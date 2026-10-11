/**
 * Milestone M1 Empirical Challenge & Stress Test Suite
 * 
 * Verifies:
 * 1. DashboardContext.tsx stopActiveRun logic:
 *    - Graceful handling of network failure (fetch throws)
 *    - Graceful handling of HTTP 400, 404, 409, 500 responses
 *    - Local state update and dashboard refresh on HTTP 200
 *    - SelectedRun matching and non-matching isolation
 * 2. ExecutionPreflightModal.tsx:
 *    - Submitting state and button disabling
 *    - Error banner display on failure (HTTP 400, 500, network error)
 *    - Success workflow: refreshDashboard, onClose, onRunDispatched, openRunDetails
 *    - Runner readiness indicators (online vs offline)
 *    - Mode toggling (single vs loop) and batch parameter resolution
 * 3. /api/v1/runs route defensively handling status 'STOPPED', snake_case & camelCase variants
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { TestHarness, Assert } = require('./helpers/test-harness');

const harness = new TestHarness('Milestone M1 Empirical Challenge: Context, Preflight Modal & Runs API');

// ============================================================================
// SUITE 1: DashboardContext stopActiveRun Empirical Stress Testing
// ============================================================================
harness.describe('M1-CTX: DashboardContext stopActiveRun Logic & Defensiveness', () => {

  // Factory simulating DashboardContext stopActiveRun implementation
  function createStopActiveRunHarness(initialState = {}) {
    let selectedRun = initialState.selectedRun !== undefined ? initialState.selectedRun : null;
    let refreshCount = 0;
    const fetchCalls = [];

    const mockRefreshDashboard = async () => {
      refreshCount++;
    };

    const mockFetch = async (url, options) => {
      fetchCalls.push({ url, options });
      if (initialState.fetchBehavior) {
        return initialState.fetchBehavior(url, options);
      }
      return { ok: true, status: 200, json: async () => ({ run: { id: 'run-1', status: 'cancelled' } }) };
    };

    // Exact logic from apps/web/src/context/DashboardContext.tsx:154-172
    const stopActiveRun = async (runId) => {
      try {
        const res = await mockFetch(`/api/v1/runs`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ run_id: runId, status: 'cancelled' })
        });
        if (res.ok) {
          if (selectedRun && selectedRun.id === runId) {
            selectedRun = { ...selectedRun, status: 'cancelled' };
          }
          await mockRefreshDashboard();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    };

    return {
      stopActiveRun,
      getSelectedRun: () => selectedRun,
      getRefreshCount: () => refreshCount,
      getFetchCalls: () => fetchCalls,
    };
  }

  harness.it('M1-CTX.1: Network failure (fetch throws TypeError) returns false, does not throw or corrupt state', async () => {
    const ctx = createStopActiveRunHarness({
      selectedRun: { id: 'run-123', status: 'running', workflowName: 'Invoice Scraper' },
      fetchBehavior: async () => {
        throw new TypeError('Failed to fetch: NetworkError when attempting to fetch resource.');
      }
    });

    const result = await ctx.stopActiveRun('run-123');

    Assert.equal(result, false, 'stopActiveRun must return false on network failure');
    Assert.equal(ctx.getSelectedRun().status, 'running', 'selectedRun status must remain untouched on failure');
    Assert.equal(ctx.getRefreshCount(), 0, 'refreshDashboard must NOT be called on failure');
    Assert.equal(ctx.getFetchCalls().length, 1, 'Fetch was attempted exactly once');
  });

  harness.it('M1-CTX.2: HTTP 400 Bad Request returns false, preserves state, does not refresh', async () => {
    const ctx = createStopActiveRunHarness({
      selectedRun: { id: 'run-123', status: 'running' },
      fetchBehavior: async () => ({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid status transition' })
      })
    });

    const result = await ctx.stopActiveRun('run-123');

    Assert.equal(result, false, 'Returns false on 400 response');
    Assert.equal(ctx.getSelectedRun().status, 'running', 'Status remains unchanged');
    Assert.equal(ctx.getRefreshCount(), 0, 'No refresh triggered');
  });

  harness.it('M1-CTX.3: HTTP 404 Not Found returns false gracefully', async () => {
    const ctx = createStopActiveRunHarness({
      selectedRun: { id: 'run-non-existent', status: 'running' },
      fetchBehavior: async () => ({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Run not found' })
      })
    });

    const result = await ctx.stopActiveRun('run-non-existent');
    Assert.equal(result, false, 'Returns false on 404');
    Assert.equal(ctx.getRefreshCount(), 0);
  });

  harness.it('M1-CTX.4: HTTP 409 Conflict (e.g. concurrent claim or invalid state) returns false', async () => {
    const ctx = createStopActiveRunHarness({
      selectedRun: { id: 'run-completed', status: 'completed' },
      fetchBehavior: async () => ({
        ok: false,
        status: 409,
        json: async () => ({ error: 'Run already completed' })
      })
    });

    const result = await ctx.stopActiveRun('run-completed');
    Assert.equal(result, false, 'Returns false on 409 conflict');
    Assert.equal(ctx.getSelectedRun().status, 'completed');
    Assert.equal(ctx.getRefreshCount(), 0);
  });

  harness.it('M1-CTX.5: HTTP 500 Server Error returns false without bubbling exception', async () => {
    const ctx = createStopActiveRunHarness({
      selectedRun: { id: 'run-1', status: 'running' },
      fetchBehavior: async () => ({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' })
      })
    });

    const result = await ctx.stopActiveRun('run-1');
    Assert.equal(result, false, 'Returns false on 500 error');
    Assert.equal(ctx.getSelectedRun().status, 'running');
  });

  harness.it('M1-CTX.6: HTTP 200 Success sends correct payload, updates selectedRun and refreshes dashboard', async () => {
    const initialRun = { id: 'run-active-99', status: 'running', workflowName: 'E-commerce Orders' };
    const ctx = createStopActiveRunHarness({
      selectedRun: initialRun,
      fetchBehavior: async () => ({
        ok: true,
        status: 200,
        json: async () => ({ run: { id: 'run-active-99', status: 'cancelled' } })
      })
    });

    const result = await ctx.stopActiveRun('run-active-99');

    Assert.equal(result, true, 'Returns true on HTTP 200');
    Assert.equal(ctx.getSelectedRun().status, 'cancelled', 'selectedRun must transition to cancelled');
    Assert.equal(ctx.getSelectedRun().workflowName, 'E-commerce Orders', 'Preserves other selectedRun fields');
    Assert.equal(ctx.getRefreshCount(), 1, 'refreshDashboard was called once');

    // Verify wire payload
    const calls = ctx.getFetchCalls();
    Assert.equal(calls.length, 1);
    Assert.equal(calls[0].url, '/api/v1/runs');
    Assert.equal(calls[0].options.method, 'PATCH');
    Assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
    const parsedBody = JSON.parse(calls[0].options.body);
    Assert.equal(parsedBody.run_id, 'run-active-99', 'Payload run_id matches target');
    Assert.equal(parsedBody.status, 'cancelled', 'Payload status is explicitly cancelled');
  });

  harness.it('M1-CTX.7: HTTP 200 Success when selectedRun is null does not throw', async () => {
    const ctx = createStopActiveRunHarness({
      selectedRun: null,
      fetchBehavior: async () => ({ ok: true, status: 200 })
    });

    const result = await ctx.stopActiveRun('run-any');
    Assert.equal(result, true, 'Returns true');
    Assert.equal(ctx.getSelectedRun(), null, 'selectedRun remains null');
    Assert.equal(ctx.getRefreshCount(), 1, 'Dashboard still refreshed');
  });

  harness.it('M1-CTX.8: HTTP 200 Success when a DIFFERENT run is selected does NOT mutate it', async () => {
    const ctx = createStopActiveRunHarness({
      selectedRun: { id: 'run-other', status: 'running' },
      fetchBehavior: async () => ({ ok: true, status: 200 })
    });

    const result = await ctx.stopActiveRun('run-different');
    Assert.equal(result, true);
    Assert.equal(ctx.getSelectedRun().id, 'run-other');
    Assert.equal(ctx.getSelectedRun().status, 'running', 'Does not overwrite status of unrelated run');
    Assert.equal(ctx.getRefreshCount(), 1);
  });
});

// ============================================================================
// SUITE 2: ExecutionPreflightModal Logic & Empirical State Testing
// ============================================================================
harness.describe('M1-MODAL: ExecutionPreflightModal State & Dispatch Contracts', () => {

  // State machine simulator implementing ExecutionPreflightModal logic
  function createPreflightModalHarness(props, context) {
    let isOpen = props.isOpen !== undefined ? props.isOpen : true;
    let workflow = props.workflow || null;
    let execMode = 'single';
    let itemMode = 'new';
    let maxItems = '';
    let paginate = true;
    let submitting = false;
    let error = null;

    let refreshDashboardCalled = 0;
    let onCloseCalled = 0;
    let dispatchedRuns = [];
    let openedRunDetails = [];
    let fetchCalls = [];

    const formatDomain = (url) => {
      if (!url) return '';
      try {
        const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
        return parsed.hostname.replace(/^www\./, '');
      } catch {
        return url;
      }
    };

    const handleLaunch = async () => {
      submitting = true;
      error = null;
      try {
        const itemsLimit = maxItems.trim() ? parseInt(maxItems, 10) : 0;
        const bodyPayload = {
          workflow_id: workflow.id,
          org_id: context.orgId,
          status: 'pending',
          total_items_discovered: itemsLimit || 0,
          mode: execMode,
          item_mode: itemMode,
          paginate: paginate
        };

        fetchCalls.push({ url: '/api/v1/runs', method: 'POST', body: bodyPayload });

        const res = await context.mockFetch('/api/v1/runs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || 'Failed to dispatch workflow execution');
        }

        const json = await res.json();
        const dispatchedRun = {
          ...json.run,
          workflowName: workflow.name,
          wf_workflows: { name: workflow.name }
        };

        if (context.refreshDashboard) {
          await context.refreshDashboard();
          refreshDashboardCalled++;
        }
        if (props.onClose) {
          props.onClose();
          onCloseCalled++;
        }
        if (props.onRunDispatched) {
          props.onRunDispatched(dispatchedRun);
          dispatchedRuns.push(dispatchedRun);
        }
        if (context.openRunDetails) {
          context.openRunDetails(dispatchedRun);
          openedRunDetails.push(dispatchedRun);
        }
      } catch (err) {
        error = err instanceof Error ? err.message : 'Execution dispatch failed';
      } finally {
        submitting = false;
      }
    };

    return {
      getUIState: () => {
        if (!isOpen || !workflow) return null;
        return {
          isOpen,
          workflowName: workflow.name,
          domain: formatDomain(workflow.portal_url),
          isRunnerOnline: context.isRunnerOnline,
          runnerBadgeText: context.isRunnerOnline ? 'Desktop Worker Online & Ready' : 'Desktop Worker Offline',
          runnerBadgeColor: context.isRunnerOnline ? 'emerald' : 'amber',
          execMode,
          itemMode,
          maxItems,
          paginate,
          submitting,
          buttonDisabled: submitting,
          buttonText: submitting ? 'Dispatching...' : 'Dispatch Execution',
          error,
          errorBannerVisible: Boolean(error),
        };
      },
      setExecMode: (m) => { execMode = m; },
      setItemMode: (m) => { itemMode = m; },
      setMaxItems: (val) => { maxItems = val; },
      setPaginate: (p) => { paginate = p; },
      launch: handleLaunch,
      getRefreshDashboardCount: () => refreshDashboardCalled,
      getOnCloseCount: () => onCloseCalled,
      getDispatchedRuns: () => dispatchedRuns,
      getOpenedRunDetails: () => openedRunDetails,
      getFetchCalls: () => fetchCalls,
    };
  }

  harness.it('M1-MODAL.1: Guard conditions: returns null if isOpen is false or workflow is null', () => {
    const modalClosed = createPreflightModalHarness({ isOpen: false, workflow: { id: 'wf-1', name: 'W1' } }, {});
    Assert.equal(modalClosed.getUIState(), null, 'Returns null when isOpen=false');

    const modalNoWf = createPreflightModalHarness({ isOpen: true, workflow: null }, {});
    Assert.equal(modalNoWf.getUIState(), null, 'Returns null when workflow=null');
  });

  harness.it('M1-MODAL.2: Runner readiness reflects isRunnerOnline correctly', () => {
    const onlineModal = createPreflightModalHarness(
      { isOpen: true, workflow: { id: 'wf-1', name: 'Flow 1', portal_url: 'https://example.com' } },
      { isRunnerOnline: true }
    );
    const onlineState = onlineModal.getUIState();
    Assert.equal(onlineState.isRunnerOnline, true);
    Assert.equal(onlineState.runnerBadgeText, 'Desktop Worker Online & Ready');
    Assert.equal(onlineState.runnerBadgeColor, 'emerald');

    const offlineModal = createPreflightModalHarness(
      { isOpen: true, workflow: { id: 'wf-1', name: 'Flow 1', portal_url: 'https://example.com' } },
      { isRunnerOnline: false }
    );
    const offlineState = offlineModal.getUIState();
    Assert.equal(offlineState.isRunnerOnline, false);
    Assert.equal(offlineState.runnerBadgeText, 'Desktop Worker Offline');
    Assert.equal(offlineState.runnerBadgeColor, 'amber');
  });

  harness.it('M1-MODAL.3: Domain formatter extracts clean hostname without www', () => {
    const modal = createPreflightModalHarness(
      { isOpen: true, workflow: { id: 'wf-1', name: 'Flow 1', portal_url: 'https://www.invoices.acme.corp/login' } },
      {}
    );
    Assert.equal(modal.getUIState().domain, 'invoices.acme.corp');
  });

  harness.it('M1-MODAL.4: Dispatch failure with 400 displays error banner, re-enables button, does not close', async () => {
    const modal = createPreflightModalHarness(
      {
        isOpen: true,
        workflow: { id: 'wf-1', name: 'Invoice Automation' },
        onClose: () => {},
        onRunDispatched: () => {}
      },
      {
        orgId: 'org-123',
        isRunnerOnline: true,
        mockFetch: async () => ({
          ok: false,
          status: 400,
          json: async () => ({ error: 'Workflow has no active steps' })
        })
      }
    );

    // Initial state: not submitting, no error
    Assert.equal(modal.getUIState().errorBannerVisible, false);
    Assert.equal(modal.getUIState().buttonDisabled, false);

    await modal.launch();

    // After failure: error banner is displayed, button is re-enabled for retry
    const state = modal.getUIState();
    Assert.equal(state.errorBannerVisible, true, 'Error banner must be visible');
    Assert.equal(state.error, 'Workflow has no active steps', 'Displays exact API error message');
    Assert.equal(state.submitting, false, 'submitting must reset to false');
    Assert.equal(state.buttonDisabled, false, 'Button must be re-enabled for retry');
    Assert.equal(state.buttonText, 'Dispatch Execution');
    Assert.equal(modal.getOnCloseCount(), 0, 'onClose must NOT be called on failure');
    Assert.equal(modal.getDispatchedRuns().length, 0, 'No run dispatched');
    Assert.equal(modal.getOpenedRunDetails().length, 0, 'Drawer not opened');
  });

  harness.it('M1-MODAL.5: Dispatch network error (fetch throws) displays error banner cleanly', async () => {
    const modal = createPreflightModalHarness(
      { isOpen: true, workflow: { id: 'wf-1', name: 'Flow 1' } },
      {
        orgId: 'org-123',
        mockFetch: async () => {
          throw new Error('Connection refused to /api/v1/runs');
        }
      }
    );

    await modal.launch();

    const state = modal.getUIState();
    Assert.equal(state.errorBannerVisible, true);
    Assert.equal(state.error, 'Connection refused to /api/v1/runs');
    Assert.equal(state.buttonDisabled, false);
    Assert.equal(modal.getOnCloseCount(), 0);
  });

  harness.it('M1-MODAL.6: Dispatch success dispatches run, refreshes dashboard, closes modal, opens drawer', async () => {
    const dispatchedRunMock = {
      id: 'run-new-777',
      workflow_id: 'wf-100',
      org_id: 'org-abc',
      status: 'pending',
      total_items_discovered: 0,
      started_at: new Date().toISOString()
    };

    let drawerOpenedWith = null;
    let onRunDispatchedWith = null;

    const modal = createPreflightModalHarness(
      {
        isOpen: true,
        workflow: { id: 'wf-100', name: 'Vendor Portal Synchronizer' },
        onClose: () => {},
        onRunDispatched: (run) => { onRunDispatchedWith = run; }
      },
      {
        orgId: 'org-abc',
        isRunnerOnline: true,
        refreshDashboard: async () => {},
        openRunDetails: (run) => { drawerOpenedWith = run; },
        mockFetch: async () => ({
          ok: true,
          status: 201,
          json: async () => ({ run: dispatchedRunMock })
        })
      }
    );

    await modal.launch();

    // Verify wire payload
    const calls = modal.getFetchCalls();
    Assert.equal(calls.length, 1);
    Assert.equal(calls[0].url, '/api/v1/runs');
    Assert.equal(calls[0].method, 'POST');
    Assert.equal(calls[0].body.workflow_id, 'wf-100');
    Assert.equal(calls[0].body.org_id, 'org-abc');
    Assert.equal(calls[0].body.status, 'pending');
    Assert.equal(calls[0].body.mode, 'single');

    // Verify lifecycle callbacks
    Assert.equal(modal.getRefreshDashboardCount(), 1, 'refreshDashboard was called');
    Assert.equal(modal.getOnCloseCount(), 1, 'onClose was called');

    Assert.ok(onRunDispatchedWith, 'onRunDispatched was called');
    Assert.equal(onRunDispatchedWith.id, 'run-new-777');
    Assert.equal(onRunDispatchedWith.workflowName, 'Vendor Portal Synchronizer', 'Enriched with workflowName');
    Assert.equal(onRunDispatchedWith.wf_workflows.name, 'Vendor Portal Synchronizer', 'Enriched with wf_workflows.name');

    Assert.ok(drawerOpenedWith, 'openRunDetails was called');
    Assert.equal(drawerOpenedWith.id, 'run-new-777');
  });

  harness.it('M1-MODAL.7: Batch/Loop mode configures loop parameters and numerical limits correctly', async () => {
    const modal = createPreflightModalHarness(
      {
        isOpen: true,
        workflow: { id: 'wf-200', name: 'Loop Batch Invoices' }
      },
      {
        orgId: 'org-xyz',
        mockFetch: async () => ({
          ok: true,
          status: 201,
          json: async () => ({ run: { id: 'run-loop-1', status: 'pending' } })
        })
      }
    );

    // Switch to loop mode and configure
    modal.setExecMode('loop');
    modal.setItemMode('old'); // Re-download
    modal.setMaxItems('25');
    modal.setPaginate(false);

    const state = modal.getUIState();
    Assert.equal(state.execMode, 'loop');
    Assert.equal(state.itemMode, 'old');
    Assert.equal(state.maxItems, '25');
    Assert.equal(state.paginate, false);

    await modal.launch();

    const call = modal.getFetchCalls()[0];
    Assert.equal(call.body.mode, 'loop');
    Assert.equal(call.body.item_mode, 'old');
    Assert.equal(call.body.total_items_discovered, 25);
    Assert.equal(call.body.paginate, false);
  });

  harness.it('M1-MODAL.8: HTML non-JSON 502/504 Bad Gateway traps JSON parse error and shows fallback', async () => {
    const modal = createPreflightModalHarness(
      { isOpen: true, workflow: { id: 'wf-502', name: 'Gateway Flow' } },
      {
        orgId: 'org-1',
        mockFetch: async () => ({
          ok: false,
          status: 502,
          json: async () => {
            throw new SyntaxError('Unexpected token < in JSON at position 0');
          }
        })
      }
    );

    await modal.launch();

    const state = modal.getUIState();
    Assert.equal(state.errorBannerVisible, true);
    Assert.equal(state.error, 'Failed to dispatch workflow execution', 'Falls back safely on HTML 502 response');
    Assert.equal(state.buttonDisabled, false);
  });

  harness.it('M1-MODAL.9: Malformed maxItems (NaN / whitespace / non-numeric) sanitizes to 0', async () => {
    const modal = createPreflightModalHarness(
      { isOpen: true, workflow: { id: 'wf-nan', name: 'NaN Test' } },
      {
        orgId: 'org-1',
        mockFetch: async () => ({
          ok: true,
          status: 201,
          json: async () => ({ run: { id: 'run-nan', status: 'pending' } })
        })
      }
    );

    modal.setExecMode('loop');
    modal.setMaxItems('   not_a_number   ');
    await modal.launch();

    const call = modal.getFetchCalls()[0];
    Assert.equal(call.body.total_items_discovered, 0, 'total_items_discovered sanitized to 0 for invalid input');
  });

  harness.it('M1-MODAL.10: Null or invalid portal_url safely handled without throwing in formatDomain', () => {
    const modalEmpty = createPreflightModalHarness({ isOpen: true, workflow: { id: 'wf-1', name: 'W1', portal_url: '' } }, {});
    Assert.equal(modalEmpty.getUIState().domain, '');

    const modalMalformed = createPreflightModalHarness({ isOpen: true, workflow: { id: 'wf-2', name: 'W2', portal_url: ':::not-a-valid-url:::' } }, {});
    Assert.equal(modalMalformed.getUIState().domain, ':::not-a-valid-url:::');
  });
});

// ============================================================================
// SUITE 2B: Concurrent & Race Condition Stress Testing
// ============================================================================
harness.describe('M1-CONCURRENCY: Concurrent Aborts & State Resilience', () => {

  harness.it('M1-CONC.1: Rapid burst of 10 concurrent stopActiveRun calls succeeds without crashing or state corruption', async () => {
    let selectedRun = { id: 'run-target', status: 'running' };
    let refreshCount = 0;

    const stopActiveRun = async (runId) => {
      try {
        const res = await (async () => {
          await new Promise((r) => setTimeout(r, 2));
          return { ok: true, status: 200 };
        })();
        if (res.ok) {
          if (selectedRun && selectedRun.id === runId) {
            selectedRun = { ...selectedRun, status: 'cancelled' };
          }
          refreshCount++;
          return true;
        }
        return false;
      } catch {
        return false;
      }
    };

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => stopActiveRun(i === 0 ? 'run-target' : `run-${i}`))
    );

    Assert.equal(results.every((r) => r === true), true, 'All concurrent calls return true');
    Assert.equal(selectedRun.status, 'cancelled', 'Target run status transitioned to cancelled');
    Assert.equal(refreshCount, 10, 'All calls completed successfully');
  });
});

// ============================================================================
// SUITE 3: Source Code & Architectural Integrity Checks
// ============================================================================
harness.describe('M1-SRC: Static Source Code Invariant Inspections', () => {

  harness.it('M1-SRC.1: DashboardContext stopActiveRun sends status: cancelled and run_id', () => {
    const ctxPath = path.resolve(__dirname, '../apps/web/src/context/DashboardContext.tsx');
    const content = fs.readFileSync(ctxPath, 'utf8');

    Assert.ok(
      content.includes(`body: JSON.stringify({ run_id: runId, status: 'cancelled' })`),
      'Must send run_id and status: cancelled in PATCH body'
    );
    Assert.ok(
      !content.includes(`status: 'STOPPED'`),
      'Must NOT send STOPPED in stopActiveRun body'
    );
  });

  harness.it('M1-SRC.2: DashboardContext fetchDashboardContext is deferred out of effect body', () => {
    const ctxPath = path.resolve(__dirname, '../apps/web/src/context/DashboardContext.tsx');
    const content = fs.readFileSync(ctxPath, 'utf8');

    // Verifies that fetch is wrapped in setTimeout / microtask to avoid react-hooks/set-state-in-effect warning
    Assert.ok(
      content.includes('setTimeout('),
      'Uses setTimeout to defer initial state hydration outside the synchronous effect body'
    );
    Assert.ok(
      content.includes('clearTimeout(timer)'),
      'Cleans up timer on unmount'
    );
  });

  harness.it('M1-SRC.3: ExecutionPreflightModal implements error banner and disabled submitting button', () => {
    const modalPath = path.resolve(__dirname, '../apps/web/src/components/dashboard/ExecutionPreflightModal.tsx');
    const content = fs.readFileSync(modalPath, 'utf8');

    Assert.ok(content.includes('disabled={submitting}'), 'Button has disabled={submitting}');
    Assert.ok(content.includes('{error && ('), 'Renders error banner when error is truthy');
    Assert.ok(content.includes('bg-rose-500/10'), 'Error banner uses rose theme styling');
    Assert.ok(content.includes('openRunDetails(dispatchedRun)'), 'Opens run details drawer upon successful dispatch');
    Assert.ok(content.includes('onRunDispatched(dispatchedRun)'), 'Triggers onRunDispatched callback');
  });

  harness.it('M1-SRC.4: /api/v1/runs/route.ts defensively aliases STOPPED to cancelled', () => {
    const routePath = path.resolve(__dirname, '../apps/web/src/app/api/v1/runs/route.ts');
    const content = fs.readFileSync(routePath, 'utf8');

    const normalizedContent = content.replace(/\r\n/g, '\n');

    // GET defensiveness
    Assert.ok(
      normalizedContent.includes(`statusFilterRaw === 'STOPPED' ? 'cancelled' : statusFilterRaw`),
      'GET aliases status=STOPPED to cancelled'
    );

    // POST defensiveness
    Assert.ok(
      normalizedContent.includes("if (status === 'STOPPED') {\n      status = 'cancelled';\n    }"),
      'POST aliases status STOPPED to cancelled'
    );

    // PATCH defensiveness
    Assert.ok(
      normalizedContent.includes(`body.run_id || body.runId || body.id`),
      'PATCH accepts run_id, runId, or id'
    );
  });
});

if (require.main === module) {
  harness.run().then((res) => {
    process.exitCode = res.failed > 0 ? 1 : 0;
  });
}

module.exports = { harness };
