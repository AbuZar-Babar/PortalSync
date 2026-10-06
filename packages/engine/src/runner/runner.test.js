/**
 * Automated Test Suite for Desktop Runner Cloud Bridge Client & Daemon
 * packages/engine/src/runner/
 * 
 * Uses Node.js native test runner (node:test) and assertions (node:assert).
 * Zero external dependencies.
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

const { CloudClient, CloudClientError } = require('./cloud-client');
const { computeSha256, getFileChecksum, ArtifactTracker } = require('./dedup-helper');
const { detect2FAChallenge, waitFor2FAResolution } = require('./hitl-detector');
const { RunnerDaemon, checkCdpResponding } = require('./runner-daemon');
const { parseCliArgs } = require('./cli');

// ==========================================
// 1. CloudClient Tests
// ==========================================
test('CloudClient - configuration and header generation', () => {
  const client = new CloudClient({
    baseUrl: 'http://example.com/api///',
    token: 'ps_live_test_org_123',
    timeoutMs: 5000,
  });

  assert.strictEqual(client.baseUrl, 'http://example.com/api');
  assert.strictEqual(client.token, 'ps_live_test_org_123');

  const headers = client._getHeaders();
  assert.strictEqual(headers['Authorization'], 'Bearer ps_live_test_org_123');
  assert.strictEqual(headers['x-runner-token'], 'ps_live_test_org_123');
  assert.strictEqual(headers['Content-Type'], 'application/json');
});

test('CloudClient - getPendingRuns', async () => {
  let calledUrl = '';
  let calledHeaders = {};

  const mockFetch = async (url, options) => {
    calledUrl = url;
    calledHeaders = options.headers;
    return {
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({
        runs: [
          { id: 'run_1', workflow_id: 'wf_1', status: 'pending' },
          { id: 'run_2', workflow_id: 'wf_2', status: 'pending' }
        ]
      })
    };
  };

  const client = new CloudClient({
    baseUrl: 'http://localhost:3000',
    token: 'ps_live_org_abc',
    fetch: mockFetch
  });

  const runs = await client.getPendingRuns();
  assert.strictEqual(calledUrl, 'http://localhost:3000/api/v1/runs?status=pending');
  assert.strictEqual(calledHeaders['Authorization'], 'Bearer ps_live_org_abc');
  assert.strictEqual(runs.length, 2);
  assert.strictEqual(runs[0].id, 'run_1');
});

test('CloudClient - claimRun (pending -> running)', async () => {
  let requestMethod = '';
  let requestBody = null;

  const mockFetch = async (url, options) => {
    requestMethod = options.method;
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ run: { id: requestBody.run_id, status: 'running' } })
    };
  };

  const client = new CloudClient({
    baseUrl: 'http://localhost:3000',
    token: 'ps_live_org_abc',
    fetch: mockFetch
  });

  const run = await client.claimRun('run_99');
  assert.strictEqual(requestMethod, 'PATCH');
  assert.strictEqual(requestBody.run_id, 'run_99');
  assert.strictEqual(requestBody.status, 'running');
  assert.strictEqual(run.status, 'running');
});

test('CloudClient - updateRunProgress and updateRunStatus', async () => {
  const requests = [];

  const mockFetch = async (url, options) => {
    requests.push({ url, method: options.method, body: JSON.parse(options.body) });
    return {
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: true })
    };
  };

  const client = new CloudClient({
    baseUrl: 'http://localhost:3000',
    token: 'ps_live_org_abc',
    fetch: mockFetch
  });

  await client.updateRunProgress('run_123', { items_processed: 5, items_downloaded: 3 });
  await client.updateRunStatus('run_123', 'requires_action', { error_summary: '2FA challenge' });
  await client.updateRunStatus('run_123', 'completed', { completed_at: '2026-10-06T13:00:00Z' });

  assert.strictEqual(requests.length, 3);
  assert.strictEqual(requests[0].body.items_processed, 5);
  assert.strictEqual(requests[0].body.items_downloaded, 3);
  assert.strictEqual(requests[1].body.status, 'requires_action');
  assert.strictEqual(requests[1].body.error_summary, '2FA challenge');
  assert.strictEqual(requests[2].body.status, 'completed');
  assert.strictEqual(requests[2].body.completed_at, '2026-10-06T13:00:00Z');
});

test('CloudClient - registerArtifact', async () => {
  let artifactPayload = null;

  const mockFetch = async (url, options) => {
    artifactPayload = JSON.parse(options.body);
    return {
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ artifact: { id: 'art_1', ...artifactPayload } })
    };
  };

  const client = new CloudClient({
    baseUrl: 'http://localhost:3000',
    token: 'ps_live_org_abc',
    fetch: mockFetch
  });

  const artifact = await client.registerArtifact('run_123', {
    file_name: 'invoice_1001.pdf',
    file_size_bytes: 45012,
    sha256_hash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    storage_path: '/downloads/invoice_1001.pdf',
    item_metadata: { invoiceNo: 'INV-1001' }
  });

  assert.strictEqual(artifactPayload.run_id, 'run_123');
  assert.strictEqual(artifactPayload.file_name, 'invoice_1001.pdf');
  assert.strictEqual(artifactPayload.sha256_hash, 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
  assert.strictEqual(artifactPayload.file_size_bytes, 45012);
  assert.strictEqual(artifact.id, 'art_1');
});

test('CloudClient - getWorkflow', async () => {
  const mockFetch = async (url) => {
    return {
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({
        workflows: [
          { id: 'wf_alpha', name: 'Alpha Portal', portal_url: 'https://alpha.example.com' },
          { id: 'wf_beta', name: 'Beta Portal', portal_url: 'https://beta.example.com' }
        ]
      })
    };
  };

  const client = new CloudClient({
    baseUrl: 'http://localhost:3000',
    token: 'ps_live_org_abc',
    fetch: mockFetch
  });

  const wf = await client.getWorkflow('wf_beta');
  assert.strictEqual(wf.id, 'wf_beta');
  assert.strictEqual(wf.name, 'Beta Portal');
});

test('CloudClient - handles 401 Unauthorized cleanly', async () => {
  const mockFetch = async () => {
    return {
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: { get: () => 'application/json' },
      json: async () => ({ error: 'Invalid runner token' })
    };
  };

  const client = new CloudClient({
    baseUrl: 'http://localhost:3000',
    token: 'ps_live_invalid',
    fetch: mockFetch
  });

  await assert.rejects(
    async () => await client.getPendingRuns(),
    (err) => {
      assert(err instanceof CloudClientError);
      assert.strictEqual(err.status, 401);
      assert(err.message.includes('Invalid runner token'));
      return true;
    }
  );
});

// ==========================================
// 2. SHA-256 Deduplication & Artifact Storage Tests
// ==========================================
test('ArtifactTracker - computeSha256 and zero duplicates guarantee', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-test-'));
  const testFile1 = path.join(tmpDir, 'inv1.pdf');
  const testFile2 = path.join(tmpDir, 'inv2.pdf'); // same content
  const testFile3 = path.join(tmpDir, 'inv3.pdf'); // different content

  fs.writeFileSync(testFile1, 'INVOICE CONTENT ABC 123');
  fs.writeFileSync(testFile2, 'INVOICE CONTENT ABC 123');
  fs.writeFileSync(testFile3, 'DIFFERENT INVOICE CONTENT XYZ');

  const hash1 = computeSha256(testFile1);
  const hash2 = computeSha256(testFile2);
  const hash3 = computeSha256(testFile3);

  assert.strictEqual(hash1, hash2, 'Identical contents must have identical SHA-256');
  assert.notStrictEqual(hash1, hash3, 'Different contents must have distinct SHA-256');

  const tracker = new ArtifactTracker();
  const targetDir = path.join(tmpDir, 'target');

  // Process first file
  const res1 = tracker.processAndSaveArtifact(testFile1, targetDir);
  assert.strictEqual(res1.isDuplicate, false);
  assert.strictEqual(res1.hash, hash1);
  assert(fs.existsSync(res1.targetPath));

  // Process second file (same content) -> zero duplicates guarantee must flag duplicate
  const res2 = tracker.processAndSaveArtifact(testFile2, targetDir);
  assert.strictEqual(res2.isDuplicate, true);
  assert.strictEqual(res2.hash, hash1);

  // Process third file (different content)
  const res3 = tracker.processAndSaveArtifact(testFile3, targetDir);
  assert.strictEqual(res3.isDuplicate, false);
  assert.strictEqual(res3.hash, hash3);

  // Clean up
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('ArtifactTracker - filename collision with different content gets unique suffix', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-test-collision-'));
  const targetDir = path.join(tmpDir, 'target');
  fs.mkdirSync(targetDir, { recursive: true });

  // Existing file at destination named invoice.pdf
  fs.writeFileSync(path.join(targetDir, 'invoice.pdf'), 'EXISTING CONTENT');

  // New file also named invoice.pdf, but DIFFERENT content
  const newSource = path.join(tmpDir, 'invoice.pdf');
  fs.writeFileSync(newSource, 'BRAND NEW DIFFERENT INVOICE CONTENT');

  const tracker = new ArtifactTracker();
  const res = tracker.processAndSaveArtifact(newSource, targetDir);

  assert.strictEqual(res.isDuplicate, false);
  assert.notStrictEqual(res.fileName, 'invoice.pdf');
  assert(res.fileName.startsWith('invoice_'));
  assert(res.fileName.endsWith('.pdf'));
  assert(fs.existsSync(res.targetPath));

  // Clean up
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('ArtifactTracker - scanDirectory ignores transient .tmp and .crdownload files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-test-scan-'));
  fs.writeFileSync(path.join(tmpDir, 'invoice.pdf'), 'PDF data');
  fs.writeFileSync(path.join(tmpDir, 'download.crdownload'), 'incomplete download');
  fs.writeFileSync(path.join(tmpDir, 'file.tmp'), 'temp data');
  fs.writeFileSync(path.join(tmpDir, '.hidden'), 'hidden data');

  const tracker = new ArtifactTracker();
  const files = tracker.scanDirectory(tmpDir);

  assert.strictEqual(files.length, 1);
  assert.strictEqual(files[0].fileName, 'invoice.pdf');

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ==========================================
// 3. HITL 2FA Detection Tests
// ==========================================
test('HITL 2FA - detects 2FA selectors on mock page', async () => {
  const mockPageWithOtp = {
    evaluate: async (fn, selectors, patterns) => {
      // Simulate DOM evaluation matching an OTP input
      return {
        detected: true,
        reason: 'Matched 2FA element selector: input[autocomplete="one-time-code"]',
        selector: 'input[autocomplete="one-time-code"]',
        url: 'https://portal.example.com/login/mfa'
      };
    }
  };

  const challenge = await detect2FAChallenge(mockPageWithOtp);
  assert.strictEqual(challenge.detected, true);
  assert(challenge.reason.includes('one-time-code'));
});

test('HITL 2FA - detect2FAChallenge returns false on standard page', async () => {
  const mockPageStandard = {
    evaluate: async () => ({ detected: false })
  };

  const challenge = await detect2FAChallenge(mockPageStandard);
  assert.strictEqual(challenge.detected, false);
});

test('HITL 2FA - waitFor2FAResolution resolves early when challenge clears', async () => {
  let checkCount = 0;
  const mockPage = {
    evaluate: async () => {
      checkCount++;
      // After 2 checks, challenge disappears
      return { detected: checkCount < 2 };
    }
  };

  const ticks = [];
  const result = await waitFor2FAResolution(mockPage, {
    timeoutMs: 3000,
    pollIntervalMs: 50,
    onTick: (sec) => ticks.push(sec)
  });

  assert.strictEqual(result.resolved, true);
  assert.strictEqual(result.timedOut, false);
  assert(ticks.length > 0);
});

test('HITL 2FA - waitFor2FAResolution times out if challenge remains active', async () => {
  const mockPage = {
    evaluate: async () => ({ detected: true, reason: 'Persistent MFA' })
  };

  const result = await waitFor2FAResolution(mockPage, {
    timeoutMs: 150,
    pollIntervalMs: 30
  });

  assert.strictEqual(result.resolved, false);
  assert.strictEqual(result.timedOut, true);
});

// ==========================================
// 4. RunnerDaemon Tests
// ==========================================
test('checkCdpResponding - returns true when port 9222 responds with 200', async () => {
  // Spawn a temporary mock HTTP server on an ephemeral port
  const server = http.createServer((req, res) => {
    if (req.url === '/json/version') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        Browser: 'Chrome/128.0.0.0',
        webSocketDebuggerUrl: 'ws://127.0.0.1:9999/devtools/browser/abc'
      }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const testPort = server.address().port;

  try {
    const res = await checkCdpResponding(testPort, '127.0.0.1');
    assert.strictEqual(res.responding, true);
    assert.strictEqual(res.data.Browser, 'Chrome/128.0.0.0');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('checkCdpResponding - returns false when port is closed', async () => {
  // Probe port 65432 which is unlikely to have a service listening
  const res = await checkCdpResponding(65432, '127.0.0.1', 200);
  assert.strictEqual(res.responding, false);
});

test('RunnerDaemon - pollOnce claims run and executes', async () => {
  let claimedId = '';
  let updatedStatus = '';

  const mockClient = {
    getPendingRuns: async () => [{ id: 'run_test_1', workflow_id: 'wf_alpha' }],
    claimRun: async (id) => {
      claimedId = id;
      return { id, workflow_id: 'wf_alpha', status: 'running' };
    },
    getWorkflow: async (wfId) => ({
      id: wfId,
      name: 'Test Workflow',
      portal_url: 'http://example.com'
    }),
    updateRunProgress: async () => ({}),
    updateRunStatus: async (id, status) => {
      updatedStatus = status;
      return {};
    },
    registerArtifact: async () => ({})
  };

  const daemon = new RunnerDaemon({
    cloudClient: mockClient,
    cdpPort: 9222,
    logger: { info: () => {}, warn: () => {}, error: () => {}, success: () => {} }
  });

  // Mock executeRun so we don't need live Chrome in unit test
  let executedRunId = '';
  daemon.executeRun = async (run) => {
    executedRunId = run.id;
    return { success: true, runId: run.id };
  };

  await daemon.pollOnce();
  assert.strictEqual(claimedId, 'run_test_1');
  assert.strictEqual(executedRunId, 'run_test_1');
});

// ==========================================
// 5. CLI Argument Parsing Tests
// ==========================================
test('CLI - parseCliArgs extracts commands and flags correctly', () => {
  const parsed1 = parseCliArgs(['doctor', '--port', '9333', '--cloud-url', 'http://cloud.test', '--token', 'ps_live_abc']);
  assert.strictEqual(parsed1.command, 'doctor');
  assert.strictEqual(parsed1.options.port, 9333);
  assert.strictEqual(parsed1.options.cloudUrl, 'http://cloud.test');
  assert.strictEqual(parsed1.options.token, 'ps_live_abc');

  const parsed2 = parseCliArgs(['doctor', '--help']);
  assert.strictEqual(parsed2.command, 'doctor');
  assert.strictEqual(parsed2.options.help, true);

  const parsed3 = parseCliArgs(['listen', '-i', '15', '-d', './custom_downloads']);
  assert.strictEqual(parsed3.command, 'listen');
  assert.strictEqual(parsed3.options.pollInterval, 15);
  assert.strictEqual(parsed3.options.targetFolder, './custom_downloads');

  const parsed4 = parseCliArgs(['run', 'wf_special_99']);
  assert.strictEqual(parsed4.command, 'run');
  assert.strictEqual(parsed4.positional[0], 'wf_special_99');
});

// ==========================================
// 6. Adversarial Stress & Integrity Tests
// ==========================================
test('Adversarial - claimRun handles 409 Conflict race condition gracefully', async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 409,
    statusText: 'Conflict',
    headers: { get: () => 'application/json' },
    json: async () => ({ error: 'Run already claimed by another runner' })
  });

  const client = new CloudClient({
    baseUrl: 'http://localhost:3000',
    token: 'ps_live_runner_2',
    fetch: mockFetch
  });

  await assert.rejects(
    async () => await client.claimRun('run_contested'),
    (err) => {
      assert(err instanceof CloudClientError);
      assert.strictEqual(err.status, 409);
      assert(err.message.includes('Run already claimed'));
      return true;
    }
  );
});

test('Adversarial - handleHitlIntervention updates cloud to requires_action and fails on 90s timeout', async () => {
  const statusTransitions = [];

  const mockClient = {
    updateRunStatus: async (runId, status, extra) => {
      statusTransitions.push({ runId, status, extra });
      return {};
    }
  };

  const daemon = new RunnerDaemon({
    cloudClient: mockClient,
    hitlTimeoutMs: 100, // Short timeout for test
    logger: { info: () => {}, warn: () => {}, error: () => {}, success: () => {} }
  });

  const mockPageChallenged = {
    evaluate: async () => ({
      detected: true,
      reason: '2FA challenge: enter 6-digit code'
    })
  };

  let caughtError = null;
  try {
    await daemon.handleHitlIntervention('run_hitl_test', mockPageChallenged, {
      detected: true,
      reason: '2FA challenge'
    });
  } catch (err) {
    caughtError = err;
  }

  assert(caughtError !== null);
  assert(caughtError.message.includes('2FA timeout'));
  assert.strictEqual(statusTransitions.length, 2);
  assert.strictEqual(statusTransitions[0].status, 'requires_action');
  assert.strictEqual(statusTransitions[1].status, 'failed');
  assert(statusTransitions[1].extra.error_summary.includes('2FA timeout'));
});

test('Adversarial - Multi-batch deduplication never re-registers duplicate files', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-dedup-multibatch-'));
  const targetDir = path.join(tmpDir, 'downloads');
  fs.mkdirSync(targetDir, { recursive: true });

  const tracker = new ArtifactTracker();

  // Create three files, two have identical content
  const f1 = path.join(tmpDir, 'invoice_jan.pdf');
  const f2 = path.join(tmpDir, 'invoice_jan_copy.pdf'); // same content
  const f3 = path.join(tmpDir, 'invoice_feb.pdf'); // distinct content

  fs.writeFileSync(f1, 'INVOICE JAN 2026 $500');
  fs.writeFileSync(f2, 'INVOICE JAN 2026 $500');
  fs.writeFileSync(f3, 'INVOICE FEB 2026 $750');

  const registeredHashes = [];

  for (const f of [f1, f2, f3, f1, f2]) {
    const res = tracker.processAndSaveArtifact(f, targetDir);
    if (!res.isDuplicate) {
      registeredHashes.push(res.hash);
    }
  }

  // Only two unique hashes must be registered out of 5 attempts
  assert.strictEqual(registeredHashes.length, 2);
  assert.strictEqual(new Set(registeredHashes).size, 2);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

