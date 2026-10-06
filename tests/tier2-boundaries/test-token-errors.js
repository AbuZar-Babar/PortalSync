/**
 * Tier 2 Boundary & Corner Cases: Runner Token Errors & Auth Extremes
 * Tests:
 *  - B1.1: Missing authorization header and cookies altogether -> 401
 *  - B1.2: Token with invalid prefix (ps_test_ instead of ps_live_) -> 401
 *  - B1.3: Token with empty org identifier (ps_live_) -> 401
 *  - B1.4: Random string / JWT-like non-PortalSync bearer token -> 401
 *  - B1.5: Cross-tenant access: Runner Org A requesting Org B resource -> 403
 *  - B1.6: Empty string Bearer token -> 401
 * Total: 6 test cases (>=5 threshold)
 */

const { TestHarness, Assert } = require('../helpers/test-harness');
const { MockCloudServer } = require('../helpers/mock-cloud-server');
const { ORG_1_ID, ORG_2_ID, TOKENS } = require('../helpers/fixtures');

const harness = new TestHarness('Tier 2: Token Errors & Auth Boundary');
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

harness.describe('Token Errors & Auth Boundary Cases', () => {
  harness.it('B1.1: Missing Authorization header and cookies altogether returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/runs`);
    Assert.equal(res.status, 401);
    const json = await res.json();
    Assert.includes(json.error, 'missing runner token or session');
  });

  harness.it('B1.2: Token with invalid prefix (ps_test_) returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/runs`, {
      headers: { Authorization: `Bearer ${TOKENS.invalidPrefix}` },
    });
    Assert.equal(res.status, 401);
    const json = await res.json();
    Assert.includes(json.error, 'ps_live_');
  });

  harness.it('B1.3: Token with empty org identifier (ps_live_ with nothing after) returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/runs`, {
      headers: { Authorization: 'Bearer ps_live_' },
    });
    Assert.equal(res.status, 401);
    const json = await res.json();
    Assert.includes(json.error, 'missing org identifier');
  });

  harness.it('B1.4: Random bearer token without ps_live_ prefix returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/runs`, {
      headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.sig' },
    });
    Assert.equal(res.status, 401);
  });

  harness.it('B1.5: Cross-tenant access: Org 1 runner updating Org 2 run returns 403 Forbidden', async () => {
    // Org 2 creates a run
    const run = server.addRun({ org_id: ORG_2_ID, workflow_id: 'wf-org2', status: 'pending' });

    // Org 1 runner attempts to claim it
    const res = await fetch(`${baseUrl}/api/v1/runs`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${TOKENS.validOrg1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ run_id: run.id, status: 'running' }),
    });

    Assert.equal(res.status, 403);
    const json = await res.json();
    Assert.includes(json.error, 'Forbidden');
  });

  harness.it('B1.6: Empty string Bearer token returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/runs`, {
      headers: { Authorization: 'Bearer ' },
    });
    Assert.equal(res.status, 401);
  });
});

if (require.main === module) {
  harness.run().then((res) => {
    process.exitCode = res.failed > 0 ? 1 : 0;
  });
}

module.exports = { harness };
