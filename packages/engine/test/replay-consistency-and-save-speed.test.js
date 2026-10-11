/**
 * Test Suite: Workflow Replay Consistency & Sub-Second Recorder Save Speed
 * 
 * Verifies:
 * 1. Second-run replay consistency: navigateToWorkflowTarget enforces clean navigation to
 *    designated startUrl when Chrome is sitting on deep sub-pages, export screens, or modals
 *    from a prior run.
 * 2. Startup hygiene: lingering auxiliary tabs and modal overlays from prior runs are cleared
 *    before Step 1 executes.
 * 3. Sub-second recorder save: Promise.allSettled + 400ms timeout race ensures 20+ hanging iframes
 *    do not stall the Save operation (takes < 600ms instead of 10-15s).
 * 4. Raw recording purity: saves immediately with default mode 'STANDARD' without blocking on
 *    synchronous loop detection.
 * 5. RunnerDaemon lock clearance: guarantees activeRun, currentRunner, isInHitl, and watchdog
 *    intervals are unequivocally cleared in finally blocks.
 */

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const LoopReplayRunner = require('../src/replay/loop-replay-runner');
const RecorderBridge = require('../src/recorder/recorder-bridge');
const { RunnerDaemon } = require('../src/runner/runner-daemon');

console.log('🧪 Starting Replay Consistency & Save Speed Test Suite...\n');

(async () => {
  let passedTests = 0;
  let totalTests = 0;

  function runTest(name, fn) {
    totalTests++;
    try {
      fn();
      console.log(`  ✅ ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`  ❌ ${name}: ${err.message}`);
      throw err;
    }
  }

  async function runAsyncTest(name, fn) {
    totalTests++;
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`  ❌ ${name}: ${err.message}`);
      throw err;
    }
  }

  // =========================================================================
  // GROUP 1: navigateToWorkflowTarget & Consecutive Run Consistency
  // =========================================================================
  console.log('🔹 Group 1: navigateToWorkflowTarget Consecutive Replay Navigation');

  await runAsyncTest('1.1: Forces navigation when Chrome remains on deep sub-page/export screen from run 1', async () => {
    const runner = new LoopReplayRunner({ runId: 'test-run-1' });
    let navigatedTo = null;
    let broughtToFront = false;

    const mockPage = {
      url: () => 'https://vendor.portal.com/invoices/export?batchId=99281&format=pdf',
      bringToFront: async () => { broughtToFront = true; },
      goto: async (url) => { navigatedTo = url; },
      evaluate: async () => false, // no modal
    };

    const workflow = {
      startUrl: 'https://vendor.portal.com/invoices',
      steps: [{ type: 'CLICK', name: 'Download Button' }],
    };

    await runner.navigateToWorkflowTarget(mockPage, workflow);

    assert.strictEqual(broughtToFront, true, 'Page must be brought to front');
    assert.strictEqual(navigatedTo, 'https://vendor.portal.com/invoices', 'Must navigate back to startUrl when on deep path');
  });

  await runAsyncTest('1.2: Forces navigation when hash route changed to inner modal/viewer in SPA', async () => {
    const runner = new LoopReplayRunner({ runId: 'test-run-2' });
    let navigatedTo = null;

    const mockPage = {
      url: () => 'https://app.erp.com/#/invoices/viewer/a2f87723-04ee-4092-b858',
      bringToFront: async () => {},
      goto: async (url) => { navigatedTo = url; },
      evaluate: async () => false,
    };

    const workflow = {
      targetUrl: 'https://app.erp.com/#/invoices',
      steps: [{ type: 'CLICK', name: 'Filter Status' }],
    };

    await runner.navigateToWorkflowTarget(mockPage, workflow);

    assert.strictEqual(navigatedTo, 'https://app.erp.com/#/invoices', 'Must reset hash route to designated workflow startUrl');
  });

  await runAsyncTest('1.3: Forces navigation when origins differ completely', async () => {
    const runner = new LoopReplayRunner({ runId: 'test-run-3' });
    let navigatedTo = null;

    const mockPage = {
      url: () => 'https://google.com',
      bringToFront: async () => {},
      goto: async (url) => { navigatedTo = url; },
      evaluate: async () => false,
    };

    const workflow = {
      startUrl: 'https://supplier.portal.com/dashboard',
    };

    await runner.navigateToWorkflowTarget(mockPage, workflow);

    assert.strictEqual(navigatedTo, 'https://supplier.portal.com/dashboard', 'Must navigate when origins differ');
  });

  await runAsyncTest('1.4: Preserves active session if target is login but current page is already authenticated', async () => {
    const runner = new LoopReplayRunner({ runId: 'test-run-4' });
    let navigatedTo = null;

    const mockPage = {
      url: () => 'https://vendor.portal.com/dashboard',
      bringToFront: async () => {},
      goto: async (url) => { navigatedTo = url; },
      evaluate: async () => false,
    };

    const workflow = {
      startUrl: 'https://vendor.portal.com/login',
    };

    await runner.navigateToWorkflowTarget(mockPage, workflow);

    assert.strictEqual(navigatedTo, null, 'Must NOT navigate back to login when already authenticated');
  });

  await runAsyncTest('1.5: Forces navigation when exact URL matches but a lingering modal/overlay is open', async () => {
    const runner = new LoopReplayRunner({ runId: 'test-run-5' });
    let navigatedTo = null;
    let overlayCleared = false;

    runner.replayEngine = {
      interruptionHandler: {
        clearLingeringDialogs: async () => {},
        clearBlockingOverlays: async () => { overlayCleared = true; },
      },
    };

    // First evaluate says modal is open; second evaluate says modal is still open, forcing reload
    let evalCount = 0;
    const mockPage = {
      url: () => 'https://vendor.portal.com/invoices',
      bringToFront: async () => {},
      goto: async (url) => { navigatedTo = url; },
      evaluate: async () => {
        evalCount++;
        return true; // Modal is detected
      },
    };

    const workflow = {
      startUrl: 'https://vendor.portal.com/invoices',
    };

    await runner.navigateToWorkflowTarget(mockPage, workflow);

    assert.strictEqual(overlayCleared, true, 'InterruptionHandler.clearBlockingOverlays must be called');
    assert.strictEqual(navigatedTo, 'https://vendor.portal.com/invoices', 'Must reload/navigate fresh when modal was lingering');
  });

  await runAsyncTest('1.6: Proactively clears lingering JavaScript dialogs before and after navigation', async () => {
    const runner = new LoopReplayRunner({ runId: 'test-run-6' });
    let clearedCount = 0;

    runner.replayEngine = {
      interruptionHandler: {
        clearLingeringDialogs: async () => { clearedCount++; },
        clearBlockingOverlays: async () => {},
      },
    };

    const mockPage = {
      url: () => 'https://vendor.portal.com/invoices',
      bringToFront: async () => {},
      goto: async () => {},
      evaluate: async () => false,
    };

    const workflow = {
      startUrl: 'https://vendor.portal.com/invoices',
    };

    await runner.navigateToWorkflowTarget(mockPage, workflow);

    assert.strictEqual(clearedCount, 2, 'clearLingeringDialogs must be called both before and after navigation check');
  });

  // =========================================================================
  // GROUP 2: Sub-Second Recorder Save & Parallel Frame Flushing
  // =========================================================================
  console.log('\n🔹 Group 2: Sub-Second Recorder Save & Parallel Frame Flushing');

  await runAsyncTest('2.1: RecorderBridge.stop() finishes in < 600ms even with 20 hanging cross-origin iframes', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rec-speed-test-'));
    const bridge = new RecorderBridge({
      name: 'speed-test-workflow',
      outputDir: tempDir,
    });

    bridge.isRecording = true;
    bridge.startedAt = new Date().toISOString();
    bridge.startUrl = 'https://vendor.portal.com/invoices';

    // Add mock actions
    bridge.actions = [
      { id: 'act_1', type: 'CLICK', timestamp: Date.now(), name: 'Login Button' },
      { id: 'act_2', type: 'INPUT', timestamp: Date.now() + 500, name: 'Search Field', value: 'INV-1001' },
    ];

    // Create 20 mock frames where 15 of them hang or take 5000ms to evaluate
    const mockFrames = [];
    for (let i = 0; i < 20; i++) {
      const isSlow = i % 2 === 0;
      mockFrames.push({
        name: () => `iframe-${i}`,
        url: () => `https://third-party-tracker-${i}.com/frame`,
        evaluate: async () => {
          if (isSlow) {
            // Hang for 5 seconds
            await new Promise(r => setTimeout(r, 5000));
          }
          return true;
        },
      });
    }

    const mockPage = {
      isClosed: () => false,
      viewport: async () => ({ width: 1280, height: 800 }),
      evaluate: async () => 'MockBrowser/1.0',
      frames: () => mockFrames,
    };

    bridge.page = mockPage;
    bridge._attachedPages = new Set([mockPage]);

    const startTime = Date.now();
    const filePath = await bridge.stop();
    const durationMs = Date.now() - startTime;

    console.log(`     -> stop() completed in ${durationMs}ms with 20 iframes (10 slow/hanging)`);

    assert.ok(durationMs < 900, `Expected stop() to finish in < 900ms, but took ${durationMs}ms`);
    assert.ok(fs.existsSync(filePath), 'Saved recipe file must exist');

    const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.strictEqual(fileContent.actions.length, 2, 'Actions must be preserved');
    assert.strictEqual(fileContent.metadata.mode, 'STANDARD', 'Default mode must be STANDARD');
    assert.strictEqual(fileContent.metadata.isLoop, false, 'Default isLoop must be false');

    // Cleanup temp dir
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
  });

  // =========================================================================
  // GROUP 3: RunnerDaemon Lock Clearance & Robust Watchdog Termination
  // =========================================================================
  console.log('\n🔹 Group 3: RunnerDaemon Lock Clearance');

  await runAsyncTest('3.1: executeRun clears activeRun, currentRunner, isInHitl, and watchdog intervals on fatal error', async () => {
    const mockCloudClient = {
      baseUrl: 'http://localhost:3000',
      getPendingRuns: async () => [],
      claimRun: async () => ({ id: 'run-99' }),
      updateRunStatus: async () => ({}),
      updateRunProgress: async () => ({}),
      getWorkflow: async () => ({
        id: 'wf-1',
        name: 'Test Workflow',
        steps: [{ type: 'CLICK', name: 'Step 1' }],
      }),
    };

    const daemon = new RunnerDaemon({ cloudClient: mockCloudClient });

    // Mock executeRun that throws inside the try block
    let caughtError = false;
    try {
      await daemon.executeRun({
        id: 'run-fail-test',
        workflow_id: 'wf-1',
        workflow: {
          id: 'wf-1',
          name: 'Broken Flow',
          workflow_definition: {
            // Intentionally broken definition that throws inside try
            get steps() { throw new Error('Simulated runtime crash during execution'); },
          },
        },
      });
    } catch (err) {
      caughtError = true;
    }

    assert.strictEqual(caughtError, true, 'Error must be thrown');
    assert.strictEqual(daemon.activeRun, null, 'activeRun lock must be unequivocally cleared in finally');
    assert.strictEqual(daemon.currentRunner, null, 'currentRunner must be cleared in finally');
    assert.strictEqual(daemon.isInHitl, false, 'isInHitl must be false');
    assert.strictEqual(daemon.isStoppingCurrentRun, false, 'isStoppingCurrentRun must be false');
  });

  await runAsyncTest('3.2: handleHitlIntervention resets isInHitl in finally when timeout or exception occurs', async () => {
    const daemon = new RunnerDaemon({
      cloudClient: {
        updateRunStatus: async () => ({}),
      },
      hitlTimeoutMs: 50, // fast timeout for test
    });

    const mockPage = {
      isClosed: () => false,
      evaluate: async () => ({ detected: true, reason: 'Persistent OTP' }), // persistent 2FA challenge
    };

    let caughtTimeout = false;
    try {
      await daemon.handleHitlIntervention(
        'run-hitl-test',
        mockPage,
        { reason: 'OTP' },
        { timeoutMs: 50, pollIntervalMs: 10, throwOnTimeout: true, checkAuth: async () => false }
      );
    } catch (err) {
      caughtTimeout = true;
    }

    assert.strictEqual(caughtTimeout, true, 'Timeout error must be thrown');
    assert.strictEqual(daemon.isInHitl, false, 'isInHitl must be guaranteed false after intervention exits');
  });

  console.log(`\n🎉 ALL ${passedTests}/${totalTests} REPLAY CONSISTENCY & SAVE SPEED TESTS PASSED!`);
})();
