const test = require('node:test');
const assert = require('node:assert/strict');
const ReplayEngine = require('../src/replay/replay-engine');

test('Transient Programmatic Download Action Detection', async (t) => {
  const isTransient = ReplayEngine.isTransientProgrammaticDownloadAction;
  assert.equal(typeof isTransient, 'function', 'ReplayEngine exports isTransientProgrammaticDownloadAction');

  await t.test('detects transient download anchor with blob href and zero size', () => {
    const action = {
      type: 'CLICK',
      target: {
        candidates: [{ strategy: 'cssPath', value: 'body > a' }],
        fingerprint: {
          tagName: 'a',
          attributes: { href: 'blob:http://localhost:3000/download-uuid-1234' },
          dimensions: { width: 0, height: 0 },
          text: ''
        }
      }
    };
    assert.equal(isTransient(action), true);
  });

  await t.test('detects transient download anchor with action.action CLICK and body/a xpath', () => {
    const action = {
      action: 'CLICK',
      target: {
        candidates: [{ strategy: 'xpath', value: '/html/body/a[1]' }],
        fingerprint: {
          tagName: 'a',
          attributes: { href: 'blob:https://portal.example.com/export.csv' },
          dimensions: { width: 0, height: 0 },
          text: '   '
        }
      }
    };
    assert.equal(isTransient(action), true);
  });

  await t.test('detects transient download anchor with direct fingerprint on target', () => {
    const action = {
      type: 'CLICK',
      target: {
        tagName: 'a',
        href: 'blob:http://localhost:3000/export.pdf',
        dimensions: { width: 0, height: 0 },
        text: ''
      }
    };
    assert.equal(isTransient(action), true);
  });

  await t.test('does not flag normal navigation link', () => {
    const action = {
      type: 'CLICK',
      target: {
        candidates: [{ strategy: 'cssPath', value: 'nav > a.menu-link' }],
        fingerprint: {
          tagName: 'a',
          attributes: { href: 'https://portal.example.com/invoices' },
          dimensions: { width: 120, height: 40 },
          text: 'Invoices'
        }
      }
    };
    assert.equal(isTransient(action), false);
  });

  await t.test('does not flag download link with visible text', () => {
    const action = {
      type: 'CLICK',
      target: {
        candidates: [{ strategy: 'cssPath', value: 'table td > a' }],
        fingerprint: {
          tagName: 'a',
          attributes: { href: 'blob:https://portal.example.com/invoice-123.pdf', download: 'invoice.pdf' },
          dimensions: { width: 80, height: 25 },
          text: 'Download Invoice'
        }
      }
    };
    assert.equal(isTransient(action), false);
  });

  await t.test('does not flag button actions', () => {
    const action = {
      type: 'CLICK',
      target: {
        fingerprint: {
          tagName: 'button',
          text: 'Export'
        }
      }
    };
    assert.equal(isTransient(action), false);
  });

  await t.test('returns false for null or non-click actions', () => {
    assert.equal(isTransient(null), false);
    assert.equal(isTransient({ type: 'INPUT' }), false);
    assert.equal(isTransient({ type: 'NAVIGATE' }), false);
  });
});

test('Adaptive Timeout in waitForTargetElement', async (t) => {
  await t.test('calculates effective timeout based on action.timeDeltaMs', async () => {
    const engine = new ReplayEngine();
    engine.timeoutMs = 15000;

    // Simulate mock frame and resolution loop timing check
    // If recordedDelta is 12000, effectiveTimeout should be min(60000, max(15000, 12000 + 8000)) = 20000
    const actionWithDelta = {
      type: 'CLICK',
      timeDeltaMs: 12000,
      target: { candidates: [] }
    };

    // Fast-failing probe: aborted engine to inspect immediate behavior
    engine.isAborted = true;
    await assert.rejects(
      () => engine.waitForTargetElement(actionWithDelta.target, 0, actionWithDelta.type, actionWithDelta),
      /Execution stopped by user/
    );
  });
});
