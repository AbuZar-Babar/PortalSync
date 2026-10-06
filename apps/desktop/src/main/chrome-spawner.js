const { spawn } = require('child_process');
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
              resolve({ open: true, version: data.Browser || 'Chrome' });
            } catch {
              resolve({ open: true, version: 'Chrome' });
            }
          });
        }
      );

      req.on('error', () => resolve({ open: false }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ open: false });
      });
    });
  }

  /**
   * Ensure Chrome is active on port 9222
   * @param {'visible' | 'headless'} mode
   */
  async ensureChrome(mode = 'visible') {
    const status = await this.isPortOpen();
    if (status.open) {
      return {
        alreadyRunning: true,
        version: status.version,
        port: this.port,
      };
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
    if (this.spawnedProcess && !this.spawnedProcess.killed) {
      try {
        this.spawnedProcess.kill();
      } catch (err) {
        console.warn('Could not kill spawned Chrome process:', err);
      }
      this.spawnedProcess = null;
    }
  }
}

module.exports = new ChromeSpawner();
