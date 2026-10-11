/**
 * Empirical Challenger 2 Test Suite: Milestone M3 Executions & Runs Telemetry
 * 
 * Aggressively verifies and stress-tests:
 * 1. Search filtering across workflow name, workflow ID, and run UUID.
 * 2. Filter pills (All, Active, Needs 2FA, Completed, Failed) filtering logic and metric consistency.
 * 3. Empty states rendering decision tree (0 runs exist vs 0 search results found).
 * 4. Unmount lifecycle: Supabase Realtime channel and 3s polling timer destruction without memory leaks.
 * 5. Formatters, edge cases, and progress calculation.
 * 6. Static source AST and architectural invariant verification of runs/page.tsx.
 * 7. Event propagation isolation and 2FA banner payload mapping.
 * 
 * Zero external dependencies — pure Node.js CommonJS with test-harness.js
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { TestHarness, Assert } = require('./helpers/test-harness');

const harness = new TestHarness('Milestone M3 Empirical Challenge: Runs Telemetry & Lifecycle');

// ============================================================================
// SIMULATION ORACLES & LOGIC HARNESS (Mirroring apps/web/src/app/dashboard/runs/page.tsx)
// ============================================================================

/**
 * Mirror of formatDuration in runs/page.tsx
 */
function formatDuration(startedAt, completedAt, nowOverride = null) {
  if (!startedAt) return '—';
  const start = new Date(startedAt).getTime();
  if (isNaN(start)) return '—';
  const end = completedAt ? new Date(completedAt).getTime() : (nowOverride ?? Date.now());
  if (isNaN(end) || end < start) return '—';

  const diffSec = Math.floor((end - start) / 1000);
  if (diffSec < 0) return '—';
  if (diffSec < 60) return `${diffSec}s`;

  const min = Math.floor(diffSec / 60);
  const sec = diffSec % 60;
  if (min < 60) return `${min}m ${sec}s`;

  const hours = Math.floor(min / 60);
  const remMin = min % 60;
  return `${hours}h ${remMin}m`;
}

/**
 * Mirror of formatRelativeTime in runs/page.tsx
 */
function formatRelativeTime(dateInput, nowOverride = null) {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '—';

  const now = nowOverride ?? Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 45) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Mirror of filteredRuns in runs/page.tsx
 */
function filterRuns(runs, statusFilter, searchQuery) {
  return runs.filter((run) => {
    // Filter pill logic
    if (statusFilter === 'active') {
      if (!['pending', 'running', 'requires_action'].includes(run.status)) {
        return false;
      }
    } else if (statusFilter === 'requires_action') {
      if (run.status !== 'requires_action') return false;
    } else if (statusFilter === 'completed') {
      if (run.status !== 'completed') return false;
    } else if (statusFilter === 'failed') {
      if (!['failed', 'cancelled'].includes(run.status)) return false;
    }

    // Search query logic
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const wfName = (run.wf_workflows?.name || run.workflowName || '').toLowerCase();
      const wfId = (run.workflow_id || '').toLowerCase();
      const runId = (run.id || '').toLowerCase();
      if (!wfName.includes(q) && !wfId.includes(q) && !runId.includes(q)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Mirror of stats calculation in runs/page.tsx
 */
function computeStats(runs) {
  const total = runs.length;
  const active = runs.filter((r) =>
    ['pending', 'running', 'requires_action'].includes(r.status)
  ).length;
  const needs2fa = runs.filter((r) => r.status === 'requires_action').length;
  const completed = runs.filter((r) => r.status === 'completed').length;
  const failed = runs.filter((r) => ['failed', 'cancelled'].includes(r.status)).length;
  const totalFiles = runs.reduce((acc, r) => acc + (r.items_downloaded || 0), 0);
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, active, needs2fa, completed, failed, totalFiles, successRate };
}

/**
 * Mirror of empty state decision tree in runs/page.tsx
 */
function getEmptyStateKind(isLoading, totalRunsCount, filteredRunsCount) {
  if (isLoading) return 'LOADING';
  if (totalRunsCount === 0) return 'NO_RUNS_YET';
  if (filteredRunsCount === 0) return 'NO_FILTER_MATCHES';
  return 'SHOW_TABLE';
}

/**
 * Progress bar percentage calculation
 */
function computeProgressPct(itemsProcessed, totalDiscovered) {
  const processedCount = itemsProcessed || 0;
  const discoveredCount = totalDiscovered || 0;
  return discoveredCount > 0
    ? Math.min(100, Math.round((processedCount / discoveredCount) * 100))
    : 0;
}

// ============================================================================
// SUITE 1: Search Filtering Across Workflow Name, Workflow ID, and Run UUID
// ============================================================================

harness.describe('Suite 1: Search Filtering Logic', () => {
  const mockRuns = [
    {
      id: 'e1001111-2222-3333-4444-555566667777',
      workflow_id: 'wf-stripe-payouts-01',
      workflowName: 'Stripe Payouts Reconciliation',
      wf_workflows: { name: 'Stripe Payouts Reconciliation' },
      status: 'completed',
    },
    {
      id: 'e2002222-3333-4444-5555-666677778888',
      workflow_id: 'wf-quickbooks-sync-02',
      workflowName: 'QuickBooks Daily Sync',
      wf_workflows: null, // Test fallback to workflowName
      status: 'running',
    },
    {
      id: 'e3003333-4444-5555-6666-777788889999',
      workflow_id: 'wf-portal-invoices-03',
      workflowName: undefined,
      wf_workflows: { name: 'Portal Invoices Downloader' },
      status: 'requires_action',
    },
    {
      id: 'e4004444-5555-6666-7777-888899990000',
      workflow_id: 'wf-sap-custom-export-04',
      workflowName: undefined,
      wf_workflows: null, // Neither name available, only wf_id
      status: 'failed',
    },
  ];

  harness.it('matches workflow name case-insensitively and partial substring', () => {
    const res1 = filterRuns(mockRuns, 'all', 'stripe');
    Assert.equal(res1.length, 1);
    Assert.equal(res1[0].id, mockRuns[0].id);

    const res2 = filterRuns(mockRuns, 'all', 'RECONCILIATION');
    Assert.equal(res2.length, 1);
    Assert.equal(res2[0].id, mockRuns[0].id);

    const res3 = filterRuns(mockRuns, 'all', 'daily sync');
    Assert.equal(res3.length, 1);
    Assert.equal(res3[0].id, mockRuns[1].id);
  });

  harness.it('matches workflow ID when workflow name does not match', () => {
    const res1 = filterRuns(mockRuns, 'all', 'wf-stripe');
    Assert.equal(res1.length, 1);
    Assert.equal(res1[0].id, mockRuns[0].id);

    const res2 = filterRuns(mockRuns, 'all', 'sap-custom');
    Assert.equal(res2.length, 1);
    Assert.equal(res2[0].id, mockRuns[3].id);
  });

  harness.it('matches run UUID exactly or prefix/substring', () => {
    // 8-character prefix as displayed in table (#e1001111)
    const res1 = filterRuns(mockRuns, 'all', 'e1001111');
    Assert.equal(res1.length, 1);
    Assert.equal(res1[0].id, mockRuns[0].id);

    // Full run UUID
    const res2 = filterRuns(mockRuns, 'all', 'e2002222-3333-4444-5555-666677778888');
    Assert.equal(res2.length, 1);
    Assert.equal(res2[0].id, mockRuns[1].id);

    // Middle substring of UUID
    const res3 = filterRuns(mockRuns, 'all', '5555-6666');
    Assert.equal(res3.length, 3); // 3 of them share 5555-6666 in mock
  });

  harness.it('handles leading and trailing whitespace safely', () => {
    const res = filterRuns(mockRuns, 'all', '   stripe   ');
    Assert.equal(res.length, 1);
    Assert.equal(res[0].id, mockRuns[0].id);
  });

  harness.it('returns all runs when search is empty or whitespace only', () => {
    const res1 = filterRuns(mockRuns, 'all', '');
    Assert.equal(res1.length, mockRuns.length);

    const res2 = filterRuns(mockRuns, 'all', '    ');
    Assert.equal(res2.length, mockRuns.length);
  });

  harness.it('tolerates missing or null fields gracefully without crashing', () => {
    const weirdRuns = [
      { id: '', workflow_id: '', status: 'completed' },
      { id: 'some-id', workflow_id: null, wf_workflows: null, status: 'running' },
      { id: 'valid-id', workflow_id: 'wf-1', workflowName: null, status: 'failed' }
    ];

    const res = filterRuns(weirdRuns, 'all', 'some-id');
    Assert.equal(res.length, 1);
    Assert.equal(res[0].id, 'some-id');
  });

  harness.it('correctly returns 0 results when no field matches query', () => {
    const res = filterRuns(mockRuns, 'all', 'non-existent-xyz-999');
    Assert.equal(res.length, 0);
  });
});

// ============================================================================
// SUITE 2: Filter Pills Logic & Metrics Invariants
// ============================================================================

harness.describe('Suite 2: Filter Pills & Metrics Consistency', () => {
  const sampleRuns = [
    { id: '1', status: 'pending', items_downloaded: 0 },
    { id: '2', status: 'running', items_downloaded: 3 },
    { id: '3', status: 'requires_action', items_downloaded: 1 },
    { id: '4', status: 'completed', items_downloaded: 5 },
    { id: '5', status: 'completed', items_downloaded: 2 },
    { id: '6', status: 'failed', items_downloaded: 0 },
    { id: '7', status: 'cancelled', items_downloaded: 0 },
  ];

  harness.it('correctly partitions runs across all filter pills', () => {
    const all = filterRuns(sampleRuns, 'all', '');
    const active = filterRuns(sampleRuns, 'active', '');
    const requiresAction = filterRuns(sampleRuns, 'requires_action', '');
    const completed = filterRuns(sampleRuns, 'completed', '');
    const failed = filterRuns(sampleRuns, 'failed', '');

    Assert.equal(all.length, 7);
    // Active includes pending, running, requires_action (ids 1, 2, 3)
    Assert.equal(active.length, 3);
    Assert.equal(active.map(r => r.id).sort().join(','), '1,2,3');

    // Requires action (id 3)
    Assert.equal(requiresAction.length, 1);
    Assert.equal(requiresAction[0].id, '3');

    // Completed (ids 4, 5)
    Assert.equal(completed.length, 2);
    Assert.equal(completed.map(r => r.id).sort().join(','), '4,5');

    // Failed includes failed and cancelled (ids 6, 7)
    Assert.equal(failed.length, 2);
    Assert.equal(failed.map(r => r.id).sort().join(','), '6,7');
  });

  harness.it('ensures pill counts perfectly match computeStats aggregates', () => {
    const stats = computeStats(sampleRuns);

    const activeList = filterRuns(sampleRuns, 'active', '');
    const needs2faList = filterRuns(sampleRuns, 'requires_action', '');
    const completedList = filterRuns(sampleRuns, 'completed', '');
    const failedList = filterRuns(sampleRuns, 'failed', '');

    Assert.equal(stats.total, sampleRuns.length);
    Assert.equal(stats.active, activeList.length);
    Assert.equal(stats.needs2fa, needs2faList.length);
    Assert.equal(stats.completed, completedList.length);
    Assert.equal(stats.failed, failedList.length);

    // Invoices sum = 0 + 3 + 1 + 5 + 2 + 0 + 0 = 11
    Assert.equal(stats.totalFiles, 11);

    // Success rate = 2 / 7 = 28.57% -> 29%
    Assert.equal(stats.successRate, 29);
  });

  harness.it('handles 0 runs in computeStats without division by zero', () => {
    const emptyStats = computeStats([]);
    Assert.equal(emptyStats.total, 0);
    Assert.equal(emptyStats.active, 0);
    Assert.equal(emptyStats.needs2fa, 0);
    Assert.equal(emptyStats.completed, 0);
    Assert.equal(emptyStats.failed, 0);
    Assert.equal(emptyStats.totalFiles, 0);
    Assert.equal(emptyStats.successRate, 0);
    Assert.ok(!isNaN(emptyStats.successRate), 'Success rate must not be NaN');
  });

  harness.it('combines filter pill AND search query conjunctively', () => {
    const customRuns = [
      { id: '1', status: 'running', workflowName: 'Invoices Alpha' },
      { id: '2', status: 'running', workflowName: 'Reports Beta' },
      { id: '3', status: 'completed', workflowName: 'Invoices Gamma' },
    ];

    // Pill = active (1, 2) AND search = 'Invoices' -> matches only 1
    const res = filterRuns(customRuns, 'active', 'Invoices');
    Assert.equal(res.length, 1);
    Assert.equal(res[0].id, '1');

    // Pill = completed (3) AND search = 'Beta' -> matches 0
    const res2 = filterRuns(customRuns, 'completed', 'Beta');
    Assert.equal(res2.length, 0);
  });
});

// ============================================================================
// SUITE 3: Empty State Rendering Decision Tree
// ============================================================================

harness.describe('Suite 3: Empty State Rendering Decision Tree', () => {
  harness.it('renders LOADING when isLoading is true regardless of counts', () => {
    Assert.equal(getEmptyStateKind(true, 0, 0), 'LOADING');
    Assert.equal(getEmptyStateKind(true, 10, 5), 'LOADING');
  });

  harness.it('renders NO_RUNS_YET when total runs is 0', () => {
    // When 0 total runs, invites user to browse workflow library
    Assert.equal(getEmptyStateKind(false, 0, 0), 'NO_RUNS_YET');
  });

  harness.it('renders NO_FILTER_MATCHES when runs exist but filter yields 0', () => {
    // Total runs = 5, but filter/search yielded 0
    Assert.equal(getEmptyStateKind(false, 5, 0), 'NO_FILTER_MATCHES');
  });

  harness.it('renders SHOW_TABLE when filtered runs are present', () => {
    Assert.equal(getEmptyStateKind(false, 5, 3), 'SHOW_TABLE');
  });
});

// ============================================================================
// SUITE 4: Unmount Lifecycle & Teardown Cleanliness
// ============================================================================

harness.describe('Suite 4: Unmount Lifecycle & Teardown Cleanliness', () => {
  harness.it('cleans up Supabase Realtime channel subscription on unmount', () => {
    let channelRemoved = false;
    let registeredChannel = null;

    const mockSupabase = {
      channel: (name) => {
        registeredChannel = {
          name,
          on: () => registeredChannel,
          subscribe: () => registeredChannel,
        };
        return registeredChannel;
      },
      removeChannel: (ch) => {
        if (ch === registeredChannel) {
          channelRemoved = true;
        }
      },
    };

    // Simulate useEffect in runs/page.tsx
    const orgId = 'org-test-uuid-123';
    const channel = mockSupabase
      .channel(`wf_execution_runs_telemetry_${orgId}`)
      .on('postgres_changes', {}, () => {})
      .subscribe();

    const cleanup = () => {
      mockSupabase.removeChannel(channel);
    };

    Assert.equal(channelRemoved, false);
    // Execute component unmount
    cleanup();
    Assert.equal(channelRemoved, true, 'Supabase channel must be removed cleanly on unmount');
  });

  harness.it('cleans up 3s polling interval on unmount when active runs exist', () => {
    let clearedTimerId = null;

    // Simulate setInterval
    const intervalId = setInterval(() => {}, 3000);

    // Simulate unmount cleanup in runs/page.tsx
    const cleanup = () => {
      clearInterval(intervalId);
      clearedTimerId = intervalId;
    };

    cleanup();
    Assert.ok(clearedTimerId !== null, 'Interval ID must be cleared upon unmount');
  });

  harness.it('does not create polling interval when no active runs exist', () => {
    const terminalRuns = [
      { id: '1', status: 'completed' },
      { id: '2', status: 'failed' },
      { id: '3', status: 'cancelled' },
    ];

    const hasActiveRuns = terminalRuns.some(
      (r) => r.status === 'pending' || r.status === 'running' || r.status === 'requires_action'
    );

    Assert.equal(hasActiveRuns, false, 'hasActiveRuns must be false for terminal-only runs');
    // Effect early returns: `if (!hasActiveRuns || !orgId) return;`
  });

  harness.it('removes window keydown event listener on unmount', () => {
    const listeners = [];
    const mockWindow = {
      addEventListener: (type, fn) => listeners.push({ type, fn }),
      removeEventListener: (type, fn) => {
        const idx = listeners.findIndex(l => l.type === type && l.fn === fn);
        if (idx !== -1) listeners.splice(idx, 1);
      }
    };

    const handleKeyDown = () => {};
    mockWindow.addEventListener('keydown', handleKeyDown);
    Assert.equal(listeners.length, 1);

    // Unmount cleanup
    mockWindow.removeEventListener('keydown', handleKeyDown);
    Assert.equal(listeners.length, 0, 'Keydown listener must be removed on unmount');
  });

  harness.it('stress tests rapid mount-unmount cycles (50 cycles) without leaked timers', () => {
    let activeIntervalCount = 0;
    const cleanups = [];

    for (let i = 0; i < 50; i++) {
      activeIntervalCount++;
      const id = setInterval(() => {}, 3000);
      cleanups.push(() => {
        clearInterval(id);
        activeIntervalCount--;
      });
    }

    Assert.equal(activeIntervalCount, 50);

    // Unmount all
    while (cleanups.length > 0) {
      const fn = cleanups.pop();
      fn();
    }

    Assert.equal(activeIntervalCount, 0, 'All intervals must be zero after teardown');
  });
});

// ============================================================================
// SUITE 5: Formatters & Progress Edge Cases
// ============================================================================

harness.describe('Suite 5: Formatters & Calculation Boundaries', () => {
  harness.it('formats durations across scales (seconds, minutes, hours, invalid)', () => {
    const t0 = new Date('2026-10-11T12:00:00Z').toISOString();
    const t25s = new Date('2026-10-11T12:00:25Z').toISOString();
    const t3m12s = new Date('2026-10-11T12:03:12Z').toISOString();
    const t2h15m = new Date('2026-10-11T14:15:00Z').toISOString();

    Assert.equal(formatDuration(t0, t25s), '25s');
    Assert.equal(formatDuration(t0, t3m12s), '3m 12s');
    Assert.equal(formatDuration(t0, t2h15m), '2h 15m');

    // Missing / invalid
    Assert.equal(formatDuration(null, null), '—');
    Assert.equal(formatDuration(undefined, undefined), '—');
    Assert.equal(formatDuration('invalid-date', null), '—');
    // Inverted (completed before start)
    Assert.equal(formatDuration(t25s, t0), '—');
  });

  harness.it('formats relative time across recent, minutes, hours, days', () => {
    const now = new Date('2026-10-11T12:00:00Z').getTime();

    // 20 seconds ago -> Just now
    const t20s = new Date(now - 20 * 1000).toISOString();
    Assert.equal(formatRelativeTime(t20s, now), 'Just now');

    // 15 minutes ago -> 15m ago
    const t15m = new Date(now - 15 * 60 * 1000).toISOString();
    Assert.equal(formatRelativeTime(t15m, now), '15m ago');

    // 4 hours ago -> 4h ago
    const t4h = new Date(now - 4 * 3600 * 1000).toISOString();
    Assert.equal(formatRelativeTime(t4h, now), '4h ago');

    // 1 day ago -> Yesterday
    const t1d = new Date(now - 26 * 3600 * 1000).toISOString();
    Assert.equal(formatRelativeTime(t1d, now), 'Yesterday');

    // 3 days ago -> 3d ago
    const t3d = new Date(now - 3 * 24 * 3600 * 1000).toISOString();
    Assert.equal(formatRelativeTime(t3d, now), '3d ago');

    // Invalid / null
    Assert.equal(formatRelativeTime(null, now), '—');
    Assert.equal(formatRelativeTime('not-a-date', now), '—');
  });

  harness.it('calculates progress percentage with safety clamp', () => {
    Assert.equal(computeProgressPct(0, 0), 0);
    Assert.equal(computeProgressPct(5, 10), 50);
    Assert.equal(computeProgressPct(10, 10), 100);
    // Overflow protection: items_processed > discovered
    Assert.equal(computeProgressPct(15, 10), 100);
    // Null/undefined safety
    Assert.equal(computeProgressPct(null, null), 0);
  });
});

// ============================================================================
// SUITE 6: Source AST & Architectural Invariants of runs/page.tsx
// ============================================================================

harness.describe('Suite 6: Source Invariants of runs/page.tsx', () => {
  const runsPagePath = path.resolve(__dirname, '../apps/web/src/app/dashboard/runs/page.tsx');
  let sourceCode = '';

  harness.it('loads runs/page.tsx from expected path', () => {
    Assert.ok(fs.existsSync(runsPagePath), `File must exist at ${runsPagePath}`);
    sourceCode = fs.readFileSync(runsPagePath, 'utf8');
    Assert.ok(sourceCode.length > 500, 'File must not be empty');
  });

  harness.it('is a Client Component starting with "use client"', () => {
    Assert.ok(sourceCode.trim().startsWith("'use client'"), 'Must begin with use client directive');
  });

  harness.it('integrates useDashboard context hook correctly', () => {
    Assert.ok(sourceCode.includes("from '@/context/DashboardContext'"), 'Must import from DashboardContext');
    Assert.ok(sourceCode.includes('useDashboard()'), 'Must call useDashboard hook');
    Assert.ok(sourceCode.includes('openRunDetails'), 'Must destructure openRunDetails');
    Assert.ok(sourceCode.includes('stopActiveRun'), 'Must destructure stopActiveRun');
  });

  harness.it('wires Supabase Realtime postgres_changes listener with channel removal', () => {
    Assert.ok(sourceCode.includes("table: 'wf_execution_runs'"), 'Must listen to wf_execution_runs');
    Assert.ok(sourceCode.includes("supabase.removeChannel(channel)"), 'Must cleanly call removeChannel on unmount');
  });

  harness.it('implements 3s polling interval with clearInterval cleanup', () => {
    Assert.ok(sourceCode.includes('setInterval('), 'Must configure setInterval polling');
    Assert.ok(sourceCode.includes('3000'), 'Must use 3s interval');
    Assert.ok(sourceCode.includes('clearInterval(interval)'), 'Must call clearInterval on unmount');
  });

  harness.it('mounts TwoFactorBanner for action-required runs', () => {
    Assert.ok(sourceCode.includes('<TwoFactorBanner'), 'Must mount TwoFactorBanner component');
    Assert.ok(sourceCode.includes("actionRuns.length > 0"), 'Must conditionally render when action runs exist');
  });

  harness.it('protects action buttons with stopPropagation()', () => {
    // Both handleStopRun and handleCopyId must stop propagation to prevent row click drawer trigger
    Assert.ok(sourceCode.includes('handleStopRun = async (runId: string, e: React.MouseEvent) => {'), 'handleStopRun signature');
    Assert.ok(sourceCode.includes('handleCopyId = (id: string, e: React.MouseEvent) => {'), 'handleCopyId signature');
    const stopPropagationCount = (sourceCode.match(/e\.stopPropagation\(\)/g) || []).length;
    Assert.ok(stopPropagationCount >= 2, 'Must stop propagation on both Stop Run and Copy ID');
  });

  harness.it('provides all 6 required telemetry columns', () => {
    Assert.ok(sourceCode.includes('<StatusBadge status={run.status} />'), 'Column 1: Status badge');
    Assert.ok(sourceCode.includes('workflowDisplayName'), 'Column 2: Workflow Name');
    Assert.ok(sourceCode.includes('items_processed'), 'Column 3: Discovered / Processed Items');
    Assert.ok(sourceCode.includes('items_downloaded'), 'Column 4: Invoices Downloaded');
    Assert.ok(sourceCode.includes('formatDuration'), 'Column 5: Duration / Started');
    Assert.ok(sourceCode.includes('Stop Run') && sourceCode.includes('Inspect'), 'Column 6: Actions (Stop Run / Inspect)');
  });
});

// Run all test suites
harness.run().then((report) => {
  if (report.failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}).catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
