/**
 * Tier 1 Feature Coverage: R1 Cloud Run Polling & Telemetry API
 * Features:
 *  - F1: Dual Runner Token Auth (5 tests)
 *  - F2: Polling Pending Runs (5 tests)
 *  - F3: Atomic Run Transitions (5 tests)
 *  - F4: Artifact Registration API (5 tests)
 *  - F5: Hybrid Storage Preferences (5 tests)
 * Total: 25 test cases
 */

const { TestHarness, Assert } = require('../helpers/test-harness');
const { MockCloudServer } = require('../helpers/mock-cloud-server');
const { ORG_1_ID, ORG_2_ID, TOKENS, createSamplePdf } = require('../helpers/fixtures');

const harness = new TestHarness('Tier 1: R1 Cloud API Feature Coverage');
const server = new MockCloudServer();
let baseUrl = '';

harness.beforeAll(async () => {
  baseUrl = await server.start(0);
});

harness.afterAll(async () => {
  await server.stop();
});

harness.beforeEach(() => {
  server.reset();
});

// ==========================================
// FEATURE 1: Dual Runner Token Auth (5 tests)
// ==========================================
harness.describe('F1: Dual Runner Token Auth', () => {
  harness.it('F1.1: Authenticates successfully using Authorization: Bearer ps_live_<org_id>', async () => {
    const res = await fetch(`${baseUrl}/api/v1/runs`, {
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}` },
    });
    Assert.equal(res.status, 200, 'Expected HTTP 200 OK');
    const json = await res.json();
    Assert.ok(Array.isArray(json.runs), 'Expected runs array in response');
  });

  harness.it('F1.2: Authenticates successfully using x-runner-token header', async () => {
    const res = await fetch(`${baseUrl}/api/v1/runs`, {
      headers: { 'x-runner-token': TOKENS.validOrg1 },
    });
    Assert.equal(res.status, 200, 'Expected HTTP 200 OK');
    const json = await res.json();
    Assert.ok(Array.isArray(json.runs), 'Expected runs array in response');
  });

  harness.it('F1.3: Authenticates successfully via cookie session fallback', async () => {
    const res = await fetch(`${baseUrl}/api/v1/runs`, {
      headers: { Cookie: `mock_session_org=${ORG_1_ID}` },
    });
    Assert.equal(res.status, 200, 'Expected HTTP 200 OK');
    const json = await res.json();
    Assert.ok(Array.isArray(json.runs), 'Expected runs array in response');
  });

  harness.it('F1.4: Rejects request missing runner token and session with 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/v1/runs`);
    Assert.equal(res.status, 401, 'Expected HTTP 401 Unauthorized');
    const json = await res.json();
    Assert.includes(json.error, 'Unauthorized', 'Expected descriptive 401 message');
  });

  harness.it('F1.5: Rejects malformed token prefix with 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/v1/runs`, {
      headers: { Authorization: `Bearer ${TOKENS.invalidPrefix}` },
    });
    Assert.equal(res.status, 401, 'Expected HTTP 401 Unauthorized');
    const json = await res.json();
    Assert.includes(json.error, 'ps_live_', 'Expected token prefix error');
  });
});

// ==========================================
// FEATURE 2: Polling Pending Runs (5 tests)
// ==========================================
harness.describe('F2: Polling Pending Runs', () => {
  harness.it('F2.1: GET /api/v1/runs?status=pending returns only pending runs for authenticated org', async () => {
    server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-1', status: 'pending' });
    server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-2', status: 'running' });
    server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-3', status: 'completed' });

    const res = await fetch(`${baseUrl}/api/v1/runs?status=pending`, {
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}` },
    });
    Assert.equal(res.status, 200);
    const json = await res.json();
    Assert.equal(json.runs.length, 1);
    Assert.equal(json.runs[0].status, 'pending');
  });

  harness.it('F2.2: Isolates multi-tenant pending runs between organizations', async () => {
    server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-org1', status: 'pending' });
    server.addRun({ org_id: ORG_2_ID, workflow_id: 'wf-org2', status: 'pending' });

    const res = await fetch(`${baseUrl}/api/v1/runs?status=pending`, {
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}` },
    });
    const json = await res.json();
    Assert.equal(json.runs.length, 1);
    Assert.equal(json.runs[0].org_id, ORG_1_ID);
    Assert.equal(json.runs[0].workflow_id, 'wf-org1');
  });

  harness.it('F2.3: Filters runs by workflow_id when query parameter provided', async () => {
    server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-target', status: 'pending' });
    server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-other', status: 'pending' });

    const res = await fetch(`${baseUrl}/api/v1/runs?status=pending&workflow_id=wf-target`, {
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}` },
    });
    const json = await res.json();
    Assert.equal(json.runs.length, 1);
    Assert.equal(json.runs[0].workflow_id, 'wf-target');
  });

  harness.it('F2.4: Orders runs descending by started_at', async () => {
    server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-old', status: 'pending', started_at: '2026-10-06T08:00:00Z' });
    server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-new', status: 'pending', started_at: '2026-10-06T12:00:00Z' });

    const res = await fetch(`${baseUrl}/api/v1/runs?status=pending`, {
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}` },
    });
    const json = await res.json();
    Assert.equal(json.runs.length, 2);
    Assert.equal(json.runs[0].workflow_id, 'wf-new');
    Assert.equal(json.runs[1].workflow_id, 'wf-old');
  });

  harness.it('F2.5: Returns empty array when no pending runs exist', async () => {
    const res = await fetch(`${baseUrl}/api/v1/runs?status=pending`, {
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}` },
    });
    const json = await res.json();
    Assert.deepEqual(json.runs, []);
  });
});

// ==========================================
// FEATURE 3: Atomic Run Transitions (5 tests)
// ==========================================
harness.describe('F3: Atomic Run Transitions', () => {
  harness.it('F3.1: Transitions pending -> running (runner claim) and returns updated run', async () => {
    const initial = server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-1', status: 'pending' });

    const res = await fetch(`${baseUrl}/api/v1/runs`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${TOKENS.validOrg1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ run_id: initial.id, status: 'running' }),
    });

    Assert.equal(res.status, 200);
    const json = await res.json();
    Assert.equal(json.run.status, 'running');
  });

  harness.it('F3.2: Rejects double claim with 409 Conflict when run is already running', async () => {
    const run = server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-1', status: 'running' });

    const res = await fetch(`${baseUrl}/api/v1/runs`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${TOKENS.validOrg1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ run_id: run.id, status: 'running' }),
    });

    // Attempting to claim an already running run is invalid transition
    Assert.equal(res.status, 409);
    const json = await res.json();
    Assert.includes(json.error, 'Invalid status transition');
  });

  harness.it('F3.3: Transitions running -> requires_action on 2FA challenge detection', async () => {
    const run = server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-1', status: 'running' });

    const res = await fetch(`${baseUrl}/api/v1/runs`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${TOKENS.validOrg1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        run_id: run.id,
        status: 'requires_action',
        error_summary: '2FA challenge detected: awaiting OTP entry',
      }),
    });

    Assert.equal(res.status, 200);
    const json = await res.json();
    Assert.equal(json.run.status, 'requires_action');
    Assert.includes(json.run.error_summary, '2FA challenge detected');
  });

  harness.it('F3.4: Transitions requires_action -> running on resolution, and requires_action -> failed on timeout', async () => {
    const run1 = server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-1', status: 'requires_action' });
    const run2 = server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-2', status: 'requires_action' });

    // Resolution
    const res1 = await fetch(`${baseUrl}/api/v1/runs`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ run_id: run1.id, status: 'running' }),
    });
    Assert.equal(res1.status, 200);
    Assert.equal((await res1.json()).run.status, 'running');

    // Timeout
    const res2 = await fetch(`${baseUrl}/api/v1/runs`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ run_id: run2.id, status: 'failed', error_summary: '2FA timeout (90s elapsed)' }),
    });
    Assert.equal(res2.status, 200);
    Assert.equal((await res2.json()).run.status, 'failed');
  });

  harness.it('F3.5: Transitions running -> completed recording telemetry and completion timestamp', async () => {
    const run = server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-1', status: 'running' });
    const completedAt = new Date().toISOString();

    const res = await fetch(`${baseUrl}/api/v1/runs`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${TOKENS.validOrg1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        run_id: run.id,
        status: 'completed',
        items_processed: 12,
        items_downloaded: 10,
        completed_at: completedAt,
      }),
    });

    Assert.equal(res.status, 200);
    const json = await res.json();
    Assert.equal(json.run.status, 'completed');
    Assert.equal(json.run.items_processed, 12);
    Assert.equal(json.run.items_downloaded, 10);
    Assert.ok(json.run.completed_at);
  });
});

// ==========================================
// FEATURE 4: Artifact Registration API (5 tests)
// ==========================================
harness.describe('F4: Artifact Registration API', () => {
  harness.it('F4.1: POST /api/v1/artifacts registers file with SHA-256 and size (201 Created)', async () => {
    const run = server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-1', status: 'running' });
    const pdf = createSamplePdf('INV-2001', '500.00');

    const res = await fetch(`${baseUrl}/api/v1/artifacts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKENS.validOrg1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        run_id: run.id,
        file_name: pdf.filename,
        file_size_bytes: pdf.sizeBytes,
        sha256_hash: pdf.sha256,
      }),
    });

    Assert.equal(res.status, 201);
    const json = await res.json();
    Assert.ok(json.artifact.id);
    Assert.equal(json.artifact.run_id, run.id);
    Assert.equal(json.artifact.sha256_hash, pdf.sha256);
    Assert.equal(json.artifact.file_size_bytes, pdf.sizeBytes);
  });

  harness.it('F4.2: Validates mandatory fields: rejects missing run_id, file_name, or sha256_hash with 400', async () => {
    const res = await fetch(`${baseUrl}/api/v1/artifacts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_name: 'test.pdf' }),
    });
    Assert.equal(res.status, 400);
    const json = await res.json();
    Assert.includes(json.error, 'mandatory');
  });

  harness.it('F4.3: Accepts optional cloud_storage_path and item_metadata in registration payload', async () => {
    const run = server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-1', status: 'running' });
    const pdf = createSamplePdf('INV-2002', '750.00');

    const res = await fetch(`${baseUrl}/api/v1/artifacts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        run_id: run.id,
        file_name: pdf.filename,
        file_size_bytes: pdf.sizeBytes,
        sha256_hash: pdf.sha256,
        cloud_storage_path: `invoices/${ORG_1_ID}/${pdf.filename}`,
        item_metadata: { invoiceNumber: 'INV-2002', total: 750.0 },
      }),
    });

    Assert.equal(res.status, 201);
    const json = await res.json();
    Assert.equal(json.artifact.cloud_storage_path, `invoices/${ORG_1_ID}/${pdf.filename}`);
    Assert.equal(json.artifact.item_metadata.invoiceNumber, 'INV-2002');
  });

  harness.it('F4.4: Rejects artifact registration for non-existent run_id with 404 Not Found', async () => {
    const pdf = createSamplePdf('INV-2003', '100.00');
    const res = await fetch(`${baseUrl}/api/v1/artifacts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        run_id: 'non-existent-uuid',
        file_name: pdf.filename,
        file_size_bytes: pdf.sizeBytes,
        sha256_hash: pdf.sha256,
      }),
    });
    Assert.equal(res.status, 404);
  });

  harness.it('F4.5: GET /api/v1/artifacts?run_id=<id> retrieves registered artifacts for a run', async () => {
    const run = server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-1', status: 'running' });
    const pdf1 = createSamplePdf('INV-2004', '200.00');
    const pdf2 = createSamplePdf('INV-2005', '300.00');

    // Register 2 artifacts
    await fetch(`${baseUrl}/api/v1/artifacts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ run_id: run.id, file_name: pdf1.filename, file_size_bytes: pdf1.sizeBytes, sha256_hash: pdf1.sha256 }),
    });
    await fetch(`${baseUrl}/api/v1/artifacts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ run_id: run.id, file_name: pdf2.filename, file_size_bytes: pdf2.sizeBytes, sha256_hash: pdf2.sha256 }),
    });

    const res = await fetch(`${baseUrl}/api/v1/artifacts?run_id=${run.id}`, {
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}` },
    });
    Assert.equal(res.status, 200);
    const json = await res.json();
    Assert.equal(json.artifacts.length, 2);
  });
});

// ==========================================
// FEATURE 5: Hybrid Storage Preferences (5 tests)
// ==========================================
harness.describe('F5: Hybrid Storage Preferences', () => {
  harness.it('F5.1: POST /api/v1/workflows persists upload_to_cloud: true and target_folder', async () => {
    const res = await fetch(`${baseUrl}/api/v1/workflows`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Supplier Portal A',
        portal_url: 'https://supplier-a.internal',
        upload_to_cloud: true,
        target_folder: 'C:\\Invoices\\SupplierA',
      }),
    });

    Assert.equal(res.status, 201);
    const json = await res.json();
    Assert.equal(json.workflow.workflow_definition.upload_to_cloud, true);
    Assert.equal(json.workflow.workflow_definition.target_folder, 'C:\\Invoices\\SupplierA');
  });

  harness.it('F5.2: POST /api/v1/workflows persists upload_to_cloud: false for local-only downloads', async () => {
    const res = await fetch(`${baseUrl}/api/v1/workflows`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Local Only Portal',
        portal_url: 'https://supplier-b.internal',
        upload_to_cloud: false,
        target_folder: 'D:\\Archive\\Local',
      }),
    });

    Assert.equal(res.status, 201);
    const json = await res.json();
    Assert.equal(json.workflow.workflow_definition.upload_to_cloud, false);
    Assert.equal(json.workflow.workflow_definition.target_folder, 'D:\\Archive\\Local');
  });

  harness.it('F5.3: PATCH /api/v1/workflows updates hybrid storage preferences dynamically', async () => {
    const wf = server.addWorkflow({
      org_id: ORG_1_ID,
      name: 'Dynamic Storage Portal',
      workflow_definition: { upload_to_cloud: false, target_folder: 'C:\\Original' },
    });

    const res = await fetch(`${baseUrl}/api/v1/workflows`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflow_id: wf.id,
        upload_to_cloud: true,
        target_folder: 'C:\\Updated',
      }),
    });

    Assert.equal(res.status, 200);
    const json = await res.json();
    Assert.equal(json.workflow.workflow_definition.upload_to_cloud, true);
    Assert.equal(json.workflow.workflow_definition.target_folder, 'C:\\Updated');
  });

  harness.it('F5.4: Rejects workflow creation missing mandatory name or portal_url with 400', async () => {
    const res = await fetch(`${baseUrl}/api/v1/workflows`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ upload_to_cloud: true }),
    });
    Assert.equal(res.status, 400);
  });

  harness.it('F5.5: Enforces multi-tenant isolation on workflow listings', async () => {
    server.addWorkflow({ org_id: ORG_1_ID, name: 'Org 1 Workflow' });
    server.addWorkflow({ org_id: ORG_2_ID, name: 'Org 2 Workflow' });

    const res = await fetch(`${baseUrl}/api/v1/workflows`, {
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}` },
    });
    Assert.equal(res.status, 200);
    const json = await res.json();
    Assert.equal(json.workflows.length, 1);
    Assert.equal(json.workflows[0].name, 'Org 1 Workflow');
  });
});

if (require.main === module) {
  harness.run().then((res) => {
    process.exitCode = res.failed > 0 ? 1 : 0;
  });
}

module.exports = { harness };
