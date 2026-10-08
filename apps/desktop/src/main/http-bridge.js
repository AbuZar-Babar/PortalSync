/**
 * Desktop Localhost HTTP Bridge
 * 
 * Runs on 127.0.0.1:49152 to bridge Web Dashboard (Vercel / Localhost)
 * with the Desktop Automation and Chrome CDP Recorder engine.
 */

'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const chromeSpawner = require('./chrome-spawner');
const configManager = require('./config-manager');
const notifier = require('./notifier');

// Initialize module resolution for puppeteer-core from worktree or root if missing
try {
  const candidateWorktreePaths = [
    path.resolve(__dirname, '../../../../../Workflow-Capture-agent-worktrees/multi-agent-integration/node_modules'),
    path.resolve(__dirname, '../../../../Workflow-Capture-agent-worktrees/multi-agent-integration/node_modules'),
    path.resolve(__dirname, '../../../../../Workflow-Capture-agent-worktrees/main/node_modules'),
    path.resolve(__dirname, '../../../../node_modules'),
    path.resolve(__dirname, '../../node_modules'),
    path.resolve('C:/Users/AbuZar/Desktop/Fyp/Workflow-Capture-agent-worktrees/multi-agent-integration/node_modules')
  ];
  for (const p of candidateWorktreePaths) {
    if (fs.existsSync(p)) {
      if (!process.env.NODE_PATH || !process.env.NODE_PATH.includes(p)) {
        process.env.NODE_PATH = [p, process.env.NODE_PATH || ''].filter(Boolean).join(path.delimiter);
      }
    }
  }
  require('module').Module._initPaths();
} catch (e) {
  console.warn('[HTTPBridge] Module init fallback notice:', e.message);
}

const RecorderBridge = require(path.resolve(__dirname, '../../../../packages/engine/src/recorder/recorder-bridge'));

class HttpBridge {
  constructor() {
    this.port = 49152;
    this.host = '127.0.0.1';
    this.server = null;
    this.activeRecorder = null;
    this.isRecording = false;
    this.isStopping = false;
    this.completedRecording = false;
    this.actions = [];
    this.lastRecipe = null;
    this.sessionMeta = null;
    this.statusListeners = [];
  }

  onStatusChange(cb) {
    if (typeof cb === 'function') this.statusListeners.push(cb);
  }

  notifyStatus() {
    const status = this.getStatus();
    for (const cb of this.statusListeners) {
      try {
        cb(status);
      } catch (err) {
        console.warn('[HTTPBridge] Listener error:', err);
      }
    }
  }

  getStatus() {
    const activeActions = this.activeRecorder?.actions || this.actions || [];
    return {
      status: 'ok',
      isRecording: this.isRecording,
      actionCount: activeActions.length,
      actions: activeActions,
      completedRecording: this.completedRecording,
      sessionMeta: this.sessionMeta,
      recipe: this.lastRecipe,
      port: this.port
    };
  }

  setCorsHeaders(req, res) {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Private-Network');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    if (origin !== '*') {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }

  sendJson(req, res, statusCode, data) {
    this.setCorsHeaders(req, res);
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  parseBody(req) {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch {
          resolve({});
        }
      });
      req.on('error', () => resolve({}));
    });
  }

  async start() {
    if (this.server) return;

    this.server = http.createServer(async (req, res) => {
      try {
        const urlObj = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
        const pathname = (urlObj.pathname.length > 1 && urlObj.pathname.endsWith('/'))
          ? urlObj.pathname.slice(0, -1)
          : urlObj.pathname;

        // 1. CORS Preflight
        if (req.method === 'OPTIONS') {
          this.setCorsHeaders(req, res);
          res.writeHead(204);
          res.end();
          return;
        }

        // 2. Health Endpoint
        if ((pathname === '/health' || pathname === '/api/health') && req.method === 'GET') {
          const activeActions = this.activeRecorder?.actions || this.actions || [];
          return this.sendJson(req, res, 200, {
            status: 'ok',
            isRecording: this.isRecording,
            actionCount: activeActions.length,
            completedRecording: this.completedRecording,
            port: this.port
          });
        }

        // 3. Status Endpoint
        if ((pathname === '/record/status' || pathname === '/api/record/status') && req.method === 'GET') {
          const activeActions = this.activeRecorder?.actions || this.actions || [];
          return this.sendJson(req, res, 200, {
            status: 'ok',
            isRecording: this.isRecording,
            completedRecording: this.completedRecording,
            actionCount: activeActions.length,
            actions: activeActions,
            name: this.sessionMeta?.name || null,
            url: this.sessionMeta?.url || null,
            startedAt: this.sessionMeta?.startedAt || null,
            completedAt: this.sessionMeta?.completedAt || null,
            recipe: this.lastRecipe || null,
            port: this.port
          });
        }

        // 4. Start Recording Endpoint
        if ((pathname === '/record/start' || pathname === '/api/record/start') && req.method === 'POST') {
          const body = await this.parseBody(req);
          try {
            const result = await this.startRecording(body);
            return this.sendJson(req, res, 200, result);
          } catch (err) {
            return this.sendJson(req, res, 400, { error: err.message });
          }
        }

        // 5. Stop Recording Endpoint
        if ((pathname === '/record/stop' || pathname === '/api/record/stop') && req.method === 'POST') {
          try {
            const result = await this.stopRecording();
            return this.sendJson(req, res, 200, result);
          } catch (err) {
            return this.sendJson(req, res, 500, { error: err.message });
          }
        }

        // 6. Reset / Clear Recording State Endpoint
        if ((pathname === '/record/reset' || pathname === '/api/record/reset') && req.method === 'POST') {
          try {
            const result = await this.resetRecording();
            return this.sendJson(req, res, 200, result);
          } catch (err) {
            return this.sendJson(req, res, 500, { error: err.message });
          }
        }

        // 6. Stop Active Execution Run Endpoint
        if ((pathname === '/run/stop' || pathname === '/api/run/stop') && req.method === 'POST') {
          try {
            const runnerController = require('./runner-controller');
            const result = await runnerController.stopActiveRun();
            return this.sendJson(req, res, 200, result);
          } catch (err) {
            return this.sendJson(req, res, 500, { error: err.message });
          }
        }

        // 404 Fallback
        return this.sendJson(req, res, 404, { error: 'Not Found', path: pathname });
      } catch (err) {
        console.error('[HTTPBridge] Uncaught request error:', err);
        return this.sendJson(req, res, 500, { error: err.message });
      }
    });

    return new Promise((resolve, reject) => {
      this.server.listen(this.port, this.host, () => {
        console.log(`[HTTPBridge] Desktop Localhost Bridge listening on http://${this.host}:${this.port}`);
        resolve();
      });
      this.server.on('error', (err) => {
        console.error(`[HTTPBridge] Server error on port ${this.port}:`, err.message);
        if (!this.server.listening) {
          reject(err);
        }
      });
    });
  }

  async startRecording(options = {}) {
    if (this.isRecording) {
      throw new Error('A recording session is already active');
    }

    const sessionName = options.name || `workflow-${Date.now()}`;
    const targetUrl = options.url || 'https://google.com';

    // Ensure Chrome is active on port 9222
    await chromeSpawner.ensureChrome('visible');

    const config = configManager.get();
    const outputDir = path.join(
      config.targetFolder || path.join(os.homedir(), 'Downloads', 'PortalSync'),
      'Recordings'
    );
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    this.isRecording = true;
    this.completedRecording = false;
    this.actions = [];
    this.lastRecipe = null;
    this.sessionMeta = {
      name: sessionName,
      url: targetUrl,
      startedAt: new Date().toISOString()
    };

    this.activeRecorder = new RecorderBridge({
      name: sessionName,
      browserURL: 'http://127.0.0.1:9222',
      outputDir,
      onSave: async () => {
        await this._handleChromeSave();
      }
    });

    const origHandle = this.activeRecorder._handleCapturedAction.bind(this.activeRecorder);
    this.activeRecorder._handleCapturedAction = (rawAction) => {
      const added = origHandle(rawAction);
      if (added && this.activeRecorder) {
        this.actions = this.activeRecorder.actions || [];
        this.notifyStatus();
      }
      return added;
    };

    await this.activeRecorder.start();

    // Navigate to initial target URL if specified
    if (targetUrl && !targetUrl.startsWith('about:') && this.activeRecorder.page) {
      try {
        await this.activeRecorder.page.bringToFront();
        const currentUrl = typeof this.activeRecorder.page.url === 'function' ? this.activeRecorder.page.url() : '';
        if (currentUrl === 'about:blank' || currentUrl.startsWith('chrome://')) {
          await this.activeRecorder.page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        }
      } catch (e) {
        console.warn('[HTTPBridge] Page navigate notice:', e.message);
      }
    }

    this.notifyStatus();

    return {
      success: true,
      isRecording: true,
      name: sessionName,
      url: targetUrl,
      startedAt: this.sessionMeta.startedAt
    };
  }

  async _handleChromeSave() {
    if (this.isStopping) return;
    this.isStopping = true;
    try {
      if (this.activeRecorder) {
        const recorder = this.activeRecorder;
        let filePath = null;
        try {
          filePath = await recorder.stop();
        } catch (stopErr) {
          console.warn('[HTTPBridge] Recorder stop warning:', stopErr.message);
        }
        this.actions = recorder.actions || [];

        let recipeData = null;
        if (filePath && fs.existsSync(filePath)) {
          try {
            recipeData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          } catch (readErr) {
            console.warn('[HTTPBridge] Could not parse recipe file:', readErr.message);
          }
        }

        this.lastRecipe = recipeData || {
          metadata: {
            name: this.sessionMeta?.name || recorder.name,
            startUrl: recorder.startUrl || this.sessionMeta?.url,
            startedAt: this.sessionMeta?.startedAt,
            completedAt: new Date().toISOString(),
            isLoop: false,
            mode: 'STANDARD',
            version: '1.0.0'
          },
          actions: this.actions
        };

        this.activeRecorder = null;
        this.isRecording = false;
        this.completedRecording = true;
        if (this.sessionMeta) {
          this.sessionMeta.completedAt = new Date().toISOString();
        }

        notifier.notifyRecordingSaved(this.sessionMeta?.name || 'Recorded Workflow', this.actions.length);
        this.notifyStatus();
      }
    } catch (err) {
      console.error('[HTTPBridge] Chrome finish error:', err);
    } finally {
      this.isStopping = false;
    }
  }

  async stopRecording() {
    if (this.activeRecorder && this.activeRecorder.isRecording) {
      await this._handleChromeSave();
    }

    this.isRecording = false;
    this.completedRecording = true;
    this.notifyStatus();

    return {
      success: true,
      isRecording: false,
      completedRecording: true,
      actionCount: this.actions.length,
      actions: this.actions,
      recipe: this.lastRecipe
    };
  }

  async resetRecording() {
    if (this.activeRecorder && this.activeRecorder.isRecording) {
      try {
        await this.activeRecorder.stop();
      } catch {}
      this.activeRecorder = null;
    }

    this.isRecording = false;
    this.isStopping = false;
    this.completedRecording = false;
    this.actions = [];
    this.lastRecipe = null;
    this.sessionMeta = null;
    this.notifyStatus();

    return {
      success: true,
      message: 'Recording state reset cleanly',
      isRecording: false,
      completedRecording: false,
      actionCount: 0,
      actions: []
    };
  }

  async stop() {
    if (this.activeRecorder && this.activeRecorder.isRecording) {
      try {
        await this.activeRecorder.stop();
      } catch {}
      this.activeRecorder = null;
    }
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          this.server = null;
          resolve();
        });
      });
    }
  }
}

module.exports = new HttpBridge();
