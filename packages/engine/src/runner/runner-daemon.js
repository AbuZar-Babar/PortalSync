/**
 * PortalSync Runner Daemon
 * 
 * Continuous desktop automation daemon that:
 * 1. Verifies local Chrome CDP connection on port 9222
 * 2. Runs an HTTP polling loop every 10–15 seconds querying for pending cloud runs
 * 3. Claims runs atomically (pending -> running)
 * 4. Boots LoopReplayRunner with cloud workflow parameters and streams telemetry
 * 5. Handles 90-second Human-in-the-Loop (HITL) 2FA intervention:
 *    - Detects 2FA/OTP/challenge prompts
 *    - Updates cloud status to 'requires_action' with error_summary
 *    - Pauses replay, counts down 90s, resumes on authentication or marks failed on timeout
 * 6. Computes SHA-256 hashes of downloaded invoice PDFs (guaranteeing zero duplicates)
 * 7. Saves files locally in target_folder and registers artifacts in cloud
 * 
 * Zero external dependencies — pure Node.js CommonJS.
 */

'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');
const { CloudClient } = require('./cloud-client');
const { ArtifactTracker, computeSha256 } = require('./dedup-helper');
const { detect2FAChallenge, waitFor2FAResolution } = require('./hitl-detector');

/**
 * Diagnostic check to verify if Chrome CDP is responding
 * @param {number} [port=9222]
 * @param {string} [host='127.0.0.1']
 * @param {number} [timeoutMs=1500]
 * @returns {Promise<{ responding: boolean, statusCode?: number, data?: any, error?: string }>}
 */
function checkCdpResponding(port = 9222, host = '127.0.0.1', timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(`http://${host}:${port}/json/version`, { timeout: timeoutMs }, (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        let versionData = null;
        try { versionData = JSON.parse(raw); } catch {}
        resolve({
          responding: res.statusCode === 200,
          statusCode: res.statusCode,
          data: versionData,
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        responding: false,
        error: err.message,
        code: err.code,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        responding: false,
        error: 'CDP connection timed out',
        code: 'ETIMEDOUT',
      });
    });
  });
}

class RunnerDaemon {
  /**
   * @param {Object} options
   * @param {CloudClient|Object} [options.cloudClient] - Cloud client instance or configuration options
   * @param {number} [options.cdpPort=9222] - Chrome remote debugging port
   * @param {string} [options.cdpHost='127.0.0.1'] - Chrome remote debugging host
   * @param {number} [options.pollIntervalMs=10000] - Polling interval in ms (10-15s recommended)
   * @param {string} [options.targetFolder] - Base directory for downloaded artifacts
   * @param {number} [options.hitlTimeoutMs=90000] - HITL 2FA wait timeout (default: 90000ms = 90s)
   * @param {Object} [options.logger] - Optional custom logger
   */
  constructor(options = {}) {
    if (options.cloudClient instanceof CloudClient ||
       (options.cloudClient && (typeof options.cloudClient.getPendingRuns === 'function' || typeof options.cloudClient.updateRunStatus === 'function'))) {
      this.cloudClient = options.cloudClient;
    } else {
      this.cloudClient = new CloudClient(options.cloudClient || options);
    }

    this.cdpPort = options.cdpPort || 9222;
    this.cdpHost = options.cdpHost || '127.0.0.1';
    this.pollIntervalMs = options.pollIntervalMs || 10000;
    this.targetFolder = options.targetFolder || path.resolve(process.cwd(), 'downloads');
    this.hitlTimeoutMs = options.hitlTimeoutMs || 90000;

    this.logger = options.logger || {
      info: (...args) => console.log('[Daemon:INFO]', ...args),
      warn: (...args) => console.warn('[Daemon:WARN]', ...args),
      error: (...args) => console.error('[Daemon:ERROR]', ...args),
      success: (...args) => console.log('[Daemon:SUCCESS]', ...args),
    };

    this.isRunning = false;
    this.activeRun = null;
    this.currentRunner = null;
    this.isInHitl = false;
    this.artifactTracker = new ArtifactTracker();
    this._pollTimer = null;
  }

  /**
   * Check CDP availability
   */
  async checkCdp() {
    return checkCdpResponding(this.cdpPort, this.cdpHost);
  }

  /**
   * Start continuous polling loop
   */
  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.logger.info(`Starting PortalSync Runner Daemon (CDP port: ${this.cdpPort}, Poll interval: ${this.pollIntervalMs / 1000}s)`);
    this.logger.info(`Cloud API URL: ${this.cloudClient.baseUrl}`);

    // Initial CDP check
    const cdpStatus = await this.checkCdp();
    if (cdpStatus.responding) {
      this.logger.success(`Chrome CDP is responding on ${this.cdpHost}:${this.cdpPort} (${cdpStatus.data?.Browser || 'Chrome'})`);
    } else {
      this.logger.warn(`Chrome CDP not detected on port ${this.cdpPort}. Daemon will poll for runs, but browser execution requires Chrome running with --remote-debugging-port=${this.cdpPort}.`);
    }

    // Polling loop
    while (this.isRunning) {
      try {
        await this.pollOnce();
      } catch (err) {
        this.logger.error(`Error during polling cycle: ${err.message}`);
      }

      if (this.isRunning) {
        await this._sleep(this.pollIntervalMs);
      }
    }
  }

  /**
   * Stop continuous polling loop
   */
  async stop() {
    this.logger.info('Stopping PortalSync Runner Daemon...');
    this.isRunning = false;

    if (this._pollTimer) {
      clearTimeout(this._pollTimer);
      this._pollTimer = null;
    }

    if (this.currentRunner && typeof this.currentRunner.stop === 'function') {
      try {
        await this.currentRunner.stop();
      } catch (err) {
        this.logger.warn(`Error stopping active runner: ${err.message}`);
      }
    }

    this.activeRun = null;
    this.currentRunner = null;
    this.logger.info('Daemon stopped.');
  }

  /**
   * Single polling execution cycle
   * Queries pending runs, atomically claims one, and executes it.
   */
  async pollOnce() {
    if (this.activeRun) {
      // Busy executing a run
      return null;
    }

    let pendingRuns = [];
    try {
      pendingRuns = await this.cloudClient.getPendingRuns();
    } catch (err) {
      this.logger.warn(`Failed to poll pending runs: ${err.message}`);
      return null;
    }

    if (!Array.isArray(pendingRuns) || pendingRuns.length === 0) {
      return null;
    }

    this.logger.info(`Found ${pendingRuns.length} pending run(s). Attempting to claim...`);
    const candidate = pendingRuns[0];

    let claimedRun = null;
    try {
      claimedRun = await this.cloudClient.claimRun(candidate.id);
    } catch (err) {
      this.logger.warn(`Could not claim run ${candidate.id} (status: ${err.status || 'err'}): ${err.message}`);
      return null;
    }

    const runToExecute = claimedRun || candidate;
    return await this.executeRun(runToExecute);
  }

  /**
   * Execute a single claimed run
   * @param {Object} run - ExecutionRun record
   */
  async executeRun(run) {
    if (!run || !run.id) {
      throw new Error('executeRun requires a valid run record');
    }

    this.activeRun = run;
    this.logger.info(`Executing run ${run.id} for workflow: ${run.workflow_id}`);

    // Fetch workflow definition
    let workflow = run.workflow;
    if (!workflow && run.workflow_id) {
      try {
        workflow = await this.cloudClient.getWorkflow(run.workflow_id);
      } catch (err) {
        this.logger.warn(`Could not fetch workflow details for ${run.workflow_id}: ${err.message}`);
      }
    }

    // Determine target download directory with safe fallback if configured drive/path doesn't exist
    const workflowTargetFolder = workflow?.workflow_definition?.target_folder;
    let runTargetDir = path.join(this.targetFolder, run.id);

    if (workflowTargetFolder) {
      try {
        if (!fs.existsSync(workflowTargetFolder)) {
          fs.mkdirSync(workflowTargetFolder, { recursive: true });
        }
        runTargetDir = workflowTargetFolder;
      } catch (mkdirErr) {
        this.logger.warn(`Configured target folder '${workflowTargetFolder}' is inaccessible (${mkdirErr.message}). Falling back to local directory '${runTargetDir}'.`);
      }
    }

    if (!fs.existsSync(runTargetDir)) {
      try {
        fs.mkdirSync(runTargetDir, { recursive: true });
      } catch (fallbackErr) {
        // Last-resort fallback to os temp directory
        const os = require('os');
        runTargetDir = path.join(os.tmpdir(), 'portalsync-downloads', run.id);
        fs.mkdirSync(runTargetDir, { recursive: true });
      }
    }

    // Initialize LoopReplayRunner lazily
    let LoopReplayRunner;
    try {
      LoopReplayRunner = require('../replay/loop-replay-runner');
    } catch (err) {
      const errorMsg = `Failed to load LoopReplayRunner: ${err.message}`;
      this.logger.error(errorMsg);
      await this.cloudClient.updateRunStatus(run.id, 'failed', {
        error_summary: errorMsg,
        completed_at: new Date().toISOString(),
      }).catch(() => {});
      this.activeRun = null;
      throw new Error(errorMsg);
    }

    const runner = new LoopReplayRunner({
      cdpPort: this.cdpPort,
      runId: run.id,
      workflowId: run.workflow_id,
      workflowName: workflow?.name || 'workflow',
      targetUrl: workflow?.portal_url,
      structuredDownloadsDir: runTargetDir,
    });
    this.currentRunner = runner;

    // Track execution telemetry
    let itemsProcessed = 0;
    let itemsDownloaded = 0;
    let hitlInterval = null;

    try {
      // Progress handler
      const onProgress = async (progress) => {
        if (progress.manifest) {
          itemsProcessed = progress.manifest.itemsProcessed || progress.manifest.itemsSucceeded || itemsProcessed;
          itemsDownloaded = progress.manifest.itemsDownloaded || itemsDownloaded;
        }
        await this.cloudClient.updateRunProgress(run.id, {
          items_processed: itemsProcessed,
          items_downloaded: itemsDownloaded,
        }).catch(err => {
          this.logger.warn(`Failed to update progress: ${err.message}`);
        });
      };

      // Background watchdog for 2FA challenge detection
      hitlInterval = setInterval(async () => {
        if (this.isInHitl || !this.currentRunner) return;
        const page = this.currentRunner.replayEngine?.page;
        if (!page || (typeof page.isClosed === 'function' && page.isClosed())) return;

        try {
          const challenge = await detect2FAChallenge(page);
          if (challenge.detected) {
            await this.handleHitlIntervention(run.id, page, challenge);
          }
        } catch {
          // Ignore transient evaluation errors
        }
      }, 1500);

      // Execute workflow
      const effectiveWorkflow = workflow || {
        id: run.workflow_id,
        name: 'Workflow',
        portal_url: 'about:blank',
        steps: [],
      };

      const result = await runner.start(effectiveWorkflow, { onProgress });

      // Clean up HITL watchdog
      if (hitlInterval) {
        clearInterval(hitlInterval);
        hitlInterval = null;
      }

      // Check downloaded artifacts, compute SHA-256, deduplicate, and register in cloud
      const newArtifacts = await this.collectAndRegisterArtifacts(run.id, runTargetDir, runner);
      itemsDownloaded = Math.max(itemsDownloaded, newArtifacts.length);

      // Determine final run status
      const isSuccess = result?.status === 'COMPLETED' || result?.status === 'COMPLETED_WITH_ERRORS' || !result?.error;
      const finalStatus = isSuccess ? 'completed' : 'failed';

      await this.cloudClient.updateRunStatus(run.id, finalStatus, {
        items_processed: itemsProcessed,
        items_downloaded: itemsDownloaded,
        completed_at: new Date().toISOString(),
        error_summary: result?.error || null,
      });

      this.logger.success(`Run ${run.id} finished with status: ${finalStatus} (${itemsDownloaded} artifact(s) registered)`);
      return { success: isSuccess, runId: run.id, itemsDownloaded, itemsProcessed };
    } catch (err) {
      if (hitlInterval) {
        clearInterval(hitlInterval);
        hitlInterval = null;
      }

      const errorMsg = err.message || 'Execution error';
      this.logger.error(`Run ${run.id} failed: ${errorMsg}`);

      await this.cloudClient.updateRunStatus(run.id, 'failed', {
        error_summary: errorMsg,
        completed_at: new Date().toISOString(),
      }).catch(() => {});

      throw err;
    } finally {
      this.activeRun = null;
      this.currentRunner = null;
      this.isInHitl = false;
    }
  }

  /**
   * Handle 90-second HITL 2FA intervention
   * @param {string} runId 
   * @param {any} page 
   * @param {Object} [challengeInfo] 
   * @param {Object} [options]
   * @param {number} [options.timeoutMs]
   * @param {number} [options.pollIntervalMs]
   * @param {boolean} [options.throwOnTimeout]
   * @returns {Promise<{ resolved: boolean, timedOut?: boolean }>}
   */
  async handleHitlIntervention(runId, page, challengeInfo = {}, options = {}) {
    this.isInHitl = true;
    const reasonText = challengeInfo?.reason ? ` (${challengeInfo.reason})` : '';
    this.logger.warn(`[HITL 2FA] 2FA/Authentication challenge detected on run ${runId}${reasonText}`);

    // Step 1: Update cloud status to requires_action
    const errorSummary = '2FA challenge detected: awaiting human verification';
    await this.cloudClient.updateRunStatus(runId, 'requires_action', {
      error_summary: errorSummary,
    }).catch(err => this.logger.warn(`Could not update 2FA status: ${err.message}`));

    // Step 2: Pause replay execution
    if (this.currentRunner?.replayEngine && typeof this.currentRunner.replayEngine.pause === 'function') {
      await this.currentRunner.replayEngine.pause('2FA Challenge');
    }

    const timeoutMs = options.timeoutMs || this.hitlTimeoutMs || 90000;
    const pollIntervalMs = options.pollIntervalMs || (options.timeoutMs ? Math.min(1000, Math.max(20, Math.floor(timeoutMs / 10))) : (this.hitlTimeoutMs ? Math.min(1000, Math.max(20, Math.floor(this.hitlTimeoutMs / 10))) : 1000));

    // Step 3: Wait up to 90 seconds for human intervention
    const result = await waitFor2FAResolution(page, {
      timeoutMs,
      pollIntervalMs,
      onTick: typeof options.onTick === 'function' ? options.onTick : (remainingSec) => {
        this.logger.info(`[HITL 2FA] Awaiting human verification... ${remainingSec}s remaining`);
      },
      checkAuth: typeof options.checkAuth === 'function' ? options.checkAuth : async (p) => {
        try {
          const { isSessionAuthenticated } = require('../shared/auth-detector');
          return await isSessionAuthenticated(p);
        } catch {
          return false;
        }
      },
    });

    if (result.resolved) {
      this.logger.success(`[HITL 2FA] Human verification completed in ${Math.round(result.elapsedMs / 1000)}s! Resuming execution...`);
      // Step 4: Resume execution and update cloud back to running
      await this.cloudClient.updateRunStatus(runId, 'running', {
        error_summary: null,
      }).catch(() => {});

      if (this.currentRunner?.replayEngine && typeof this.currentRunner.replayEngine.resume === 'function') {
        await this.currentRunner.replayEngine.resume();
      }
      this.isInHitl = false;
      return { resolved: true };
    } else {
      // Step 5: Timeout expired (90 seconds elapsed)
      const timeoutMsg = '2FA timeout: Human verification was not completed within 90 seconds';
      this.logger.error(`[HITL 2FA] ${timeoutMsg}`);

      await this.cloudClient.updateRunStatus(runId, 'failed', {
        error_summary: timeoutMsg,
        completed_at: new Date().toISOString(),
      }).catch(() => {});

      if (this.currentRunner && typeof this.currentRunner.stop === 'function') {
        await this.currentRunner.stop().catch(() => {});
      }
      this.isInHitl = false;

      if (options.throwOnTimeout === false) {
        return { resolved: false, timedOut: true };
      }

      const timeoutError = new Error(timeoutMsg);
      timeoutError.resolved = false;
      timeoutError.timedOut = true;
      throw timeoutError;
    }
  }

  /**
   * Scan download directories, compute SHA-256, deduplicate, and register artifacts
   * @param {string} runId 
   * @param {string} targetDir 
   * @param {any} runner 
   * @returns {Promise<Array<any>>} List of registered artifacts
   */
  async collectAndRegisterArtifacts(runId, targetDir, runner) {
    const directoriesToScan = new Set();
    if (fs.existsSync(targetDir)) directoriesToScan.add(targetDir);
    if (runner?.runsDir && fs.existsSync(runner.runsDir)) directoriesToScan.add(runner.runsDir);
    if (runner?.downloadsDir && fs.existsSync(runner.downloadsDir)) directoriesToScan.add(runner.downloadsDir);

    const registered = [];

    for (const dir of directoriesToScan) {
      const files = this.artifactTracker.scanDirectory(dir);
      for (const fileRecord of files) {
        // Exclude internal manifests or state files
        if (fileRecord.fileName.toLowerCase() === 'manifest.json' || fileRecord.fileName.endsWith('.json')) {
          continue;
        }

        const artifactResult = this.artifactTracker.processAndSaveArtifact(
          fileRecord.filePath,
          targetDir,
          fileRecord.fileName
        );

        if (artifactResult.isDuplicate) {
          this.logger.info(`[Deduplication] Skipping duplicate file: ${artifactResult.fileName} (SHA-256: ${artifactResult.hash.substring(0, 12)}...)`);
          continue;
        }

        try {
          const registeredArtifact = await this.cloudClient.registerArtifact(runId, {
            file_name: artifactResult.fileName,
            file_size_bytes: artifactResult.sizeBytes,
            sha256_hash: artifactResult.hash,
            storage_path: artifactResult.targetPath,
            cloud_storage_path: artifactResult.targetPath,
            item_metadata: {
              source: 'desktop-runner',
              run_id: runId,
              discovered_at: new Date().toISOString(),
            },
          });
          this.logger.success(`Registered artifact: ${artifactResult.fileName} [SHA-256: ${artifactResult.hash.substring(0, 10)}...]`);
          registered.push(registeredArtifact);
        } catch (err) {
          this.logger.warn(`Failed to register artifact in cloud: ${err.message}`);
        }
      }
    }

    return registered;
  }

  /**
   * Execute a specific workflow immediately by ID
   * @param {string} workflowId 
   * @param {Object} [options]
   */
  async executeWorkflow(workflowId, options = {}) {
    this.logger.info(`Fetching workflow: ${workflowId}`);
    const workflow = await this.cloudClient.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const syntheticRun = {
      id: `run_local_${Date.now()}`,
      workflow_id: workflowId,
      org_id: workflow.org_id || 'local',
      workflow,
    };

    return await this.executeRun(syntheticRun);
  }

  _sleep(ms) {
    return new Promise(resolve => {
      this._pollTimer = setTimeout(resolve, ms);
    });
  }
}

module.exports = {
  RunnerDaemon,
  checkCdpResponding,
  computeSha256,
  detect2FAChallenge,
  waitFor2FAResolution,
};
