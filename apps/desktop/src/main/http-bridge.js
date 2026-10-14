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

// Engine and runtime module resolution strategy:
// Standard npm workspace resolution handles dev dependencies. In packaged Electron
// apps or monorepo development, engine-resolver.js configures module search paths
// relative to process.resourcesPath or the monorepo root packages/engine directory.

const engineResolver = require('./engine-resolver');
const RecorderBridge = engineResolver.requireEngine('src/recorder/recorder-bridge');

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
    this._stoppingPromise = null;
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

        // 7. Live Page and Table Item Discovery Endpoint
        if ((pathname === '/discover' || pathname === '/api/discover') && (req.method === 'POST' || req.method === 'GET')) {
          try {
            const body = req.method === 'POST' ? await this.parseBody(req).catch(() => ({})) : {};
            const workflow = body.workflow || null;
            const targetUrl = body.url || workflow?.portal_url || workflow?.start_url || workflow?.targetUrl;

            const { connectToBrowser } = engineResolver.requireEngine('src/utils/cdp-connector');
            const { PageInspector } = engineResolver.requireEngine('src/shared/page-inspector');
            const ItemDiscovery = engineResolver.requireEngine('src/shared/item-discovery');
            const LoopReplayRunner = engineResolver.requireEngine('src/replay/loop-replay-runner');

            const { browser, page } = await connectToBrowser({ autoLaunch: false }).catch(() => ({ browser: null, page: null }));
            if (!page) {
              return this.sendJson(req, res, 200, {
                success: false,
                reason: 'No active Chrome browser session on port 9222',
                availableFields: [],
                fieldValues: {},
                itemCount: 0,
                items: []
              });
            }

            try {
              const currentUrl = page.url ? page.url() : '';
            if (targetUrl && (currentUrl === 'about:blank' || !currentUrl)) {
              await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
            }

            const inspection = await PageInspector.inspectPage(page).catch(() => ({ collections: [] }));
            const discoveredCols = new Set();
            const fieldValuesMap = {};

            const addVal = (field, val) => {
              if (!field || val === null || val === undefined) return;
              const f = String(field).trim();
              let v = String(val).trim();
              if (!f || !v) return;
              if (/^[▸►▶▼▽▾+\-±›❯»⮞⌄v><\u25B6\u25BC\u25B8\u25BE\u276F\u203A\s]+$/i.test(v)) return;
              v = v.replace(/^[▸►▶▼▽▾+\-±›❯»⮞⌄v><\u25B6\u25BC\u25B8\u25BE\u276F\u203A\s]+/, '').trim();
              if (!v) return;
              if (!fieldValuesMap[f]) fieldValuesMap[f] = [];
              if (!fieldValuesMap[f].includes(v)) {
                fieldValuesMap[f].push(v);
              }
            };

            let primaryItems = [];
            let totalItemCount = 0;

            if (inspection && Array.isArray(inspection.collections) && inspection.collections.length > 0) {
              const primaryCollection = inspection.collections[0];
              totalItemCount = primaryCollection.rowCount || (primaryCollection.items?.length ?? 0);
              (primaryCollection.columns || []).forEach(c => {
                if (c && typeof c === 'string' && c.trim()) discoveredCols.add(c.trim());
              });

              if (Array.isArray(primaryCollection.items)) {
                primaryItems = primaryCollection.items;
                primaryCollection.items.forEach(row => {
                  Object.entries(row).forEach(([col, val]) => {
                    if (col && !col.startsWith('_')) {
                      discoveredCols.add(col.trim());
                      addVal(col.trim(), val);
                    }
                  });
                });
              }
            }

            // Also inspect workflow steps for target elements and ItemDiscovery
            const steps = workflow?.steps || workflow?.workflow_definition?.steps || [];
            if (steps.length > 0) {
              const stepIdx = Number.isInteger(body.loopStepIndex) ? body.loopStepIndex : 0;
              const targetStep = steps[stepIdx] || steps[0];
              if (targetStep) {
                const discovery = await ItemDiscovery.discover(page, targetStep.target || targetStep.fingerprint, {
                  minItems: 1,
                  minScore: 0.4
                }).catch(() => null);

                if (discovery && discovery.success) {
                  totalItemCount = Math.max(totalItemCount, discovery.itemCount || 0);
                  if (typeof LoopReplayRunner.extractDiscoveredItems === 'function') {
                    const extracted = await LoopReplayRunner.extractDiscoveredItems(page, discovery).catch(() => []);
                    if (Array.isArray(extracted)) {
                      extracted.forEach(it => {
                        if (it.fields) {
                          Object.entries(it.fields).forEach(([k, v]) => {
                            if (k && typeof k === 'string') {
                              discoveredCols.add(k.trim());
                              addVal(k.trim(), v);
                            }
                          });
                        }
                      });
                    }
                  }
                }
              }
            }

            const cleanFieldValues = {};
            Object.entries(fieldValuesMap).forEach(([k, vals]) => {
              cleanFieldValues[k] = vals.slice(0, 30);
            });

            return this.sendJson(req, res, 200, {
              success: true,
              availableFields: Array.from(discoveredCols),
              fieldValues: cleanFieldValues,
              itemCount: totalItemCount,
              items: primaryItems.slice(0, 50),
              url: page.url ? page.url() : '',
              title: (typeof page.title === 'function') ? await page.title().catch(() => '') : ''
            });
            } finally {
              if (browser) await browser.disconnect().catch(() => {});
            }
          } catch (err) {
            console.warn('[HTTPBridge] Discovery handler error:', err.message);
            return this.sendJson(req, res, 500, {
              success: false,
              error: err.message,
              availableFields: [],
              fieldValues: {},
              itemCount: 0
            });
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
      config.targetFolder || (fs.existsSync(path.join(os.homedir(), 'Downloads', 'PortalSync')) ? path.join(os.homedir(), 'Downloads', 'PortalSync') : path.join(os.homedir(), 'Downloads', 'ReFlow')),
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
      startedAt: this.sessionMeta?.startedAt || this.activeRecorder?.startedAt || new Date().toISOString()
    };
  }

  async _handleChromeSave() {
    if (this._stoppingPromise) {
      return this._stoppingPromise;
    }
    if (this.isStopping) return;
    this.isStopping = true;

    this._stoppingPromise = (async () => {
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

          try {
            notifier.notifyRecordingSaved(this.sessionMeta?.name || 'Recorded Workflow', this.actions.length);
          } catch {}
          this.notifyStatus();
        }
      } catch (err) {
        console.error('[HTTPBridge] Chrome finish error:', err);
      } finally {
        this.isStopping = false;
        this._stoppingPromise = null;
      }
    })();

    return this._stoppingPromise;
  }

  async stopRecording() {
    if (this._stoppingPromise) {
      await this._stoppingPromise;
    } else if (this.activeRecorder && (this.activeRecorder.isRecording || this.isRecording)) {
      await this._handleChromeSave();
    }

    this.isRecording = false;
    this.isStopping = false;
    this._stoppingPromise = null;
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
    if (this._stoppingPromise) {
      try { await this._stoppingPromise; } catch {}
      this._stoppingPromise = null;
    }
    if (this.activeRecorder && this.activeRecorder.isRecording) {
      try {
        await this.activeRecorder.stop();
      } catch {}
      this.activeRecorder = null;
    }

    this.isRecording = false;
    this.isStopping = false;
    this._stoppingPromise = null;
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
