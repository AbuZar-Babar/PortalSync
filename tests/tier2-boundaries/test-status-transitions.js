/**
 * Tier 2 Boundary & Corner Cases: Status Transitions State Machine Extremes
 * Tests:
 *  - B2.1: Illegal backward transition: completed -> running returns 409
 *  - B2.2: Illegal backward transition: failed -> pending returns 409
 *  - B2.3: Illegal skip transition: pending -> completed without running returns 409
 *  - B2.4: Double claim race condition returns 409 Conflict
 *  - B2.5: Unknown status string (e.g. status: 'exploded') returns 409
 *  - B2.6: Transitioning cancelled run to running returns 409
 * Total: 6 test cases (>=5 threshold)
 */

const { TestHarness, Assert } = require('../helpers/test-harness');
const { MockCloudServer } = require('../helpers/mock-cloud-server');
const { ORG_1_ID, TOKENS } = require('../helpers/fixtures');

const harness = new TestHarness('Tier 2: Status Transitions State Machine');
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

harness.describe('Status Transition Boundary Cases', () => {
  async function attemptTransition(runId, targetStatus) {
    return fetch(`${baseUrl}/api/v1/runs`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${TOKENS.validOrg1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ run_id: runId, status: targetStatus }),
    });
  }

  harness.it('B2.1: Illegal backward transition: completed -> running returns 409', async () => {
    const run = server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-1', status: 'completed' });
    const res = await attemptTransition(run.id, 'running');
    Assert.equal(res.status, 409);
    const json = await res.json();
    Assert.includes(json.error, 'Invalid status transition');
  });

  harness.it('B2.2: Illegal backward transition: failed -> pending returns 409', async () => {
    const run = server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-1', status: 'failed' });
    const res = await attemptTransition(run.id, 'pending');
    Assert.equal(res.status, 409);
  });

  harness.it('B2.3: Illegal skip transition: pending -> completed directly returns 409', async () => {
    const run = server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-1', status: 'pending' });
    const res = await attemptTransition(run.id, 'completed');
    Assert.equal(res.status, 409);
  });

  harness.it('B2.4: Double claim race condition: second claim on running run returns 409 Conflict', async () => {
    const run = server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-1', status: 'running' });
    const res = await attemptTransition(run.id, 'running');
    Assert.equal(res.status, 409);
    const json = await res.json();
    Assert.includes(json.error, 'cannot claim run');
  });

  harness.it('B2.5: Unknown/arbitrary status string returns 409', async () => {
    const run = server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-1', status: 'pending' });
    const res = await attemptTransition(run.id, 'exploded');
    Assert.equal(res.status, 409);
    const json = await res.json();
    Assert.includes(json.error, 'Invalid status transition');
  });

  harness.it('B2.6: Transitioning cancelled run to running returns 409', async () => {
    const run = server.addRun({ org_id: ORG_1_ID, workflow_id: 'wf-1', status: 'cancelled' });
    const res = await attemptTransition(run.id, 'running');
    Assert.equal(res.status, 409);
  });
});

if (require.main === module) {
  harness.run().then((res) => {
    process.exitCode = res.failed > 0 ? 1 : 0;
  });
}

module.exports = { harness };
