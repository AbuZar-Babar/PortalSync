/**
 * Tier 3 Cross-Feature Interactions: Full State-Machine & Component Lifecycles
 * Tests:
 *  - Scenario 3.1: Happy-path lifecycle: Portal create -> Run Now (pending) -> Daemon claim (running) -> Artifact sync -> Completed
 *  - Scenario 3.2: 2FA HITL Resolution lifecycle: Pending -> Running -> 2FA challenge (requires_action) -> Resolved -> Running -> Completed
 *  - Scenario 3.3: 2FA HITL Timeout lifecycle: Pending -> Running -> 2FA challenge (requires_action) -> 90s timeout -> Failed
 *  - Scenario 3.4: Multi-Runner concurrency arbitration: Simultaneous claim attempts resolve with exactly one 200 and one 409
 *  - Scenario 3.5: Hybrid storage branching: Cloud upload true vs false persists proper storage paths
 *  - Scenario 3.6: Dashboard cancelation of pending run prevents runner execution
 * Total: 6 interaction scenarios (>=5 threshold)
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

const harness = new TestHarness('Tier 3: Cross-Feature Lifecycle Interactions');
const server = new MockCloudServer();
let baseUrl = '';
let tempLocalDir = '';

harness.beforeAll(async () => {
  baseUrl = await server.start(0);
});

harness.afterAll(async () => {
  await server.stop();
});

harness.beforeEach(() => {
  server.reset();
  tempLocalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-tier3-'));
});

harness.afterEach(() => {
  if (tempLocalDir && fs.existsSync(tempLocalDir)) {
    fs.rmSync(tempLocalDir, { recursive: true, force: true });
  }
});

harness.describe('Cross-Feature Pairwise Interaction Lifecycles', () => {
  harness.it('Scenario 3.1: Full Happy-Path Lifecycle (Create -> Pending -> Claim -> Download -> Artifact -> Complete)', async () => {
    const client = new CloudClient({ baseUrl, token: TOKENS.validOrg1 });
    const tracker = new ArtifactTracker();

    // 1. Dashboard creates workflow with hybrid storage preferences
    const wfRes = await fetch(`${baseUrl}/api/v1/workflows`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Supplier Invoices Production',
        portal_url: 'https://supplier.portal.com',
        upload_to_cloud: true,
        target_folder: tempLocalDir,
      }),
    });
    Assert.equal(wfRes.status, 201);
    const { workflow } = await wfRes.json();

    // 2. User clicks "Run Now" in Dashboard -> creates pending run
    const runRes = await fetch(`${baseUrl}/api/v1/runs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow_id: workflow.id, status: 'pending' }),
    });
    Assert.equal(runRes.status, 201);
    const { run: createdRun } = await runRes.json();
    Assert.equal(createdRun.status, 'pending');

    // 3. Desktop Runner polls pending runs
    const pendingRuns = await client.getPendingRuns();
    Assert.equal(pendingRuns.length, 1);
    Assert.equal(pendingRuns[0].id, createdRun.id);

    // 4. Desktop Runner claims run atomically
    const claimedRun = await client.claimRun(pendingRuns[0].id);
    Assert.equal(claimedRun.status, 'running');

    // 5. Runner simulates invoice download and local storage
    const pdf = createSamplePdf('INV-2026-001', '1250.00');
    const sourceFilePath = path.join(tempLocalDir, pdf.filename);
    fs.writeFileSync(sourceFilePath, pdf.buffer);

    const processedArtifact = tracker.processAndSaveArtifact(sourceFilePath, tempLocalDir);
    Assert.equal(processedArtifact.isDuplicate, false);
    Assert.equal(processedArtifact.hash, pdf.sha256);

    // 6. Runner registers artifact with cloud
    const registered = await client.registerArtifact(claimedRun.id, {
      file_name: processedArtifact.fileName,
      file_size_bytes: processedArtifact.sizeBytes,
      sha256_hash: processedArtifact.hash,
      cloud_storage_path: `invoices/${ORG_1_ID}/${pdf.filename}`,
    });
    Assert.ok(registered.id);

    // 7. Runner marks run completed
    const completedRun = await client.updateRunStatus(claimedRun.id, 'completed', {
      items_processed: 1,
      items_downloaded: 1,
      completed_at: new Date().toISOString(),
    });
    Assert.equal(completedRun.status, 'completed');

    // 8. Dashboard fetches execution details and verifies artifact checksum
    const artifactsRes = await fetch(`${baseUrl}/api/v1/artifacts?run_id=${completedRun.id}`, {
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}` },
    });
    Assert.equal(artifactsRes.status, 200);
    const { artifacts } = await artifactsRes.json();
    Assert.equal(artifacts.length, 1);
    Assert.equal(artifacts[0].sha256_hash, pdf.sha256);
  });

  harness.it('Scenario 3.2: 2FA Human-in-the-Loop Resolved Lifecycle', async () => {
    const client = new CloudClient({ baseUrl, token: TOKENS.validOrg1 });

    // 1. Run created and claimed
    const initialRun = server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-2fa', status: 'pending' });
    const claimed = await client.claimRun(initialRun.id);
    Assert.equal(claimed.status, 'running');

    // 2. 2FA challenge detected -> signal requires_action
    const requiresActionRun = await client.updateRunStatus(claimed.id, 'requires_action', {
      error_summary: '2FA challenge detected: awaiting one-time passcode',
    });
    Assert.equal(requiresActionRun.status, 'requires_action');

    // 3. Verify Dashboard banner state
    const runsList = await client.getPendingRuns();
    // pendingRuns does NOT include requires_action
    Assert.equal(runsList.length, 0);

    // 4. Human enters 2FA passcode -> resolved
    let checkCount = 0;
    const mockPage = {
      evaluate: async () => {
        checkCount++;
        return { detected: checkCount < 2 }; // Cleared on second check
      },
    };
    const resolution = await waitFor2FAResolution(mockPage, { timeoutMs: 5000, pollIntervalMs: 50 });
    Assert.equal(resolution.resolved, true);

    // 5. Runner transitions back to running
    const resumedRun = await client.updateRunStatus(claimed.id, 'running');
    Assert.equal(resumedRun.status, 'running');

    // 6. Complete execution
    const finishedRun = await client.updateRunStatus(claimed.id, 'completed', {
      items_processed: 5,
      items_downloaded: 5,
    });
    Assert.equal(finishedRun.status, 'completed');
  });

  harness.it('Scenario 3.3: 2FA Human-in-the-Loop Expiration & Failure Lifecycle', async () => {
    const client = new CloudClient({ baseUrl, token: TOKENS.validOrg1 });

    const initialRun = server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-timeout', status: 'pending' });
    await client.claimRun(initialRun.id);

    // Signal requires_action
    await client.updateRunStatus(initialRun.id, 'requires_action', {
      error_summary: '2FA challenge detected',
    });

    // 90s countdown expires without user action
    const mockPage = { evaluate: async () => ({ detected: true }) };
    const resolution = await waitFor2FAResolution(mockPage, { timeoutMs: 100, pollIntervalMs: 25 });
    Assert.equal(resolution.timedOut, true);

    // Runner transitions to failed
    const failedRun = await client.updateRunStatus(initialRun.id, 'failed', {
      error_summary: '2FA timeout: human verification not completed within 90s',
    });
    Assert.equal(failedRun.status, 'failed');
    Assert.includes(failedRun.error_summary, '90s');
  });

  harness.it('Scenario 3.4: Multi-Runner Concurrency Arbitration (Double Claim)', async () => {
    const runnerA = new CloudClient({ baseUrl, token: TOKENS.validOrg1 });
    const runnerB = new CloudClient({ baseUrl, token: TOKENS.validOrg1 });

    const run = server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-race', status: 'pending' });

    // Both runners attempt to claim concurrently
    const [resultA, resultB] = await Promise.allSettled([
      runnerA.claimRun(run.id),
      runnerB.claimRun(run.id),
    ]);

    // Exactly one should succeed, and one should fail with 409
    const succeeded = [resultA, resultB].filter((r) => r.status === 'fulfilled');
    const failed = [resultA, resultB].filter((r) => r.status === 'rejected');

    Assert.equal(succeeded.length, 1, 'Exactly one runner must claim the run');
    Assert.equal(failed.length, 1, 'Second runner claim must be rejected');
    Assert.equal(failed[0].reason.status, 409, 'Rejection status must be 409 Conflict');
  });

  harness.it('Scenario 3.5: Hybrid Storage Branching (Cloud Upload vs Local Only)', async () => {
    const client = new CloudClient({ baseUrl, token: TOKENS.validOrg1 });
    const runCloud = server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-cloud', status: 'running' });
    const runLocal = server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-local', status: 'running' });

    const pdf = createSamplePdf('INV-HYBRID', '99.00');

    // Register with cloud upload
    const artCloud = await client.registerArtifact(runCloud.id, {
      file_name: pdf.filename,
      file_size_bytes: pdf.sizeBytes,
      sha256_hash: pdf.sha256,
      cloud_storage_path: `s3://invoices/${pdf.filename}`,
    });

    // Register with local only
    const artLocal = await client.registerArtifact(runLocal.id, {
      file_name: pdf.filename,
      file_size_bytes: pdf.sizeBytes,
      sha256_hash: pdf.sha256,
      cloud_storage_path: null,
    });

    Assert.equal(artCloud.cloud_storage_path, `s3://invoices/${pdf.filename}`);
    Assert.equal(artLocal.cloud_storage_path, null);
    Assert.equal(artCloud.sha256_hash, artLocal.sha256_hash);
  });

  harness.it('Scenario 3.6: Dashboard Cancelation of Pending Run Prevents Runner Claim', async () => {
    const client = new CloudClient({ baseUrl, token: TOKENS.validOrg1 });
    const run = server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-cancel', status: 'pending' });

    // User cancels from dashboard
    const cancelRes = await fetch(`${baseUrl}/api/v1/runs`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ run_id: run.id, status: 'cancelled' }),
    });
    Assert.equal(cancelRes.status, 200);

    // Runner attempts to claim cancelled run -> rejected with 409
    let caught = null;
    try {
      await client.claimRun(run.id);
    } catch (err) {
      caught = err;
    }
    Assert.ok(caught !== null);
    Assert.equal(caught.status, 409);
  });
});

if (require.main === module) {
  harness.run().then((res) => {
    process.exitCode = res.failed > 0 ? 1 : 0;
  });
}

module.exports = { harness };
