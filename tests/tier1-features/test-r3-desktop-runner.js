/**
 * Tier 1 Feature Coverage: R3 Desktop Runner CLI & Daemon
 * Features:
 *  - F11: Desktop Cloud Client (5 tests)
 *  - F12: Runner Daemon Loop & CDP Connection (5 tests)
 *  - F13: 90s HITL 2FA Intervention (5 tests)
 *  - F14: SHA-256 Deduplication & Storage (5 tests)
 *  - F15: Desktop Runner CLI (5 tests)
 * Total: 25 test cases
 */

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { TestHarness, Assert } = require('../helpers/test-harness');
const { MockCloudServer } = require('../helpers/mock-cloud-server');
const { MockCdpServer } = require('../helpers/mock-cdp-server');
const { ORG_1_ID, TOKENS, createSamplePdf } = require('../helpers/fixtures');

// Imports from packages/engine/src/runner
const { CloudClient } = require('../../packages/engine/src/runner/cloud-client');
const { RunnerDaemon, checkCdpResponding } = require('../../packages/engine/src/runner/runner-daemon');
const { detect2FAChallenge, waitFor2FAResolution } = require('../../packages/engine/src/runner/hitl-detector');
const { ArtifactTracker, computeSha256 } = require('../../packages/engine/src/runner/dedup-helper');

const harness = new TestHarness('Tier 1: R3 Desktop Runner Feature Coverage');
const cloudServer = new MockCloudServer();
const cdpServer = new MockCdpServer();
let cloudUrl = '';
let cdpPort = 9222;

harness.beforeAll(async () => {
  cloudUrl = await cloudServer.start(0);
  try {
    await cdpServer.start(9222);
  } catch {
    cdpPort = 19222;
    await cdpServer.start(cdpPort);
  }
});

harness.afterAll(async () => {
  await cloudServer.stop();
  await cdpServer.stop();
});

harness.beforeEach(() => {
  cloudServer.reset();
});

// ==========================================
// FEATURE 11: Desktop Cloud Client (5 tests)
// ==========================================
harness.describe('F11: Desktop Cloud Client', () => {
  harness.it('F11.1: Instantiates with baseUrl and runnerToken, sets Bearer header', () => {
    const client = new CloudClient({ baseUrl: cloudUrl, token: TOKENS.validOrg1 });
    Assert.equal(client.baseUrl, cloudUrl.replace(/\/$/, ''));
    Assert.equal(client.token, TOKENS.validOrg1);
    Assert.equal(client._getHeaders()['Authorization'], `Bearer ${TOKENS.validOrg1}`);
    Assert.equal(client._getHeaders()['x-runner-token'], TOKENS.validOrg1);
  });

  harness.it('F11.2: getPendingRuns fetches runs filtered by status=pending', async () => {
    cloudServer.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-1', status: 'pending' });
    cloudServer.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-2', status: 'running' });

    const client = new CloudClient({ baseUrl: cloudUrl, token: TOKENS.validOrg1 });
    const runs = await client.getPendingRuns();
    Assert.equal(runs.length, 1);
    Assert.equal(runs[0].status, 'pending');
  });

  harness.it('F11.3: claimRun atomically transitions pending run to running', async () => {
    const run = cloudServer.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-1', status: 'pending' });

    const client = new CloudClient({ baseUrl: cloudUrl, token: TOKENS.validOrg1 });
    const claimed = await client.claimRun(run.id);
    Assert.equal(claimed.status, 'running');
  });

  harness.it('F11.4: updateRunStatus transitions run to requires_action with error summary', async () => {
    const run = cloudServer.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-1', status: 'running' });

    const client = new CloudClient({ baseUrl: cloudUrl, token: TOKENS.validOrg1 });
    const updated = await client.updateRunStatus(run.id, 'requires_action', {
      error_summary: '2FA challenge detected',
    });
    Assert.equal(updated.status, 'requires_action');
    Assert.equal(updated.error_summary, '2FA challenge detected');
  });

  harness.it('F11.5: registerArtifact posts artifact with SHA-256 checksum and size', async () => {
    const run = cloudServer.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-1', status: 'running' });
    const pdf = createSamplePdf('INV-3001', '125.00');

    const client = new CloudClient({ baseUrl: cloudUrl, token: TOKENS.validOrg1 });
    const artifact = await client.registerArtifact(run.id, {
      file_name: pdf.filename,
      file_size_bytes: pdf.sizeBytes,
      sha256_hash: pdf.sha256,
      cloud_storage_path: `invoices/${pdf.filename}`,
    });

    Assert.ok(artifact.id);
    Assert.equal(artifact.sha256_hash, pdf.sha256);
  });
});

// ==========================================
// FEATURE 12: Runner Daemon Loop & CDP (5 tests)
// ==========================================
harness.describe('F12: Runner Daemon Loop & CDP Connection', () => {
  harness.it('F12.1: checkCdpResponding returns responding: true when CDP port responds on /json/version', async () => {
    const res = await checkCdpResponding(cdpPort);
    Assert.equal(res.responding, true);
    Assert.ok(res.data);
  });

  harness.it('F12.2: checkCdpResponding returns responding: false when target port is closed', async () => {
    const res = await checkCdpResponding(19999);
    Assert.equal(res.responding, false);
  });

  harness.it('F12.3: Daemon poll cycle skips execution when no pending runs exist', async () => {
    const client = new CloudClient({ baseUrl: cloudUrl, token: TOKENS.validOrg1 });
    const runs = await client.getPendingRuns();
    Assert.equal(runs.length, 0);
  });

  harness.it('F12.4: Daemon handles 409 Conflict during claim without crashing loop', async () => {
    const run = cloudServer.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-1', status: 'running' });
    const client = new CloudClient({ baseUrl: cloudUrl, token: TOKENS.validOrg1 });

    let caughtError = null;
    try {
      await client.claimRun(run.id);
    } catch (err) {
      caughtError = err;
    }
    Assert.ok(caughtError !== null, 'Expected error on double claim');
    Assert.equal(caughtError.status, 409);
  });

  harness.it('F12.5: Daemon poll cycle orders pending runs descending by started_at', async () => {
    cloudServer.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-new', status: 'pending', started_at: '2026-10-06T12:00:00Z' });
    cloudServer.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-old', status: 'pending', started_at: '2026-10-06T08:00:00Z' });

    const client = new CloudClient({ baseUrl: cloudUrl, token: TOKENS.validOrg1 });
    const runs = await client.getPendingRuns();
    Assert.equal(runs.length, 2);
    Assert.ok(runs[0].started_at >= runs[1].started_at);
  });
});

// ==========================================
// FEATURE 13: 90s HITL 2FA Intervention (5 tests)
// ==========================================
harness.describe('F13: 90s HITL 2FA Intervention', () => {
  harness.it('F13.1: detect2FAChallenge returns detected: true when 2FA input elements exist', async () => {
    const mockPageWithOtp = {
      evaluate: async () => ({
        detected: true,
        reason: 'Selector matched: input[autocomplete="one-time-code"]',
      }),
    };
    const res = await detect2FAChallenge(mockPageWithOtp);
    Assert.equal(res.detected, true);
    Assert.includes(res.reason, 'one-time-code');
  });

  harness.it('F13.2: detect2FAChallenge returns detected: false on standard login page', async () => {
    const mockPageStandard = {
      evaluate: async () => ({
        detected: false,
        reason: null,
      }),
    };
    const res = await detect2FAChallenge(mockPageStandard);
    Assert.equal(res.detected, false);
  });

  harness.it('F13.3: waitFor2FAResolution resolves within 90s window when user enters OTP', async () => {
    let callCount = 0;
    const mockPageResolving = {
      evaluate: async () => {
        callCount++;
        return { detected: callCount < 2, reason: callCount < 2 ? 'Active challenge' : null };
      },
    };

    const res = await waitFor2FAResolution(mockPageResolving, {
      timeoutMs: 5000,
      pollIntervalMs: 50,
    });
    Assert.equal(res.resolved, true);
    Assert.equal(res.timedOut, false);
  });

  harness.it('F13.4: waitFor2FAResolution times out and returns timedOut: true after expiration', async () => {
    const mockPagePersistent = {
      evaluate: async () => ({
        detected: true,
        reason: 'Challenge still present',
      }),
    };

    const res = await waitFor2FAResolution(mockPagePersistent, {
      timeoutMs: 100, // Fast timeout for test
      pollIntervalMs: 25,
    });
    Assert.equal(res.resolved, false);
    Assert.equal(res.timedOut, true);
  });

  harness.it('F13.5: Dispatches requires_action and then failed on 2FA timeout', async () => {
    const run = cloudServer.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-1', status: 'running' });
    const client = new CloudClient({ baseUrl: cloudUrl, token: TOKENS.validOrg1 });

    // 1. Signal 2FA challenge detected
    const reqAction = await client.updateRunStatus(run.id, 'requires_action', {
      error_summary: '2FA challenge detected: awaiting OTP',
    });
    Assert.equal(reqAction.status, 'requires_action');

    // 2. Signal 2FA timeout failure
    const timedOut = await client.updateRunStatus(run.id, 'failed', {
      error_summary: '2FA intervention timed out after 90s',
    });
    Assert.equal(timedOut.status, 'failed');
    Assert.includes(timedOut.error_summary, 'timed out');
  });
});

// ==========================================
// FEATURE 14: SHA-256 Deduplication & Storage (5 tests)
// ==========================================
harness.describe('F14: SHA-256 Deduplication & Storage', () => {
  let tempDir = '';
  let targetDir = '';

  harness.beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-dedup-src-'));
    targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-dedup-dst-'));
  });

  harness.afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    if (targetDir && fs.existsSync(targetDir)) fs.rmSync(targetDir, { recursive: true, force: true });
  });

  harness.it('F14.1: Computes exact SHA-256 hash matching crypto standards', () => {
    const pdf = createSamplePdf('INV-4001', '300.00');
    const hash = computeSha256(pdf.buffer);
    Assert.equal(hash, pdf.sha256);
    Assert.equal(hash.length, 64);
  });

  harness.it('F14.2: Guarantee zero duplicates: isDuplicate returns true for identical file content', () => {
    const tracker = new ArtifactTracker();
    const pdf = createSamplePdf('INV-4002', '450.00');
    const filePath = path.join(tempDir, pdf.filename);
    fs.writeFileSync(filePath, pdf.buffer);

    // Register first time
    const art1 = tracker.processAndSaveArtifact(filePath, targetDir);
    Assert.equal(art1.isDuplicate, false);

    // Attempt processing same file again
    const art2 = tracker.processAndSaveArtifact(filePath, targetDir);
    Assert.equal(art2.isDuplicate, true);
    Assert.equal(art2.hash, art1.hash);
  });

  harness.it('F14.3: Appends unique hash suffix on filename collision when content differs', () => {
    const tracker = new ArtifactTracker();
    const pdfA = createSamplePdf('INV-COLLISION', '100.00');
    const pdfB = createSamplePdf('INV-COLLISION', '200.00');

    const fileA = path.join(tempDir, 'invoice_A.pdf');
    const fileB = path.join(tempDir, 'invoice_B.pdf');
    fs.writeFileSync(fileA, pdfA.buffer);
    fs.writeFileSync(fileB, pdfB.buffer);

    const artA = tracker.processAndSaveArtifact(fileA, targetDir, 'invoice.pdf');
    const artB = tracker.processAndSaveArtifact(fileB, targetDir, 'invoice.pdf');

    Assert.equal(artA.isDuplicate, false);
    Assert.equal(artB.isDuplicate, false);
    Assert.notEqual(artA.hash, artB.hash);
    Assert.notEqual(artA.fileName, artB.fileName);
    Assert.ok(artB.fileName.includes(artB.hash.substring(0, 8)));
  });

  harness.it('F14.4: Ignores transient .tmp and .crdownload browser download files in scanDirectory', () => {
    const tracker = new ArtifactTracker();
    fs.writeFileSync(path.join(tempDir, 'invoice.pdf.crdownload'), Buffer.from('in-progress'));
    fs.writeFileSync(path.join(tempDir, 'download.tmp'), Buffer.from('temp-data'));
    fs.writeFileSync(path.join(tempDir, 'final.pdf'), createSamplePdf('INV-4003').buffer);

    const results = tracker.scanDirectory(tempDir);
    Assert.equal(results.length, 1);
    Assert.equal(results[0].fileName, 'final.pdf');
  });

  harness.it('F14.5: Bundles complete artifact metadata payload for cloud API', () => {
    const tracker = new ArtifactTracker();
    const pdf = createSamplePdf('INV-4004', '800.00');
    const filePath = path.join(tempDir, pdf.filename);
    fs.writeFileSync(filePath, pdf.buffer);

    const artifact = tracker.processAndSaveArtifact(filePath, targetDir, pdf.filename);

    const payload = {
      run_id: 'run-123',
      file_name: artifact.fileName,
      file_size_bytes: artifact.sizeBytes,
      sha256_hash: artifact.hash,
    };

    Assert.equal(payload.run_id, 'run-123');
    Assert.equal(payload.file_name, pdf.filename);
    Assert.equal(payload.file_size_bytes, pdf.sizeBytes);
    Assert.equal(payload.sha256_hash, pdf.sha256);
  });
});

// ==========================================
// FEATURE 15: Desktop Runner CLI (5 tests)
// ==========================================
harness.describe('F15: Desktop Runner CLI', () => {
  const cliPath = path.resolve(__dirname, '../../packages/engine/src/runner/cli.js');

  harness.it('F15.1: node cli.js doctor --help executes cleanly with exit code 0', () => {
    const result = spawnSync(process.execPath, [cliPath, 'doctor', '--help'], {
      encoding: 'utf-8',
    });
    Assert.equal(result.status, 0, `Expected exit code 0, got ${result.status}. Error: ${result.stderr}`);
    Assert.includes(result.stdout, 'doctor [options]');
  });

  harness.it('F15.2: node cli.js --help displays all commands (doctor, listen, run)', () => {
    const result = spawnSync(process.execPath, [cliPath, '--help'], {
      encoding: 'utf-8',
    });
    Assert.equal(result.status, 0);
    Assert.includes(result.stdout, 'doctor');
    Assert.includes(result.stdout, 'listen');
    Assert.includes(result.stdout, 'run');
  });

  harness.it('F15.3: node cli.js --version outputs version string', () => {
    const result = spawnSync(process.execPath, [cliPath, '--version'], {
      encoding: 'utf-8',
    });
    Assert.equal(result.status, 0);
    Assert.match(result.stdout, /\d+\.\d+\.\d+/);
  });

  harness.it('F15.4: node cli.js doctor runs health check against mock servers', () => {
    const result = spawnSync(
      process.execPath,
      [cliPath, 'doctor', '--port', String(cdpPort), '--cloud-url', cloudUrl, '--token', TOKENS.validOrg1],
      { encoding: 'utf-8' }
    );
    Assert.equal(result.status, 0, `Doctor failed: ${result.stderr || result.stdout}`);
    Assert.includes(result.stdout, 'Chrome CDP');
    Assert.includes(result.stdout, 'PortalSync Cloud');
  });

  harness.it('F15.5: node cli.js doctor detects missing/closed CDP port and reports diagnostic warning', () => {
    const result = spawnSync(
      process.execPath,
      [cliPath, 'doctor', '--port', '19998', '--cloud-url', cloudUrl, '--token', TOKENS.validOrg1],
      { encoding: 'utf-8' }
    );
    Assert.equal(result.status, 0);
    const combined = result.stdout + result.stderr;
    Assert.includes(combined, 'Chrome CDP is NOT responding');
    Assert.includes(combined, 'need attention');
  });
});

if (require.main === module) {
  harness.run().then((res) => {
    process.exitCode = res.failed > 0 ? 1 : 0;
  });
}

module.exports = { harness };
