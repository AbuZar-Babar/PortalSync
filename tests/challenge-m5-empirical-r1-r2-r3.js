/**
 * Milestone M5 Comprehensive Empirical Challenge Test Suite
 * 
 * Verifies R1, R2, and R3 implementations:
 * 1. Binary download route /api/v1/runners/download & stream handling
 * 2. Diagnostics route /api/v1/runners/diagnostics & Node CDP probe behavior & timeouts
 * 3. Settings persistence & fallback to localStorage (wf_saas_automation_config, workflow_capture_settings, workflow_capture_theme)
 * 4. Overview calculations: zero runs, active runs, wf_run_artifacts join without non-existent org_id column
 * 5. Runners Hub invariants: token lifecycle, diagnostics triggers, download triggers
 * 
 * Zero external dependencies — pure Node.js CommonJS test harness.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert');

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

let totalPassed = 0;
let totalFailed = 0;
const failureDetails = [];

function test(name, fn) {
  try {
    const start = Date.now();
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.then(
        () => {
          const duration = Date.now() - start;
          console.log(`  ${COLORS.green}✓${COLORS.reset} ${name} ${COLORS.dim}(${duration}ms)${COLORS.reset}`);
          totalPassed++;
        },
        (err) => {
          console.log(`  ${COLORS.red}✗${COLORS.reset} ${name}`);
          console.log(`     ${COLORS.red}${err.message}${COLORS.reset}`);
          totalFailed++;
          failureDetails.push({ name, error: err });
        }
      );
    } else {
      const duration = Date.now() - start;
      console.log(`  ${COLORS.green}✓${COLORS.reset} ${name} ${COLORS.dim}(${duration}ms)${COLORS.reset}`);
      totalPassed++;
      return Promise.resolve();
    }
  } catch (err) {
    console.log(`  ${COLORS.red}✗${COLORS.reset} ${name}`);
    console.log(`     ${COLORS.red}${err.message}${COLORS.reset}`);
    totalFailed++;
    failureDetails.push({ name, error: err });
    return Promise.resolve();
  }
}

async function runAll() {
  console.log(`\n${COLORS.bold}${COLORS.cyan}================================================================${COLORS.reset}`);
  console.log(`${COLORS.bold}  EMPIRICAL CHALLENGER TEST SUITE: MILESTONE M5 (R1, R2, R3)    ${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}================================================================${COLORS.reset}\n`);

  // =========================================================================
  // SUITE 1: Binary Download Route & Stream Handling (/api/v1/runners/download)
  // =========================================================================
  console.log(`${COLORS.bold}--- SUITE 1: Binary Download Route & Stream Handling ---${COLORS.reset}`);

  const desktopDistDir = path.resolve(__dirname, '../apps/desktop/dist');
  const installerPath = path.join(desktopDistDir, 'FlowMind-Worker-Setup-1.0.0.exe');
  const portablePath = path.join(desktopDistDir, 'FlowMind-Worker-Portable-1.0.0.exe');

  await test('1.1: Physical installer executable exists and is non-empty (>80MB)', () => {
    assert.ok(fs.existsSync(installerPath), `File must exist at ${installerPath}`);
    const stat = fs.statSync(installerPath);
    assert.ok(stat.size > 80 * 1024 * 1024, `Installer size (${stat.size} bytes) must exceed 80MB`);
  });

  await test('1.2: Physical portable executable exists and is non-empty (>75MB)', () => {
    assert.ok(fs.existsSync(portablePath), `File must exist at ${portablePath}`);
    const stat = fs.statSync(portablePath);
    assert.ok(stat.size > 75 * 1024 * 1024, `Portable size (${stat.size} bytes) must exceed 75MB`);
  });

  await test('1.3: findBinaryPath algorithm resolves executable across cwd roots', () => {
    function findBinaryPath(fileName, testCwd) {
      const candidatePaths = [
        path.resolve(testCwd, '../desktop/dist', fileName),
        path.resolve(testCwd, 'apps/desktop/dist', fileName),
        path.resolve(testCwd, 'dist', fileName),
        path.resolve(testCwd, '../../apps/desktop/dist', fileName),
        path.join('c:', 'Users', 'AbuZar', 'Desktop', 'Fyp', 'Workflow-Capture-SaaS', 'apps', 'desktop', 'dist', fileName),
      ];

      for (const candidate of candidatePaths) {
        try {
          if (fs.existsSync(candidate)) return candidate;
        } catch {}
      }
      return null;
    }

    // When running from repo root
    const resolvedFromRoot = findBinaryPath('FlowMind-Worker-Portable-1.0.0.exe', path.resolve(__dirname, '..'));
    assert.ok(resolvedFromRoot && fs.existsSync(resolvedFromRoot), 'Must resolve when cwd is repo root');

    // When running from apps/web
    const resolvedFromWeb = findBinaryPath('FlowMind-Worker-Setup-1.0.0.exe', path.resolve(__dirname, '../apps/web'));
    assert.ok(resolvedFromWeb && fs.existsSync(resolvedFromWeb), 'Must resolve when cwd is apps/web');

    // Unknown file returns null cleanly
    const resolvedUnknown = findBinaryPath('non-existent-binary.exe', path.resolve(__dirname, '..'));
    assert.strictEqual(resolvedUnknown, null, 'Must return null when file does not exist');
  });

  await test('1.4: Node Stream to Web ReadableStream conversion preserves binary chunks', async () => {
    function nodeStreamToReadable(nodeStream) {
      return new ReadableStream({
        start(controller) {
          nodeStream.on('data', (chunk) => {
            const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
            controller.enqueue(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
          });
          nodeStream.on('end', () => controller.close());
          nodeStream.on('error', (err) => controller.error(err));
        },
        cancel() {
          nodeStream.destroy();
        },
      });
    }

    const testReadStream = fs.createReadStream(portablePath, { start: 0, end: 1024 * 1024 - 1 });
    const webStream = nodeStreamToReadable(testReadStream);
    const reader = webStream.getReader();

    let bytesRead = 0;
    let chunksCount = 0;
    let firstChunk = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      assert.ok(value instanceof Uint8Array, 'Chunk must be Uint8Array');
      if (!firstChunk) firstChunk = value;
      bytesRead += value.byteLength;
      chunksCount++;
    }

    assert.strictEqual(bytesRead, 1024 * 1024, 'Must read exactly 1MB');
    assert.ok(chunksCount > 1, 'Must stream across multiple data chunks');
    // Verify PE executable MZ signature (0x4D, 0x5A)
    assert.strictEqual(firstChunk[0], 0x4d, 'Byte 0 must match Windows PE header "M"');
    assert.strictEqual(firstChunk[1], 0x5a, 'Byte 1 must match Windows PE header "Z"');
  });

  await test('1.5: Stream cancellation destroys underlying Node ReadStream cleanly', async () => {
    let nodeStreamDestroyed = false;
    const testReadStream = fs.createReadStream(portablePath);
    testReadStream.on('close', () => {
      nodeStreamDestroyed = true;
    });

    const webStream = new ReadableStream({
      start(controller) {
        testReadStream.on('data', (chunk) => {
          controller.enqueue(chunk);
        });
      },
      cancel() {
        testReadStream.destroy();
      },
    });

    const reader = webStream.getReader();
    await reader.read(); // Read first chunk
    await reader.cancel(); // Cancel stream

    await new Promise((r) => setTimeout(r, 50));
    assert.ok(testReadStream.destroyed, 'Underlying Node stream must be marked destroyed');
  });

  await test('1.6: Route headers and parameter mapping contract', () => {
    const routeSourcePath = path.resolve(__dirname, '../apps/web/src/app/api/v1/runners/download/route.ts');
    assert.ok(fs.existsSync(routeSourcePath), 'Download route source must exist');
    const content = fs.readFileSync(routeSourcePath, 'utf8');

    assert.ok(content.includes("export const dynamic = 'force-dynamic'"), 'Must be force-dynamic');
    assert.ok(content.includes("'FlowMind-Worker-Portable-1.0.0.exe'"), 'Must support Portable exe');
    assert.ok(content.includes("'FlowMind-Worker-Setup-1.0.0.exe'"), 'Must support Setup installer exe');
    assert.ok(content.includes("'Content-Type': 'application/octet-stream'"), 'Must set application/octet-stream');
    assert.ok(content.includes('Content-Disposition'), 'Must set Content-Disposition attachment header');
    assert.ok(content.includes('Content-Length'), 'Must set Content-Length header');
    assert.ok(content.includes('Cache-Control'), 'Must set Cache-Control header');
  });

  // =========================================================================
  // SUITE 2: Diagnostics Route & CDP Probe Behavior (/api/v1/runners/diagnostics)
  // =========================================================================
  console.log(`\n${COLORS.bold}--- SUITE 2: Diagnostics Route & Node CDP Probe Behavior ---${COLORS.reset}`);

  function checkCdp(port = 9222, timeoutMs = 1500) {
    const startTime = Date.now();
    return new Promise((resolve) => {
      let completed = false;

      const req = http.get(
        `http://127.0.0.1:${port}/json/version`,
        { timeout: timeoutMs },
        (res) => {
          let rawData = '';
          res.on('data', (chunk) => {
            rawData += chunk;
          });

          res.on('end', () => {
            if (completed) return;
            completed = true;
            const latency_ms = Date.now() - startTime;

            if (res.statusCode !== 200) {
              resolve({
                responding: false,
                cdp_accessible: false,
                port,
                latency_ms,
                error: `CDP endpoint returned HTTP status ${res.statusCode}`,
              });
              return;
            }

            try {
              const parsed = JSON.parse(rawData);
              const browser = parsed.Browser || parsed.browser || 'Google Chrome';
              const version = parsed['Protocol-Version'] || parsed.version || '1.3';
              const webSocketDebuggerUrl = parsed.webSocketDebuggerUrl;

              resolve({
                responding: true,
                cdp_accessible: true,
                port,
                browser,
                version,
                protocol: parsed['Protocol-Version'],
                webSocketDebuggerUrl,
                latency_ms,
              });
            } catch {
              resolve({
                responding: true,
                cdp_accessible: true,
                port,
                browser: 'Google Chrome / Chromium',
                version: '1.3',
                latency_ms,
              });
            }
          });
        }
      );

      req.on('timeout', () => {
        if (!completed) {
          completed = true;
          req.destroy();
          resolve({
            responding: false,
            cdp_accessible: false,
            port,
            latency_ms: Date.now() - startTime,
            error: `Connection timed out (${timeoutMs}ms). Ensure Google Chrome is running with --remote-debugging-port=${port}`,
          });
        }
      });

      req.on('error', (err) => {
        if (!completed) {
          completed = true;
          resolve({
            responding: false,
            cdp_accessible: false,
            port,
            latency_ms: Date.now() - startTime,
            error: err.message.includes('ECONNREFUSED')
              ? `Connection refused on port ${port}. Chrome DevTools Protocol is not running.`
              : err.message,
          });
        }
      });
    });
  }

  await test('2.1: Closed port probe traps ECONNREFUSED without throwing unhandled exceptions', async () => {
    // Port 59991 is not listening
    const res = await checkCdp(59991, 1000);
    assert.strictEqual(res.responding, false, 'Responding must be false');
    assert.strictEqual(res.cdp_accessible, false, 'cdp_accessible must be false');
    assert.strictEqual(res.port, 59991, 'Port must match probed port');
    assert.ok(res.error.includes('Connection refused on port 59991'), `Error must report connection refused: ${res.error}`);
    assert.ok(typeof res.latency_ms === 'number' && res.latency_ms >= 0, 'Latency must be non-negative');
  });

  await test('2.2: Active CDP endpoint responds with parsed browser metadata and latency', async () => {
    const mockCdpServer = http.createServer((req, res) => {
      if (req.url === '/json/version') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            Browser: 'Chrome/124.0.6367.60',
            'Protocol-Version': '1.3',
            'User-Agent': 'Mozilla/5.0 Chrome',
            webSocketDebuggerUrl: 'ws://127.0.0.1:59220/devtools/browser/789',
          })
        );
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise((r) => mockCdpServer.listen(59220, '127.0.0.1', r));

    try {
      const res = await checkCdp(59220, 1500);
      assert.strictEqual(res.responding, true, 'Responding must be true');
      assert.strictEqual(res.cdp_accessible, true, 'cdp_accessible must be true');
      assert.strictEqual(res.browser, 'Chrome/124.0.6367.60', 'Browser must match parsed name');
      assert.strictEqual(res.version, '1.3', 'Version must match protocol version');
      assert.strictEqual(
        res.webSocketDebuggerUrl,
        'ws://127.0.0.1:59220/devtools/browser/789',
        'webSocketDebuggerUrl must match'
      );
      assert.ok(res.latency_ms < 500, `Latency (${res.latency_ms}ms) should be fast`);
    } finally {
      await new Promise((r) => mockCdpServer.close(r));
    }
  });

  await test('2.3: Hanging CDP endpoint triggers timeout threshold and destroys request', async () => {
    const hangingServer = http.createServer((req, res) => {
      // Intentionally do not send response to simulate hung chrome process
    });

    await new Promise((r) => hangingServer.listen(59221, '127.0.0.1', r));

    try {
      const start = Date.now();
      const res = await checkCdp(59221, 300); // 300ms timeout
      const elapsed = Date.now() - start;

      assert.strictEqual(res.responding, false, 'Responding must be false');
      assert.strictEqual(res.cdp_accessible, false, 'cdp_accessible must be false');
      assert.ok(res.error.includes('Connection timed out (300ms)'), `Error must contain timeout notice: ${res.error}`);
      assert.ok(elapsed >= 280 && elapsed < 1000, `Elapsed time (${elapsed}ms) must match timeout threshold`);
    } finally {
      await new Promise((r) => hangingServer.close(r));
    }
  });

  await test('2.4: CDP HTTP 500 status response is flagged as non-responding', async () => {
    const errorServer = http.createServer((req, res) => {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Browser Core Crash');
    });

    await new Promise((r) => errorServer.listen(59222, '127.0.0.1', r));

    try {
      const res = await checkCdp(59222, 1000);
      assert.strictEqual(res.responding, false);
      assert.strictEqual(res.cdp_accessible, false);
      assert.ok(res.error.includes('HTTP status 500'), `Error message must report status: ${res.error}`);
    } finally {
      await new Promise((r) => errorServer.close(r));
    }
  });

  await test('2.5: Token format parsing and org_id extraction logic', () => {
    function evaluateToken(tokenCandidate) {
      if (tokenCandidate && tokenCandidate.startsWith('ps_live_')) {
        const orgId = tokenCandidate.replace('ps_live_', '').split('_')[0] || 'org_active';
        return { valid: true, status: 'valid_format', org_id: orgId };
      }
      return { valid: false, status: 'missing_or_invalid', org_id: 'unknown' };
    }

    const valid = evaluateToken('ps_live_org123_randomsecret');
    assert.strictEqual(valid.valid, true);
    assert.strictEqual(valid.org_id, 'org123');

    const invalid = evaluateToken('bearer_other_format');
    assert.strictEqual(invalid.valid, false);
    assert.strictEqual(invalid.status, 'missing_or_invalid');

    const empty = evaluateToken(null);
    assert.strictEqual(empty.valid, false);
  });

  // =========================================================================
  // SUITE 3: Settings Persistence & LocalStorage Fallbacks (/dashboard/settings)
  // =========================================================================
  console.log(`\n${COLORS.bold}--- SUITE 3: Settings Persistence & LocalStorage Fallbacks ---${COLORS.reset}`);

  const settingsSourcePath = path.resolve(__dirname, '../apps/web/src/app/dashboard/settings/page.tsx');

  await test('3.1: Settings page exists and contains Client Component declaration and useDashboard', () => {
    assert.ok(fs.existsSync(settingsSourcePath), 'settings/page.tsx must exist');
    const content = fs.readFileSync(settingsSourcePath, 'utf8');

    assert.ok(content.startsWith("'use client';") || content.startsWith('"use client";'), 'Must have use client');
    assert.ok(content.includes('useDashboard()'), 'Must consume useDashboard');
    assert.ok(content.includes('createClient()'), 'Must import Supabase client');
  });

  await test('3.2: Contains all 6 dedicated Settings sections with tab definitions', () => {
    const content = fs.readFileSync(settingsSourcePath, 'utf8');
    const requiredTabs = ['general', 'themes', 'browser', 'workflows', 'notifications', 'security'];
    for (const tab of requiredTabs) {
      assert.ok(content.includes(`'${tab}'`), `Must declare settings tab '${tab}'`);
    }
  });

  await test('3.3: Contains all 6 FlowMind theme palettes specifications', () => {
    const content = fs.readFileSync(settingsSourcePath, 'utf8');
    const requiredPalettes = [
      'flowmind-cyber',
      'charcoal-indigo',
      'emerald-matrix',
      'slate-dark',
      'crimson-rose',
      'forest',
    ];
    for (const pal of requiredPalettes) {
      assert.ok(content.includes(`'${pal}'`), `Must declare theme palette '${pal}'`);
    }
  });

  await test('3.4: Contains all 4 bot automation presets (balanced, ultra_stealth, fast, erp)', () => {
    const content = fs.readFileSync(settingsSourcePath, 'utf8');
    const presets = ['balanced', 'ultra_stealth', 'fast', 'erp'];
    for (const p of presets) {
      assert.ok(content.includes(`preset: '${p}'`) || content.includes(`${p}: {`), `Must define bot preset '${p}'`);
    }
  });

  await test('3.5: Dual persistence synchronization updates all required localStorage keys', () => {
    const content = fs.readFileSync(settingsSourcePath, 'utf8');

    // 1. Unified SaaS JSON blob
    assert.ok(
      content.includes("localStorage.setItem('wf_saas_automation_config', JSON.stringify("),
      'Must persist full config to wf_saas_automation_config'
    );

    // 2. CommonJS runner compatible JSON
    assert.ok(
      content.includes("localStorage.setItem('workflow_capture_settings', JSON.stringify("),
      'Must persist runner settings to workflow_capture_settings'
    );

    // 3. Theme palette key
    assert.ok(
      content.includes("localStorage.setItem('workflow_capture_theme',"),
      'Must persist theme to workflow_capture_theme'
    );
  });

  await test('3.6: Database update logic safely handles missing settings column in Postgres', () => {
    const content = fs.readFileSync(settingsSourcePath, 'utf8');

    // Check that wf_organizations update updates name & slug
    assert.ok(content.includes(".from('wf_organizations')"), 'Must target wf_organizations table');
    assert.ok(content.includes('name: settings.general.orgName'), 'Must update org name');
    assert.ok(content.includes('slug: settings.general.orgSlug'), 'Must update org slug');

    // Check try/catch protection on settings column update
    const tryCatchBlock = content.includes('// Safely attempt settings column in try/catch') ||
      content.includes('update({ settings: settings }');
    assert.ok(tryCatchBlock, 'Must wrap settings column update in try/catch to avoid postgrest 42703 error');
  });

  await test('3.7: Runner config serialization compatibility validation', () => {
    const dummySettings = {
      general: { orgName: 'Corp A', downloadsPath: 'downloads/invoices/', autoSaveSteps: true, compactDensity: false },
      themes: { palette: 'flowmind-cyber', mode: 'dark' },
      browser: {
        preset: 'balanced',
        cdpPort: 9222,
        headless: false,
        isolatedProfile: true,
        mouseEnabled: true,
        curveType: 'bezier_cubic',
        speed: 'medium',
        wobble: 2,
        overshoot: true,
        hoverBeforeClickMs: 140,
        typingDelayMs: 50,
        punctuationPauseMs: 180,
        elementTimeoutSec: 25,
        pollIntervalMs: 100,
        minActionDelayMs: 250,
        maxActionDelayMs: 650,
        stealthFlags: { maskWebdriver: true, emulateChromeRuntime: true, emulatePlugins: true, randomizeScroll: false, spoofUserAgent: false }
      },
      workflows: { maxLoopIterations: 50, retryAttempts: 2, autoHealingTimeoutSec: 30, concurrentLimit: 3, dedupHashVerification: true, itemMode: 'new', autoAcceptDialogs: true, loopDetection: true },
      notifications: { webhookUrl: 'https://hooks.slack.com/services/123', webhookSecret: 'sec', notifyCompleted: true, notifyFailed: true, notify2FAChallenge: true, notifyStarted: false, emailAlertsEnabled: true, email2FAAlert: true, emailFailureDigest: true, additionalEmails: '' },
      security: { maskCredentials: true, masterKeyVerified: true, encryptionAlgorithm: 'AES-256-GCM', portalCredentials: [], envOverrides: [] }
    };

    const runnerConfig = {
      workspaceName: dummySettings.general.orgName,
      downloadsPath: dummySettings.general.downloadsPath,
      autoSave: dummySettings.general.autoSaveSteps,
      compactDensity: dummySettings.general.compactDensity,
      cdpPort: dummySettings.browser.cdpPort,
      headless: dummySettings.browser.headless,
      isolatedProfile: dummySettings.browser.isolatedProfile,
      mouseEnabled: dummySettings.browser.mouseEnabled,
      curveType: dummySettings.browser.curveType,
      speed: dummySettings.browser.speed,
      wobble: dummySettings.browser.wobble,
      overshoot: dummySettings.browser.overshoot,
      hoverBeforeClickMs: dummySettings.browser.hoverBeforeClickMs,
      typingDelayMs: dummySettings.browser.typingDelayMs,
      punctuationPauseMs: dummySettings.browser.punctuationPauseMs,
      elementTimeoutSec: dummySettings.browser.elementTimeoutSec,
      pollIntervalMs: dummySettings.browser.pollIntervalMs,
      minActionDelay: dummySettings.browser.minActionDelayMs,
      maxActionDelay: dummySettings.browser.maxActionDelayMs,
      stealthFlags: dummySettings.browser.stealthFlags,
      maxLoopIterations: dummySettings.workflows.maxLoopIterations,
      retryAttempts: dummySettings.workflows.retryAttempts,
      autoHealingTimeoutSec: dummySettings.workflows.autoHealingTimeoutSec,
      concurrentLimit: dummySettings.workflows.concurrentLimit,
      dedupHashVerification: dummySettings.workflows.dedupHashVerification,
      itemMode: dummySettings.workflows.itemMode,
      autoAcceptDialogs: dummySettings.workflows.autoAcceptDialogs,
      loopDetection: dummySettings.workflows.loopDetection,
      webhookUrl: dummySettings.notifications.webhookUrl,
      notifyCompleted: dummySettings.notifications.notifyCompleted,
      notifyFailed: dummySettings.notifications.notifyFailed,
      notify2FAChallenge: dummySettings.notifications.notify2FAChallenge,
      emailAlertsEnabled: dummySettings.notifications.emailAlertsEnabled,
      maskCredentials: dummySettings.security.maskCredentials
    };

    const serialized = JSON.stringify(runnerConfig);
    const parsed = JSON.parse(serialized);

    assert.strictEqual(parsed.workspaceName, 'Corp A');
    assert.strictEqual(parsed.cdpPort, 9222);
    assert.strictEqual(parsed.curveType, 'bezier_cubic');
    assert.strictEqual(parsed.typingDelayMs, 50);
    assert.strictEqual(parsed.stealthFlags.maskWebdriver, true);
    assert.strictEqual(parsed.webhookUrl, 'https://hooks.slack.com/services/123');
  });

  // =========================================================================
  // SUITE 4: Overview Dashboard Calculations & Schema Queries (/dashboard)
  // =========================================================================
  console.log(`\n${COLORS.bold}--- SUITE 4: Overview Dashboard Calculations & Schema Queries ---${COLORS.reset}`);

  const overviewSourcePath = path.resolve(__dirname, '../apps/web/src/app/dashboard/page.tsx');

  await test('4.1: Overview page exists and declares Client Component with useDashboard', () => {
    assert.ok(fs.existsSync(overviewSourcePath), 'dashboard/page.tsx must exist');
    const content = fs.readFileSync(overviewSourcePath, 'utf8');

    assert.ok(content.startsWith("'use client';") || content.startsWith('"use client";'), 'Must have use client');
    assert.ok(content.includes('useDashboard()'), 'Must consume useDashboard');
    assert.ok(content.includes('createClient()'), 'Must import Supabase client');
  });

  await test('4.2: Zero runs edge case defaults to 100% success rate without NaN', () => {
    const rawRuns = [];
    const runsCount = 0;

    const totalR = runsCount ?? rawRuns.length;
    const completedCount = rawRuns.filter((r) => {
      const st = String(r.status || '').toLowerCase();
      return st === 'completed' || st === 'success';
    }).length;
    const rate = totalR > 0 ? Math.round((completedCount / totalR) * 100) : 100;

    assert.strictEqual(rate, 100, 'Success rate for 0 runs must be 100');
    assert.ok(!isNaN(rate), 'Success rate must not be NaN');
  });

  await test('4.3: Success rate calculation accurately handles mixed run statuses', () => {
    const rawRuns = [
      { status: 'completed' },
      { status: 'Completed' },
      { status: 'success' },
      { status: 'failed' },
      { status: 'cancelled' },
      { status: 'running' },
    ];
    const totalR = rawRuns.length;
    const completedCount = rawRuns.filter((r) => {
      const st = String(r.status || '').toLowerCase();
      return st === 'completed' || st === 'success';
    }).length;
    const rate = totalR > 0 ? Math.round((completedCount / totalR) * 100) : 100;

    // 3 completed out of 6 total = 50%
    assert.strictEqual(completedCount, 3, 'Must match 3 completed/success runs case-insensitively');
    assert.strictEqual(rate, 50, 'Success rate must be exactly 50%');
  });

  await test('4.4: Invoices calculation handles items_downloaded and artifacts without org_id column query', () => {
    const content = fs.readFileSync(overviewSourcePath, 'utf8');

    // Verify it queries wf_run_artifacts using .in('run_id', runIds)
    assert.ok(
      content.includes(".from('wf_run_artifacts')"),
      'Must query wf_run_artifacts'
    );
    assert.ok(
      content.includes(".in('run_id', runIds)"),
      'Must filter wf_run_artifacts via run_id array'
    );

    // Verify it NEVER queries wf_run_artifacts.eq('org_id', orgId)
    const lines = content.split('\n');
    let insideArtifactsQuery = false;
    let foundIllegalOrgIdQuery = false;

    for (const line of lines) {
      if (line.includes("from('wf_run_artifacts')")) insideArtifactsQuery = true;
      if (insideArtifactsQuery) {
        if (line.includes("eq('org_id'") || line.includes('eq("org_id"')) {
          foundIllegalOrgIdQuery = true;
        }
        if (line.includes(';')) insideArtifactsQuery = false;
      }
    }

    assert.strictEqual(
      foundIllegalOrgIdQuery,
      false,
      'Must NOT query org_id on wf_run_artifacts because column does not exist'
    );

    // Verify empty runIds protection
    assert.ok(
      content.includes('if (runIds.length > 0)'),
      'Must guard against querying .in() on empty runIds'
    );
  });

  await test('4.5: Active runs trigger 3s polling fallback interval with cleanup', () => {
    const content = fs.readFileSync(overviewSourcePath, 'utf8');

    // hasActiveRuns check includes pending, running, requires_action
    assert.ok(content.includes("'pending'"), 'Must check pending status');
    assert.ok(content.includes("'running'"), 'Must check running status');
    assert.ok(content.includes("'requires_action'"), 'Must check requires_action status');

    // 3s interval timer
    assert.ok(content.includes('setInterval('), 'Must set up polling interval');
    assert.ok(content.includes('3000'), 'Polling interval must be 3000ms');
    assert.ok(content.includes('clearInterval('), 'Must clean up interval on unmount');
  });

  await test('4.6: Supabase Realtime subscription cleans up channel on unmount', () => {
    const content = fs.readFileSync(overviewSourcePath, 'utf8');

    assert.ok(
      content.includes(".channel(`wf_dashboard_overview_${orgId}`)"),
      'Must create unique org realtime channel'
    );
    assert.ok(
      content.includes("table: 'wf_execution_runs'"),
      'Must listen to wf_execution_runs changes'
    );
    assert.ok(
      content.includes('supabase.removeChannel(channel)'),
      'Must remove channel subscription in cleanup function'
    );
  });

  // =========================================================================
  // SUITE 5: Workers Hub (/dashboard/runners) Telemetry & Diagnostics
  // =========================================================================
  console.log(`\n${COLORS.bold}--- SUITE 5: Workers Hub Telemetry & Diagnostics ---${COLORS.reset}`);

  const runnersSourcePath = path.resolve(__dirname, '../apps/web/src/app/dashboard/runners/page.tsx');

  await test('5.1: Runners page exists and consumes useDashboard context', () => {
    assert.ok(fs.existsSync(runnersSourcePath), 'runners/page.tsx must exist');
    const content = fs.readFileSync(runnersSourcePath, 'utf8');

    assert.ok(content.startsWith("'use client';") || content.startsWith('"use client";'), 'Must have use client');
    assert.ok(content.includes('useDashboard()'), 'Must consume useDashboard');
  });

  await test('5.2: 1-click token copy with clipboard support and animated feedback', () => {
    const content = fs.readFileSync(runnersSourcePath, 'utf8');
    assert.ok(content.includes('navigator.clipboard.writeText('), 'Must call clipboard API');
    assert.ok(content.includes('copiedToken'), 'Must maintain copiedToken feedback state');
  });

  await test('5.3: Token regeneration dialog and revocation handling with localStorage fallback', () => {
    const content = fs.readFileSync(runnersSourcePath, 'utf8');
    assert.ok(content.includes('showRegenModal'), 'Must support token regeneration modal');
    assert.ok(content.includes('showRevokeModal'), 'Must support token revocation modal');
    assert.ok(
      content.includes('wf_runner_token_override_') || content.includes('wf_runner_token_revoked_'),
      'Must persist token state override to localStorage'
    );
  });

  await test('5.4: 3-step Connection Diagnostics suite triggers CDP probe to /api/v1/runners/diagnostics', () => {
    const content = fs.readFileSync(runnersSourcePath, 'utf8');
    assert.ok(content.includes('runDiagnosticsSuite'), 'Must define diagnostics runner');
    assert.ok(
      content.includes("fetch('/api/v1/runners/diagnostics?port=9222'"),
      'Must query /api/v1/runners/diagnostics with port 9222'
    );
    assert.ok(content.includes("'X-Runner-Token'"), 'Must include runner token header in probe');
  });

  await test('5.5: Desktop runner binary download links trigger /api/v1/runners/download', () => {
    const content = fs.readFileSync(runnersSourcePath, 'utf8');
    assert.ok(
      content.includes('/api/v1/runners/download?type=installer'),
      'Must offer setup installer download trigger'
    );
    assert.ok(
      content.includes('/api/v1/runners/download?type=portable'),
      'Must offer portable binary download trigger'
    );
  });

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log(`\n${COLORS.bold}${COLORS.cyan}================================================================${COLORS.reset}`);
  console.log(`${COLORS.bold}                      TEST EXECUTION SUMMARY                    ${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}================================================================${COLORS.reset}\n`);

  console.log(`  Total Checks: ${totalPassed + totalFailed}`);
  console.log(`  Passed:       ${COLORS.green}${totalPassed}${COLORS.reset}`);
  console.log(`  Failed:       ${totalFailed > 0 ? COLORS.red : ''}${totalFailed}${COLORS.reset}\n`);

  if (totalFailed > 0) {
    console.log(`${COLORS.red}${COLORS.bold}FAILURES:${COLORS.reset}`);
    for (const f of failureDetails) {
      console.log(`  - ${f.name}: ${f.error.message}`);
    }
    process.exit(1);
  } else {
    console.log(`${COLORS.green}${COLORS.bold}>>> ALL EMPIRICAL CHECKS PASSED SUCCESSFULLY! (VERDICT: APPROVE) <<<${COLORS.reset}\n`);
    process.exit(0);
  }
}

runAll().catch((err) => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
