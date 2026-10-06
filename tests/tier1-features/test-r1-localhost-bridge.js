/**
 * Tier 1 Feature Coverage: R1 Desktop Localhost HTTP Bridge
 * 
 * Verifies:
 *  - F16: Server Lifecycle & Initial State (3 tests)
 *  - F17: CORS Preflight & W3C Private Network Access (3 tests)
 *  - F18: Health Check & Status Endpoints (4 tests)
 *  - F19: Session Control, Re-entrancy & Route Handling (3 tests)
 *  - F20: Simulated Chrome Finish & Recipe Compilation (2 tests)
 * Total: 15 test cases
 */

'use strict';

const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const { TestHarness, Assert } = require('../helpers/test-harness');

// Initialize module resolution paths for desktop dependencies
const candidateWorktreePaths = [
  path.resolve(__dirname, '../../../../Workflow-Capture-agent-worktrees/multi-agent-integration/node_modules'),
  path.resolve(__dirname, '../../../Workflow-Capture-agent-worktrees/multi-agent-integration/node_modules'),
  path.resolve(__dirname, '../../../../Workflow-Capture-agent-worktrees/main/node_modules'),
  path.resolve(__dirname, '../../node_modules'),
  path.resolve(__dirname, '../node_modules'),
  path.resolve('C:/Users/AbuZar/Desktop/Fyp/Workflow-Capture-agent-worktrees/multi-agent-integration/node_modules'),
];
for (const p of candidateWorktreePaths) {
  try {
    if (fs.existsSync(p)) {
      if (!process.env.NODE_PATH || !process.env.NODE_PATH.includes(p)) {
        process.env.NODE_PATH = [p, process.env.NODE_PATH || ''].filter(Boolean).join(path.delimiter);
      }
    }
  } catch {}
}
try {
  require('node:module').Module._initPaths();
} catch {}

const httpBridge = require(path.resolve(__dirname, '../../apps/desktop/src/main/http-bridge'));

const harness = new TestHarness('Tier 1: R1 Localhost Bridge Feature Coverage');

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
        res.on('data', (chunk) => {
          resBody += chunk;
        });
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

harness.beforeAll(async () => {
  await httpBridge.start();
});

harness.afterAll(async () => {
  await httpBridge.stop();
});

// =========================================================================
// FEATURE 16: Server Lifecycle & Initial State (3 tests)
// =========================================================================
harness.describe('F16: Server Lifecycle & Initial State', () => {
  harness.it('F16.1: Initial bridge status indicates healthy idle state on port 49152', () => {
    const status = httpBridge.getStatus();
    Assert.equal(status.status, 'ok', 'Status must be ok');
    Assert.equal(status.isRecording, false, 'Initial state should not be recording');
    Assert.equal(status.actionCount, 0, 'Initial action count should be 0');
    Assert.equal(status.port, 49152, 'Bridge port must be 49152');
  });

  harness.it('F16.2: Server is actively listening on 127.0.0.1:49152', () => {
    Assert.ok(httpBridge.server, 'Server instance must exist');
    Assert.ok(httpBridge.server.listening, 'Server must be listening');
    const addr = httpBridge.server.address();
    Assert.equal(addr.port, 49152, 'Listening port must match 49152');
  });

  harness.it('F16.3: Calling start() multiple times is safe and idempotent', async () => {
    await httpBridge.start();
    Assert.ok(httpBridge.server.listening, 'Server remains listening after redundant start');
  });
});

// =========================================================================
// FEATURE 17: CORS Preflight & W3C Private Network Access (3 tests)
// =========================================================================
harness.describe('F17: CORS Preflight & W3C Private Network Access', () => {
  harness.it('F17.1: OPTIONS preflight from production Vercel console returns 204 with PNA headers', async () => {
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

    Assert.equal(res.statusCode, 204, 'CORS preflight must return 204 No Content');
    Assert.equal(
      res.headers['access-control-allow-origin'],
      'https://web-fawn-ten-55.vercel.app',
      'Origin header must echo Vercel host'
    );
    Assert.equal(
      res.headers['access-control-allow-private-network'],
      'true',
      'PNA header Access-Control-Allow-Private-Network must be true'
    );
    Assert.equal(res.headers['access-control-allow-credentials'], 'true', 'Credentials must be allowed for origin');
    Assert.ok(res.headers['access-control-allow-methods'].includes('POST'), 'Methods must allow POST');
    Assert.ok(res.headers['access-control-allow-methods'].includes('OPTIONS'), 'Methods must allow OPTIONS');
  });

  harness.it('F17.2: OPTIONS preflight from local web development host returns 204 with PNA headers', async () => {
    const res = await makeRequest({
      method: 'OPTIONS',
      path: '/health',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
      },
    });

    Assert.equal(res.statusCode, 204, 'Preflight from localhost:3000 must return 204');
    Assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:3000', 'Origin must match localhost');
    Assert.equal(res.headers['access-control-allow-private-network'], 'true', 'Must support Private Network Access');
  });

  harness.it('F17.3: Permissive CORS headers exposed on standard GET requests with origin', async () => {
    const res = await makeRequest({
      method: 'GET',
      path: '/health',
      headers: {
        Origin: 'https://web-fawn-ten-55.vercel.app',
      },
    });

    Assert.equal(res.statusCode, 200, 'GET /health must return 200');
    Assert.equal(
      res.headers['access-control-allow-origin'],
      'https://web-fawn-ten-55.vercel.app',
      'Response must reflect calling origin'
    );
    Assert.equal(res.headers['access-control-allow-private-network'], 'true', 'Private network access header present');
  });
});

// =========================================================================
// FEATURE 18: Health Check & Status Endpoints (4 tests)
// =========================================================================
harness.describe('F18: Health Check & Status Endpoints', () => {
  harness.it('F18.1: GET /health returns 200 with status ok and telemetry metadata', async () => {
    const res = await makeRequest({
      method: 'GET',
      path: '/health',
    });

    Assert.equal(res.statusCode, 200, 'Health endpoint must return HTTP 200');
    Assert.ok(res.json, 'Response must be valid JSON');
    Assert.equal(res.json.status, 'ok', 'Status property must be ok');
    Assert.equal(res.json.isRecording, false, 'isRecording must be false');
    Assert.equal(res.json.actionCount, 0, 'actionCount must be 0');
    Assert.equal(res.json.port, 49152, 'Port must be 49152');
  });

  harness.it('F18.2: GET /api/health alias matches /health response contract', async () => {
    const res = await makeRequest({
      method: 'GET',
      path: '/api/health',
    });

    Assert.equal(res.statusCode, 200, 'API alias must return 200');
    Assert.equal(res.json.status, 'ok', 'Status must be ok');
    Assert.equal(res.json.port, 49152, 'Port must match 49152');
  });

  harness.it('F18.3: GET /record/status returns recording state and actions array', async () => {
    const res = await makeRequest({
      method: 'GET',
      path: '/record/status',
    });

    Assert.equal(res.statusCode, 200, 'Status endpoint must return 200');
    Assert.equal(res.json.status, 'ok', 'Status must be ok');
    Assert.equal(typeof res.json.isRecording, 'boolean', 'isRecording must be boolean');
    Assert.equal(typeof res.json.actionCount, 'number', 'actionCount must be number');
    Assert.ok(Array.isArray(res.json.actions), 'actions must be an array');
  });

  harness.it('F18.4: GET /api/record/status alias returns matching contract', async () => {
    const res = await makeRequest({
      method: 'GET',
      path: '/api/record/status',
    });

    Assert.equal(res.statusCode, 200, 'Status alias must return 200');
    Assert.equal(res.json.status, 'ok', 'Status must be ok');
    Assert.ok(Array.isArray(res.json.actions), 'Actions array must be present');
  });
});

// =========================================================================
// FEATURE 19: Session Control, Re-entrancy & Route Handling (3 tests)
// =========================================================================
harness.describe('F19: Session Control, Re-entrancy & Route Handling', () => {
  harness.it('F19.1: POST /record/stop when idle returns gracefully with completedRecording: true', async () => {
    const res = await makeRequest({
      method: 'POST',
      path: '/record/stop',
      headers: { 'Content-Type': 'application/json' },
    });

    Assert.equal(res.statusCode, 200, 'Stop when idle returns 200');
    Assert.equal(res.json.success, true, 'success flag must be true');
    Assert.equal(res.json.isRecording, false, 'isRecording must be false');
    Assert.equal(res.json.completedRecording, true, 'completedRecording must be true');
    Assert.ok(Array.isArray(res.json.actions), 'actions must be an array');
  });

  harness.it('F19.2: POST /record/start returns 400 when session is already active (re-entrancy guard)', async () => {
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

      Assert.equal(res.statusCode, 400, 'Must reject concurrent start with HTTP 400');
      Assert.ok(res.json.error, 'Must provide error message');
      Assert.ok(res.json.error.includes('already active'), 'Error should cite already active session');
    } finally {
      httpBridge.isRecording = false;
    }
  });

  harness.it('F19.3: GET /unknown-endpoint returns 404 JSON with descriptive error', async () => {
    const res = await makeRequest({
      method: 'GET',
      path: '/unknown-endpoint',
    });

    Assert.equal(res.statusCode, 404, 'Unknown endpoint must return HTTP 404');
    Assert.equal(res.json.error, 'Not Found', 'Error must be Not Found');
    Assert.equal(res.json.path, '/unknown-endpoint', 'Path must match requested route');
  });
});

// =========================================================================
// FEATURE 20: Simulated Chrome Finish & Recipe Compilation (2 tests)
// =========================================================================
harness.describe('F20: Simulated Chrome Finish & Recipe Compilation', () => {
  harness.it('F20.1: Simulated Chrome finish flushes session, generates recipe, and notifies listeners', async () => {
    let listenerFired = false;
    let listenerState = null;
    httpBridge.onStatusChange((status) => {
      listenerFired = true;
      listenerState = status;
    });

    const mockActions = [
      { type: 'navigate', url: 'https://vendor.portal.com/login', timestamp: 1000 },
      { type: 'click', selector: '#login-btn', timestamp: 2000 },
      { type: 'click', selector: 'a[href="/invoices"]', timestamp: 3000 },
    ];

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

    // Trigger Chrome save completion handler
    await httpBridge._handleChromeSave();

    Assert.equal(httpBridge.isRecording, false, 'isRecording must be reset to false');
    Assert.equal(httpBridge.completedRecording, true, 'completedRecording must be set to true');
    Assert.equal(httpBridge.actions.length, 3, 'Actions array must match captured length');
    Assert.ok(httpBridge.lastRecipe, 'Recipe must be compiled');
    Assert.equal(httpBridge.lastRecipe.metadata.name, 'invoice-download-flow', 'Recipe name must match session');
    Assert.equal(httpBridge.lastRecipe.actions.length, 3, 'Recipe actions must match');
    Assert.ok(listenerFired, 'onStatusChange listener must be triggered');
    Assert.ok(listenerState, 'Status change callback must receive state');
  });

  harness.it('F20.2: Subsequent GET /record/status returns finished recipe and complete action list', async () => {
    const res = await makeRequest({
      method: 'GET',
      path: '/record/status',
    });

    Assert.equal(res.statusCode, 200, 'Status endpoint returns 200');
    Assert.equal(res.json.completedRecording, true, 'completedRecording is true');
    Assert.equal(res.json.actionCount, 3, 'actionCount is 3');
    Assert.ok(res.json.recipe, 'Recipe is present in status response');
    Assert.equal(res.json.recipe.metadata.name, 'invoice-download-flow', 'Recipe name matches');
  });
});

module.exports = { harness };
