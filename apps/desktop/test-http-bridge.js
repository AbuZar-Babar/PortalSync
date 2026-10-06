/**
 * Test Suite for Desktop Localhost HTTP Bridge (apps/desktop/src/main/http-bridge.js)
 * 
 * Verifies:
 * - Server lifecycle on 127.0.0.1:49152
 * - W3C Private Network Access (PNA) and permissive CORS preflight
 * - Health check endpoint GET /health and /api/health
 * - Recording status endpoint GET /record/status and /api/record/status
 * - Stop endpoint POST /record/stop
 * - 404 routing
 * - Re-entrancy protection
 * - Simulated recording completion and recipe extraction
 * - Clean server shutdown
 */

'use strict';

const http = require('http');
const assert = require('assert');
const path = require('path');

// Ensure module resolution paths for dependencies
const candidateWorktreePaths = [
  path.resolve(__dirname, '../../../Workflow-Capture-agent-worktrees/multi-agent-integration/node_modules'),
  path.resolve(__dirname, '../../Workflow-Capture-agent-worktrees/multi-agent-integration/node_modules'),
  path.resolve(__dirname, '../../../Workflow-Capture-agent-worktrees/main/node_modules'),
  path.resolve(__dirname, '../../node_modules'),
  path.resolve(__dirname, '../node_modules'),
  path.resolve('C:/Users/AbuZar/Desktop/Fyp/Workflow-Capture-agent-worktrees/multi-agent-integration/node_modules')
];
for (const p of candidateWorktreePaths) {
  try {
    if (require('fs').existsSync(p)) {
      if (!process.env.NODE_PATH || !process.env.NODE_PATH.includes(p)) {
        process.env.NODE_PATH = [p, process.env.NODE_PATH || ''].filter(Boolean).join(path.delimiter);
      }
    }
  } catch {}
}
require('module').Module._initPaths();

const httpBridge = require('./src/main/http-bridge');

function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port: 49152,
        ...options,
      },
      (res) => {
        let resBody = '';
        res.on('data', (chunk) => (resBody += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(resBody);
          } catch {}
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: resBody,
            json,
          });
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('>>> Running Test Suite for Desktop Localhost HTTP Bridge <<<\n');
  let passed = 0;
  let failed = 0;

  function test(desc, fn) {
    return Promise.resolve()
      .then(fn)
      .then(() => {
        console.log(`  ✓ ${desc}`);
        passed++;
      })
      .catch((err) => {
        console.error(`  ✕ ${desc}`);
        console.error(`    ${err.message}`);
        failed++;
      });
  }

  // 1. Initial State
  await test('Initial bridge state is valid and idle', () => {
    const status = httpBridge.getStatus();
    assert.strictEqual(status.status, 'ok');
    assert.strictEqual(status.isRecording, false);
    assert.strictEqual(status.actionCount, 0);
    assert.strictEqual(status.port, 49152);
  });

  // 2. Server Start
  await test('Server starts successfully on 127.0.0.1:49152', async () => {
    await httpBridge.start();
    assert.ok(httpBridge.server);
    assert.ok(httpBridge.server.listening);
  });

  // 3. Double start idempotency
  await test('Calling start() again while running is safe and idempotent', async () => {
    await httpBridge.start();
    assert.ok(httpBridge.server.listening);
  });

  // 4. CORS Preflight with Private Network Access from Vercel
  await test('OPTIONS preflight from https://web-fawn-ten-55.vercel.app returns 204 with PNA headers', async () => {
    const res = await makeRequest({
      method: 'OPTIONS',
      path: '/record/start',
      headers: {
        Origin: 'https://web-fawn-ten-55.vercel.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
        'Access-Control-Request-Private-Network': 'true',
      },
    });

    assert.strictEqual(res.statusCode, 204);
    assert.strictEqual(res.headers['access-control-allow-origin'], 'https://web-fawn-ten-55.vercel.app');
    assert.strictEqual(res.headers['access-control-allow-private-network'], 'true');
    assert.strictEqual(res.headers['access-control-allow-credentials'], 'true');
    assert.ok(res.headers['access-control-allow-methods'].includes('POST'));
    assert.ok(res.headers['access-control-allow-methods'].includes('OPTIONS'));
  });

  // 5. CORS Preflight from localhost:3000
  await test('OPTIONS preflight from http://localhost:3000 returns 204 with PNA headers', async () => {
    const res = await makeRequest({
      method: 'OPTIONS',
      path: '/health',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
      },
    });

    assert.strictEqual(res.statusCode, 204);
    assert.strictEqual(res.headers['access-control-allow-origin'], 'http://localhost:3000');
    assert.strictEqual(res.headers['access-control-allow-private-network'], 'true');
  });

  // 6. GET /health
  await test('GET /health returns 200 with status ok and CORS headers', async () => {
    const res = await makeRequest({
      method: 'GET',
      path: '/health',
      headers: {
        Origin: 'https://web-fawn-ten-55.vercel.app',
      },
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['access-control-allow-private-network'], 'true');
    assert.strictEqual(res.headers['access-control-allow-origin'], 'https://web-fawn-ten-55.vercel.app');
    assert.deepStrictEqual(res.json, {
      status: 'ok',
      isRecording: false,
      actionCount: 0,
      completedRecording: false,
      port: 49152,
    });
  });

  // 7. GET /api/health alias
  await test('GET /api/health alias returns 200 with matching payload', async () => {
    const res = await makeRequest({
      method: 'GET',
      path: '/api/health',
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.status, 'ok');
    assert.strictEqual(res.json.port, 49152);
  });

  // 8. GET /record/status
  await test('GET /record/status returns 200 with recording state and actions array', async () => {
    const res = await makeRequest({
      method: 'GET',
      path: '/record/status',
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.status, 'ok');
    assert.strictEqual(res.json.isRecording, false);
    assert.strictEqual(res.json.actionCount, 0);
    assert.ok(Array.isArray(res.json.actions));
  });

  // 9. POST /record/stop when idle
  await test('POST /record/stop when idle returns gracefully with completedRecording: true', async () => {
    const res = await makeRequest({
      method: 'POST',
      path: '/record/stop',
      headers: { 'Content-Type': 'application/json' },
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.success, true);
    assert.strictEqual(res.json.isRecording, false);
    assert.strictEqual(res.json.completedRecording, true);
    assert.ok(Array.isArray(res.json.actions));
  });

  // 10. 404 Route handling
  await test('GET /unknown-endpoint returns 404 JSON', async () => {
    const res = await makeRequest({
      method: 'GET',
      path: '/unknown-endpoint',
    });

    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.json.error, 'Not Found');
    assert.strictEqual(res.json.path, '/unknown-endpoint');
  });

  // 11. Status Change Listener
  await test('onStatusChange fires callback on state transitions', () => {
    let fired = false;
    let receivedState = null;
    httpBridge.onStatusChange((s) => {
      fired = true;
      receivedState = s;
    });

    httpBridge.notifyStatus();
    assert.strictEqual(fired, true);
    assert.ok(receivedState);
    assert.strictEqual(receivedState.status, 'ok');
  });

  // 12. Re-entrancy protection
  await test('POST /record/start returns 400 if recording session is already active', async () => {
    // Manually mark isRecording = true to test guard
    httpBridge.isRecording = true;
    try {
      const res = await makeRequest(
        {
          method: 'POST',
          path: '/record/start',
          headers: { 'Content-Type': 'application/json' },
        },
        { name: 'duplicate-test', url: 'https://example.com' }
      );

      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.json.error.includes('already active'));
    } finally {
      httpBridge.isRecording = false;
    }
  });

  // 13. Simulated Chrome finish and recipe compilation
  await test('Simulated Chrome finish flushes session, compiles recipe, and updates status', async () => {
    const mockActions = [
      { type: 'navigate', url: 'https://vendor.portal.com/login', timestamp: 1000 },
      { type: 'click', selector: '#login-btn', timestamp: 2000 },
      { type: 'click', selector: 'a[href="/invoices"]', timestamp: 3000 },
    ];

    // Mock active recorder
    httpBridge.activeRecorder = {
      name: 'invoice-download-flow',
      startUrl: 'https://vendor.portal.com/login',
      actions: mockActions,
      stop: async () => null,
    };
    httpBridge.sessionMeta = {
      name: 'invoice-download-flow',
      url: 'https://vendor.portal.com/login',
      startedAt: new Date(Date.now() - 5000).toISOString(),
    };
    httpBridge.isRecording = true;
    httpBridge.completedRecording = false;

    // Trigger Chrome save
    await httpBridge._handleChromeSave();

    assert.strictEqual(httpBridge.isRecording, false);
    assert.strictEqual(httpBridge.completedRecording, true);
    assert.strictEqual(httpBridge.actions.length, 3);
    assert.ok(httpBridge.lastRecipe);
    assert.strictEqual(httpBridge.lastRecipe.metadata.name, 'invoice-download-flow');
    assert.strictEqual(httpBridge.lastRecipe.actions.length, 3);

    // Verify GET /record/status returns the finished recipe and actions
    const res = await makeRequest({ method: 'GET', path: '/record/status' });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.completedRecording, true);
    assert.strictEqual(res.json.actionCount, 3);
    assert.strictEqual(res.json.recipe.metadata.name, 'invoice-download-flow');
  });

  // 14. Server Shutdown
  await test('Server closes cleanly and releases port', async () => {
    await httpBridge.stop();
    assert.strictEqual(httpBridge.server, null);
  });

  console.log(`\n========================================`);
  console.log(`Tests Passed: ${passed}`);
  console.log(`Tests Failed: ${failed}`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
