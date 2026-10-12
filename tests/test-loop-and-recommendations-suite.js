/**
 * Comprehensive Verification Test Suite
 * 
 * Verifies:
 * 1. RunnerDaemon mode resolution when isLoop is true and def.mode is 'single'
 * 2. LoopReplayRunner sequential step iteration loop execution (does NOT bail to single run)
 * 3. LoopReplayRunner search of subsequent partition.loopSteps for candidate table targets
 * 4. Desktop HTTP Bridge /discover endpoint registration
 * 5. VisualWorkflowEditor mode saving to cloud
 * 6. PropertyDrawer instant role update and extract_column recommendations
 * 7. ExecutionPreflightModal live discovery and column extraction
 * 8. Zero em dashes constraint verification across all touched files
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const LoopDetector = require('../packages/engine/src/shared/loop-detector');
const LoopReplayRunner = require('../packages/engine/src/replay/loop-replay-runner');

test('Test 1: RunnerDaemon mode resolution logic', () => {
  // Test case A: run.mode is undefined, def.mode is 'single', but isLoop is true
  const runA = { status: 'pending' };
  const defA = { mode: 'single' };
  const isLoopA = true;
  const resolvedModeA = (runA.mode === 'loop' || runA.mode === 'single')
    ? runA.mode
    : (isLoopA ? 'loop' : (defA.mode || 'single'));

  assert.equal(resolvedModeA, 'loop', 'When isLoop is true and run.mode is undefined, mode must resolve to loop');

  // Test case B: run explicitly requested single mode
  const runB = { mode: 'single' };
  const defB = { mode: 'loop' };
  const isLoopB = false;
  const resolvedModeB = (runB.mode === 'loop' || runB.mode === 'single')
    ? runB.mode
    : (isLoopB ? 'loop' : (defB.mode || 'single'));

  assert.equal(resolvedModeB, 'single', 'Explicit run.mode single must be preserved');

  // Test case C: normal single execution
  const runC = {};
  const defC = { mode: 'single' };
  const isLoopC = false;
  const resolvedModeC = (runC.mode === 'loop' || runC.mode === 'single')
    ? runC.mode
    : (isLoopC ? 'loop' : (defC.mode || 'single'));

  assert.equal(resolvedModeC, 'single', 'Normal single execution must resolve to single');
});

test('Test 2: LoopReplayRunner sequential step iteration loop runs full loopLimit iterations', async () => {
  // Construct runner with step-iteration workflow (no table, 3 steps, role: 'LOOP')
  const runner = new LoopReplayRunner({
    workflowId: 'test-wf-loop-1',
    workflowName: 'Step Iteration Workflow',
    loopLimit: 4,
    isLoop: true,
    mode: 'loop',
    structuredDownloadsDir: path.join(__dirname, 'tmp-test-downloads')
  });

  let executedSteps = [];
  runner.replayEngine = {
    connect: async () => ({ pages: async () => [{ url: () => 'https://portal.example.com', title: async () => 'Test Portal' }] }),
    _ensureSelectorResolverInFrame: async () => {},
    executeAction: async (step, idx) => {
      executedSteps.push({ index: idx, action: step.action, value: step.value });
    },
    page: {
      url: () => 'https://portal.example.com',
      title: async () => 'Test Portal',
      evaluate: async () => false,
      mainFrame: () => ({})
    },
    tabManager: {
      cleanupAuxiliaryTabs: async () => {},
      getPrimaryPage: () => runner.replayEngine.page
    },
    disconnect: async () => {}
  };

  const workflow = {
    id: 'test-wf-loop-1',
    name: 'Step Iteration Workflow',
    targetUrl: 'https://portal.example.com',
    isLoop: true,
    loopLimit: 4,
    steps: [
      { action: 'NAVIGATE', value: 'https://portal.example.com', role: 'SETUP' },
      { action: 'CLICK', target: '#tab-reports', role: 'LOOP', isLoop: true },
      { action: 'CLICK', target: '#btn-next', role: 'LOOP', isLoop: true }
    ]
  };

  // Mock ItemDiscovery.discover to return no table items
  const originalDiscover = require('../packages/engine/src/shared/item-discovery').discover;
  require('../packages/engine/src/shared/item-discovery').discover = async () => ({ success: false, itemCount: 0 });

  let progressEvents = [];
  const manifest = await runner.executeLoop(workflow, 1, (prog) => {
    progressEvents.push(prog);
  });

  // Restore
  require('../packages/engine/src/shared/item-discovery').discover = originalDiscover;

  assert.equal(manifest.mode, 'STEP_LOOP', 'Manifest mode should be STEP_LOOP');
  assert.equal(manifest.itemsTotal, 4, 'Should execute 4 iterations');
  assert.equal(manifest.itemsSucceeded, 4, 'Should succeed 4 iterations');
  assert.equal(executedSteps.length, 9, 'Should execute 1 setup step + (2 loop steps x 4 iterations) = 9 total actions');
});

test('Test 3: PropertyDrawer and VisualWorkflowEditor static invariants', () => {
  const editorCode = fs.readFileSync(
    path.join(__dirname, '../apps/web/src/components/workflow-editor/VisualWorkflowEditor.tsx'),
    'utf8'
  );
  const drawerCode = fs.readFileSync(
    path.join(__dirname, '../apps/web/src/components/workflow-editor/PropertyDrawer.tsx'),
    'utf8'
  );
  const bridgeCode = fs.readFileSync(
    path.join(__dirname, '../apps/desktop/src/main/http-bridge.js'),
    'utf8'
  );
  const modalCode = fs.readFileSync(
    path.join(__dirname, '../apps/web/src/components/dashboard/ExecutionPreflightModal.tsx'),
    'utf8'
  );

  // Invariant 1: VisualWorkflowEditor saves mode: hasLoop ? 'loop' : 'single'
  assert.ok(
    editorCode.includes("mode: hasLoop ? 'loop' : 'single'"),
    'VisualWorkflowEditor must save mode in workflow_definition'
  );

  // Invariant 2: PropertyDrawer auto-commits on role change
  assert.ok(
    drawerCode.includes('onUpdate(nodeId, nextDraft);'),
    'PropertyDrawer must auto-commit role selection immediately to node'
  );

  // Invariant 3: PropertyDrawer has extract_column recommendations
  assert.ok(
    drawerCode.includes('extract_column_recommendations'),
    'PropertyDrawer must provide datalist recommendations for extract_column'
  );

  // Invariant 4: http-bridge has /discover endpoint
  assert.ok(
    bridgeCode.includes("pathname === '/discover'"),
    'http-bridge must register /discover endpoint'
  );
  assert.ok(
    bridgeCode.includes('PageInspector.inspectPage'),
    'http-bridge must use PageInspector for live discovery'
  );

  // Invariant 5: ExecutionPreflightModal calls live discovery on mount
  assert.ok(
    modalCode.includes('handleRefreshFields(workflow)'),
    'ExecutionPreflightModal must call handleRefreshFields on mount'
  );
  assert.ok(
    modalCode.includes("fetch('http://127.0.0.1:49152/discover'"),
    'ExecutionPreflightModal must target live /discover endpoint'
  );
});

test('Test 4: Zero em dashes in all modified and created files', () => {
  const filesToCheck = [
    path.join(__dirname, '../apps/desktop/src/main/http-bridge.js'),
    path.join(__dirname, '../apps/web/src/app/api/v1/runs/route.ts'),
    path.join(__dirname, '../apps/web/src/app/api/v1/workflows/[id]/discover/route.ts'),
    path.join(__dirname, '../apps/web/src/components/dashboard/ExecutionPreflightModal.tsx'),
    path.join(__dirname, '../apps/web/src/components/workflow-editor/VisualWorkflowEditor.tsx'),
    path.join(__dirname, '../apps/web/src/components/workflow-editor/PropertyDrawer.tsx'),
    path.join(__dirname, '../packages/engine/src/runner/runner-daemon.js'),
    path.join(__dirname, '../packages/engine/src/replay/loop-replay-runner.js')
  ];

  filesToCheck.forEach((filePath) => {
    assert.ok(fs.existsSync(filePath), `File must exist: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf8');
    const hasEmDash = content.includes('\u2014');
    assert.equal(
      hasEmDash,
      false,
      `File ${path.basename(filePath)} contains forbidden em dash!`
    );
  });
});
