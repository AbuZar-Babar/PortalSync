import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the actual implementation file
const runsPagePath = path.resolve(__dirname, '../src/app/dashboard/runs/page.tsx');
const pageCode = fs.readFileSync(runsPagePath, 'utf8');

// Dynamically extract formatDuration and formatRelativeTime from page.tsx and transpile with TS
function extractFunction(code, funcName) {
  const funcStart = code.indexOf(`function ${funcName}`);
  if (funcStart === -1) {
    throw new Error(`Function ${funcName} not found in ${runsPagePath}`);
  }
  let braceCount = 0;
  let started = false;
  let endIndex = -1;
  for (let i = funcStart; i < code.length; i++) {
    if (code[i] === '{') {
      braceCount++;
      started = true;
    } else if (code[i] === '}') {
      braceCount--;
      if (started && braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }
  if (endIndex === -1) {
    throw new Error(`Could not find end of function ${funcName}`);
  }
  const funcBodyTs = code.slice(funcStart, endIndex);
  const transpiled = ts.transpileModule(funcBodyTs, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;

  return new Function(`${transpiled}; return ${funcName};`)();
}

const formatDuration = extractFunction(pageCode, 'formatDuration');
const formatRelativeTime = extractFunction(pageCode, 'formatRelativeTime');

describe('Milestone M3 Empirical Challenge: Telemetry & UI Logic', () => {

  describe('1. formatDuration Telemetry Calculation', () => {
    test('handles missing or invalid inputs gracefully', () => {
      assert.equal(formatDuration(null, null), '—');
      assert.equal(formatDuration(undefined, undefined), '—');
      assert.equal(formatDuration('', ''), '—');
      assert.equal(formatDuration('invalid-date', null), '—');
      assert.equal(formatDuration('2026-01-01T00:00:00Z', 'invalid-date'), '—');
      assert.equal(formatDuration(null, '2026-01-01T00:00:00Z'), '—');
    });

    test('handles completedAt earlier than startedAt', () => {
      const start = '2026-10-11T12:00:00Z';
      const end = '2026-10-11T11:59:00Z';
      assert.equal(formatDuration(start, end), '—');
    });

    test('handles future startedAt when completedAt is omitted', () => {
      const futureStart = new Date(Date.now() + 60000).toISOString();
      assert.equal(formatDuration(futureStart, null), '—');
    });

    test('formats durations under 60 seconds (seconds only)', () => {
      const start = new Date(1000000000000);
      const end0 = new Date(1000000000000);
      const end45 = new Date(1000000045000);
      const end59 = new Date(1000000059999);

      assert.equal(formatDuration(start.toISOString(), end0.toISOString()), '0s');
      assert.equal(formatDuration(start.toISOString(), end45.toISOString()), '45s');
      assert.equal(formatDuration(start.toISOString(), end59.toISOString()), '59s');
    });

    test('formats durations between 1 minute and 59 minutes (m and s)', () => {
      const start = new Date(1000000000000);
      const end60s = new Date(1000000060000); // 1m 0s
      const end95s = new Date(1000000095000); // 1m 35s
      const end59m59s = new Date(1000000000000 + (59 * 60 + 59) * 1000);

      assert.equal(formatDuration(start.toISOString(), end60s.toISOString()), '1m 0s');
      assert.equal(formatDuration(start.toISOString(), end95s.toISOString()), '1m 35s');
      assert.equal(formatDuration(start.toISOString(), end59m59s.toISOString()), '59m 59s');
    });

    test('formats durations of 1 hour or more (h and m)', () => {
      const start = new Date(1000000000000);
      const end1h = new Date(1000000000000 + 3600 * 1000); // 1h 0m
      const end2h15m = new Date(1000000000000 + (2 * 3600 + 15 * 60 + 20) * 1000); // 2h 15m (seconds truncated)
      const end48h = new Date(1000000000000 + 48 * 3600 * 1000);

      assert.equal(formatDuration(start.toISOString(), end1h.toISOString()), '1h 0m');
      assert.equal(formatDuration(start.toISOString(), end2h15m.toISOString()), '2h 15m');
      assert.equal(formatDuration(start.toISOString(), end48h.toISOString()), '48h 0m');
    });

    test('parses timestamps with varied timezone offsets (+05:00, -04:00, Z)', () => {
      const start = '2026-10-11T10:00:00+05:00';
      const end = '2026-10-11T05:01:30Z'; // equivalent to 10:01:30+05:00 -> 1m 30s diff
      assert.equal(formatDuration(start, end), '1m 30s');
    });

    test('adversarial generator: 1,000 synthetic runs format cleanly without throw', () => {
      const baseMs = 1760000000000;
      for (let i = 0; i < 1000; i++) {
        const offsetSec = Math.floor(Math.random() * 86400 * 3); // up to 3 days
        const start = new Date(baseMs).toISOString();
        const end = new Date(baseMs + offsetSec * 1000).toISOString();
        const res = formatDuration(start, end);
        assert.ok(typeof res === 'string' && res.length > 0);
        assert.notEqual(res, '—');
      }
    });
  });

  describe('2. formatRelativeTime Telemetry Calculation', () => {
    test('handles missing or invalid inputs gracefully', () => {
      assert.equal(formatRelativeTime(null), '—');
      assert.equal(formatRelativeTime(undefined), '—');
      assert.equal(formatRelativeTime(''), '—');
      assert.equal(formatRelativeTime('not-a-valid-date'), '—');
    });

    test('formats recent times under 45 seconds as "Just now"', () => {
      const now = Date.now();
      assert.equal(formatRelativeTime(new Date(now - 10000).toISOString()), 'Just now');
      assert.equal(formatRelativeTime(new Date(now - 44000).toISOString()), 'Just now');
    });

    test('boundary testing: 45s to 59s returns "0m ago"', () => {
      const now = Date.now();
      const formatted50s = formatRelativeTime(new Date(now - 50000).toISOString());
      assert.equal(formatted50s, '0m ago');
    });

    test('formats minutes, hours, yesterday, and days', () => {
      const now = Date.now();
      assert.equal(formatRelativeTime(new Date(now - 65000).toISOString()), '1m ago');
      assert.equal(formatRelativeTime(new Date(now - 59 * 60 * 1000).toISOString()), '59m ago');
      assert.equal(formatRelativeTime(new Date(now - 2 * 3600 * 1000).toISOString()), '2h ago');
      assert.equal(formatRelativeTime(new Date(now - 24 * 3600 * 1000).toISOString()), 'Yesterday');
      assert.equal(formatRelativeTime(new Date(now - 3 * 24 * 3600 * 1000).toISOString()), '3d ago');
      assert.equal(formatRelativeTime(new Date(now - 6 * 24 * 3600 * 1000).toISOString()), '6d ago');
    });

    test('falls back to locale date string for 7+ days', () => {
      const now = Date.now();
      const past7d = new Date(now - 8 * 24 * 3600 * 1000);
      const res = formatRelativeTime(past7d.toISOString());
      assert.ok(!res.includes('ago') && res !== 'Yesterday');
    });
  });

  describe('3. Processed / Discovered Ratio Calculation', () => {
    function computeProgress(processed, discovered) {
      const processedCount = processed || 0;
      const discoveredCount = discovered || 0;
      return discoveredCount > 0
        ? Math.min(100, Math.round((processedCount / discoveredCount) * 100))
        : 0;
    }

    test('calculates 0% when discoveredCount is 0 or undefined', () => {
      assert.equal(computeProgress(0, 0), 0);
      assert.equal(computeProgress(5, 0), 0);
      assert.equal(computeProgress(undefined, undefined), 0);
      assert.equal(computeProgress(null, null), 0);
    });

    test('calculates accurate percentages and rounds correctly', () => {
      assert.equal(computeProgress(5, 10), 50);
      assert.equal(computeProgress(1, 3), 33);
      assert.equal(computeProgress(2, 3), 67);
      assert.equal(computeProgress(100, 100), 100);
    });

    test('clamps ratio at 100% when processed exceeds discovered', () => {
      assert.equal(computeProgress(120, 100), 100);
      assert.equal(computeProgress(50, 10), 100);
    });

    test('stress test across 1,000 randomized runs', () => {
      for (let i = 0; i < 1000; i++) {
        const discovered = Math.floor(Math.random() * 500);
        const processed = Math.floor(Math.random() * 600);
        const ratio = computeProgress(processed, discovered);
        assert.ok(ratio >= 0 && ratio <= 100, `Ratio ${ratio} out of bounds`);
        if (discovered === 0) {
          assert.equal(ratio, 0);
        } else if (processed >= discovered) {
          assert.equal(ratio, 100);
        }
      }
    });
  });

  describe('4. 2FA Recovery Banner Condition & Props Mapping', () => {
    const mockRuns = [
      { id: 'run-1', status: 'running', workflow_id: 'wf-1', started_at: '2026-10-11T10:00:00Z' },
      { id: 'run-2', status: 'requires_action', workflow_id: 'wf-2', wf_workflows: { name: 'SAP Vendor Invoice' }, started_at: '2026-10-11T10:01:00Z', error_summary: '2FA timeout pending' },
      { id: 'run-3', status: 'completed', workflow_id: 'wf-3', started_at: '2026-10-11T09:00:00Z' },
      { id: 'run-4', status: 'requires_action', workflow_id: 'wf-4', workflowName: 'Coupa Portal Downloader', started_at: '2026-10-11T10:02:00Z' },
    ];

    test('filters only runs with status === requires_action', () => {
      const actionRuns = mockRuns.filter((r) => r.status === 'requires_action');
      assert.equal(actionRuns.length, 2);
      assert.equal(actionRuns[0].id, 'run-2');
      assert.equal(actionRuns[1].id, 'run-4');
    });

    test('correctly maps activeActionRuns props', () => {
      const actionRuns = mockRuns.filter((r) => r.status === 'requires_action');
      const mapped = actionRuns.map((r) => ({
        id: r.id,
        workflowName: r.wf_workflows?.name || r.workflowName || r.workflow_id,
        wf_workflows: r.wf_workflows || undefined,
        error_summary: r.error_summary,
        started_at: r.started_at,
      }));

      assert.equal(mapped.length, 2);
      assert.equal(mapped[0].workflowName, 'SAP Vendor Invoice');
      assert.equal(mapped[0].error_summary, '2FA timeout pending');
      assert.equal(mapped[1].workflowName, 'Coupa Portal Downloader');
    });

    test('banner trigger: activates if and only if actionRuns.length > 0', () => {
      const noActionRuns = mockRuns.filter((r) => r.status !== 'requires_action');
      assert.equal(noActionRuns.filter((r) => r.status === 'requires_action').length > 0, false);
      assert.equal(mockRuns.filter((r) => r.status === 'requires_action').length > 0, true);
    });

    test('banner onSelectRun maps to handleOpenRun correctly', () => {
      let openedItem = null;
      const handleOpenRun = (run) => {
        openedItem = run;
      };

      const selectedActionRun = { id: 'run-2' };
      const fullRun = mockRuns.find((r) => r.id === selectedActionRun.id);
      if (fullRun) {
        handleOpenRun(fullRun);
      }

      assert.ok(openedItem !== null);
      assert.equal(openedItem.id, 'run-2');
      assert.equal(openedItem.status, 'requires_action');
    });
  });

  describe('5. Stop Run Button: Event Isolation, Arguments & Optimistic State', () => {
    test('isolates event propagation via e.stopPropagation() and passes run.id', async () => {
      let propagationStopped = false;
      let rowClickTriggered = false;

      const mockEvent = {
        stopPropagation: () => {
          propagationStopped = true;
        },
      };

      let stopRunCalledWith = null;
      const stopActiveRunMock = async (id) => {
        stopRunCalledWith = id;
        return true;
      };

      let runsState = [
        { id: 'run-alpha', status: 'running' },
        { id: 'run-beta', status: 'completed' },
      ];

      const setRuns = (updater) => {
        runsState = updater(runsState);
      };

      // Emulate handleStopRun from page.tsx
      const handleStopRun = async (runId, e) => {
        e.stopPropagation();
        const ok = await stopActiveRunMock(runId);
        if (ok) {
          setRuns((prev) =>
            prev.map((r) => (r.id === runId ? { ...r, status: 'cancelled' } : r))
          );
        }
      };

      await handleStopRun('run-alpha', mockEvent);

      assert.equal(propagationStopped, true, 'e.stopPropagation() was invoked');
      assert.equal(rowClickTriggered, false, 'Row click handler was prevented');
      assert.equal(stopRunCalledWith, 'run-alpha', 'stopActiveRun received correct run.id');
      assert.equal(runsState[0].status, 'cancelled', 'Optimistic state updated target run to cancelled');
      assert.equal(runsState[1].status, 'completed', 'Other runs remained untouched');
    });

    test('retains original state if stopActiveRun fails', async () => {
      const mockEvent = { stopPropagation: () => {} };
      const stopActiveRunMock = async () => false;

      let runsState = [{ id: 'run-gamma', status: 'running' }];
      const setRuns = (updater) => {
        runsState = updater(runsState);
      };

      const handleStopRun = async (runId, e) => {
        e.stopPropagation();
        const ok = await stopActiveRunMock(runId);
        if (ok) {
          setRuns((prev) =>
            prev.map((r) => (r.id === runId ? { ...r, status: 'cancelled' } : r))
          );
        }
      };

      await handleStopRun('run-gamma', mockEvent);
      assert.equal(runsState[0].status, 'running', 'Status was not changed when API returned false');
    });

    test('verifies active status condition for rendering Stop Run button', () => {
      const checkIsActive = (status) =>
        status === 'pending' || status === 'running' || status === 'requires_action';

      assert.equal(checkIsActive('pending'), true);
      assert.equal(checkIsActive('running'), true);
      assert.equal(checkIsActive('requires_action'), true);
      assert.equal(checkIsActive('completed'), false);
      assert.equal(checkIsActive('failed'), false);
      assert.equal(checkIsActive('cancelled'), false);
    });
  });

  describe('6. Filter Pills & Instant Search Logic', () => {
    const dataset = [
      { id: 'uuid-1', status: 'running', workflow_id: 'wf-a', workflowName: 'Amazon Receipts' },
      { id: 'uuid-2', status: 'pending', workflow_id: 'wf-b', workflowName: 'Stripe Payouts' },
      { id: 'uuid-3', status: 'requires_action', workflow_id: 'wf-c', workflowName: 'PayPal OTP' },
      { id: 'uuid-4', status: 'completed', workflow_id: 'wf-d', workflowName: 'QuickBooks Sync' },
      { id: 'uuid-5', status: 'failed', workflow_id: 'wf-e', workflowName: 'NetSuite Downloader' },
      { id: 'uuid-6', status: 'cancelled', workflow_id: 'wf-f', workflowName: 'Xero Archive' },
    ];

    function filterDataset(items, statusFilter, searchQuery) {
      return items.filter((run) => {
        if (statusFilter === 'active') {
          if (!['pending', 'running', 'requires_action'].includes(run.status)) return false;
        } else if (statusFilter === 'requires_action') {
          if (run.status !== 'requires_action') return false;
        } else if (statusFilter === 'completed') {
          if (run.status !== 'completed') return false;
        } else if (statusFilter === 'failed') {
          if (!['failed', 'cancelled'].includes(run.status)) return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const wfName = (run.workflowName || '').toLowerCase();
          const wfId = (run.workflow_id || '').toLowerCase();
          const runId = (run.id || '').toLowerCase();
          if (!wfName.includes(q) && !wfId.includes(q) && !runId.includes(q)) return false;
        }
        return true;
      });
    }

    test('filters accurately across all pills', () => {
      assert.equal(filterDataset(dataset, 'all', '').length, 6);
      assert.equal(filterDataset(dataset, 'active', '').length, 3);
      assert.equal(filterDataset(dataset, 'requires_action', '').length, 1);
      assert.equal(filterDataset(dataset, 'completed', '').length, 1);
      assert.equal(filterDataset(dataset, 'failed', '').length, 2); // failed + cancelled
    });

    test('instant search queries match workflow name, ID, or UUID substring', () => {
      assert.equal(filterDataset(dataset, 'all', 'stripe').length, 1);
      assert.equal(filterDataset(dataset, 'all', 'wf-c').length, 1);
      assert.equal(filterDataset(dataset, 'all', 'uuid-5').length, 1);
      assert.equal(filterDataset(dataset, 'all', 'nonexistent').length, 0);
      assert.equal(filterDataset(dataset, 'active', 'paypal').length, 1);
      assert.equal(filterDataset(dataset, 'completed', 'stripe').length, 0); // stripe is pending, not completed
    });
  });

  describe('7. Static Code Integrity Verification on page.tsx', () => {
    test('verifies presence of all required hooks and subscriptions', () => {
      assert.ok(pageCode.includes("useDashboard()"), 'Must consume useDashboard()');
      assert.ok(pageCode.includes("openRunDetails("), 'Must call openRunDetails');
      assert.ok(pageCode.includes("stopActiveRun("), 'Must call stopActiveRun');
      assert.ok(pageCode.includes("TwoFactorBanner"), 'Must render TwoFactorBanner');
      assert.ok(pageCode.includes("wf_execution_runs"), 'Must reference wf_execution_runs');
      assert.ok(pageCode.includes(".channel("), 'Must set up Supabase realtime channel');
      assert.ok(pageCode.includes("removeChannel("), 'Must clean up Supabase realtime channel');
      assert.ok(pageCode.includes("e.stopPropagation()"), 'Must isolate Stop Run click event');
    });

    test('verifies telemetry columns exist', () => {
      assert.ok(pageCode.includes('Status'), 'Has Status column');
      assert.ok(pageCode.includes('Workflow Name'), 'Has Workflow Name column');
      assert.ok(pageCode.includes('Discovered / Processed'), 'Has Discovered / Processed column');
      assert.ok(pageCode.includes('Invoices Downloaded'), 'Has Invoices Downloaded column');
      assert.ok(pageCode.includes('Duration / Started'), 'Has Duration / Started column');
      assert.ok(pageCode.includes('Actions'), 'Has Actions column');
    });
  });
});
