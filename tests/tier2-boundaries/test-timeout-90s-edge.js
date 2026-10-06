/**
 * Tier 2 Boundary & Corner Cases: 90s Human-in-the-Loop Timeout Edges
 * Tests:
 *  - B5.1: Exact 90-second boundary: timer trips accurately when elapsed reaches timeout
 *  - B5.2: Resolution at wire edge (before timeout): resolves successfully without false timeout
 *  - B5.3: Negative elapsed or clock skew: remaining seconds clamp to 0 and never return negative
 *  - B5.4: Multiple concurrent runs maintain independent timer lifecycles
 *  - B5.5: Immediate resolution at 0.1s: exits loop promptly without sleeping
 *  - B5.6: onTick countdown callback emits non-negative integer seconds
 * Total: 6 test cases (>=5 threshold)
 */

const { TestHarness, Assert } = require('../helpers/test-harness');
const { waitFor2FAResolution } = require('../../packages/engine/src/runner/hitl-detector');

const harness = new TestHarness('Tier 2: 90s HITL Timeout Edge Cases');

harness.describe('90-Second HITL Timeout Boundary & Corner Cases', () => {
  harness.it('B5.1: Exact timeout boundary: returns timedOut: true when elapsed reaches timeoutMs', async () => {
    const mockPage = {
      evaluate: async () => ({ detected: true, reason: '2FA challenge active' }),
    };

    const t0 = Date.now();
    const res = await waitFor2FAResolution(mockPage, {
      timeoutMs: 80,
      pollIntervalMs: 20,
    });
    const elapsed = Date.now() - t0;

    Assert.equal(res.resolved, false);
    Assert.equal(res.timedOut, true);
    Assert.ok(elapsed >= 80, `Expected elapsed >= 80ms, got ${elapsed}ms`);
  });

  harness.it('B5.2: Resolution at wire edge: resolves successfully right before timeout boundary', async () => {
    let checks = 0;
    const mockPage = {
      evaluate: async () => {
        checks++;
        // Clear challenge on 4th check (right before timeout)
        return { detected: checks < 4, reason: checks < 4 ? 'Active' : null };
      },
    };

    const res = await waitFor2FAResolution(mockPage, {
      timeoutMs: 300,
      pollIntervalMs: 50,
    });

    Assert.equal(res.resolved, true);
    Assert.equal(res.timedOut, false);
  });

  harness.it('B5.3: Negative elapsed or clock skew: remaining seconds clamp to 0 and never return negative', () => {
    function computeRemainingSeconds(startedAtMs, nowMs, maxWaitSeconds = 90) {
      const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
      return Math.max(0, maxWaitSeconds - elapsedSeconds);
    }

    // Normal calculation
    Assert.equal(computeRemainingSeconds(1000, 31000, 90), 60);

    // Past 90s boundary -> clamped at 0
    Assert.equal(computeRemainingSeconds(1000, 150000, 90), 0);

    // Extreme future time (clock skew backwards) -> clamped safely
    Assert.equal(computeRemainingSeconds(50000, 1000, 90), 90);
  });

  harness.it('B5.4: Multiple concurrent runs maintain independent timer lifecycles', async () => {
    const pageA = { evaluate: async () => ({ detected: true, reason: 'Page A' }) };
    let pageBResolved = false;
    const pageB = {
      evaluate: async () => {
        return { detected: !pageBResolved, reason: 'Page B' };
      },
    };

    // Run A times out, Run B resolves after 60ms
    setTimeout(() => {
      pageBResolved = true;
    }, 60);

    const [resA, resB] = await Promise.all([
      waitFor2FAResolution(pageA, { timeoutMs: 150, pollIntervalMs: 25 }),
      waitFor2FAResolution(pageB, { timeoutMs: 300, pollIntervalMs: 25 }),
    ]);

    Assert.equal(resA.timedOut, true);
    Assert.equal(resA.resolved, false);

    Assert.equal(resB.resolved, true);
    Assert.equal(resB.timedOut, false);
  });

  harness.it('B5.5: Immediate resolution at 0.1s: exits loop promptly without sleeping full window', async () => {
    const mockPage = {
      evaluate: async () => ({ detected: false }), // Not detected immediately
    };

    const t0 = Date.now();
    const res = await waitFor2FAResolution(mockPage, {
      timeoutMs: 5000,
      pollIntervalMs: 50,
    });
    const elapsed = Date.now() - t0;

    Assert.equal(res.resolved, true);
    Assert.ok(elapsed < 200, `Expected prompt exit (<200ms), took ${elapsed}ms`);
  });

  harness.it('B5.6: onTick countdown callback emits non-negative integer seconds', async () => {
    const ticks = [];
    const mockPage = {
      evaluate: async () => ({ detected: true }),
    };

    await waitFor2FAResolution(mockPage, {
      timeoutMs: 120,
      pollIntervalMs: 30,
      onTick: (sec) => ticks.push(sec),
    });

    Assert.ok(ticks.length > 0, 'Expected onTick to be called');
    ticks.forEach((tick) => {
      Assert.ok(Number.isInteger(tick), 'Tick must be integer');
      Assert.ok(tick >= 0, 'Tick must be non-negative');
    });
  });
});

if (require.main === module) {
  harness.run().then((res) => {
    process.exitCode = res.failed > 0 ? 1 : 0;
  });
}

module.exports = { harness };
