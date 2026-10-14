const path = require('path');
const configManager = require('./config-manager');
const chromeSpawner = require('./chrome-spawner');
const notifier = require('./notifier');

class RunnerController {
  constructor() {
    this.daemon = null;
    this.status = 'idle'; // 'idle' | 'starting' | 'active' | 'stopping' | 'error'
    this.activeRun = null;
    this.lastError = null;
    this.recentRuns = [];
    this.onStatusChangeCallbacks = [];
    this._heartbeatTimer = null;
  }

  onStatusChange(cb) {
    this.onStatusChangeCallbacks.push(cb);
  }

  _notifyStatus() {
    const state = this.getState();
    for (const cb of this.onStatusChangeCallbacks) {
      try {
        cb(state);
      } catch (err) {
        console.error('Error in status change callback:', err);
      }
    }
  }

  getState() {
    return {
      status: this.status,
      activeRun: this.activeRun,
      lastError: this.lastError,
      recentRuns: this.recentRuns.slice(0, 5),
    };
  }

  async start() {
    if (this.status === 'active' || this.status === 'starting') {
      return this.getState();
    }

    this.status = 'starting';
    this.lastError = null;
    this._notifyStatus();

    const config = configManager.get();
    if (!config.runnerToken) {
      this.status = 'error';
      this.lastError = 'Runner Token is required. Please save your token in settings.';
      this._notifyStatus();
      throw new Error(this.lastError);
    }

    try {
      // 1. Load engine modules from packages/engine (works in dev and packaged .exe)
      const engineResolver = require('./engine-resolver');
      const RunnerDaemonModule = engineResolver.requireEngine('src/runner/runner-daemon');
      const RunnerDaemon = RunnerDaemonModule.RunnerDaemon || RunnerDaemonModule;
      const CloudClientModule = engineResolver.requireEngine('src/runner/cloud-client');
      const CloudClient = CloudClientModule.CloudClient || CloudClientModule;

      const cloudClient = new CloudClient({
        baseUrl: config.cloudUrl || 'https://web-fawn-ten-55.vercel.app',
        token: config.runnerToken,
      });

      // 2. Initialize daemon with custom logger forwarding to desktop UI
      this.daemon = new RunnerDaemon({
        cloudClient,
        cdpPort: 9222,
        targetFolder: config.targetFolder,
        pollIntervalMs: 3000,
        logger: {
          info: (...args) => console.log('[RunnerDaemon:INFO]', ...args),
          warn: (...args) => console.warn('[RunnerDaemon:WARN]', ...args),
          error: (...args) => console.error('[RunnerDaemon:ERROR]', ...args),
          success: (...args) => console.log('[RunnerDaemon:SUCCESS]', ...args),
        },
      });

      // Hook run lifecycle
      const originalExecuteRun = this.daemon.executeRun.bind(this.daemon);
      this.daemon.executeRun = async (run) => {
        this.activeRun = {
          id: run.id,
          workflowId: run.workflow_id,
          status: 'running',
          startedAt: new Date().toISOString(),
          itemsDownloaded: 0,
        };
        this._notifyStatus();

        try {
          // Lazily ensure Chrome is running only when an automation job is actively executing
          const currentConfig = configManager.get();
          await chromeSpawner.ensureChrome(currentConfig.browserMode || 'visible');

          const result = await originalExecuteRun(run);

          const completedRun = {
            id: run.id,
            workflowName: result?.workflowName || 'Portal Automation',
            status: 'completed',
            itemsDownloaded: result?.itemsDownloaded || 0,
            completedAt: new Date().toISOString(),
          };

          this.recentRuns.unshift(completedRun);
          this.activeRun = null;
          this._notifyStatus();

          notifier.notifyRunCompleted(completedRun.workflowName, completedRun.itemsDownloaded);
          return result;
        } catch (err) {
          const failedRun = {
            id: run.id,
            workflowName: 'Portal Automation',
            status: 'failed',
            error: err.message,
            completedAt: new Date().toISOString(),
          };

          this.recentRuns.unshift(failedRun);
          this.activeRun = null;
          this._notifyStatus();

          notifier.notifyRunFailed(failedRun.workflowName, err.message);
          throw err;
        }
      };

      // Start polling & send initial heartbeat (daemon runs its own 10s heartbeat cycle)
      this.daemon.start().catch((err) => {
        console.error('Daemon polling error:', err);
      });

      this.status = 'active';
      this._notifyStatus();
      return this.getState();
    } catch (err) {
      if (this._heartbeatTimer) {
        clearInterval(this._heartbeatTimer);
        this._heartbeatTimer = null;
      }
      this.status = 'error';
      this.lastError = err.message;
      this._notifyStatus();
      throw err;
    }
  }

  async stop() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }

    if (this.status === 'idle') return this.getState();

    this.status = 'stopping';
    this._notifyStatus();

    if (this.daemon) {
      try {
        await this.daemon.stop();
      } catch (err) {
        console.warn('Error stopping daemon:', err);
      }
      this.daemon = null;
    }

    this.status = 'idle';
    this.activeRun = null;
    this._notifyStatus();
    return this.getState();
  }

  async stopActiveRun() {
    if (this.daemon && typeof this.daemon.stopActiveRun === 'function') {
      const res = await this.daemon.stopActiveRun();
      this.activeRun = null;
      this._notifyStatus();
      return res;
    }
    this.activeRun = null;
    this._notifyStatus();
    return { success: false, message: 'Daemon is not active' };
  }
}

module.exports = new RunnerController();

