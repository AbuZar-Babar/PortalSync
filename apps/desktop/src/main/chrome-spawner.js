const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');
const os = require('os');
const fs = require('fs');

class ChromeSpawner {
  constructor() {
    this.port = 9222;
    this.host = '127.0.0.1';
    this.spawnedProcess = null;
    this.profileDir = path.join(os.homedir(), '.chrome-portalsync');
  }

  /**
   * Locate the Chrome executable on Windows
   */
  findChromePath() {
    const candidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ];

    for (const p of candidates) {
      if (p && fs.existsSync(p)) {
        return p;
      }
    }

    return null;
  }

  /**
   * Check if Chrome is already running with remote debugging on port 9222
   * Returns open status, version string, and whether it is running in headless mode.
   */
  async isPortOpen() {
    return new Promise((resolve) => {
      const req = http.get(
        {
          host: this.host,
          port: this.port,
          path: '/json/version',
          timeout: 1500,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            try {
              const data = JSON.parse(body);
              const browserStr = data.Browser || '';
              const userAgentStr = data['User-Agent'] || '';
              const isHeadless = Boolean(
                browserStr.toLowerCase().includes('headless') ||
                userAgentStr.toLowerCase().includes('headless')
              );
              resolve({
                open: true,
                version: browserStr || 'Chrome',
                isHeadless,
                webSocketDebuggerUrl: data.webSocketDebuggerUrl,
              });
            } catch {
              resolve({ open: true, version: 'Chrome', isHeadless: false });
            }
          });
        }
      );

      req.on('error', () => resolve({ open: false, isHeadless: false }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ open: false, isHeadless: false });
      });
    });
  }

  /**
   * Close any running Chrome instance on port 9222 cleanly
   */
  async closeChrome() {
    // 1. Try closing cleanly via CDP Browser.close with puppeteer-core
    try {
      const puppeteer = require('puppeteer-core');
      const browser = await Promise.race([
        puppeteer.connect({
          browserURL: `http://${this.host}:${this.port}`,
          defaultViewport: null,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connect timeout')), 1500)),
      ]);
      await Promise.race([
        browser.close(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Close timeout')), 2500)),
      ]);
    } catch {
      // Graceful CDP close failed or timed out, will fallback to process termination
    }

    // 2. Kill spawnedProcess reference if still active
    this.stopSpawned();

    // 3. Fallback on Windows: terminate any lingering process listening on remote debugging port
    if (process.platform === 'win32') {
      try {
        const output = execSync(`netstat -ano -p tcp | findstr :${this.port}`, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        });
        const lines = output.split(/\r?\n/);
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5 && parts[1].includes(`:${this.port}`) && parts[3] === 'LISTENING') {
            const pid = parseInt(parts[4], 10);
            if (pid && pid > 0 && pid !== process.pid) {
              try {
                execSync(`taskkill /F /PID ${pid} /T`, { stdio: 'ignore' });
              } catch {}
            }
          }
        }
      } catch {}
    }

    // 4. Wait for port 9222 to fully release
    const startWait = Date.now();
    while (Date.now() - startWait < 3000) {
      const check = await this.isPortOpen();
      if (!check.open) break;
      await new Promise((r) => setTimeout(r, 200));
    }

    // 5. Clean lock files from profile directory so next spawn doesn't fail
    this._cleanLocks();
  }

  _cleanLocks() {
    for (const lock of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
      try {
        const lockPath = path.join(this.profileDir, lock);
        if (fs.existsSync(lockPath)) {
          fs.unlinkSync(lockPath);
        }
      } catch {}
    }
  }

  /**
   * Ensure Chrome is active on port 9222 in the requested mode
   * @param {'visible' | 'headless'} mode
   */
  async ensureChrome(mode = 'visible') {
    const status = await this.isPortOpen();
    if (status.open) {
      const isCurrentlyHeadless = Boolean(status.isHeadless);
      const wantsHeadless = mode === 'headless';

      if (isCurrentlyHeadless === wantsHeadless) {
        return {
          alreadyRunning: true,
          version: status.version,
          port: this.port,
          mode: isCurrentlyHeadless ? 'headless' : 'visible',
        };
      }

      console.log(
        `[ChromeSpawner] Mode mismatch: running=${isCurrentlyHeadless ? 'headless' : 'visible'}, requested=${mode}. Restarting Chrome...`
      );
      await this.closeChrome();
    }

    const chromePath = this.findChromePath();
    if (!chromePath) {
      throw new Error(
        'Google Chrome was not found on this system. Please ensure Google Chrome is installed.'
      );
    }

    if (!fs.existsSync(this.profileDir)) {
      fs.mkdirSync(this.profileDir, { recursive: true });
    }

    this._cleanLocks();

    const args = [
      `--remote-debugging-port=${this.port}`,
      `--user-data-dir=${this.profileDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-sync',
    ];

    if (mode === 'headless') {
      args.push('--headless=new', '--disable-gpu');
    }

    this.spawnedProcess = spawn(chromePath, args, {
      detached: true,
      stdio: 'ignore',
    });

    this.spawnedProcess.unref();

    // Poll until Chrome CDP responds (up to 8 seconds)
    const startTime = Date.now();
    while (Date.now() - startTime < 8000) {
      await new Promise((r) => setTimeout(r, 400));
      const check = await this.isPortOpen();
      if (check.open) {
        return {
          alreadyRunning: false,
          version: check.version,
          port: this.port,
          mode,
        };
      }
    }

    throw new Error(`Chrome started but CDP failed to respond on port ${this.port} within 8 seconds.`);
  }

  /**
   * Stop the Chrome instance if it was spawned by this app
   */
  stopSpawned() {
    if (this.spawnedProcess) {
      try {
        if (!this.spawnedProcess.killed) {
          this.spawnedProcess.kill();
        }
      } catch (err) {
        console.warn('Could not kill spawned Chrome process:', err);
      }
      this.spawnedProcess = null;
    }
  }
}

module.exports = new ChromeSpawner();
