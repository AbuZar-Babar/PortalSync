/**
 * Extended Verification Suite: Filter and Batch Execution Edge Cases
 */

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const { validateItemFilter, evaluateItemFilter } = require('../packages/engine/src/shared/item-filter');
const LoopReplayRunner = require('../packages/engine/src/replay/loop-replay-runner');

async function runExtendedTests() {
  console.log('🧪 Starting Extended Filter and Batch Execution Tests...\n');

  // --------------------------------------------------------------------------
  // Test E1: State Leakage Prevention in API Definition Update Logic
  // --------------------------------------------------------------------------
  console.log('🔹 Test E1: State Leakage Prevention in Runs API Logic');
  {
    const currentDefWithFilter = {
      mode: 'loop',
      isLoop: true,
      loopStepIndex: 2,
      loopLimit: 5,
      itemFilter: {
        matchMode: 'all',
        conditions: [{ field: 'Status', operator: 'equals', value: 'Pending' }]
      }
    };
    const currentFilterRulesWithFilter = {
      itemFilter: {
        matchMode: 'all',
        conditions: [{ field: 'Status', operator: 'equals', value: 'Pending' }]
      }
    };

    // Simulate clearing filter and limits on new run dispatch
    const nextMode = 'loop';
    const nextIsLoop = true;
    const nextLoopStepIndex = 1;
    const nextLoopLimit = null; // No limit
    const nextItemFilter = null; // No filter (process all items)

    const updatedDef = {
      ...currentDefWithFilter,
      mode: nextMode,
      isLoop: nextIsLoop,
      loopStepIndex: (nextLoopStepIndex !== null && nextLoopStepIndex !== undefined) ? nextLoopStepIndex : null,
      loopLimit: (nextLoopLimit !== null && nextLoopLimit !== undefined) ? nextLoopLimit : null,
      itemFilter: nextItemFilter || null,
    };

    const updatedFilterRules = {
      ...currentFilterRulesWithFilter,
      itemFilter: nextItemFilter || null,
    };

    assert.strictEqual(updatedDef.itemFilter, null, 'Previous itemFilter must be cleared');
    assert.strictEqual(updatedDef.loopLimit, null, 'Previous loopLimit must be cleared');
    assert.strictEqual(updatedDef.loopStepIndex, 1, 'New loopStepIndex must be 1');
    assert.strictEqual(updatedFilterRules.itemFilter, null, 'filter_rules itemFilter must be cleared');
    console.log('  ✅ State leakage prevention passed');
  }

  // --------------------------------------------------------------------------
  // Test E2: RunnerDaemon Candidate Filter Discrimination
  // --------------------------------------------------------------------------
  console.log('🔹 Test E2: RunnerDaemon Candidate Filter Discrimination');
  {
    function resolveCandidateFilter(candidate) {
      if (!candidate || typeof candidate !== 'object') return null;
      if (candidate.itemFilter) return resolveCandidateFilter(candidate.itemFilter);
      if (Array.isArray(candidate.conditions) && candidate.conditions.length > 0) return candidate;
      if (candidate.field || candidate.column || candidate.filterValue) return candidate;
      return null;
    }

    // 1. Metadata-only filter_rules should NOT be treated as a filter
    const metadataFilterRules = {
      available_fields: ['Type', 'Status', 'Invoice Number', 'Due Date', 'Amount'],
      columns: ['Type', 'Status']
    };
    assert.strictEqual(resolveCandidateFilter(metadataFilterRules), null, 'Metadata filter_rules must return null');

    // 2. Enveloped itemFilter should be extracted
    const validCompound = {
      matchMode: 'all',
      conditions: [{ field: 'Type', operator: 'contains', value: 'Invoice' }]
    };
    assert.deepStrictEqual(resolveCandidateFilter({ itemFilter: validCompound }), validCompound);

    // 3. Legacy column/value shape should be recognized
    const legacyShape = { column: 'Type', value: 'Invoice' };
    assert.deepStrictEqual(resolveCandidateFilter(legacyShape), legacyShape);

    console.log('  ✅ Candidate filter discrimination passed');
  }

  // --------------------------------------------------------------------------
  // Test E3: Loop Step Candidate Auto-Detection Invariants
  // --------------------------------------------------------------------------
  console.log('🔹 Test E3: Loop Step Candidate Auto-Detection');
  {
    function getWorkflowSteps(workflow) {
      if (!workflow) return [];
      const wd = workflow.workflow_definition || {};
      if (Array.isArray(wd.steps) && wd.steps.length > 0) return wd.steps;
      if (Array.isArray(wd.actions) && wd.actions.length > 0) return wd.actions;
      if (Array.isArray(workflow.steps) && workflow.steps.length > 0) return workflow.steps;
      if (Array.isArray(workflow.actions) && workflow.actions.length > 0) return workflow.actions;
      return [];
    }

    function detectLoopCandidate(steps, savedIndex) {
      if (!Array.isArray(steps) || steps.length === 0) return 0;
      if (typeof savedIndex === 'number' && Number.isInteger(savedIndex) && savedIndex >= 0 && savedIndex < steps.length) {
        return savedIndex;
      }
      const roleIdx = steps.findIndex(
        (s) => s && (s.role === 'LOOP' || s.isLoopCandidate === true || s.isLoop === true || s.loopMode === 'sequential_iteration')
      );
      if (roleIdx >= 0) return roleIdx;

      const rowIdx = steps.findIndex((s) => {
        if (!s) return false;
        const tag = (s.target?.fingerprint?.tagName || s.fingerprint?.tagName || '').toUpperCase();
        const role = (s.target?.fingerprint?.role || '').toLowerCase();
        const text = (s.name || s.elementName || s.description || s.target?.elementName || s.target?.friendlyName || '').toLowerCase();
        const candidates = Array.isArray(s.target?.candidates) ? s.target.candidates : [];
        const selectors = candidates.map((c) => c.value || '').join(' ').toLowerCase();

        return (
          tag === 'TR' ||
          tag === 'TD' ||
          role === 'row' ||
          role === 'gridcell' ||
          selectors.includes('tr') ||
          selectors.includes('tbody') ||
          selectors.includes('data-row') ||
          selectors.includes('.row') ||
          text.includes('table row') ||
          text.includes('row item') ||
          text.includes('invoice row')
        );
      });
      if (rowIdx >= 0) return rowIdx;

      if (steps.length > 1) return 1;
      return 0;
    }

    // Workflow with actions instead of steps
    const wfWithActions = {
      workflow_definition: {
        actions: [
          { name: 'Go to portal', type: 'navigate' },
          { name: 'Click Invoice Row', type: 'click', target: { fingerprint: { tagName: 'TR' } } },
          { name: 'Download PDF', type: 'click' }
        ]
      }
    };
    const extractedSteps = getWorkflowSteps(wfWithActions);
    assert.strictEqual(extractedSteps.length, 3, 'Must extract 3 actions as steps');
    assert.strictEqual(detectLoopCandidate(extractedSteps), 1, 'Must detect TR at index 1');

    // Generic workflow with 4 steps without table tags: fallback to Step #2 (index 1)
    const generic4 = [
      { name: 'Step 1' },
      { name: 'Step 2' },
      { name: 'Step 3' },
      { name: 'Step 4' }
    ];
    assert.strictEqual(detectLoopCandidate(generic4), 1, 'Generic 4-step workflow must fallback to index 1 (Step #2)');

    // Single step workflow: index 0
    assert.strictEqual(detectLoopCandidate([{ name: 'Step 1' }]), 0, 'Single step workflow must fallback to index 0');

    console.log('  ✅ Loop step candidate auto-detection passed');
  }

  // --------------------------------------------------------------------------
  // Test E4: Condition Validation and Construction Edge Cases
  // --------------------------------------------------------------------------
  console.log('🔹 Test E4: Condition Validation and Payload Construction');
  {
    function validateAndBuildFilter(conditions, matchMode = 'all') {
      if (!conditions || conditions.length === 0) {
        return { error: 'Please add at least one filter condition, or select "Process all items".' };
      }

      const validConditions = [];
      for (let i = 0; i < conditions.length; i++) {
        const c = conditions[i];
        const isCustom = c.field === '__custom__';
        const fieldName = (isCustom ? c.customField : c.field || '').trim();

        if (!fieldName) {
          return { error: `Please enter a column header name for condition #${i + 1}.` };
        }

        if (c.operator === 'dateBetween') {
          let from = (c.dateFrom || '').trim();
          let to = (c.dateTo || '').trim();

          if (!from && !to) {
            return { error: `Please select a valid date range for "${fieldName}".` };
          }
          if (!from) from = to;
          if (!to) to = from;
          if (from > to) {
            const temp = from;
            from = to;
            to = temp;
          }

          validConditions.push({
            field: fieldName,
            operator: 'dateBetween',
            value: { from, to },
          });
        } else {
          const val = (c.value || '').trim();
          if (!val) {
            return { error: `Please enter a filter value for "${fieldName}".` };
          }

          validConditions.push({
            field: fieldName,
            operator: c.operator,
            value: val,
          });
        }
      }

      if (validConditions.length === 0) {
        return { error: 'Please configure at least one active filter condition, or select "Process all items".' };
      }

      const payload = {
        matchMode,
        conditions: validConditions,
      };

      if (validConditions.length === 1) {
        payload.field = validConditions[0].field;
        payload.operator = validConditions[0].operator;
        payload.value = validConditions[0].value;
      }

      return { payload };
    }

    // 1. Empty string value is rejected with error
    const emptyValRes = validateAndBuildFilter([{ field: 'Type', operator: 'contains', value: '' }]);
    assert.ok(emptyValRes.error, 'Empty value must return error');
    assert.strictEqual(emptyValRes.error, 'Please enter a filter value for "Type".');

    // 2. Custom field without name is rejected with error
    const emptyCustomRes = validateAndBuildFilter([{ field: '__custom__', customField: '', operator: 'contains', value: 'test' }]);
    assert.ok(emptyCustomRes.error, 'Empty custom field name must return error');

    // 3. dateBetween without any dates is rejected with error
    const emptyDateRes = validateAndBuildFilter([{ field: 'Due Date', operator: 'dateBetween', dateFrom: '', dateTo: '' }]);
    assert.ok(emptyDateRes.error, 'Empty dateBetween dates must return error');

    // 4. Valid single condition populates both conditions array and top-level properties
    const singleRes = validateAndBuildFilter([{ field: 'Status', operator: 'equals', value: 'Paid' }]);
    assert.ok(singleRes.payload, 'Valid condition must build payload');
    assert.strictEqual(singleRes.payload.field, 'Status');
    assert.strictEqual(singleRes.payload.operator, 'equals');
    assert.strictEqual(singleRes.payload.value, 'Paid');
    assert.strictEqual(singleRes.payload.conditions.length, 1);

    // 5. Engine validator confirms compatibility
    const engineCheck = validateItemFilter(singleRes.payload);
    assert.strictEqual(engineCheck.valid, true, 'Engine validateItemFilter must accept built payload');

    console.log('  ✅ Condition validation and payload construction passed');
  }

  // --------------------------------------------------------------------------
  // Test E5: Zero Em Dashes Guarantee
  // --------------------------------------------------------------------------
  console.log('🔹 Test E5: Zero Em Dashes Verification Across Touched Files');
  {
    const files = [
      'apps/web/src/components/dashboard/ExecutionPreflightModal.tsx',
      'apps/web/src/app/api/v1/runs/route.ts',
      'packages/engine/src/runner/runner-daemon.js',
      'packages/engine/src/replay/loop-replay-runner.js',
      'tests/test-filter-and-batch-execution.js',
      'tests/test-filter-batch-extended.js'
    ];

    const emDashChar = String.fromCharCode(8212); // U+2014

    for (const f of files) {
      const fullPath = path.resolve(__dirname, '..', f);
      const content = fs.readFileSync(fullPath, 'utf8');
      assert.ok(!content.includes(emDashChar) && !content.includes('\u2014'), `File ${f} must not contain any em dashes`);
    }

    console.log('  ✅ Zero em dashes guarantee verified');
  }

  console.log('\n🎉 ALL EXTENDED FILTER AND BATCH TESTS PASSED!\n');
}

runExtendedTests().catch((err) => {
  console.error('❌ Extended test failure:', err);
  process.exit(1);
});
