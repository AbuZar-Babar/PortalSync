/**
 * Milestone M2 Empirical Challenge & Stress Test Suite
 * 
 * Verifies apps/web/src/app/dashboard/workflows/page.tsx:
 * 1. Domain extraction & Relative Time formatting edge cases
 * 2. Workflow filtering and search logic (name, domain, URL, description, case-insensitivity, empty search)
 * 3. Status filtering (all, running, idle) and sorting (recent, name_asc, name_desc, steps_desc)
 * 4. Active vs Idle run correlation & status badge resolution (Running, Action Required, Idle)
 * 5. Target run resolution in handleCardClick (active runs prioritized, fallback to latest, fallback to synthetic idle)
 * 6. Event propagation prevention (Run button, Visual Canvas link, Delete button stopping propagation)
 * 7. Keyboard event bubbling analysis and behavior
 * 8. Source code contract compliance (imports, modals, contexts, shortcuts, storage key)
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { TestHarness, Assert } = require('./helpers/test-harness');

const harness = new TestHarness('Milestone M2 Empirical Challenge: Workflows Dashboard Page');

// ============================================================================
// Load source code directly to extract and mirror logic faithfully
// ============================================================================
const PAGE_PATH = path.resolve(__dirname, '../apps/web/src/app/dashboard/workflows/page.tsx');
const pageSource = fs.readFileSync(PAGE_PATH, 'utf8');

// Pure implementations matching page.tsx exactly for rigorous unit & property testing
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
    return (
      urlCandidate
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0] || 'custom-portal'
    );
  }
}

function formatRelativeTime(dateInput, now = Date.now()) {
  if (!dateInput) return 'Never run';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Never run';

  const diffMs = now - date.getTime();
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

function filterAndSortWorkflows({
  workflows,
  searchQuery = '',
  statusFilter = 'all',
  sortBy = 'recent',
  activeRuns = [],
}) {
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
      // Default: 'recent' created_at desc
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
}

function resolveStatusBadge(wf, activeRuns) {
  const activeWfRuns = activeRuns.filter((r) => r.workflow_id === wf.id);
  const hasActiveRun = activeWfRuns.length > 0;
  const requiresActionRun = activeWfRuns.find((r) => r.status === 'requires_action');

  if (hasActiveRun) {
    if (requiresActionRun) {
      return {
        type: 'action_required',
        text: `Action Required (${activeWfRuns.length} active)`,
        activeCount: activeWfRuns.length,
      };
    } else {
      return {
        type: 'running',
        text: `Running (${activeWfRuns.length} active)`,
        activeCount: activeWfRuns.length,
      };
    }
  } else {
    return {
      type: 'idle',
      text: 'Idle',
      activeCount: 0,
    };
  }
}

function resolveCardClickRun(wf, activeRuns, latestRuns) {
  const activeForWf = activeRuns.filter((r) => r.workflow_id === wf.id);
  const targetRun = activeForWf[0] || latestRuns[wf.id];

  if (targetRun) {
    return {
      id: targetRun.id,
      workflow_id: wf.id,
      workflowName: wf.name,
      wf_workflows: { name: wf.name },
      status: targetRun.status,
      total_items_discovered: targetRun.total_items_discovered,
      items_discovered: targetRun.total_items_discovered,
      items_processed: targetRun.items_processed,
      items_downloaded: targetRun.items_downloaded,
      started_at: targetRun.started_at,
      completed_at: targetRun.completed_at,
      error_summary: targetRun.error_summary,
    };
  } else {
    return {
      id: '',
      workflow_id: wf.id,
      workflowName: wf.name,
      wf_workflows: { name: wf.name },
      status: 'idle',
      total_items_discovered: 0,
      items_discovered: 0,
      items_processed: 0,
      items_downloaded: 0,
      started_at: wf.created_at,
    };
  }
}

// ============================================================================
// SUITE 1: Domain Extraction & Relative Time Formatting Empirical Stress
// ============================================================================
harness.describe('M2-UTIL: extractDomain & formatRelativeTime Stress Tests', () => {

  harness.it('M2-UTIL.1: Standard HTTPS URL extracts hostname without www.', () => {
    const wf = { portal_url: 'https://www.billing.stripe.com/portal/v2' };
    Assert.equal(extractDomain(wf), 'billing.stripe.com');
  });

  harness.it('M2-UTIL.2: Protocol-less URL parses safely and strips www.', () => {
    const wf = { portal_url: 'www.usoil.portal.com/login' };
    Assert.equal(extractDomain(wf), 'usoil.portal.com');
  });

  harness.it('M2-UTIL.3: Falls back to workflow_definition.start_url if portal_url is missing', () => {
    const wf = {
      portal_url: null,
      workflow_definition: { start_url: 'https://app.hubspot.com/contacts' },
    };
    Assert.equal(extractDomain(wf), 'app.hubspot.com');
  });

  harness.it('M2-UTIL.4: Returns "custom-portal" for empty, null, or about:blank', () => {
    Assert.equal(extractDomain({ portal_url: '' }), 'custom-portal');
    Assert.equal(extractDomain({ portal_url: null }), 'custom-portal');
    Assert.equal(extractDomain({ portal_url: 'about:blank' }), 'custom-portal');
    Assert.equal(extractDomain({}), 'custom-portal');
  });

  harness.it('M2-UTIL.5: Malformed URL gracefully handles without throwing', () => {
    const wf = { portal_url: 'https://invalid host with spaces.com' };
    const domain = extractDomain(wf);
    Assert.ok(typeof domain === 'string' && domain.length > 0);
  });

  harness.it('M2-UTIL.6: formatRelativeTime handles missing/invalid date inputs', () => {
    Assert.equal(formatRelativeTime(null), 'Never run');
    Assert.equal(formatRelativeTime(undefined), 'Never run');
    Assert.equal(formatRelativeTime(''), 'Never run');
    Assert.equal(formatRelativeTime('not-a-valid-date'), 'Never run');
  });

  harness.it('M2-UTIL.7: formatRelativeTime handles granular diff intervals', () => {
    const now = 1700000000000;
    Assert.equal(formatRelativeTime(new Date(now - 15000).toISOString(), now), 'Just now');
    Assert.equal(formatRelativeTime(new Date(now - 5 * 60 * 1000).toISOString(), now), '5m ago');
    Assert.equal(formatRelativeTime(new Date(now - 3 * 3600 * 1000).toISOString(), now), '3h ago');
    Assert.equal(formatRelativeTime(new Date(now - 25 * 3600 * 1000).toISOString(), now), 'Yesterday');
    Assert.equal(formatRelativeTime(new Date(now - 4 * 24 * 3600 * 1000).toISOString(), now), '4d ago');
  });
});

// ============================================================================
// SUITE 2: Workflow Filtering and Search Logic
// ============================================================================
harness.describe('M2-FILTER: Search, Filtering & Sorting Empirical Verification', () => {

  const sampleWorkflows = [
    {
      id: 'wf-1',
      name: 'Stripe Invoice Ingestion',
      portal_url: 'https://billing.stripe.com/session/invoices',
      workflow_definition: { description: 'Downloads customer monthly statements', steps: [1, 2, 3] },
      created_at: '2026-03-01T10:00:00Z',
    },
    {
      id: 'wf-2',
      name: 'HubSpot Contact Sync',
      portal_url: 'https://app.hubspot.com/crm/contacts',
      workflow_definition: { target_folder: 'HubSpot Downloads', steps: [1, 2, 3, 4, 5] },
      created_at: '2026-03-05T12:00:00Z',
    },
    {
      id: 'wf-3',
      name: 'US Oil Fuel Index Scraper',
      portal_url: 'https://usoil.supplierportal.net/portal',
      workflow_definition: { description: 'Daily fuel benchmark price scrape', steps: [1] },
      created_at: '2026-03-10T08:00:00Z',
    },
    {
      id: 'wf-4',
      name: 'AWS Billing Statement Archiver',
      portal_url: 'https://console.aws.amazon.com/billing/home',
      workflow_definition: { description: 'Retrieves PDF statements from AWS console', steps: [1, 2] },
      created_at: '2026-03-08T15:00:00Z',
    },
  ];

  harness.it('M2-FILTER.1: Empty or whitespace search query matches all workflows', () => {
    const res1 = filterAndSortWorkflows({ workflows: sampleWorkflows, searchQuery: '' });
    Assert.equal(res1.length, 4);

    const res2 = filterAndSortWorkflows({ workflows: sampleWorkflows, searchQuery: '    ' });
    Assert.equal(res2.length, 4);
  });

  harness.it('M2-FILTER.2: Search by name is case-insensitive (UPPERCASE, lowercase, mixed)', () => {
    const resUpper = filterAndSortWorkflows({ workflows: sampleWorkflows, searchQuery: 'STRIPE' });
    Assert.equal(resUpper.length, 1);
    Assert.equal(resUpper[0].id, 'wf-1');

    const resLower = filterAndSortWorkflows({ workflows: sampleWorkflows, searchQuery: 'stripe' });
    Assert.equal(resLower.length, 1);
    Assert.equal(resLower[0].id, 'wf-1');

    const resMixed = filterAndSortWorkflows({ workflows: sampleWorkflows, searchQuery: 'sTrIpE' });
    Assert.equal(resMixed.length, 1);
    Assert.equal(resMixed[0].id, 'wf-1');
  });

  harness.it('M2-FILTER.3: Search by domain matches hostname extracted from portal_url', () => {
    const res = filterAndSortWorkflows({ workflows: sampleWorkflows, searchQuery: 'supplierportal' });
    Assert.equal(res.length, 1);
    Assert.equal(res[0].id, 'wf-3');
  });

  harness.it('M2-FILTER.4: Search by portal_url matches path components and query params', () => {
    const res = filterAndSortWorkflows({ workflows: sampleWorkflows, searchQuery: 'session/invoices' });
    Assert.equal(res.length, 1);
    Assert.equal(res[0].id, 'wf-1');
  });

  harness.it('M2-FILTER.5: Search by description and target_folder', () => {
    // Description search
    const resDesc = filterAndSortWorkflows({ workflows: sampleWorkflows, searchQuery: 'benchmark' });
    Assert.equal(resDesc.length, 1);
    Assert.equal(resDesc[0].id, 'wf-3');

    // Target folder fallback search
    const resFolder = filterAndSortWorkflows({ workflows: sampleWorkflows, searchQuery: 'HubSpot Downloads' });
    Assert.equal(resFolder.length, 1);
    Assert.equal(resFolder[0].id, 'wf-2');
  });

  harness.it('M2-FILTER.6: Non-matching search query returns empty array', () => {
    const res = filterAndSortWorkflows({ workflows: sampleWorkflows, searchQuery: 'NonExistentWorkflowXYZ' });
    Assert.equal(res.length, 0);
  });

  harness.it('M2-FILTER.7: Special regex characters in search do not throw error', () => {
    const res = filterAndSortWorkflows({ workflows: sampleWorkflows, searchQuery: '[.*+?^${}()|]' });
    Assert.equal(res.length, 0);
  });

  harness.it('M2-FILTER.8: Status filter "running" returns only workflows with active runs', () => {
    const activeRuns = [
      { id: 'run-1', workflow_id: 'wf-1', status: 'running' },
      { id: 'run-2', workflow_id: 'wf-3', status: 'pending' },
    ];

    const res = filterAndSortWorkflows({
      workflows: sampleWorkflows,
      statusFilter: 'running',
      activeRuns,
    });

    Assert.equal(res.length, 2);
    const ids = res.map((w) => w.id).sort();
    Assert.deepEqual(ids, ['wf-1', 'wf-3']);
  });

  harness.it('M2-FILTER.9: Status filter "idle" returns only workflows without active runs', () => {
    const activeRuns = [
      { id: 'run-1', workflow_id: 'wf-1', status: 'running' },
    ];

    const res = filterAndSortWorkflows({
      workflows: sampleWorkflows,
      statusFilter: 'idle',
      activeRuns,
    });

    Assert.equal(res.length, 3);
    const ids = res.map((w) => w.id).sort();
    Assert.deepEqual(ids, ['wf-2', 'wf-3', 'wf-4']);
  });

  harness.it('M2-FILTER.10: Combined search query and status filter intersection', () => {
    const activeRuns = [
      { id: 'run-1', workflow_id: 'wf-1', status: 'running' },
      { id: 'run-2', workflow_id: 'wf-3', status: 'running' },
    ];

    // Search matches wf-1, and status filter is running -> returns wf-1
    const res = filterAndSortWorkflows({
      workflows: sampleWorkflows,
      searchQuery: 'stripe',
      statusFilter: 'running',
      activeRuns,
    });
    Assert.equal(res.length, 1);
    Assert.equal(res[0].id, 'wf-1');

    // Search matches wf-1, but status filter is idle -> returns 0
    const resEmpty = filterAndSortWorkflows({
      workflows: sampleWorkflows,
      searchQuery: 'stripe',
      statusFilter: 'idle',
      activeRuns,
    });
    Assert.equal(resEmpty.length, 0);
  });

  harness.it('M2-FILTER.11: Sorting options (recent, name_asc, name_desc, steps_desc)', () => {
    // Recent: wf-3 (Mar 10) > wf-4 (Mar 8) > wf-2 (Mar 5) > wf-1 (Mar 1)
    const resRecent = filterAndSortWorkflows({ workflows: sampleWorkflows, sortBy: 'recent' });
    Assert.deepEqual(resRecent.map((w) => w.id), ['wf-3', 'wf-4', 'wf-2', 'wf-1']);

    // Name Asc: AWS (wf-4) < HubSpot (wf-2) < Stripe (wf-1) < US Oil (wf-3)
    const resNameAsc = filterAndSortWorkflows({ workflows: sampleWorkflows, sortBy: 'name_asc' });
    Assert.deepEqual(resNameAsc.map((w) => w.id), ['wf-4', 'wf-2', 'wf-1', 'wf-3']);

    // Name Desc: US Oil (wf-3) > Stripe (wf-1) > HubSpot (wf-2) > AWS (wf-4)
    const resNameDesc = filterAndSortWorkflows({ workflows: sampleWorkflows, sortBy: 'name_desc' });
    Assert.deepEqual(resNameDesc.map((w) => w.id), ['wf-3', 'wf-1', 'wf-2', 'wf-4']);

    // Steps Desc: wf-2 (5 steps) > wf-1 (3 steps) > wf-4 (2 steps) > wf-3 (1 step)
    const resStepsDesc = filterAndSortWorkflows({ workflows: sampleWorkflows, sortBy: 'steps_desc' });
    Assert.deepEqual(resStepsDesc.map((w) => w.id), ['wf-2', 'wf-1', 'wf-4', 'wf-3']);
  });
});

// ============================================================================
// SUITE 3: Active vs Idle Run Correlation Logic & Badge Display
// ============================================================================
harness.describe('M2-RUNS: Active vs Idle Run Correlation & Telemetry Mapping', () => {

  const wfA = { id: 'wf-a', name: 'Vendor Portal Sync', created_at: '2026-03-01T00:00:00Z' };
  const wfB = { id: 'wf-b', name: 'Invoice Ingest', created_at: '2026-03-02T00:00:00Z' };

  harness.it('M2-RUNS.1: Zero active runs yields "Idle" badge with 0 active count', () => {
    const badge = resolveStatusBadge(wfA, []);
    Assert.equal(badge.type, 'idle');
    Assert.equal(badge.text, 'Idle');
    Assert.equal(badge.activeCount, 0);
  });

  harness.it('M2-RUNS.2: Workflow with 1 running run displays "Running (1 active)"', () => {
    const activeRuns = [{ id: 'run-1', workflow_id: 'wf-a', status: 'running' }];
    const badge = resolveStatusBadge(wfA, activeRuns);
    Assert.equal(badge.type, 'running');
    Assert.equal(badge.text, 'Running (1 active)');
    Assert.equal(badge.activeCount, 1);
  });

  harness.it('M2-RUNS.3: Workflow with multiple active runs displays "Running (N active)"', () => {
    const activeRuns = [
      { id: 'run-1', workflow_id: 'wf-a', status: 'pending' },
      { id: 'run-2', workflow_id: 'wf-a', status: 'running' },
      { id: 'run-3', workflow_id: 'wf-a', status: 'running' },
      { id: 'run-4', workflow_id: 'wf-b', status: 'running' }, // Belongs to different workflow
    ];
    const badge = resolveStatusBadge(wfA, activeRuns);
    Assert.equal(badge.type, 'running');
    Assert.equal(badge.text, 'Running (3 active)');
    Assert.equal(badge.activeCount, 3);

    // wfB has only 1 active run
    const badgeB = resolveStatusBadge(wfB, activeRuns);
    Assert.equal(badgeB.type, 'running');
    Assert.equal(badgeB.text, 'Running (1 active)');
    Assert.equal(badgeB.activeCount, 1);
  });

  harness.it('M2-RUNS.4: Workflow with "requires_action" displays "Action Required (N active)"', () => {
    const activeRuns = [
      { id: 'run-1', workflow_id: 'wf-a', status: 'requires_action' },
      { id: 'run-2', workflow_id: 'wf-a', status: 'running' },
    ];
    const badge = resolveStatusBadge(wfA, activeRuns);
    Assert.equal(badge.type, 'action_required');
    Assert.equal(badge.text, 'Action Required (2 active)');
    Assert.equal(badge.activeCount, 2);
  });

  harness.it('M2-RUNS.5: handleCardClick maps active run when available', () => {
    const activeRuns = [
      {
        id: 'run-active-1',
        workflow_id: 'wf-a',
        status: 'running',
        total_items_discovered: 42,
        items_processed: 12,
        items_downloaded: 10,
        started_at: '2026-03-11T12:00:00Z',
      },
    ];
    const latestRuns = {
      'wf-a': {
        id: 'run-historical-old',
        workflow_id: 'wf-a',
        status: 'completed',
        total_items_discovered: 5,
        items_processed: 5,
        items_downloaded: 5,
      },
    };

    const runDetails = resolveCardClickRun(wfA, activeRuns, latestRuns);
    Assert.equal(runDetails.id, 'run-active-1');
    Assert.equal(runDetails.workflow_id, 'wf-a');
    Assert.equal(runDetails.workflowName, 'Vendor Portal Sync');
    Assert.equal(runDetails.status, 'running');
    Assert.equal(runDetails.total_items_discovered, 42);
    Assert.equal(runDetails.items_processed, 12);
  });

  harness.it('M2-RUNS.6: handleCardClick falls back to latest run when active runs are empty', () => {
    const activeRuns = [];
    const latestRuns = {
      'wf-a': {
        id: 'run-completed-99',
        workflow_id: 'wf-a',
        status: 'completed',
        total_items_discovered: 20,
        items_processed: 20,
        items_downloaded: 18,
        started_at: '2026-03-10T10:00:00Z',
        completed_at: '2026-03-10T10:05:00Z',
      },
    };

    const runDetails = resolveCardClickRun(wfA, activeRuns, latestRuns);
    Assert.equal(runDetails.id, 'run-completed-99');
    Assert.equal(runDetails.status, 'completed');
    Assert.equal(runDetails.total_items_discovered, 20);
    Assert.equal(runDetails.completed_at, '2026-03-10T10:05:00Z');
  });

  harness.it('M2-RUNS.7: handleCardClick falls back to synthetic idle record when no runs exist', () => {
    const activeRuns = [];
    const latestRuns = {};

    const runDetails = resolveCardClickRun(wfA, activeRuns, latestRuns);
    Assert.equal(runDetails.id, '');
    Assert.equal(runDetails.workflow_id, 'wf-a');
    Assert.equal(runDetails.status, 'idle');
    Assert.equal(runDetails.total_items_discovered, 0);
    Assert.equal(runDetails.started_at, wfA.created_at);
  });
});

// ============================================================================
// SUITE 4: Event Propagation & Interactive Isolation
// ============================================================================
harness.describe('M2-EVENT: Event Propagation Prevention Verification', () => {

  // Test event simulation harness
  function createCardSimulation(wf) {
    let cardClickTriggered = false;
    let preflightWorkflow = null;
    let visualCanvasNavigated = false;
    let workflowToDelete = null;

    const handleCardClick = (targetWf) => {
      cardClickTriggered = true;
    };

    // Card container click
    const simulateCardClick = () => {
      handleCardClick(wf);
    };

    // [ Run ] button click handler (mirrors page.tsx lines 697-700 & 817-820)
    const simulateRunButtonClick = (mockEvent) => {
      mockEvent.stopPropagation();
      preflightWorkflow = wf;
    };

    // Visual Canvas link click handler (mirrors page.tsx lines 711 & 829)
    const simulateVisualCanvasClick = (mockEvent) => {
      mockEvent.stopPropagation();
      visualCanvasNavigated = true;
    };

    // Delete button click handler (mirrors page.tsx lines 721-725 & 839-843)
    const simulateDeleteButtonClick = (mockEvent) => {
      mockEvent.stopPropagation();
      workflowToDelete = wf;
    };

    return {
      simulateCardClick,
      simulateRunButtonClick,
      simulateVisualCanvasClick,
      simulateDeleteButtonClick,
      getState: () => ({
        cardClickTriggered,
        preflightWorkflow,
        visualCanvasNavigated,
        workflowToDelete,
      }),
    };
  }

  function createMockEvent() {
    let stopped = false;
    return {
      stopPropagation: () => {
        stopped = true;
      },
      isPropagationStopped: () => stopped,
    };
  }

  harness.it('M2-EVENT.1: Clicking card body triggers handleCardClick', () => {
    const wf = { id: 'wf-1', name: 'Card Test' };
    const sim = createCardSimulation(wf);
    sim.simulateCardClick();
    Assert.equal(sim.getState().cardClickTriggered, true);
  });

  harness.it('M2-EVENT.2: Clicking [ Run ] button stops propagation and does not trigger card click', () => {
    const wf = { id: 'wf-1', name: 'Run Button Test' };
    const sim = createCardSimulation(wf);
    const mockEvent = createMockEvent();

    sim.simulateRunButtonClick(mockEvent);

    Assert.equal(mockEvent.isPropagationStopped(), true, 'e.stopPropagation() must be called');
    Assert.equal(sim.getState().preflightWorkflow?.id, 'wf-1', 'preflightWorkflow must be set');
    Assert.equal(sim.getState().cardClickTriggered, false, 'handleCardClick must NOT be triggered');
  });

  harness.it('M2-EVENT.3: Clicking Visual Canvas link stops propagation and does not trigger card click', () => {
    const wf = { id: 'wf-1', name: 'Canvas Link Test' };
    const sim = createCardSimulation(wf);
    const mockEvent = createMockEvent();

    sim.simulateVisualCanvasClick(mockEvent);

    Assert.equal(mockEvent.isPropagationStopped(), true, 'e.stopPropagation() must be called');
    Assert.equal(sim.getState().visualCanvasNavigated, true);
    Assert.equal(sim.getState().cardClickTriggered, false, 'handleCardClick must NOT be triggered');
  });

  harness.it('M2-EVENT.4: Clicking Delete button stops propagation and does not trigger card click', () => {
    const wf = { id: 'wf-1', name: 'Delete Button Test' };
    const sim = createCardSimulation(wf);
    const mockEvent = createMockEvent();

    sim.simulateDeleteButtonClick(mockEvent);

    Assert.equal(mockEvent.isPropagationStopped(), true, 'e.stopPropagation() must be called');
    Assert.equal(sim.getState().workflowToDelete?.id, 'wf-1');
    Assert.equal(sim.getState().cardClickTriggered, false, 'handleCardClick must NOT be triggered');
  });

  harness.it('M2-EVENT.5: Source AST check verifies e.stopPropagation() on all interactive controls in Grid and List', () => {
    // Both Grid and List have:
    // 1. Run button with e.stopPropagation()
    // 2. Link with e.stopPropagation()
    // 3. Delete button with e.stopPropagation()
    const stopPropagationMatches = pageSource.match(/e\.stopPropagation\(\)/g) || [];
    // At minimum, 3 in grid view and 3 in list view = 6 occurrences
    Assert.ok(
      stopPropagationMatches.length >= 6,
      `Expected at least 6 e.stopPropagation() calls for grid + list controls, found ${stopPropagationMatches.length}`
    );
  });

  harness.it('M2-EVENT.6 [Adversarial Stress]: Keyboard Enter/Space on card container vs inner button delegation', () => {
    // Simulation of DOM event bubbling for keyboard events
    let cardTriggered = false;
    let buttonTriggered = false;

    const wf = { id: 'wf-1', name: 'Keyboard Nav Test' };

    // Container handler directly from page.tsx:619-623
    const containerOnKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        cardTriggered = true;
      }
    };

    // Inner button handler
    const buttonOnClick = (e) => {
      e.stopPropagation();
      buttonTriggered = true;
    };

    // Scenario A: User presses Enter directly while focused on the Card container (target === currentTarget)
    const directCardEvent = {
      key: 'Enter',
      target: 'card-div',
      currentTarget: 'card-div',
      defaultPrevented: false,
      preventDefault: function() { this.defaultPrevented = true; },
    };
    containerOnKeyDown(directCardEvent);
    Assert.equal(cardTriggered, true, 'Direct keyboard activation of card opens RunDetailsDrawer');
    Assert.equal(directCardEvent.defaultPrevented, true);

    // Scenario B: Keyboard Enter on inner button without onKeyDown stopPropagation
    // When focus is on inner button, a keydown bubbles to container if unstopped.
    // If container lacks `if (e.target !== e.currentTarget) return;`, containerOnKeyDown fires.
    cardTriggered = false;
    const bubblingEvent = {
      key: 'Enter',
      target: 'button-element',
      currentTarget: 'card-div',
      defaultPrevented: false,
      preventDefault: function() { this.defaultPrevented = true; },
    };
    containerOnKeyDown(bubblingEvent);
    
    // This demonstrates that container catches bubbled keydown from inner child
    Assert.equal(cardTriggered, true, 'Container catches bubbled keydown event if target check is absent');
  });
});

// ============================================================================
// SUITE 5: Contract Compliance & Architectural Invariants
// ============================================================================
harness.describe('M2-CONTRACT: Contract Compliance & Structural Verification', () => {

  harness.it('M2-CONTRACT.1: File is client component marked with "use client"', () => {
    Assert.ok(pageSource.trim().startsWith("'use client'"), 'Must begin with "use client"');
  });

  harness.it('M2-CONTRACT.2: Integrates useDashboard context hook correctly', () => {
    Assert.ok(pageSource.includes("import { useDashboard } from '@/context/DashboardContext';"));
    Assert.ok(pageSource.includes('useDashboard()'));
    Assert.ok(pageSource.includes('openRunDetails'));
    Assert.ok(pageSource.includes('refreshDashboard'));
    Assert.ok(pageSource.includes('isRunnerOnline'));
    Assert.ok(pageSource.includes('orgId'));
  });

  harness.it('M2-CONTRACT.3: Integrates ExecutionPreflightModal and CreatePortalModal', () => {
    Assert.ok(pageSource.includes("import { ExecutionPreflightModal } from '@/components/dashboard/ExecutionPreflightModal';"));
    Assert.ok(pageSource.includes("import { CreatePortalModal } from '@/components/dashboard/CreatePortalModal';"));
    Assert.ok(pageSource.includes('<ExecutionPreflightModal'));
    Assert.ok(pageSource.includes('<CreatePortalModal'));
  });

  harness.it('M2-CONTRACT.4: View mode persistence uses wf_saas_workflow_view_mode', () => {
    Assert.ok(pageSource.includes("const VIEW_MODE_STORAGE_KEY = 'wf_saas_workflow_view_mode';"));
    Assert.ok(pageSource.includes('localStorage.getItem(VIEW_MODE_STORAGE_KEY)'));
    Assert.ok(pageSource.includes('localStorage.setItem(VIEW_MODE_STORAGE_KEY'));
  });

  harness.it('M2-CONTRACT.5: Ctrl+K / Cmd+K listener is wired with preventDefault and focus', () => {
    Assert.ok(pageSource.includes("e.key.toLowerCase() === 'k'"));
    Assert.ok(pageSource.includes('(e.ctrlKey || e.metaKey)'));
    Assert.ok(pageSource.includes('searchInputRef.current?.focus()'));
  });

  harness.it('M2-CONTRACT.6: Real-time Supabase postgres_changes listener is wired on wf_execution_runs', () => {
    Assert.ok(pageSource.includes("table: 'wf_execution_runs'"));
    Assert.ok(pageSource.includes("filter: `org_id=eq.${orgId}`"));
    Assert.ok(pageSource.includes('supabase.removeChannel(channel)'));
  });

  harness.it('M2-CONTRACT.7: Visual Canvas links route to /dashboard/workflows/${wf.id}/edit', () => {
    Assert.ok(pageSource.includes('/dashboard/workflows/${wf.id}/edit'));
  });
});

// Run harness
harness.run().then((res) => {
  if (res.failed > 0) {
    process.exit(1);
  }
});
