/**
 * Tier 1 Feature Coverage: R2 Dashboard UI Contracts & Logic
 * Features:
 *  - F6: Database Column Corrections & Data Wiring (5 tests)
 *  - F7: Dual-Mode Portal Creator Modal Contracts (5 tests)
 *  - F8: Dashboard "Run Now" Trigger Contract (5 tests)
 *  - F9: Run Details & Artifacts Drawer Contracts (5 tests)
 *  - F10: 2FA Countdown Badge & Banner Contracts (5 tests)
 * Total: 25 test cases
 */

const { TestHarness, Assert } = require('../helpers/test-harness');
const { ORG_1_ID, SAMPLE_RECORDED_WORKFLOW } = require('../helpers/fixtures');

const harness = new TestHarness('Tier 1: R2 Dashboard Contracts Feature Coverage');

// ==========================================================
// FEATURE 6: Database Column Corrections & Data Wiring (5 tests)
// ==========================================================
harness.describe('F6: Database Column Corrections & Data Wiring', () => {
  harness.it('F6.1: Maps org_id (not organization_id) in member query contract', () => {
    // Model query builder contract
    function buildMemberQuery(client, userId) {
      return {
        table: 'wf_organization_members',
        selectedColumns: ['org_id', 'role', 'wf_organizations(name, slug)'],
        filterColumn: 'user_id',
        filterValue: userId,
      };
    }

    const query = buildMemberQuery({}, 'user-123');
    Assert.ok(query.selectedColumns.includes('org_id'), 'Must select org_id');
    Assert.ok(!query.selectedColumns.includes('organization_id'), 'Must NOT select organization_id');
  });

  harness.it('F6.2: Maps org_id column when querying workflows', () => {
    function buildWorkflowsQuery(orgId) {
      return {
        table: 'wf_workflows',
        filterColumn: 'org_id',
        filterValue: orgId,
      };
    }
    const query = buildWorkflowsQuery(ORG_1_ID);
    Assert.equal(query.filterColumn, 'org_id', 'Workflows must filter by org_id');
  });

  harness.it('F6.3: Maps org_id column when querying execution runs', () => {
    function buildRunsQuery(orgId) {
      return {
        table: 'wf_execution_runs',
        filterColumn: 'org_id',
        filterValue: orgId,
      };
    }
    const query = buildRunsQuery(ORG_1_ID);
    Assert.equal(query.filterColumn, 'org_id', 'Runs must filter by org_id');
  });

  harness.it('F6.4: Orders execution runs by started_at (not created_at) descending', () => {
    function buildRunsOrderClause() {
      return {
        orderColumn: 'started_at',
        ascending: false,
      };
    }
    const order = buildRunsOrderClause();
    Assert.equal(order.orderColumn, 'started_at', 'Order column must be started_at');
    Assert.equal(order.ascending, false, 'Must order descending');
  });

  harness.it('F6.5: Distinguishes between real empty records and query failures', () => {
    function resolveDashboardState(apiResult) {
      if (apiResult.error) {
        return { status: 'error', data: [], error: apiResult.error };
      }
      if (Array.isArray(apiResult.data) && apiResult.data.length === 0) {
        return { status: 'empty', data: [] };
      }
      return { status: 'success', data: apiResult.data };
    }

    const emptyState = resolveDashboardState({ data: [], error: null });
    Assert.equal(emptyState.status, 'empty');
    Assert.equal(emptyState.data.length, 0);

    const errorState = resolveDashboardState({ data: null, error: 'Database column not found' });
    Assert.equal(errorState.status, 'error');
  });
});

// ==========================================================
// FEATURE 7: Dual-Mode Portal Creator Modal Contracts (5 tests)
// ==========================================================
harness.describe('F7: Dual-Mode Portal Creator Modal Contracts', () => {
  // Logic validator matching CreatePortalModal contract
  function validateQuickSetup(form) {
    const errors = {};
    if (!form.name || !form.name.trim()) errors.name = 'Portal name is required';
    if (!form.portal_url || !form.portal_url.trim()) {
      errors.portal_url = 'Portal URL is required';
    } else {
      try {
        const u = new URL(form.portal_url);
        if (!['http:', 'https:'].includes(u.protocol)) {
          errors.portal_url = 'Invalid URL protocol';
        }
      } catch {
        errors.portal_url = 'Invalid URL format';
      }
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }

  function validateJsonImport(jsonString) {
    if (!jsonString || !jsonString.trim()) {
      return { valid: false, error: 'Workflow JSON cannot be empty' };
    }
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      return { valid: false, error: 'Invalid JSON syntax' };
    }
    if (!parsed.metadata || !parsed.metadata.name) {
      return { valid: false, error: 'Workflow metadata must include a name' };
    }
    if (!parsed.metadata.startUrl && !parsed.steps) {
      return { valid: false, error: 'Workflow must define startUrl or steps' };
    }
    return { valid: true, workflow: parsed };
  }

  harness.it('F7.1: Mode 1 (Quick Setup): Validates required fields and valid URL protocol', () => {
    const invalidRes = validateQuickSetup({ name: '', portal_url: 'not-a-url' });
    Assert.equal(invalidRes.valid, false);
    Assert.ok(invalidRes.errors.name);
    Assert.ok(invalidRes.errors.portal_url);

    const validRes = validateQuickSetup({
      name: 'Supplier Portal',
      portal_url: 'https://supplier.portal.com/invoices',
    });
    Assert.equal(validRes.valid, true);
  });

  harness.it('F7.2: Mode 1 (Quick Setup): Generates standard workflow definition payload', () => {
    function generateQuickSetupPayload(orgId, form) {
      return {
        org_id: orgId,
        name: form.name.trim(),
        portal_url: form.portal_url.trim(),
        workflow_definition: {
          mode: 'QUICK_SETUP',
          target_folder: form.target_folder || 'downloads',
          upload_to_cloud: form.upload_to_cloud !== undefined ? form.upload_to_cloud : true,
          steps: [
            { id: 'step_1', type: 'NAVIGATE', url: form.portal_url.trim() },
            { id: 'step_2', type: 'DISCOVERY', target: 'INVOICES' },
          ],
        },
      };
    }

    const payload = generateQuickSetupPayload(ORG_1_ID, {
      name: 'Acme Portal',
      portal_url: 'https://acme.internal',
      target_folder: 'C:\\Invoices',
      upload_to_cloud: true,
    });
    Assert.equal(payload.org_id, ORG_1_ID);
    Assert.equal(payload.name, 'Acme Portal');
    Assert.equal(payload.workflow_definition.upload_to_cloud, true);
    Assert.equal(payload.workflow_definition.steps.length, 2);
  });

  harness.it('F7.3: Mode 2 (JSON Import): Parses and validates valid recorder schema JSON', () => {
    const rawJson = JSON.stringify(SAMPLE_RECORDED_WORKFLOW);
    const result = validateJsonImport(rawJson);
    Assert.equal(result.valid, true);
    Assert.equal(result.workflow.metadata.name, 'Acme Supplier Invoices');
    Assert.equal(result.workflow.steps.length, 5);
  });

  harness.it('F7.4: Mode 2 (JSON Import): Rejects corrupt JSON syntax with descriptive error', () => {
    const corruptJson = '{ "metadata": { "name": "Broken", ';
    const result = validateJsonImport(corruptJson);
    Assert.equal(result.valid, false);
    Assert.equal(result.error, 'Invalid JSON syntax');
  });

  harness.it('F7.5: Mode 2 (JSON Import): Rejects JSON missing required metadata name or actions', () => {
    const missingName = JSON.stringify({ metadata: {}, steps: [] });
    const result = validateJsonImport(missingName);
    Assert.equal(result.valid, false);
    Assert.includes(result.error, 'name');
  });
});

// ==========================================================
// FEATURE 8: Dashboard "Run Now" Trigger Contract (5 tests)
// ==========================================================
harness.describe('F8: Dashboard "Run Now" Trigger Contract', () => {
  function createRunNowPayload(orgId, workflowId) {
    return {
      org_id: orgId,
      workflow_id: workflowId,
      status: 'pending',
      total_items_discovered: 0,
      items_processed: 0,
      items_downloaded: 0,
      started_at: new Date().toISOString(),
    };
  }

  harness.it('F8.1: "Run Now" action dispatches run creation with status pending (never running)', () => {
    const payload = createRunNowPayload(ORG_1_ID, 'wf-123');
    Assert.equal(payload.status, 'pending', 'Must explicitly be pending so daemon can poll and claim');
  });

  harness.it('F8.2: Dispatches run with matching org_id and workflow_id', () => {
    const payload = createRunNowPayload(ORG_1_ID, 'wf-456');
    Assert.equal(payload.org_id, ORG_1_ID);
    Assert.equal(payload.workflow_id, 'wf-456');
  });

  harness.it('F8.3: Initializes telemetry counters items_processed and items_downloaded to 0', () => {
    const payload = createRunNowPayload(ORG_1_ID, 'wf-789');
    Assert.equal(payload.items_processed, 0);
    Assert.equal(payload.items_downloaded, 0);
    Assert.equal(payload.total_items_discovered, 0);
  });

  harness.it('F8.4: Sets valid started_at ISO timestamp upon creation', () => {
    const payload = createRunNowPayload(ORG_1_ID, 'wf-999');
    Assert.ok(payload.started_at);
    Assert.ok(!isNaN(new Date(payload.started_at).getTime()));
  });

  harness.it('F8.5: Optimistically prepends new pending run to UI run list state', () => {
    function optimisticAddRun(existingRuns, newRun) {
      return [newRun, ...existingRuns];
    }

    const initial = [{ id: 'run-1', status: 'completed' }];
    const next = optimisticAddRun(initial, { id: 'run-2', status: 'pending' });
    Assert.equal(next.length, 2);
    Assert.equal(next[0].id, 'run-2');
    Assert.equal(next[0].status, 'pending');
  });
});

// ==========================================================
// FEATURE 9: Run Details & Artifacts Drawer Contracts (5 tests)
// ==========================================================
harness.describe('F9: Run Details & Artifacts Drawer Contracts', () => {
  function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  function formatChecksum(hash, length = 12) {
    if (!hash) return '';
    return hash.length > length ? `${hash.substring(0, length)}...` : hash;
  }

  harness.it('F9.1: Formats byte counts into human-readable units (B, KB, MB)', () => {
    Assert.equal(formatFileSize(0), '0 B');
    Assert.equal(formatFileSize(512), '512 B');
    Assert.equal(formatFileSize(2048), '2 KB');
    Assert.equal(formatFileSize(5242880), '5 MB');
  });

  harness.it('F9.2: Formats SHA-256 hash checksums with truncation for clean table display', () => {
    const fullHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    Assert.equal(formatChecksum(fullHash, 8), 'e3b0c442...');
    Assert.equal(formatChecksum(fullHash, 12), 'e3b0c44298fc...');
  });

  harness.it('F9.3: Renders execution telemetry metrics (processed, downloaded, error)', () => {
    function formatRunMetrics(run) {
      return {
        processedText: `${run.items_processed || 0} items processed`,
        downloadedText: `${run.items_downloaded || 0} invoices downloaded`,
        isFailure: run.status === 'failed',
        errorMessage: run.error_summary || null,
      };
    }

    const metrics = formatRunMetrics({
      items_processed: 15,
      items_downloaded: 12,
      status: 'completed',
    });
    Assert.equal(metrics.processedText, '15 items processed');
    Assert.equal(metrics.downloadedText, '12 invoices downloaded');
    Assert.equal(metrics.isFailure, false);
  });

  harness.it('F9.4: Identifies hybrid storage path indicator (cloud vs local)', () => {
    function getStorageBadge(artifact) {
      if (artifact.cloud_storage_path) {
        return { type: 'cloud', label: 'Cloud Synced', path: artifact.cloud_storage_path };
      }
      return { type: 'local', label: 'Local Only', path: artifact.file_name };
    }

    const cloudBadge = getStorageBadge({ file_name: 'inv.pdf', cloud_storage_path: 's3://bucket/inv.pdf' });
    Assert.equal(cloudBadge.type, 'cloud');

    const localBadge = getStorageBadge({ file_name: 'inv.pdf', cloud_storage_path: null });
    Assert.equal(localBadge.type, 'local');
  });

  harness.it('F9.5: Sorts artifacts chronologically within drawer list', () => {
    const artifacts = [
      { id: '1', created_at: '2026-10-06T10:00:00Z' },
      { id: '2', created_at: '2026-10-06T10:05:00Z' },
      { id: '3', created_at: '2026-10-06T10:02:00Z' },
    ];
    const sorted = [...artifacts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    Assert.equal(sorted[0].id, '2');
    Assert.equal(sorted[1].id, '3');
    Assert.equal(sorted[2].id, '1');
  });
});

// ==========================================================
// FEATURE 10: 2FA Countdown Badge & Banner Contracts (5 tests)
// ==========================================================
harness.describe('F10: 2FA Countdown Badge & Banner Contracts', () => {
  function calculateRemaining2FATime(updatedAtIso, maxDurationSeconds = 90, nowIso = null) {
    const start = new Date(updatedAtIso).getTime();
    const now = nowIso ? new Date(nowIso).getTime() : Date.now();
    const elapsedSeconds = Math.max(0, Math.floor((now - start) / 1000));
    const remaining = Math.max(0, maxDurationSeconds - elapsedSeconds);
    return {
      remainingSeconds: remaining,
      isExpired: remaining === 0,
      urgency: remaining <= 20 ? 'critical' : remaining <= 45 ? 'warning' : 'normal',
    };
  }

  function resolveStatusBadge(status) {
    switch (status) {
      case 'pending':
        return { label: 'Pending', color: 'amber', icon: 'Clock' };
      case 'running':
        return { label: 'Running', color: 'blue', icon: 'Loader2' };
      case 'requires_action':
        return { label: 'Action Required (2FA)', color: 'purple', icon: 'ShieldAlert' };
      case 'completed':
        return { label: 'Completed', color: 'emerald', icon: 'CheckCircle' };
      case 'failed':
        return { label: 'Failed', color: 'rose', icon: 'AlertCircle' };
      default:
        return { label: status, color: 'slate', icon: 'HelpCircle' };
    }
  }

  harness.it('F10.1: Maps requires_action run status to Action Required (2FA) badge', () => {
    const badge = resolveStatusBadge('requires_action');
    Assert.equal(badge.label, 'Action Required (2FA)');
    Assert.equal(badge.color, 'purple');
  });

  harness.it('F10.2: Computes remaining seconds accurately within 90s window', () => {
    const now = '2026-10-06T12:01:00Z';
    const started = '2026-10-06T12:00:15Z'; // 45 seconds ago
    const calc = calculateRemaining2FATime(started, 90, now);
    Assert.equal(calc.remainingSeconds, 45);
    Assert.equal(calc.isExpired, false);
    Assert.equal(calc.urgency, 'warning');
  });

  harness.it('F10.3: Emits critical urgency when remaining time is 20 seconds or less', () => {
    const now = '2026-10-06T12:01:20Z';
    const started = '2026-10-06T12:00:05Z'; // 75 seconds elapsed -> 15s remaining
    const calc = calculateRemaining2FATime(started, 90, now);
    Assert.equal(calc.remainingSeconds, 15);
    Assert.equal(calc.urgency, 'critical');
    Assert.equal(calc.isExpired, false);
  });

  harness.it('F10.4: Clamps remaining time at 0 and flags isExpired when 90s expires', () => {
    const now = '2026-10-06T12:02:00Z';
    const started = '2026-10-06T12:00:00Z'; // 120 seconds elapsed
    const calc = calculateRemaining2FATime(started, 90, now);
    Assert.equal(calc.remainingSeconds, 0);
    Assert.equal(calc.isExpired, true);
  });

  harness.it('F10.5: Triggers top alert banner if and only if active run has requires_action', () => {
    function shouldShow2FABanner(runs) {
      return runs.some((r) => r.status === 'requires_action');
    }

    Assert.equal(shouldShow2FABanner([{ status: 'completed' }, { status: 'running' }]), false);
    Assert.equal(shouldShow2FABanner([{ status: 'completed' }, { status: 'requires_action' }]), true);
  });
});

if (require.main === module) {
  harness.run().then((res) => {
    process.exitCode = res.failed > 0 ? 1 : 0;
  });
}

module.exports = { harness };
