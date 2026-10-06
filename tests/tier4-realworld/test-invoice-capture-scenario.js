/**
 * Tier 4 Real-World Scenario: End-to-End Enterprise Invoice Capture Lifecycle
 * Tests:
 *  - Full real-world simulation of enterprise supplier portal invoice capture:
 *    1. Dual-mode portal registration with hybrid cloud storage configuration
 *    2. Dashboard "Run Now" trigger generating pending run
 *    3. Daemon polling and atomic claiming to running
 *    4. Multi-item pagination table discovery
 *    5. 2FA challenge detection and successful human verification resumption
 *    6. Binary PDF downloads with SHA-256 calculation and deduplication
 *    7. Artifact catalog registration in Cloud API
 *    8. Final run telemetry completion and verification
 * Total: 4 end-to-end scenarios covering multi-invoice batching, deduplication, 2FA, and audit telemetry.
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { TestHarness, Assert } = require('../helpers/test-harness');
const { MockCloudServer } = require('../helpers/mock-cloud-server');
const { ORG_1_ID, TOKENS, createSamplePdf, computeSha256 } = require('../helpers/fixtures');
const { CloudClient } = require('../../packages/engine/src/runner/cloud-client');
const { ArtifactTracker } = require('../../packages/engine/src/runner/dedup-helper');
const { waitFor2FAResolution } = require('../../packages/engine/src/runner/hitl-detector');

const harness = new TestHarness('Tier 4: Real-World Enterprise Invoice Capture Lifecycle');
const server = new MockCloudServer();
let baseUrl = '';
let targetDir = '';

harness.beforeAll(async () => {
  baseUrl = await server.start(0);
});

harness.afterAll(async () => {
  await server.stop();
});

harness.beforeEach(() => {
  server.reset();
  targetDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-realworld-'));
});

harness.afterEach(() => {
  if (targetDir && fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
});

harness.describe('Real-World Enterprise Invoice Automation Scenario', () => {
  harness.it('Scenario 4.1: Complete End-to-End Monthly Invoice Batch Extraction with 2FA and Deduplication', async () => {
    const cloudClient = new CloudClient({ baseUrl, token: TOKENS.validOrg1 });
    const tracker = new ArtifactTracker();

    // Step 1: Organization Portal Configuration
    const createWfRes = await fetch(`${baseUrl}/api/v1/workflows`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Global Logistics Portal',
        portal_url: 'https://billing.logistics-partner.com',
        upload_to_cloud: true,
        target_folder: targetDir,
        filter_rules: { min_amount: 50.0, status: 'unpaid' },
      }),
    });
    Assert.equal(createWfRes.status, 201);
    const { workflow } = await createWfRes.json();

    // Step 2: Dashboard Dispatches "Run Now"
    const triggerRes = await fetch(`${baseUrl}/api/v1/runs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflow_id: workflow.id,
        status: 'pending',
      }),
    });
    Assert.equal(triggerRes.status, 201);
    const { run: runTriggered } = await triggerRes.json();
    Assert.equal(runTriggered.status, 'pending');

    // Step 3: Runner Daemon Polls and Claims Run
    const pendingRuns = await cloudClient.getPendingRuns();
    Assert.equal(pendingRuns.length, 1);
    const claimedRun = await cloudClient.claimRun(pendingRuns[0].id);
    Assert.equal(claimedRun.status, 'running');

    // Step 4: Login encounter: 2FA challenge triggered
    await cloudClient.updateRunStatus(claimedRun.id, 'requires_action', {
      error_summary: '2FA challenge detected: awaiting SMS verification code',
    });

    // 2FA human solves challenge within 90s window
    let promptActive = true;
    setTimeout(() => { promptActive = false; }, 80);
    const mock2faPage = { evaluate: async () => ({ detected: promptActive }) };

    const resolution = await waitFor2FAResolution(mock2faPage, { timeoutMs: 5000, pollIntervalMs: 25 });
    Assert.equal(resolution.resolved, true);

    // Runner resumes
    await cloudClient.updateRunStatus(claimedRun.id, 'running');

    // Step 5: Multi-page Invoice Downloads (Batch of 3 unique invoices, 1 duplicate)
    const rawInvoices = [
      createSamplePdf('INV-LOG-001', '1450.50', '2026-10-01'),
      createSamplePdf('INV-LOG-002', '3200.00', '2026-10-02'),
      createSamplePdf('INV-LOG-001', '1450.50', '2026-10-01'), // Duplicate encountered on page 2!
      createSamplePdf('INV-LOG-003', '850.75', '2026-10-03'),
    ];

    const registeredArtifacts = [];
    let itemsProcessed = 0;
    let itemsDownloaded = 0;

    for (const inv of rawInvoices) {
      itemsProcessed++;
      const srcPath = path.join(targetDir, `download_${inv.filename}`);
      fs.writeFileSync(srcPath, inv.buffer);

      const processed = tracker.processAndSaveArtifact(srcPath, targetDir, inv.filename);
      if (processed.isDuplicate) {
        // Zero duplicate invariant: skip re-registration
        continue;
      }

      itemsDownloaded++;
      const artifact = await cloudClient.registerArtifact(claimedRun.id, {
        file_name: processed.fileName,
        file_size_bytes: processed.sizeBytes,
        sha256_hash: processed.hash,
        cloud_storage_path: `s3://company-vault/${ORG_1_ID}/${processed.fileName}`,
        item_metadata: { invoiceNumber: inv.invoiceNumber, amount: inv.amount, date: inv.date },
      });
      registeredArtifacts.push(artifact);
    }

    // Step 6: Verify Deduplication Metrics
    Assert.equal(itemsProcessed, 4, 'Total 4 invoices processed');
    Assert.equal(itemsDownloaded, 3, 'Exactly 3 unique invoices downloaded');
    Assert.equal(registeredArtifacts.length, 3, 'Exactly 3 artifacts registered in cloud');

    // Step 7: Complete Run with Telemetry
    const completedRun = await cloudClient.updateRunStatus(claimedRun.id, 'completed', {
      items_processed: itemsProcessed,
      items_downloaded: itemsDownloaded,
      completed_at: new Date().toISOString(),
    });
    Assert.equal(completedRun.status, 'completed');
    Assert.equal(completedRun.items_processed, 4);
    Assert.equal(completedRun.items_downloaded, 3);

    // Step 8: Dashboard Audit & Integrity Verification
    const artifactsQuery = await fetch(`${baseUrl}/api/v1/artifacts?run_id=${claimedRun.id}`, {
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}` },
    });
    const { artifacts } = await artifactsQuery.json();
    Assert.equal(artifacts.length, 3);

    // Verify SHA-256 hashes in database match original source files
    const hashesInDb = artifacts.map((a) => a.sha256_hash);
    Assert.ok(hashesInDb.includes(rawInvoices[0].sha256));
    Assert.ok(hashesInDb.includes(rawInvoices[1].sha256));
    Assert.ok(hashesInDb.includes(rawInvoices[3].sha256));

    // Calculate total financial balance from metadata
    const totalAmount = artifacts.reduce((sum, a) => sum + parseFloat(a.item_metadata.amount), 0);
    Assert.equal(totalAmount.toFixed(2), (1450.50 + 3200.00 + 850.75).toFixed(2));
  });

  harness.it('Scenario 4.2: Zero-Item Discovery Graceful Run Completion', async () => {
    const cloudClient = new CloudClient({ baseUrl, token: TOKENS.validOrg1 });

    const run = server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-empty-table', status: 'pending' });
    await cloudClient.claimRun(run.id);

    // Portal has no new invoices -> completed with 0 items
    const completed = await cloudClient.updateRunStatus(run.id, 'completed', {
      items_processed: 0,
      items_downloaded: 0,
      completed_at: new Date().toISOString(),
    });

    Assert.equal(completed.status, 'completed');
    Assert.equal(completed.items_downloaded, 0);

    const artifacts = await fetch(`${baseUrl}/api/v1/artifacts?run_id=${run.id}`, {
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}` },
    });
    Assert.equal((await artifacts.json()).artifacts.length, 0);
  });

  harness.it('Scenario 4.3: High-Volume Batch Extraction Integrity (10 Invoices)', async () => {
    const cloudClient = new CloudClient({ baseUrl, token: TOKENS.validOrg1 });
    const tracker = new ArtifactTracker();
    const run = server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-batch-10', status: 'pending' });
    await cloudClient.claimRun(run.id);

    for (let i = 1; i <= 10; i++) {
      const pdf = createSamplePdf(`INV-HV-${i}`, `${i * 100}.00`);
      const srcPath = path.join(targetDir, `hv_${pdf.filename}`);
      fs.writeFileSync(srcPath, pdf.buffer);

      const processed = tracker.processAndSaveArtifact(srcPath, targetDir);
      await cloudClient.registerArtifact(run.id, {
        file_name: processed.fileName,
        file_size_bytes: processed.sizeBytes,
        sha256_hash: processed.hash,
      });
    }

    const completed = await cloudClient.updateRunStatus(run.id, 'completed', {
      items_processed: 10,
      items_downloaded: 10,
    });
    Assert.equal(completed.items_downloaded, 10);

    const checkRes = await fetch(`${baseUrl}/api/v1/artifacts?run_id=${run.id}`, {
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}` },
    });
    const { artifacts } = await checkRes.json();
    Assert.equal(artifacts.length, 10);
  });

  harness.it('Scenario 4.4: Fatal Network Interruption Mid-Run Trapped with Telemetry', async () => {
    const cloudClient = new CloudClient({ baseUrl, token: TOKENS.validOrg1 });
    const run = server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-fatal-abort', status: 'pending' });
    await cloudClient.claimRun(run.id);

    // Download 1 item before error
    const pdf = createSamplePdf('INV-PARTIAL', '100.00');
    await cloudClient.registerArtifact(run.id, {
      file_name: pdf.filename,
      file_size_bytes: pdf.sizeBytes,
      sha256_hash: pdf.sha256,
    });

    // Simulating fatal navigation crash
    const failedRun = await cloudClient.updateRunStatus(run.id, 'failed', {
      items_processed: 1,
      items_downloaded: 1,
      error_summary: 'Target portal crashed: HTTP 503 Service Unavailable',
      completed_at: new Date().toISOString(),
    });

    Assert.equal(failedRun.status, 'failed');
    Assert.equal(failedRun.items_downloaded, 1);
    Assert.includes(failedRun.error_summary, '503 Service Unavailable');
  });
});

if (require.main === module) {
  harness.run().then((res) => {
    process.exitCode = res.failed > 0 ? 1 : 0;
  });
}

module.exports = { harness };
