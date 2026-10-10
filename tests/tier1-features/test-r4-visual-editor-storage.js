/**
 * Tier 1 Feature Coverage: R4 Visual Workflow Editor, Two-Way Supabase Persistence & Hybrid Storage
 * 
 * Features:
 *  - F31: Visual Workflow Graph Compilation & Topological Ordering (7 tests)
 *  - F32: Two-Way Persistence with Supabase & Workflow Definition Integrity (6 tests)
 *  - F33: Next.js 16 Dynamic Route Parameter Handling (4 tests)
 *  - F34: Hybrid Storage Download API & Error Status Codes (6 tests)
 * Total: 23 test cases
 */

'use strict';

const { TestHarness, Assert } = require('../helpers/test-harness');
const { MockCloudServer } = require('../helpers/mock-cloud-server');
const { ORG_1_ID, ORG_2_ID, TOKENS } = require('../helpers/fixtures');

const harness = new TestHarness('Tier 1: R4 Visual Workflow Editor & Hybrid Storage');
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

/**
 * Pure reference implementation of VisualWorkflowEditor.tsx compileTopologicalSteps
 * directly mirrors the compiler algorithm in apps/web/src/components/workflow-editor/VisualWorkflowEditor.tsx
 */
function compileDrawflowToSteps(exportedGraph) {
  const nodes = (exportedGraph?.drawflow?.Home?.data || {});
  const nodeEntries = Object.entries(nodes);

  if (nodeEntries.length === 0) {
    return { steps: [], hasLoop: false, loopStepIndex: -1 };
  }

  // Identify entry nodes (0 input connections)
  const entryNodes = nodeEntries.filter(([, n]) => {
    const inputConns = n.inputs?.input_1?.connections || [];
    return inputConns.length === 0;
  });

  const orderedNodes = [];
  const visited = new Set();

  const traverse = (nodeId) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const n = nodes[nodeId];
    if (!n) return;

    orderedNodes.push({ id: nodeId, data: n.data, pos_x: n.pos_x });

    const outputConns = (n.outputs?.output_1?.connections || []);
    outputConns.forEach((conn) => {
      if (conn.node && !visited.has(String(conn.node))) {
        traverse(String(conn.node));
      }
    });
  };

  if (entryNodes.length > 0) {
    entryNodes.sort((a, b) => a[1].pos_x - b[1].pos_x);
    entryNodes.forEach(([id]) => traverse(id));
  }

  nodeEntries
    .filter(([id]) => !visited.has(id))
    .sort((a, b) => a[1].pos_x - b[1].pos_x)
    .forEach(([id]) => traverse(id));

  let firstLoopIdx = -1;
  const compiledSteps = orderedNodes.map((item, idx) => {
    const d = item.data || {};
    const action = (d.action || 'CLICK').toUpperCase();
    const isLoop = d.role === 'LOOP' || action === 'LOOP_START';

    if (isLoop && firstLoopIdx === -1) {
      firstLoopIdx = idx;
    }

    return {
      index: idx,
      name: d.name || `Step #${idx + 1}`,
      action,
      type: action,
      target: d.target || '',
      candidates: Array.isArray(d.candidates) ? d.candidates : [],
      value: d.value || '',
      timeout_ms: Number(d.timeout_ms) || 5000,
      is_idempotent: Boolean(d.is_idempotent),
      role: d.role || (action === 'LOOP_START' ? 'LOOP' : 'SETUP'),
      isLoop,
      ...(d.extract_column ? { extract_column: d.extract_column, extract_attribute: d.extract_attribute } : {}),
      ...(d.download_dir ? { download_dir: d.download_dir, upload_to_cloud: d.upload_to_cloud } : {}),
    };
  });

  return {
    steps: compiledSteps,
    hasLoop: firstLoopIdx >= 0,
    loopStepIndex: firstLoopIdx,
  };
}

// ============================================================================
// FEATURE 31: Visual Workflow Graph Compilation & Topological Ordering (7 tests)
// ============================================================================
harness.describe('F31: Visual Workflow Graph Compilation & Topological Ordering', () => {
  harness.it('F31.1: Graph with 0 nodes compiles to empty steps array without error', () => {
    const emptyGraph = { drawflow: { Home: { data: {} } } };
    const result = compileDrawflowToSteps(emptyGraph);

    Assert.equal(result.steps.length, 0, 'Expected 0 steps for empty graph');
    Assert.equal(result.hasLoop, false, 'hasLoop must be false');
    Assert.equal(result.loopStepIndex, -1, 'loopStepIndex must be -1');
  });

  harness.it('F31.2: Single node graph compiles with all mandatory action fields', () => {
    const singleNodeGraph = {
      drawflow: {
        Home: {
          data: {
            '1': {
              id: 1,
              name: 'step',
              data: {
                name: 'Click Submit',
                action: 'CLICK',
                target: '#btn-submit',
                candidates: ['button.btn-primary'],
                timeout_ms: 6000,
                is_idempotent: true,
                role: 'SETUP',
              },
              pos_x: 100,
              pos_y: 200,
              inputs: { input_1: { connections: [] } },
              outputs: { output_1: { connections: [] } },
            },
          },
        },
      },
    };

    const result = compileDrawflowToSteps(singleNodeGraph);
    Assert.equal(result.steps.length, 1, 'Expected 1 compiled step');
    const step = result.steps[0];

    Assert.equal(step.index, 0, 'Index must be 0');
    Assert.equal(step.action, 'CLICK', 'Action must be CLICK');
    Assert.equal(step.type, 'CLICK', 'Type must be CLICK');
    Assert.equal(step.target, '#btn-submit', 'Target selector preserved');
    Assert.deepEqual(step.candidates, ['button.btn-primary'], 'Candidates preserved');
    Assert.equal(step.timeout_ms, 6000, 'Timeout preserved');
    Assert.equal(step.is_idempotent, true, 'is_idempotent flag preserved');
    Assert.equal(step.role, 'SETUP', 'Role preserved');
    Assert.equal(step.isLoop, false, 'isLoop must be false');
    Assert.equal(result.hasLoop, false);
    Assert.equal(result.loopStepIndex, -1);
  });

  harness.it('F31.3: All 8 node types compile with complete type-specific payloads', () => {
    const eightNodeGraph = {
      drawflow: {
        Home: {
          data: {
            '1': {
              id: 1,
              data: { action: 'NAVIGATE', value: 'https://example.com', timeout_ms: 15000, role: 'SETUP' },
              pos_x: 100,
              inputs: { input_1: { connections: [] } },
              outputs: { output_1: { connections: [{ node: '2' }] } },
            },
            '2': {
              id: 2,
              data: { action: 'WAIT', value: '3000', timeout_ms: 3000, role: 'SETUP' },
              pos_x: 200,
              inputs: { input_1: { connections: [{ node: '1' }] } },
              outputs: { output_1: { connections: [{ node: '3' }] } },
            },
            '3': {
              id: 3,
              data: { action: 'TYPE', target: '#username', value: 'admin', timeout_ms: 5000, role: 'SETUP' },
              pos_x: 300,
              inputs: { input_1: { connections: [{ node: '2' }] } },
              outputs: { output_1: { connections: [{ node: '4' }] } },
            },
            '4': {
              id: 4,
              data: { action: 'CLICK', target: '#btn-login', is_idempotent: true, role: 'SETUP' },
              pos_x: 400,
              inputs: { input_1: { connections: [{ node: '3' }] } },
              outputs: { output_1: { connections: [{ node: '5' }] } },
            },
            '5': {
              id: 5,
              data: { action: 'SELECT', target: '#filter-status', value: 'PAID', role: 'SETUP' },
              pos_x: 500,
              inputs: { input_1: { connections: [{ node: '4' }] } },
              outputs: { output_1: { connections: [{ node: '6' }] } },
            },
            '6': {
              id: 6,
              data: { action: 'LOOP_START', target: 'table.invoices tbody tr', role: 'LOOP' },
              pos_x: 600,
              inputs: { input_1: { connections: [{ node: '5' }] } },
              outputs: { output_1: { connections: [{ node: '7' }] } },
            },
            '7': {
              id: 7,
              data: { action: 'EXTRACT', target: '.invoice-id', extract_column: 'inv_no', extract_attribute: 'innerText', role: 'LOOP' },
              pos_x: 700,
              inputs: { input_1: { connections: [{ node: '6' }] } },
              outputs: { output_1: { connections: [{ node: '8' }] } },
            },
            '8': {
              id: 8,
              data: { action: 'DOWNLOAD', target: 'a.pdf-dl', download_dir: '~/Downloads', upload_to_cloud: true, role: 'LOOP' },
              pos_x: 800,
              inputs: { input_1: { connections: [{ node: '7' }] } },
              outputs: { output_1: { connections: [] } },
            },
          },
        },
      },
    };

    const result = compileDrawflowToSteps(eightNodeGraph);
    Assert.equal(result.steps.length, 8, 'Must compile all 8 nodes');

    const expectedActions = ['NAVIGATE', 'WAIT', 'TYPE', 'CLICK', 'SELECT', 'LOOP_START', 'EXTRACT', 'DOWNLOAD'];
    result.steps.forEach((s, idx) => {
      Assert.equal(s.index, idx, `Step index must match sequence #${idx}`);
      Assert.equal(s.action, expectedActions[idx], `Step #${idx} action must be ${expectedActions[idx]}`);
      Assert.ok(typeof s.name === 'string', 'Step name must be string');
      Assert.ok(typeof s.timeout_ms === 'number', 'Timeout must be number');
      Assert.ok(typeof s.isLoop === 'boolean', 'isLoop must be boolean');
    });

    // Verify type-specific attributes
    Assert.equal(result.steps[6].extract_column, 'inv_no', 'EXTRACT step must include extract_column');
    Assert.equal(result.steps[6].extract_attribute, 'innerText', 'EXTRACT step must include extract_attribute');
    Assert.equal(result.steps[7].download_dir, '~/Downloads', 'DOWNLOAD step must include download_dir');
    Assert.equal(result.steps[7].upload_to_cloud, true, 'DOWNLOAD step must include upload_to_cloud');
    Assert.equal(result.hasLoop, true, 'Loop detected');
    Assert.equal(result.loopStepIndex, 5, 'Loop starts at index 5 (LOOP_START)');
  });

  harness.it('F31.4: Topological ordering respects chain despite arbitrary/inverted node IDs', () => {
    // Chain: 999 -> 42 -> 7 -> 100
    const nonSequentialGraph = {
      drawflow: {
        Home: {
          data: {
            '100': {
              id: 100,
              data: { name: 'Final Step', action: 'CLICK' },
              pos_x: 800,
              inputs: { input_1: { connections: [{ node: '7' }] } },
              outputs: { output_1: { connections: [] } },
            },
            '7': {
              id: 7,
              data: { name: 'Third Step', action: 'WAIT' },
              pos_x: 500,
              inputs: { input_1: { connections: [{ node: '42' }] } },
              outputs: { output_1: { connections: [{ node: '100' }] } },
            },
            '42': {
              id: 42,
              data: { name: 'Second Step', action: 'TYPE' },
              pos_x: 300,
              inputs: { input_1: { connections: [{ node: '999' }] } },
              outputs: { output_1: { connections: [{ node: '7' }] } },
            },
            '999': {
              id: 999,
              data: { name: 'Root Step', action: 'NAVIGATE' },
              pos_x: 100,
              inputs: { input_1: { connections: [] } },
              outputs: { output_1: { connections: [{ node: '42' }] } },
            },
          },
        },
      },
    };

    const result = compileDrawflowToSteps(nonSequentialGraph);
    Assert.equal(result.steps.length, 4, 'Expected 4 steps');
    Assert.equal(result.steps[0].name, 'Root Step', 'Step 0 must be entry node (999)');
    Assert.equal(result.steps[1].name, 'Second Step', 'Step 1 must be node (42)');
    Assert.equal(result.steps[2].name, 'Third Step', 'Step 2 must be node (7)');
    Assert.equal(result.steps[3].name, 'Final Step', 'Step 3 must be node (100)');
  });

  harness.it('F31.5: Loop Start correctly sets hasLoop, loopStepIndex, and marks loop items', () => {
    const loopGraph = {
      drawflow: {
        Home: {
          data: {
            '1': {
              id: 1,
              data: { action: 'NAVIGATE', role: 'SETUP' },
              pos_x: 100,
              inputs: { input_1: { connections: [] } },
              outputs: { output_1: { connections: [{ node: '2' }] } },
            },
            '2': {
              id: 2,
              data: { action: 'LOOP_START', role: 'LOOP' },
              pos_x: 300,
              inputs: { input_1: { connections: [{ node: '1' }] } },
              outputs: { output_1: { connections: [{ node: '3' }] } },
            },
            '3': {
              id: 3,
              data: { action: 'EXTRACT', role: 'LOOP' },
              pos_x: 500,
              inputs: { input_1: { connections: [{ node: '2' }] } },
              outputs: { output_1: { connections: [] } },
            },
          },
        },
      },
    };

    const result = compileDrawflowToSteps(loopGraph);
    Assert.equal(result.hasLoop, true, 'hasLoop must be true');
    Assert.equal(result.loopStepIndex, 1, 'loopStepIndex must point to step #1');
    Assert.equal(result.steps[0].isLoop, false, 'Step 0 is SETUP');
    Assert.equal(result.steps[1].isLoop, true, 'Step 1 is LOOP_START');
    Assert.equal(result.steps[2].isLoop, true, 'Step 2 is LOOP body');
  });

  harness.it('F31.6: Appends unconnected floating nodes sorted by X position', () => {
    const disconnectedGraph = {
      drawflow: {
        Home: {
          data: {
            '1': {
              id: 1,
              data: { name: 'Connected A', action: 'NAVIGATE' },
              pos_x: 100,
              inputs: { input_1: { connections: [] } },
              outputs: { output_1: { connections: [{ node: '2' }] } },
            },
            '2': {
              id: 2,
              data: { name: 'Connected B', action: 'CLICK' },
              pos_x: 300,
              inputs: { input_1: { connections: [{ node: '1' }] } },
              outputs: { output_1: { connections: [] } },
            },
            '3': {
              id: 3,
              data: { name: 'Floating Later', action: 'WAIT' },
              pos_x: 900,
              inputs: { input_1: { connections: [] } },
              outputs: { output_1: { connections: [] } },
            },
            '4': {
              id: 4,
              data: { name: 'Floating Earlier', action: 'WAIT' },
              pos_x: 500,
              inputs: { input_1: { connections: [] } },
              outputs: { output_1: { connections: [] } },
            },
          },
        },
      },
    };

    const result = compileDrawflowToSteps(disconnectedGraph);
    Assert.equal(result.steps.length, 4, 'Must include all 4 nodes');
    Assert.equal(result.steps[0].name, 'Connected A');
    Assert.equal(result.steps[1].name, 'Connected B');
    Assert.equal(result.steps[2].name, 'Floating Earlier', 'Earlier floating node comes first');
    Assert.equal(result.steps[3].name, 'Floating Later', 'Later floating node comes next');
  });

  harness.it('F31.7: Circular loop connections terminate cleanly without infinite recursion', () => {
    const cycleGraph = {
      drawflow: {
        Home: {
          data: {
            '1': {
              id: 1,
              data: { name: 'Node 1', action: 'CLICK' },
              pos_x: 100,
              inputs: { input_1: { connections: [{ node: '2' }] } },
              outputs: { output_1: { connections: [{ node: '2' }] } },
            },
            '2': {
              id: 2,
              data: { name: 'Node 2', action: 'CLICK' },
              pos_x: 300,
              inputs: { input_1: { connections: [{ node: '1' }] } },
              outputs: { output_1: { connections: [{ node: '1' }] } },
            },
          },
        },
      },
    };

    const result = compileDrawflowToSteps(cycleGraph);
    Assert.equal(result.steps.length, 2, 'Graph with cycle visits each node exactly once');
  });
});

// ============================================================================
// FEATURE 32: Two-Way Persistence with Supabase & Definition Integrity (6 tests)
// ============================================================================
harness.describe('F32: Two-Way Persistence with Supabase & Definition Integrity', () => {
  harness.it('P32.1: PATCH /api/v1/workflows saves visual graph and steps cleanly', async () => {
    // 1. Create initial workflow
    const postRes = await fetch(`${baseUrl}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKENS.validOrg1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Initial Flow',
        portal_url: 'https://supplier.acme.internal',
      }),
    });
    Assert.equal(postRes.status, 201, 'Created workflow');
    const { workflow: createdWf } = await postRes.json();

    // 2. Patch with rich Drawflow graph + compiled steps
    const sampleGraph = {
      drawflow: {
        Home: {
          data: {
            '1': { id: 1, data: { action: 'CLICK', name: 'Open Portal' }, pos_x: 100 },
          },
        },
      },
    };
    const compiledSteps = [
      { index: 0, name: 'Open Portal', action: 'CLICK', type: 'CLICK', target: '#open', candidates: [], value: '', timeout_ms: 5000, is_idempotent: true, role: 'SETUP', isLoop: false },
    ];

    const patchRes = await fetch(`${baseUrl}/api/v1/workflows`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${TOKENS.validOrg1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow_id: createdWf.id,
        name: 'Persisted Visual Workflow',
        workflow_definition: {
          drawflow: sampleGraph,
          steps: compiledSteps,
          actions: compiledSteps,
          isLoop: false,
          loopStepIndex: -1,
          upload_to_cloud: true,
        },
      }),
    });

    Assert.equal(patchRes.status, 200, 'PATCH must succeed with 200');
    const { workflow: patchedWf } = await patchRes.json();
    Assert.equal(patchedWf.name, 'Persisted Visual Workflow');
    Assert.deepEqual(patchedWf.workflow_definition.drawflow, sampleGraph, 'Drawflow graph persisted');
    Assert.equal(patchedWf.workflow_definition.steps.length, 1, 'Steps persisted');
    Assert.equal(patchedWf.workflow_definition.upload_to_cloud, true, 'upload_to_cloud flag persisted');
  });

  harness.it('P32.2: GET /api/v1/workflows?id=<id> retrieves exact graph and steps without loss', async () => {
    const wf = server.addWorkflow({
      org_id: ORG_1_ID,
      name: 'Loaded Visual Flow',
      portal_url: 'https://test.com',
      workflow_definition: {
        drawflow: { version: '1.0', nodes: 5 },
        steps: [{ index: 0, action: 'NAVIGATE', value: 'https://test.com' }],
        upload_to_cloud: true,
      },
    });

    const res = await fetch(`${baseUrl}/api/v1/workflows?id=${wf.id}`, {
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}` },
    });
    Assert.equal(res.status, 200, 'GET with query ?id= must return 200');
    const data = await res.json();
    Assert.ok(data.workflow, 'Must include workflow object');
    Assert.equal(data.workflow.id, wf.id);
    Assert.deepEqual(data.workflow.workflow_definition.drawflow, { version: '1.0', nodes: 5 });
    Assert.equal(data.workflow.workflow_definition.steps[0].action, 'NAVIGATE');
  });

  harness.it('P32.3: Dynamic route GET /api/v1/workflows/[id] returns single workflow', async () => {
    const wf = server.addWorkflow({
      org_id: ORG_1_ID,
      name: 'Dynamic Route Workflow',
      portal_url: 'https://dynamic.com',
      workflow_definition: { isLoop: true, loopStepIndex: 2 },
    });

    const res = await fetch(`${baseUrl}/api/v1/workflows/${wf.id}`, {
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}` },
    });
    Assert.equal(res.status, 200, 'Dynamic route GET must return 200');
    const data = await res.json();
    Assert.equal(data.workflow.id, wf.id);
    Assert.equal(data.workflow.workflow_definition.loopStepIndex, 2);
  });

  harness.it('P32.4: Dynamic route PATCH /api/v1/workflows/[id] updates definition in place', async () => {
    const wf = server.addWorkflow({
      org_id: ORG_1_ID,
      name: 'Pre-update',
      portal_url: 'https://pre.com',
      workflow_definition: { steps: [] },
    });

    const res = await fetch(`${baseUrl}/api/v1/workflows/${wf.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${TOKENS.validOrg1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Post-update Name',
        workflow_definition: {
          steps: [{ index: 0, action: 'CLICK' }],
          upload_to_cloud: true,
        },
      }),
    });

    Assert.equal(res.status, 200, 'PATCH must return 200');
    const data = await res.json();
    Assert.equal(data.workflow.name, 'Post-update Name');
    Assert.equal(data.workflow.workflow_definition.steps.length, 1);
  });

  harness.it('P32.5: Cross-tenant isolation blocks Org 2 from patching Org 1 workflow', async () => {
    const wf = server.addWorkflow({
      org_id: ORG_1_ID,
      name: 'Protected Org 1 Flow',
      portal_url: 'https://org1.com',
    });

    const res = await fetch(`${baseUrl}/api/v1/workflows/${wf.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${TOKENS.validOrg2}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Malicious Overwrite' }),
    });

    Assert.equal(res.status, 403, 'Cross-tenant PATCH must be rejected with 403 Forbidden');
    const unmodified = server.workflows.get(wf.id);
    Assert.equal(unmodified.name, 'Protected Org 1 Flow', 'Workflow name must remain unmodified');
  });

  harness.it('P32.6: Non-existent workflow ID returns 404 on both query and path routes', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';

    const resQuery = await fetch(`${baseUrl}/api/v1/workflows?id=${fakeId}`, {
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}` },
    });
    Assert.equal(resQuery.status, 404, 'Query param with missing ID must return 404');

    const resPath = await fetch(`${baseUrl}/api/v1/workflows/${fakeId}`, {
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}` },
    });
    Assert.equal(resPath.status, 404, 'Path param with missing ID must return 404');
  });
});

// ============================================================================
// FEATURE 33: Next.js 16 Dynamic Route Parameter Handling (4 tests)
// ============================================================================
harness.describe('F33: Next.js 16 Dynamic Route Parameter Handling', () => {
  // Reference async page resolver mirroring apps/web/src/app/dashboard/workflows/[id]/edit/page.tsx
  async function resolveWorkflowEditParams(props) {
    const { id } = await props.params;
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid route parameter: id is required');
    }
    return { resolvedId: id, canvasMounted: true };
  }

  harness.it('R33.1: Standard UUID parameter unwraps asynchronously without sync errors', async () => {
    const uuid = 'e3b0c442-98fc-4c14-9afe-000000000001';
    const result = await resolveWorkflowEditParams({ params: Promise.resolve({ id: uuid }) });
    Assert.equal(result.resolvedId, uuid, 'Must resolve exact UUID');
    Assert.equal(result.canvasMounted, true);
  });

  harness.it('R33.2: Custom alphanumeric workflow slug unwraps cleanly', async () => {
    const slug = 'wf_monthly_payroll_v4';
    const result = await resolveWorkflowEditParams({ params: Promise.resolve({ id: slug }) });
    Assert.equal(result.resolvedId, slug, 'Must resolve alphanumeric slug');
  });

  harness.it('R33.3: URI-encoded parameter values preserve encoded strings', async () => {
    const encodedId = 'wf%20legacy%20run%201';
    const result = await resolveWorkflowEditParams({ params: Promise.resolve({ id: encodedId }) });
    Assert.equal(result.resolvedId, encodedId, 'Preserves encoded parameter string');
  });

  harness.it('R33.4: Delayed microtask async resolution handles deferred promises', async () => {
    const delayedPromise = new Promise((resolve) => {
      setTimeout(() => resolve({ id: 'delayed-async-id' }), 10);
    });
    const result = await resolveWorkflowEditParams({ params: delayedPromise });
    Assert.equal(result.resolvedId, 'delayed-async-id', 'Properly awaits delayed resolution');
  });
});

// ============================================================================
// FEATURE 34: Hybrid Storage Download API & Error Status Codes (6 tests)
// ============================================================================
harness.describe('F34: Hybrid Storage Download API & Error Status Codes', () => {
  harness.it('S34.1: Missing id parameter returns 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/api/v1/artifacts/download`, {
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}` },
    });
    Assert.equal(res.status, 400, 'Missing id must return 400');
    const json = await res.json();
    Assert.ok(json.error.includes('Missing artifact id'), 'Descriptive error message');
  });

  harness.it('S34.2: Non-existent artifact ID returns 404 Not Found', async () => {
    const res = await fetch(`${baseUrl}/api/v1/artifacts/download?id=00000000-0000-0000-0000-000000000000`, {
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}` },
    });
    Assert.equal(res.status, 404, 'Non-existent artifact must return 404');
    const json = await res.json();
    Assert.equal(json.error, 'Artifact not found');
  });

  harness.it('S34.3: Local-only artifact without cloud sync returns 404 with guidance', async () => {
    const run = server.addRun({ org_id: ORG_1_ID });
    const localArtifact = {
      id: 'art_local_only_123',
      run_id: run.id,
      file_name: 'local_invoice.pdf',
      file_size_bytes: 1024,
      sha256_hash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      cloud_storage_path: null, // local-only!
    };
    server.artifacts.set(localArtifact.id, localArtifact);

    const res = await fetch(`${baseUrl}/api/v1/artifacts/download?id=${localArtifact.id}`, {
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}` },
    });
    Assert.equal(res.status, 404, 'Local-only artifact must return 404');
    const json = await res.json();
    Assert.ok(json.error.includes('stored locally only'), 'Guided error message about local-only storage');
  });

  harness.it('S34.4: Cross-tenant download attempt returns 403 Forbidden', async () => {
    const runOrg2 = server.addRun({ org_id: ORG_2_ID });
    const org2Artifact = {
      id: 'art_org2_secret',
      run_id: runOrg2.id,
      file_name: 'confidential_report.pdf',
      sha256_hash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      cloud_storage_path: 'wf_artifacts/org_2/secret.pdf',
    };
    server.artifacts.set(org2Artifact.id, org2Artifact);

    // Org 1 tries to download Org 2 artifact
    const res = await fetch(`${baseUrl}/api/v1/artifacts/download?id=${org2Artifact.id}`, {
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}` },
    });
    Assert.equal(res.status, 403, 'Cross-tenant download must return 403 Forbidden');
    const json = await res.json();
    Assert.ok(json.error.includes('different organization'), 'Unauthorized message');
  });

  harness.it('S34.5: Valid synced cloud artifact returns 200 with attachment headers and content', async () => {
    const run = server.addRun({ org_id: ORG_1_ID });
    const content = Buffer.from('%PDF-1.4 Mock invoice content for FlowMind enterprise testing');
    const cloudArtifact = {
      id: 'art_cloud_valid_99',
      run_id: run.id,
      file_name: 'INV-2026-10-09.pdf',
      file_size_bytes: content.length,
      sha256_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      cloud_storage_path: 'wf_artifacts/org_1/run_1/INV-2026-10-09.pdf',
      content,
    };
    server.artifacts.set(cloudArtifact.id, cloudArtifact);

    const res = await fetch(`${baseUrl}/api/v1/artifacts/download?id=${cloudArtifact.id}`, {
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}` },
    });
    Assert.equal(res.status, 200, 'Cloud download must return 200 OK');
    Assert.equal(res.headers.get('content-type'), 'application/octet-stream');
    Assert.ok(res.headers.get('content-disposition').includes('INV-2026-10-09.pdf'), 'Content-Disposition filename header');

    const bodyBuffer = Buffer.from(await res.arrayBuffer());
    Assert.equal(bodyBuffer.toString(), content.toString(), 'Payload bytes match exactly');
  });

  harness.it('S34.6: Signed download redirection responds with 307 and signed URL', async () => {
    const run = server.addRun({ org_id: ORG_1_ID });
    const cloudArtifact = {
      id: 'art_cloud_signed_redirect',
      run_id: run.id,
      file_name: 'LargeExport.zip',
      sha256_hash: 'abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      cloud_storage_path: 'wf_artifacts/org_1/run_1/LargeExport.zip',
      signed_redirect: true,
    };
    server.artifacts.set(cloudArtifact.id, cloudArtifact);

    const res = await fetch(`${baseUrl}/api/v1/artifacts/download?id=${cloudArtifact.id}&redirect=true`, {
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}` },
      redirect: 'manual', // do not auto-follow to verify redirection response
    });
    Assert.equal(res.status, 307, 'Signed redirection responds with 307 Temporary Redirect');
    Assert.ok(res.headers.get('location').includes('storage.supabase.co'), 'Location header contains Supabase storage URL');
  });
});

if (require.main === module) {
  harness.run().then((res) => {
    process.exitCode = res.failed > 0 ? 1 : 0;
  });
}

module.exports = { harness };
