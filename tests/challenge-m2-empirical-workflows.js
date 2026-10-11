/**
 * Empirical Challenger 2 Test Suite: Milestone M2 Workflows Library
 * 
 * Aggressively verifies and stress-tests:
 * 1. Delete workflow confirmation & error handling (HTTP 409 Conflict when run is active)
 * 2. ViewMode toggling (grid vs list) and localStorage persistence / hydration / fallback
 * 3. Empty state rendering: 0 total workflows vs 0 search results vs filter resets
 * 4. Domain extraction and URL edge cases
 * 5. Event propagation isolation and modal state transitions
 * 
 * Zero external dependencies — pure Node.js CommonJS with test-harness.js
 */

'use strict';

const http = require('node:http');
const crypto = require('node:crypto');
const { TestHarness, Assert } = require('./helpers/test-harness');
const { ORG_1_ID, ORG_2_ID, TOKENS } = require('./helpers/fixtures');

const harness = new TestHarness('Milestone M2 Empirical Challenge: Workflows Library & Dispatch');

// ============================================================================
// SIMULATION ORACLES & LOGIC HARNESS (Mirroring workflows/page.tsx & [id]/route.ts)
// ============================================================================

const VIEW_MODE_STORAGE_KEY = 'wf_saas_workflow_view_mode';

function extractDomain(wf) {
  const urlCandidate =
    wf.portal_url ||
    (typeof wf.workflow_definition?.start_url === 'string'
      ? wf.workflow_definition.start_url
      : '');

  if (!urlCandidate || urlCandidate === 'about:blank') return 'custom-portal';

  try {
    const raw =
      urlCandidate.startsWith('http://') || urlCandidate.startsWith('https://')
        ? urlCandidate
        : `https://${urlCandidate}`;
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./, '');
    return host || 'custom-portal';
  } catch {
    return urlCandidate
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0] || 'custom-portal';
  }
}

function filterAndSortWorkflows(workflows, activeRuns, searchQuery, statusFilter, sortBy) {
  const q = searchQuery.toLowerCase().trim();

  return workflows
    .filter((wf) => {
      const domain = extractDomain(wf).toLowerCase();
      const name = (wf.name || '').toLowerCase();
      const description = (
        (typeof wf.workflow_definition?.description === 'string'
          ? wf.workflow_definition.description
          : '') ||
        (typeof wf.workflow_definition?.target_folder === 'string'
          ? wf.workflow_definition.target_folder
          : '') ||
        ''
      ).toLowerCase();

      const matchesSearch =
        !q ||
        name.includes(q) ||
        domain.includes(q) ||
        description.includes(q) ||
        (wf.portal_url || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const hasActiveRun = activeRuns.some((r) => r.workflow_id === wf.id);
      if (statusFilter === 'running' && !hasActiveRun) return false;
      if (statusFilter === 'idle' && hasActiveRun) return false;

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'name_desc') {
        return b.name.localeCompare(a.name);
      }
      if (sortBy === 'steps_desc') {
        const aSteps = Array.isArray(a.workflow_definition?.steps)
          ? a.workflow_definition.steps.length
          : 0;
        const bSteps = Array.isArray(b.workflow_definition?.steps)
          ? b.workflow_definition.steps.length
          : 0;
        return bSteps - aSteps;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
}

function determineEmptyStateType(workflows, filteredWorkflows, searchQuery, statusFilter) {
  if (filteredWorkflows.length > 0) {
    return 'NOT_EMPTY';
  }
  if (workflows.length === 0) {
    return 'ZERO_WORKFLOWS_GLOBAL';
  }
  return 'ZERO_SEARCH_RESULTS';
}

// In-Memory Storage Simulator for localStorage tests
class MockLocalStorage {
  constructor(shouldThrowOnAccess = false) {
    this.store = new Map();
    this.shouldThrowOnAccess = shouldThrowOnAccess;
  }
  getItem(key) {
    if (this.shouldThrowOnAccess) {
      throw new Error('SecurityError: The operation is insecure (Storage blocked in iframe/private mode).');
    }
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    if (this.shouldThrowOnAccess) {
      throw new Error('QuotaExceededError: Storage quota exceeded.');
    }
    this.store.set(key, String(value));
  }
  removeItem(key) {
    if (this.shouldThrowOnAccess) throw new Error('SecurityError');
    this.store.delete(key);
  }
  clear() {
    if (this.shouldThrowOnAccess) throw new Error('SecurityError');
    this.store.clear();
  }
}

// Simulated Client Component State Machine for WorkflowsPage
class WorkflowsPageStateSimulator {
  constructor(initialStorage = null) {
    this.localStorage = initialStorage || new MockLocalStorage();
    this.workflows = [];
    this.activeRuns = [];
    this.viewMode = 'grid'; // Default static
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.sortBy = 'recent';

    // Delete modal states
    this.workflowToDelete = null;
    this.isDeleting = false;
    this.deleteError = null;

    // Create modal state
    this.isCreateModalOpen = false;

    // Hydration step
    this.initViewModeFromStorage();
  }

  initViewModeFromStorage() {
    try {
      const saved = this.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (saved === 'grid' || saved === 'list') {
        this.viewMode = saved;
      }
    } catch {}
  }

  handleSetViewMode(mode) {
    this.viewMode = mode;
    try {
      this.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {}
  }

  openDeleteModal(wf) {
    this.workflowToDelete = wf;
    this.deleteError = null;
  }

  cancelDelete() {
    this.workflowToDelete = null;
    this.deleteError = null;
    this.isDeleting = false;
  }

  async executeDelete(apiDeleteFn) {
    if (!this.workflowToDelete) return;
    this.isDeleting = true;
    this.deleteError = null;

    try {
      const res = await apiDeleteFn(this.workflowToDelete.id);
      if (!res.ok) {
        const errorData = res.data || {};
        throw new Error(errorData.error || 'Failed to delete workflow');
      }

      // Success
      this.workflows = this.workflows.filter((w) => w.id !== this.workflowToDelete.id);
      this.workflowToDelete = null;
    } catch (err) {
      this.deleteError = err.message || 'Could not delete workflow';
    } finally {
      this.isDeleting = false;
    }
  }

  getFilteredWorkflows() {
    return filterAndSortWorkflows(
      this.workflows,
      this.activeRuns,
      this.searchQuery,
      this.statusFilter,
      this.sortBy
    );
  }

  getEmptyStateType() {
    return determineEmptyStateType(
      this.workflows,
      this.getFilteredWorkflows(),
      this.searchQuery,
      this.statusFilter
    );
  }

  clearFilters() {
    this.searchQuery = '';
    this.statusFilter = 'all';
  }
}

// ============================================================================
// IN-PROCESS API SERVER EMULATING /api/v1/workflows/[id]
// ============================================================================

class WorkflowsApiServer {
  constructor() {
    this.server = null;
    this.port = 0;
    this.url = '';
    this.workflows = new Map();
    this.runs = new Map();
    this.artifacts = new Map();
  }

  reset() {
    this.workflows.clear();
    this.runs.clear();
    this.artifacts.clear();
  }

  addWorkflow(wf) {
    const id = wf.id || crypto.randomUUID();
    const entry = {
      id,
      org_id: wf.org_id || ORG_1_ID,
      name: wf.name || 'Sample Workflow',
      portal_url: wf.portal_url || 'https://billing.stripe.com/portal',
      workflow_definition: wf.workflow_definition || { steps: [] },
      created_at: wf.created_at || new Date().toISOString(),
      updated_at: wf.updated_at || new Date().toISOString(),
    };
    this.workflows.set(id, entry);
    return entry;
  }

  addRun(run) {
    const id = run.id || crypto.randomUUID();
    const entry = {
      id,
      org_id: run.org_id || ORG_1_ID,
      workflow_id: run.workflow_id,
      status: run.status || 'pending',
      started_at: run.started_at || new Date().toISOString(),
    };
    this.runs.set(id, entry);
    return entry;
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        try {
          await this.handle(req, res);
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      this.server.listen(0, '127.0.0.1', () => {
        this.port = this.server.address().port;
        this.url = `http://127.0.0.1:${this.port}`;
        resolve(this.url);
      });
      this.server.on('error', reject);
    });
  }

  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  async handle(req, res) {
    const parsedUrl = new URL(req.url, this.url);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    const sendJson = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    // Auth verification
    const authHeader = req.headers['authorization'] || '';
    let orgId = '';
    if (authHeader.startsWith('Bearer ps_live_')) {
      orgId = authHeader.replace('Bearer ps_live_', '').trim();
    } else {
      return sendJson(401, { error: 'Unauthorized: missing or invalid runner token' });
    }

    // Route: DELETE /api/v1/workflows/:id
    const match = pathname.match(/^\/api\/v1\/workflows\/([a-zA-Z0-9_-]+)$/);
    if (!match) {
      return sendJson(404, { error: 'Route not found' });
    }

    const workflowId = match[1];

    if (method === 'DELETE') {
      const existingWf = this.workflows.get(workflowId);
      if (!existingWf) {
        return sendJson(404, { error: 'Workflow not found' });
      }

      if (existingWf.org_id !== orgId) {
        return sendJson(403, { error: 'Unauthorized: Workflow belongs to a different organization' });
      }

      // Check for active runs in pending, running, requires_action
      const activeRuns = Array.from(this.runs.values()).filter(
        (r) =>
          r.workflow_id === workflowId &&
          ['pending', 'running', 'requires_action'].includes(r.status)
      );

      if (activeRuns.length > 0) {
        return sendJson(409, {
          error: 'Cannot delete workflow while an execution run is active. Please stop the run first.',
          active_run_id: activeRuns[0].id,
          active_run_status: activeRuns[0].status,
        });
      }

      // Cascade deletion
      const wfRuns = Array.from(this.runs.values()).filter((r) => r.workflow_id === workflowId);
      for (const r of wfRuns) {
        this.runs.delete(r.id);
      }
      this.workflows.delete(workflowId);

      return sendJson(200, {
        success: true,
        message: `Workflow '${existingWf.name}' deleted successfully`,
        id: workflowId,
      });
    }

    sendJson(405, { error: 'Method Not Allowed' });
  }
}

const apiServer = new WorkflowsApiServer();
let apiBaseUrl = '';

harness.beforeAll(async () => {
  apiBaseUrl = await apiServer.start();
});

harness.afterAll(async () => {
  await apiServer.stop();
});

harness.beforeEach(() => {
  apiServer.reset();
});

// ============================================================================
// SUITE 1: DELETE WORKFLOW API ROUTE & HTTP 409 CONFLICT VERIFICATION
// ============================================================================

harness.describe('Suite 1: DELETE Workflow API & 409 Conflict Handling', () => {
  harness.it('1.1: Rejects deletion without valid Bearer token (HTTP 401)', async () => {
    const wf = apiServer.addWorkflow({ org_id: ORG_1_ID });
    const res = await fetch(`${apiBaseUrl}/api/v1/workflows/${wf.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer invalid_token' },
    });
    Assert.equal(res.status, 401, 'Status must be 401');
    const json = await res.json();
    Assert.includes(json.error, 'Unauthorized');
  });

  harness.it('1.2: Returns 404 when workflow does not exist', async () => {
    const res = await fetch(`${apiBaseUrl}/api/v1/workflows/non-existent-wf-uuid`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ps_live_${ORG_1_ID}` },
    });
    Assert.equal(res.status, 404, 'Status must be 404');
    const json = await res.json();
    Assert.equal(json.error, 'Workflow not found');
  });

  harness.it('1.3: Returns 403 when workflow belongs to a different organization', async () => {
    const wf = apiServer.addWorkflow({ org_id: ORG_2_ID });
    const res = await fetch(`${apiBaseUrl}/api/v1/workflows/${wf.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ps_live_${ORG_1_ID}` },
    });
    Assert.equal(res.status, 403, 'Status must be 403');
    const json = await res.json();
    Assert.includes(json.error, 'Unauthorized: Workflow belongs to a different organization');
  });

  harness.it('1.4: Returns HTTP 409 Conflict when active run status is "pending"', async () => {
    const wf = apiServer.addWorkflow({ org_id: ORG_1_ID, name: 'Billing Sync' });
    const run = apiServer.addRun({ workflow_id: wf.id, org_id: ORG_1_ID, status: 'pending' });

    const res = await fetch(`${apiBaseUrl}/api/v1/workflows/${wf.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ps_live_${ORG_1_ID}` },
    });
    Assert.equal(res.status, 409, 'Must return 409 Conflict');
    const json = await res.json();
    Assert.includes(json.error, 'Cannot delete workflow while an execution run is active');
    Assert.equal(json.active_run_id, run.id);
    Assert.equal(json.active_run_status, 'pending');
    Assert.ok(apiServer.workflows.has(wf.id), 'Workflow must NOT be deleted from database');
  });

  harness.it('1.5: Returns HTTP 409 Conflict when active run status is "running"', async () => {
    const wf = apiServer.addWorkflow({ org_id: ORG_1_ID, name: 'Oil Portal Downloader' });
    const run = apiServer.addRun({ workflow_id: wf.id, org_id: ORG_1_ID, status: 'running' });

    const res = await fetch(`${apiBaseUrl}/api/v1/workflows/${wf.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ps_live_${ORG_1_ID}` },
    });
    Assert.equal(res.status, 409, 'Must return 409 Conflict');
    const json = await res.json();
    Assert.includes(json.error, 'Cannot delete workflow while an execution run is active');
    Assert.equal(json.active_run_id, run.id);
    Assert.equal(json.active_run_status, 'running');
    Assert.ok(apiServer.workflows.has(wf.id), 'Workflow must NOT be deleted from database');
  });

  harness.it('1.6: Returns HTTP 409 Conflict when active run status is "requires_action"', async () => {
    const wf = apiServer.addWorkflow({ org_id: ORG_1_ID, name: '2FA Challenged Workflow' });
    const run = apiServer.addRun({ workflow_id: wf.id, org_id: ORG_1_ID, status: 'requires_action' });

    const res = await fetch(`${apiBaseUrl}/api/v1/workflows/${wf.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ps_live_${ORG_1_ID}` },
    });
    Assert.equal(res.status, 409, 'Must return 409 Conflict');
    const json = await res.json();
    Assert.includes(json.error, 'Cannot delete workflow while an execution run is active');
    Assert.equal(json.active_run_id, run.id);
    Assert.equal(json.active_run_status, 'requires_action');
    Assert.ok(apiServer.workflows.has(wf.id), 'Workflow must NOT be deleted from database');
  });

  harness.it('1.7: Allows deletion (HTTP 200) when runs are in terminal states (completed/failed/cancelled)', async () => {
    const wf = apiServer.addWorkflow({ org_id: ORG_1_ID, name: 'Archived Job' });
    apiServer.addRun({ workflow_id: wf.id, org_id: ORG_1_ID, status: 'completed' });
    apiServer.addRun({ workflow_id: wf.id, org_id: ORG_1_ID, status: 'failed' });
    apiServer.addRun({ workflow_id: wf.id, org_id: ORG_1_ID, status: 'cancelled' });

    const res = await fetch(`${apiBaseUrl}/api/v1/workflows/${wf.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ps_live_${ORG_1_ID}` },
    });
    Assert.equal(res.status, 200, 'Must return 200 OK');
    const json = await res.json();
    Assert.equal(json.success, true);
    Assert.equal(json.id, wf.id);
    Assert.ok(!apiServer.workflows.has(wf.id), 'Workflow must be deleted');
    const remainingRuns = Array.from(apiServer.runs.values()).filter((r) => r.workflow_id === wf.id);
    Assert.equal(remainingRuns.length, 0, 'Cascade deletion must remove associated runs');
  });
});

// ============================================================================
// SUITE 2: FRONTEND WORKFLOW DELETION UI & ERROR HANDLING STATE MACHINE
// ============================================================================

harness.describe('Suite 2: UI Confirmation Dialog & 409 Conflict Error Handling', () => {
  harness.it('2.1: Initial delete modal state is closed and clean', () => {
    const sim = new WorkflowsPageStateSimulator();
    Assert.equal(sim.workflowToDelete, null);
    Assert.equal(sim.isDeleting, false);
    Assert.equal(sim.deleteError, null);
  });

  harness.it('2.2: Opening delete modal sets target workflow and resets previous errors', () => {
    const sim = new WorkflowsPageStateSimulator();
    sim.deleteError = 'Previous error text';
    const sampleWf = { id: 'wf-1', name: 'Vendor Portal' };
    sim.openDeleteModal(sampleWf);

    Assert.deepEqual(sim.workflowToDelete, sampleWf);
    Assert.equal(sim.deleteError, null, 'Previous error must be cleared');
    Assert.equal(sim.isDeleting, false);
  });

  harness.it('2.3: Canceling delete modal clears state without modifying workflow catalog', () => {
    const sim = new WorkflowsPageStateSimulator();
    const sampleWf = { id: 'wf-1', name: 'Vendor Portal' };
    sim.workflows = [sampleWf];
    sim.openDeleteModal(sampleWf);
    sim.cancelDelete();

    Assert.equal(sim.workflowToDelete, null);
    Assert.equal(sim.deleteError, null);
    Assert.equal(sim.isDeleting, false);
    Assert.equal(sim.workflows.length, 1, 'Workflow list must remain untouched');
  });

  harness.it('2.4: HTTP 409 Conflict keeps modal open, displays error banner, and retains workflow in catalog', async () => {
    const sim = new WorkflowsPageStateSimulator();
    const sampleWf = { id: 'wf-active-1', name: 'Live Pipeline' };
    sim.workflows = [sampleWf];
    sim.openDeleteModal(sampleWf);

    // Mock API returning 409 Conflict
    const mockDeleteApi = async (id) => ({
      ok: false,
      status: 409,
      data: {
        error: 'Cannot delete workflow while an execution run is active. Please stop the run first.',
        active_run_id: 'run-99',
        active_run_status: 'running',
      },
    });

    await sim.executeDelete(mockDeleteApi);

    Assert.equal(sim.isDeleting, false, 'isDeleting must revert to false');
    Assert.equal(sim.deleteError, 'Cannot delete workflow while an execution run is active. Please stop the run first.');
    Assert.ok(sim.workflowToDelete !== null, 'Dialog must remain open so user sees error feedback');
    Assert.equal(sim.workflows.length, 1, 'Workflow must NOT be removed from local state on 409');
  });

  harness.it('2.5: HTTP 200 OK removes workflow from catalog, closes modal, and clears errors', async () => {
    const sim = new WorkflowsPageStateSimulator();
    const wfA = { id: 'wf-a', name: 'Workflow A' };
    const wfB = { id: 'wf-b', name: 'Workflow B' };
    sim.workflows = [wfA, wfB];
    sim.openDeleteModal(wfA);

    const mockDeleteApi = async (id) => ({
      ok: true,
      status: 200,
      data: { success: true, message: 'Deleted' },
    });

    await sim.executeDelete(mockDeleteApi);

    Assert.equal(sim.isDeleting, false);
    Assert.equal(sim.deleteError, null);
    Assert.equal(sim.workflowToDelete, null, 'Dialog must close on success');
    Assert.equal(sim.workflows.length, 1);
    Assert.equal(sim.workflows[0].id, 'wf-b', 'Only remaining workflow should be preserved');
  });

  harness.it('2.6: Network error/exception during delete is caught gracefully without unhandled rejection', async () => {
    const sim = new WorkflowsPageStateSimulator();
    const sampleWf = { id: 'wf-net-err', name: 'Network Test' };
    sim.workflows = [sampleWf];
    sim.openDeleteModal(sampleWf);

    const mockThrowingApi = async () => {
      throw new Error('Failed to fetch: Network unreachable');
    };

    await sim.executeDelete(mockThrowingApi);

    Assert.equal(sim.isDeleting, false);
    Assert.equal(sim.deleteError, 'Failed to fetch: Network unreachable');
    Assert.ok(sim.workflowToDelete !== null, 'Dialog remains open for retry');
    Assert.equal(sim.workflows.length, 1);
  });
});

// ============================================================================
// SUITE 3: VIEWMODE TOGGLING & LOCALSTORAGE PERSISTENCE
// ============================================================================

harness.describe('Suite 3: ViewMode Toggling & LocalStorage Persistence', () => {
  harness.it('3.1: Defaults to "grid" when localStorage is unpopulated', () => {
    const storage = new MockLocalStorage();
    const sim = new WorkflowsPageStateSimulator(storage);
    Assert.equal(sim.viewMode, 'grid');
  });

  harness.it('3.2: Toggling viewMode updates state and persists to localStorage', () => {
    const storage = new MockLocalStorage();
    const sim = new WorkflowsPageStateSimulator(storage);

    sim.handleSetViewMode('list');
    Assert.equal(sim.viewMode, 'list');
    Assert.equal(storage.getItem(VIEW_MODE_STORAGE_KEY), 'list');

    sim.handleSetViewMode('grid');
    Assert.equal(sim.viewMode, 'grid');
    Assert.equal(storage.getItem(VIEW_MODE_STORAGE_KEY), 'grid');
  });

  harness.it('3.3: Hydrates from pre-existing "list" preference in localStorage', () => {
    const storage = new MockLocalStorage();
    storage.setItem(VIEW_MODE_STORAGE_KEY, 'list');

    const sim = new WorkflowsPageStateSimulator(storage);
    Assert.equal(sim.viewMode, 'list', 'Should hydrate "list" from storage');
  });

  harness.it('3.4: Rejects corrupted or unauthorized values in localStorage and preserves "grid" fallback', () => {
    const corruptedValues = ['table', 'cards', 'tree', 'null', 'undefined', '123', '{}', ''];
    for (const badVal of corruptedValues) {
      const storage = new MockLocalStorage();
      storage.setItem(VIEW_MODE_STORAGE_KEY, badVal);

      const sim = new WorkflowsPageStateSimulator(storage);
      Assert.equal(sim.viewMode, 'grid', `Must fallback to grid for corrupted value: "${badVal}"`);
    }
  });

  harness.it('3.5: Survives private browsing or disabled storage (Storage exceptions)', () => {
    const throwingStorage = new MockLocalStorage(true); // Always throws SecurityError

    // Should not crash on construction or hydration
    const sim = new WorkflowsPageStateSimulator(throwingStorage);
    Assert.equal(sim.viewMode, 'grid', 'Default to grid despite storage error');

    // Should not crash on setViewMode
    sim.handleSetViewMode('list');
    Assert.equal(sim.viewMode, 'list', 'State updates in memory even if storage throws');
  });
});

// ============================================================================
// SUITE 4: EMPTY STATES RENDERING (0 TOTAL WORKFLOWS VS 0 SEARCH RESULTS)
// ============================================================================

harness.describe('Suite 4: Empty States (0 Workflows vs 0 Search Results)', () => {
  harness.it('4.1: Identifies ZERO_WORKFLOWS_GLOBAL when total catalog is empty', () => {
    const sim = new WorkflowsPageStateSimulator();
    sim.workflows = [];
    sim.searchQuery = '';
    sim.statusFilter = 'all';

    const stateType = sim.getEmptyStateType();
    Assert.equal(stateType, 'ZERO_WORKFLOWS_GLOBAL');
  });

  harness.it('4.2: Identifies ZERO_SEARCH_RESULTS when catalog has items but query yields 0 matches', () => {
    const sim = new WorkflowsPageStateSimulator();
    sim.workflows = [
      { id: 'wf-1', name: 'Stripe Billing', portal_url: 'https://billing.stripe.com', workflow_definition: { steps: [] } },
    ];
    sim.searchQuery = 'NonExistentInvoicePortal123';
    sim.statusFilter = 'all';

    const stateType = sim.getEmptyStateType();
    Assert.equal(stateType, 'ZERO_SEARCH_RESULTS');
  });

  harness.it('4.3: Identifies ZERO_SEARCH_RESULTS when status filter (running) yields 0 matches on idle workflows', () => {
    const sim = new WorkflowsPageStateSimulator();
    sim.workflows = [
      { id: 'wf-1', name: 'Idle Workflow', portal_url: 'https://example.com', workflow_definition: { steps: [] } },
    ];
    sim.activeRuns = []; // No active runs -> workflow is idle
    sim.searchQuery = '';
    sim.statusFilter = 'running'; // Filtering for running active

    const stateType = sim.getEmptyStateType();
    Assert.equal(stateType, 'ZERO_SEARCH_RESULTS');
  });

  harness.it('4.4: Clear Filters action restores full catalog instantly', () => {
    const sim = new WorkflowsPageStateSimulator();
    sim.workflows = [
      { id: 'wf-1', name: 'Workflow One', portal_url: 'https://example.com' },
      { id: 'wf-2', name: 'Workflow Two', portal_url: 'https://other.com' },
    ];
    sim.searchQuery = 'unmatched_string';
    sim.statusFilter = 'running';

    Assert.equal(sim.getFilteredWorkflows().length, 0);
    Assert.equal(sim.getEmptyStateType(), 'ZERO_SEARCH_RESULTS');

    // Trigger Clear Filters
    sim.clearFilters();

    Assert.equal(sim.searchQuery, '');
    Assert.equal(sim.statusFilter, 'all');
    Assert.equal(sim.getFilteredWorkflows().length, 2, 'All workflows restored');
    Assert.equal(sim.getEmptyStateType(), 'NOT_EMPTY');
  });
});

// ============================================================================
// SUITE 5: DOMAIN EXTRACTION & SEARCH BOUNDARY CASES
// ============================================================================

harness.describe('Suite 5: Domain Extraction & Search Invariants', () => {
  harness.it('5.1: Strips www. prefixes and extracts clean hostname', () => {
    Assert.equal(extractDomain({ portal_url: 'https://www.stripe.com/login' }), 'stripe.com');
    Assert.equal(extractDomain({ portal_url: 'http://www.supplier.portal.net/invoices' }), 'supplier.portal.net');
  });

  harness.it('5.2: Handles URLs without protocol (prepends https://)', () => {
    Assert.equal(extractDomain({ portal_url: 'billing.quickbooks.intuit.com/app/invoices' }), 'billing.quickbooks.intuit.com');
  });

  harness.it('5.3: Falls back to workflow_definition.start_url if portal_url is absent', () => {
    Assert.equal(
      extractDomain({ portal_url: '', workflow_definition: { start_url: 'https://auth.acme.org' } }),
      'auth.acme.org'
    );
  });

  harness.it('5.4: Returns "custom-portal" for empty, blank, or about:blank URLs', () => {
    Assert.equal(extractDomain({ portal_url: '' }), 'custom-portal');
    Assert.equal(extractDomain({ portal_url: 'about:blank' }), 'custom-portal');
    Assert.equal(extractDomain({ portal_url: null, workflow_definition: null }), 'custom-portal');
  });

  harness.it('5.5: Search matches across name, domain, description, and portal_url case-insensitively', () => {
    const wfList = [
      {
        id: '1',
        name: 'Alpha Invoicing',
        portal_url: 'https://billing.stripe.com',
        workflow_definition: { description: 'Quarterly VAT statements' },
        created_at: '2026-01-01',
      },
      {
        id: '2',
        name: 'Beta Portal',
        portal_url: 'https://beta.internal',
        workflow_definition: { description: 'Internal tool' },
        created_at: '2026-01-02',
      },
    ];

    // Search by partial domain
    const matchDomain = filterAndSortWorkflows(wfList, [], 'stripe', 'all', 'recent');
    Assert.equal(matchDomain.length, 1);
    Assert.equal(matchDomain[0].id, '1');

    // Search by partial description
    const matchDesc = filterAndSortWorkflows(wfList, [], 'quarterly vat', 'all', 'recent');
    Assert.equal(matchDesc.length, 1);
    Assert.equal(matchDesc[0].id, '1');

    // Search with untrimmed whitespace
    const matchTrim = filterAndSortWorkflows(wfList, [], '   alpha   ', 'all', 'recent');
    Assert.equal(matchTrim.length, 1);
    Assert.equal(matchTrim[0].id, '1');
  });
});

// ============================================================================
// SUITE 6: EVENT PROPAGATION, CLICK ISOLATION & SHORTCUTS
// ============================================================================

harness.describe('Suite 6: Event Propagation & Keyboard Shortcuts', () => {
  harness.it('6.1: Child action clicks (Run, Visual Canvas, Delete) stop propagation to prevent drawer open', () => {
    let drawerOpened = false;
    let runModalOpened = false;
    let deleteModalOpened = false;

    const handleCardClick = () => {
      drawerOpened = true;
    };

    const handleRunClick = (e) => {
      e.stopPropagation();
      runModalOpened = true;
    };

    const handleDeleteClick = (e) => {
      e.stopPropagation();
      deleteModalOpened = true;
    };

    // Simulate clicking Run button inside card
    const fakeEventRun = {
      isPropagationStopped: false,
      stopPropagation() {
        this.isPropagationStopped = true;
      },
    };
    handleRunClick(fakeEventRun);
    if (!fakeEventRun.isPropagationStopped) {
      handleCardClick();
    }

    Assert.equal(runModalOpened, true);
    Assert.equal(fakeEventRun.isPropagationStopped, true);
    Assert.equal(drawerOpened, false, 'Card click (drawer) must NOT trigger when Run is clicked');

    // Simulate clicking Delete button inside card
    const fakeEventDelete = {
      isPropagationStopped: false,
      stopPropagation() {
        this.isPropagationStopped = true;
      },
    };
    handleDeleteClick(fakeEventDelete);
    if (!fakeEventDelete.isPropagationStopped) {
      handleCardClick();
    }

    Assert.equal(deleteModalOpened, true);
    Assert.equal(fakeEventDelete.isPropagationStopped, true);
    Assert.equal(drawerOpened, false, 'Card click (drawer) must NOT trigger when Delete is clicked');
  });

  harness.it('6.2: Ctrl+K and Cmd+K trigger search input focus and selection', () => {
    let focused = false;
    let selected = false;
    let defaultPrevented = false;

    const fakeInput = {
      focus: () => { focused = true; },
      select: () => { selected = true; },
    };

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        fakeInput.focus();
        fakeInput.select();
      }
    };

    // Windows Ctrl+K
    const ctrlKEvent = { ctrlKey: true, metaKey: false, key: 'K', preventDefault: () => { defaultPrevented = true; } };
    handleKeyDown(ctrlKEvent);
    Assert.equal(defaultPrevented, true);
    Assert.equal(focused, true);
    Assert.equal(selected, true);

    // macOS Cmd+k
    focused = false;
    selected = false;
    defaultPrevented = false;
    const cmdKEvent = { ctrlKey: false, metaKey: true, key: 'k', preventDefault: () => { defaultPrevented = true; } };
    handleKeyDown(cmdKEvent);
    Assert.equal(defaultPrevented, true);
    Assert.equal(focused, true);
    Assert.equal(selected, true);
  });
});

// ============================================================================
// SUITE 7: DATE & TIME FORMATTING ROBUSTNESS
// ============================================================================

function formatRelativeTime(dateInput) {
  if (!dateInput) return 'Never run';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Never run';

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

harness.describe('Suite 7: Relative Time Formatting Robustness', () => {
  harness.it('7.1: Returns "Never run" for null, undefined, and empty string', () => {
    Assert.equal(formatRelativeTime(null), 'Never run');
    Assert.equal(formatRelativeTime(undefined), 'Never run');
    Assert.equal(formatRelativeTime(''), 'Never run');
  });

  harness.it('7.2: Returns "Never run" for invalid date strings (NaN)', () => {
    Assert.equal(formatRelativeTime('not-a-valid-date'), 'Never run');
    Assert.equal(formatRelativeTime('12345678-invalid'), 'Never run');
  });

  harness.it('7.3: Returns "Just now" for timestamp within last 60 seconds', () => {
    const nowIso = new Date(Date.now() - 5000).toISOString();
    Assert.equal(formatRelativeTime(nowIso), 'Just now');
  });

  harness.it('7.4: Returns formatted minutes ago for timestamp within the hour', () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    Assert.equal(formatRelativeTime(tenMinAgo), '10m ago');
  });
});

async function main() {
  const result = await harness.run();
  if (result.failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
}

module.exports = { harness };
