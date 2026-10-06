/**
 * Tier 2 Boundary & Corner Cases: Empty and Malformed Bodies
 * Tests:
 *  - B3.1: Completely empty body on POST /api/v1/runs returns 400
 *  - B3.2: Malformed invalid JSON payload on POST /api/v1/artifacts returns 400
 *  - B3.3: Missing required run_id on POST /api/v1/artifacts returns 400
 *  - B3.4: Missing required sha256_hash or file_name on POST /api/v1/artifacts returns 400
 *  - B3.5: Empty strings for required fields in POST /api/v1/workflows returns 400
 *  - B3.6: Non-existent run_id on PATCH /api/v1/runs returns 404
 * Total: 6 test cases (>=5 threshold)
 */

const { TestHarness, Assert } = require('../helpers/test-harness');
const { MockCloudServer } = require('../helpers/mock-cloud-server');
const { ORG_1_ID, TOKENS } = require('../helpers/fixtures');

const harness = new TestHarness('Tier 2: Empty & Malformed Bodies');
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

harness.describe('Empty and Malformed Request Bodies', () => {
  harness.it('B3.1: Completely empty body on POST /api/v1/runs returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/v1/runs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKENS.validOrg1}`,
        'Content-Type': 'application/json',
      },
      body: '',
    });
    Assert.equal(res.status, 400);
    const json = await res.json();
    Assert.includes(json.error, 'workflow_id');
  });

  harness.it('B3.2: Malformed non-JSON syntax on POST /api/v1/artifacts returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/v1/artifacts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKENS.validOrg1}`,
        'Content-Type': 'application/json',
      },
      body: '{"invalid": json[syntax here}',
    });
    Assert.equal(res.status, 400);
    const json = await res.json();
    Assert.includes(json.error, 'Invalid JSON');
  });

  harness.it('B3.3: Missing required run_id on POST /api/v1/artifacts returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/v1/artifacts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKENS.validOrg1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file_name: 'test.pdf', sha256_hash: 'abc' }),
    });
    Assert.equal(res.status, 400);
    const json = await res.json();
    Assert.includes(json.error, 'mandatory');
  });

  harness.it('B3.4: Missing required sha256_hash on POST /api/v1/artifacts returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/v1/artifacts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKENS.validOrg1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ run_id: '123', file_name: 'test.pdf' }),
    });
    Assert.equal(res.status, 400);
    const json = await res.json();
    Assert.includes(json.error, 'mandatory');
  });

  harness.it('B3.5: Empty strings for required fields in POST /api/v1/workflows returns 400', async () => {
    const res = await fetch(`${baseUrl}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKENS.validOrg1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: '   ', portal_url: '' }),
    });
    Assert.equal(res.status, 400);
  });

  harness.it('B3.6: Non-existent run_id on PATCH /api/v1/runs returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/v1/runs`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${TOKENS.validOrg1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ run_id: 'non-existent-uuid-1234', status: 'running' }),
    });
    Assert.equal(res.status, 404);
  });
});

if (require.main === module) {
  harness.run().then((res) => {
    process.exitCode = res.failed > 0 ? 1 : 0;
  });
}

module.exports = { harness };
