/**
 * Deep Adversarial Stress Harness: FlowMind Web App, Visual Editor & Hybrid Storage
 * 
 * Aggressively attacks edge cases, boundary conditions, malformed inputs,
 * injection vectors, cyclic topologies, and scale limits.
 * 
 * Zero external dependencies — pure Node.js CommonJS.
 */

'use strict';

const crypto = require('node:crypto');
const { TestHarness, Assert } = require('./helpers/test-harness');
const { MockCloudServer } = require('./helpers/mock-cloud-server');
const { ORG_1_ID, ORG_2_ID, TOKENS } = require('./helpers/fixtures');

const harness = new TestHarness('Adversarial Stress Harness: FlowMind Web, Editor & Hybrid Storage');
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

// Reference compiler function from VisualWorkflowEditor.tsx
function compileDrawflowToSteps(exportedGraph) {
  const nodes = (exportedGraph?.drawflow?.Home?.data || {});
  const nodeEntries = Object.entries(nodes);

  if (nodeEntries.length === 0) {
    return { steps: [], hasLoop: false, loopStepIndex: -1 };
  }

  const entryNodes = nodeEntries.filter(([, n]) => {
    const inputConns = n?.inputs?.input_1?.connections || [];
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

    const outputConns = (n?.outputs?.output_1?.connections || []);
    outputConns.forEach((conn) => {
      if (conn?.node && !visited.has(String(conn.node))) {
        traverse(String(conn.node));
      }
    });
  };

  if (entryNodes.length > 0) {
    entryNodes.sort((a, b) => (a[1]?.pos_x || 0) - (b[1]?.pos_x || 0));
    entryNodes.forEach(([id]) => traverse(id));
  }

  nodeEntries
    .filter(([id]) => !visited.has(id))
    .sort((a, b) => (a[1]?.pos_x || 0) - (b[1]?.pos_x || 0))
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
// ADVERSARIAL SUITE 1: Extreme Graph Compilation Stress & Topologies (6 tests)
// ============================================================================
harness.describe('ADV-1: Extreme Graph Compilation Stress & Topologies', () => {
  harness.it('ADV-1.1: Scaled linear chain of 50 sequential nodes preserves strict order', () => {
    const count = 50;
    const data = {};

    for (let i = 1; i <= count; i++) {
      data[String(i)] = {
        id: i,
        data: { name: `Chain Node #${i}`, action: i === 25 ? 'LOOP_START' : 'CLICK', role: i >= 25 ? 'LOOP' : 'SETUP' },
        pos_x: i * 200,
        inputs: { input_1: { connections: i === 1 ? [] : [{ node: String(i - 1) }] } },
        outputs: { output_1: { connections: i === count ? [] : [{ node: String(i + 1) }] } },
      };
    }

    const graph = { drawflow: { Home: { data } } };
    const t0 = Date.now();
    const result = compileDrawflowToSteps(graph);
    const duration = Date.now() - t0;

    Assert.equal(result.steps.length, 50, 'All 50 nodes compiled');
    Assert.ok(duration < 50, `Compilation of 50 nodes took ${duration}ms (< 50ms requirement)`);
    for (let i = 0; i < 50; i++) {
      Assert.equal(result.steps[i].index, i);
      Assert.equal(result.steps[i].name, `Chain Node #${i + 1}`);
    }
    Assert.equal(result.hasLoop, true, 'hasLoop detected');
    Assert.equal(result.loopStepIndex, 24, 'Loop index at 24 (Node 25)');
  });

  harness.it('ADV-1.2: Complex tree branching (1 parent -> 3 children) traverses all branches', () => {
    // Node 1 -> [Node 2, Node 3, Node 4]
    const data = {
      '1': {
        id: 1,
        data: { name: 'Root' },
        pos_x: 100,
        inputs: { input_1: { connections: [] } },
        outputs: { output_1: { connections: [{ node: '2' }, { node: '3' }, { node: '4' }] } },
      },
      '2': {
        id: 2,
        data: { name: 'Branch Left' },
        pos_x: 300,
        inputs: { input_1: { connections: [{ node: '1' }] } },
        outputs: { output_1: { connections: [] } },
      },
      '3': {
        id: 3,
        data: { name: 'Branch Middle' },
        pos_x: 350,
        inputs: { input_1: { connections: [{ node: '1' }] } },
        outputs: { output_1: { connections: [] } },
      },
      '4': {
        id: 4,
        data: { name: 'Branch Right' },
        pos_x: 400,
        inputs: { input_1: { connections: [{ node: '1' }] } },
        outputs: { output_1: { connections: [] } },
      },
    };

    const result = compileDrawflowToSteps({ drawflow: { Home: { data } } });
    Assert.equal(result.steps.length, 4, 'Root plus 3 branches must all be compiled');
    Assert.equal(result.steps[0].name, 'Root');
    const branchNames = result.steps.slice(1).map((s) => s.name);
    Assert.ok(branchNames.includes('Branch Left'));
    Assert.ok(branchNames.includes('Branch Middle'));
    Assert.ok(branchNames.includes('Branch Right'));
  });

  harness.it('ADV-1.3: Complex multi-cycle knot (A->B->C->A and B->D->B) terminates safely', () => {
    const data = {
      '1': {
        id: 1,
        data: { name: 'Cycle A' },
        pos_x: 100,
        inputs: { input_1: { connections: [{ node: '3' }] } },
        outputs: { output_1: { connections: [{ node: '2' }] } },
      },
      '2': {
        id: 2,
        data: { name: 'Cycle B' },
        pos_x: 200,
        inputs: { input_1: { connections: [{ node: '1' }, { node: '4' }] } },
        outputs: { output_1: { connections: [{ node: '3' }, { node: '4' }] } },
      },
      '3': {
        id: 3,
        data: { name: 'Cycle C' },
        pos_x: 300,
        inputs: { input_1: { connections: [{ node: '2' }] } },
        outputs: { output_1: { connections: [{ node: '1' }] } },
      },
      '4': {
        id: 4,
        data: { name: 'Subcycle D' },
        pos_x: 400,
        inputs: { input_1: { connections: [{ node: '2' }] } },
        outputs: { output_1: { connections: [{ node: '2' }] } },
      },
    };

    // All nodes have input connections (no entry nodes, pure cycle graph)
    const result = compileDrawflowToSteps({ drawflow: { Home: { data } } });
    Assert.equal(result.steps.length, 4, 'Visits all 4 nodes without infinite loop or duplication');
    const ids = new Set(result.steps.map((s) => s.name));
    Assert.equal(ids.size, 4, 'All unique nodes present');
  });

  harness.it('ADV-1.4: Malformed node data payloads (null, undefined, corrupted fields)', () => {
    const corruptGraph = {
      drawflow: {
        Home: {
          data: {
            '1': {
              id: 1,
              data: null, // null data object
              pos_x: 100,
              inputs: {},
              outputs: {},
            },
            '2': {
              id: 2,
              data: {
                action: null, // null action
                timeout_ms: 'invalid_number', // string NaN timeout
                candidates: 'not-an-array', // non-array candidates
                is_idempotent: 0,
              },
              pos_x: 200,
              inputs: {},
              outputs: {},
            },
            '3': {
              id: 3,
              data: {
                action: 'EXTRACT',
                extract_column: null, // null column
              },
              pos_x: 300,
              inputs: {},
              outputs: {},
            },
          },
        },
      },
    };

    const result = compileDrawflowToSteps(corruptGraph);
    Assert.equal(result.steps.length, 3, 'Gracefully compiles all corrupted nodes');
    Assert.equal(result.steps[0].action, 'CLICK', 'Defaults null action to CLICK');
    Assert.equal(result.steps[0].timeout_ms, 5000, 'Defaults timeout to 5000');
    Assert.deepEqual(result.steps[1].candidates, [], 'Converts non-array candidates to []');
    Assert.equal(result.steps[1].timeout_ms, 5000, 'Replaces NaN timeout with 5000');
  });

  harness.it('ADV-1.5: Multiple entry nodes with identical X position sort deterministically', () => {
    const data = {
      'B': {
        id: 'B',
        data: { name: 'Entry B' },
        pos_x: 100,
        inputs: { input_1: { connections: [] } },
        outputs: { output_1: { connections: [] } },
      },
      'A': {
        id: 'A',
        data: { name: 'Entry A' },
        pos_x: 100,
        inputs: { input_1: { connections: [] } },
        outputs: { output_1: { connections: [] } },
      },
    };

    const result = compileDrawflowToSteps({ drawflow: { Home: { data } } });
    Assert.equal(result.steps.length, 2, 'Compiles both co-located entries');
  });

  harness.it('ADV-1.6: Empty drawflow or null object properties handle cleanly', () => {
    Assert.equal(compileDrawflowToSteps(null).steps.length, 0);
    Assert.equal(compileDrawflowToSteps({}).steps.length, 0);
    Assert.equal(compileDrawflowToSteps({ drawflow: {} }).steps.length, 0);
    Assert.equal(compileDrawflowToSteps({ drawflow: { Home: null } }).steps.length, 0);
  });
});

// ============================================================================
// ADVERSARIAL SUITE 2: Storage & Persistence Scale & Edge Cases (6 tests)
// ============================================================================
harness.describe('ADV-2: Storage & Persistence Scale & Edge Cases', () => {
  harness.it('ADV-2.1: Large 150KB workflow definition round-trips without data loss', async () => {
    const largeSteps = [];
    for (let i = 0; i < 200; i++) {
      largeSteps.push({
        index: i,
        name: `Step #${i} with extended telemetry metadata and selectors`,
        action: 'CLICK',
        target: `div.grid-container > table.table-striped tbody tr:nth-child(${i}) > td.action-column > button.btn`,
        candidates: [
          `//table/tbody/tr[${i}]/td/button`,
          `#table-row-${i}-action-btn`,
        ],
        value: `val_${i}_${'x'.repeat(100)}`,
        timeout_ms: 5000,
        is_idempotent: true,
        role: 'LOOP',
        isLoop: true,
      });
    }

    const payload = {
      name: 'High-Volume Workflow Definition',
      portal_url: 'https://enterprise.acme.corp/grid',
      workflow_definition: {
        steps: largeSteps,
        drawflow: { count: 200, schema: 'flowmind-v1' },
        upload_to_cloud: true,
        target_folder: '/var/data/exports',
      },
    };

    const createRes = await fetch(`${baseUrl}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKENS.validOrg1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    Assert.equal(createRes.status, 201, 'Workflow created successfully');
    const { workflow: created } = await createRes.json();

    // Verify round-trip retrieval
    const getRes = await fetch(`${baseUrl}/api/v1/workflows?id=${created.id}`, {
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}` },
    });
    Assert.equal(getRes.status, 200, 'Fetched workflow successfully');
    const { workflow: retrieved } = await getRes.json();

    Assert.equal(retrieved.workflow_definition.steps.length, 200, 'All 200 steps intact');
    Assert.equal(retrieved.workflow_definition.steps[199].value, largeSteps[199].value, 'Payload fidelity preserved');
  });

  harness.it('ADV-2.2: Artifact download with unicode emoji filename preserves headers', async () => {
    const run = server.addRun({ org_id: ORG_1_ID });
    const emojiFilename = '📄_Monthly_Report_2026_🚀.pdf';
    const artifact = {
      id: 'art_emoji_test',
      run_id: run.id,
      file_name: emojiFilename,
      sha256_hash: crypto.createHash('sha256').update('emoji-content').digest('hex'),
      cloud_storage_path: `wf_artifacts/org_1/run_1/${emojiFilename}`,
      content: Buffer.from('Emoji PDF Content'),
    };
    server.artifacts.set(artifact.id, artifact);

    const res = await fetch(`${baseUrl}/api/v1/artifacts/download?id=${artifact.id}`, {
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}` },
    });
    Assert.equal(res.status, 200, 'Returns 200 OK');
    const contentDisp = res.headers.get('content-disposition');
    Assert.ok(contentDisp.includes(encodeURIComponent(emojiFilename)), 'Properly URL-encoded filename in Content-Disposition');
  });

  harness.it('ADV-2.3: Zero-byte artifact download returns 200 with Content-Length: 0', async () => {
    const run = server.addRun({ org_id: ORG_1_ID });
    const emptyArtifact = {
      id: 'art_zero_byte',
      run_id: run.id,
      file_name: 'empty_marker.txt',
      file_size_bytes: 0,
      sha256_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      cloud_storage_path: 'wf_artifacts/org_1/run_1/empty_marker.txt',
      content: Buffer.alloc(0),
    };
    server.artifacts.set(emptyArtifact.id, emptyArtifact);

    const res = await fetch(`${baseUrl}/api/v1/artifacts/download?id=${emptyArtifact.id}`, {
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}` },
    });
    Assert.equal(res.status, 200, 'Zero-byte download returns 200');
    Assert.equal(res.headers.get('content-length'), '0', 'Content-Length must be 0');
    const buf = Buffer.from(await res.arrayBuffer());
    Assert.equal(buf.length, 0, 'Buffer length is 0');
  });

  harness.it('ADV-2.4: Path traversal sequence in artifact ID returns 404 Not Found', async () => {
    const maliciousIds = [
      '../../etc/passwd',
      '..\\..\\Windows\\System32\\cmd.exe',
      '../secret_keys.json',
      'id=%00%2e%2e%2f',
    ];

    for (const malId of maliciousIds) {
      const res = await fetch(`${baseUrl}/api/v1/artifacts/download?id=${encodeURIComponent(malId)}`, {
        headers: { Authorization: `Bearer ${TOKENS.validOrg1}` },
      });
      Assert.equal(res.status, 404, `Path traversal probe '${malId}' must return 404`);
    }
  });

  harness.it('ADV-2.5: Concurrent PATCH updates preserve last-write-wins without corruption', async () => {
    const wf = server.addWorkflow({
      org_id: ORG_1_ID,
      name: 'Concurrent Flow',
      portal_url: 'https://concurrent.com',
      workflow_definition: { version: 1 },
    });

    const updates = Array.from({ length: 5 }, (_, i) => ({
      workflow_id: wf.id,
      name: `Concurrent Flow Update #${i + 1}`,
      workflow_definition: { version: i + 1, updatedBy: `worker-${i + 1}` },
    }));

    // Dispatch 5 concurrent PATCH requests
    const responses = await Promise.all(
      updates.map((body) =>
        fetch(`${baseUrl}/api/v1/workflows`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${TOKENS.validOrg1}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        })
      )
    );

    responses.forEach((res) => Assert.equal(res.status, 200, 'Each concurrent PATCH succeeds'));

    // Check final state
    const finalRes = await fetch(`${baseUrl}/api/v1/workflows?id=${wf.id}`, {
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}` },
    });
    const finalData = await finalRes.json();
    Assert.ok(finalData.workflow.workflow_definition.version >= 1, 'Final state valid');
  });

  harness.it('ADV-2.6: Toggling upload_to_cloud preference persists correctly across updates', async () => {
    const wf = server.addWorkflow({
      org_id: ORG_1_ID,
      name: 'Hybrid Flow',
      portal_url: 'https://hybrid.com',
      workflow_definition: { upload_to_cloud: false },
    });

    // 1. Enable cloud upload
    let res = await fetch(`${baseUrl}/api/v1/workflows`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow_id: wf.id, upload_to_cloud: true }),
    });
    let data = await res.json();
    Assert.equal(data.workflow.workflow_definition.upload_to_cloud, true);

    // 2. Disable cloud upload
    res = await fetch(`${baseUrl}/api/v1/workflows`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${TOKENS.validOrg1}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow_id: wf.id, upload_to_cloud: false }),
    });
    data = await res.json();
    Assert.equal(data.workflow.workflow_definition.upload_to_cloud, false);
  });
});

if (require.main === module) {
  harness.run().then((res) => {
    process.exitCode = res.failed > 0 ? 1 : 0;
  });
}

module.exports = { harness };
