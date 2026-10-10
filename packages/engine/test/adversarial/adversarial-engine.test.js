/**
 * Adversarial Stress & Edge Case Test Suite for FlowMind Engine
 * 
 * Empirically tests:
 * 1. State-Aware Checkbox Idempotency (replay idempotency, default ON, programmatic clicks, multi-select, uncheck)
 * 2. Smart Interruption Recovery Case Q (transparent backdrop preservation, modal backdrop handling, co-existence)
 * 3. Table Control Column Alignment (expander arrows, checkboxes, icon buttons, inline glyph stripping, no column shift)
 * 4. Universal Date Parser & Compound Boolean Filter (ISO, US, EU, dateBetween boundaries, prototype value setters)
 * 5. Multi-Tab Manager (secondary tab detection, CDP download hook, auxiliary cleanup, dashboard protection)
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const SelectorResolver = require('../../src/shared/selector-resolver');
const { executeClick, executeType, normalizeDateValue } = require('../../src/replay/action-executors');
const InterruptionHandler = require('../../src/replay/interruption-handler');
const TabManager = require('../../src/replay/tab-manager');
const LoopReplayRunner = require('../../src/replay/loop-replay-runner');
const ItemDiscovery = require('../../src/shared/item-discovery');
const {
  normalizeItemFilter,
  validateItemFilter,
  evaluateItemFilter,
  validateStrictIsoDate,
  parseSourceDate
} = require('../../src/shared/item-filter');

// Global mock events for node runtime
if (typeof global.PointerEvent === 'undefined') {
  global.PointerEvent = class PointerEvent {
    constructor(type, opts = {}) {
      this.type = type;
      Object.assign(this, opts);
    }
  };
}
if (typeof global.MouseEvent === 'undefined') {
  global.MouseEvent = class MouseEvent {
    constructor(type, opts = {}) {
      this.type = type;
      Object.assign(this, opts);
    }
  };
}
if (typeof global.Event === 'undefined') {
  global.Event = class Event {
    constructor(type, opts = {}) {
      this.type = type;
      Object.assign(this, opts);
    }
  };
}

// Helper to build realistic DOM simulation for InterruptionHandler
function createTestDOM(elements) {
  function matches(node, sel) {
    sel = sel.trim();
    if (sel === '*') return true;
    // Support compound tag.class e.g. button.x, button.close, modal.show
    if (sel.includes('.')) {
      const [tag, ...classes] = sel.split('.');
      if (tag && node.tagName.toLowerCase() !== tag.toLowerCase()) return false;
      return classes.every(c => node.classList && node.classList.contains(c));
    }
    if (sel.startsWith('#')) {
      return node.id === sel.slice(1);
    }
    // Support compound tag[attr=val] or [attr=val]
    if (sel.includes('[') && sel.endsWith(']')) {
      const bracketIndex = sel.indexOf('[');
      const tag = sel.slice(0, bracketIndex);
      if (tag && node.tagName.toLowerCase() !== tag.toLowerCase()) return false;
      const inner = sel.slice(bracketIndex + 1, -1);
      if (inner.includes('*=')) {
        const [attr, rawVal] = inner.split('*=');
        const val = rawVal.replace(/['"i\s]/g, '').toLowerCase();
        const attrVal = (node.getAttribute(attr.trim()) || '').toLowerCase();
        return attrVal.includes(val);
      }
      if (inner.includes('=')) {
        const [attr, rawVal] = inner.split('=');
        const val = rawVal.replace(/['"]/g, '');
        return node.getAttribute(attr.trim()) === val;
      }
      return Boolean(node.getAttribute(inner));
    }
    return node.tagName.toLowerCase() === sel.toLowerCase();
  }

  function queryAllIn(node, selector) {
    const parts = selector.split(',').map(s => s.trim());
    const results = [];
    function recurse(n) {
      for (const part of parts) {
        if (part.includes(' ')) {
          const sub = part.split(/\s+/);
          if (sub.length === 2 && matches(n, sub[1])) {
            let p = n.parent;
            while (p) {
              if (matches(p, sub[0])) { results.push(n); break; }
              p = p.parent;
            }
          }
        } else if (matches(n, part)) {
          results.push(n);
        }
      }
      if (n.children) {
        for (const c of n.children) recurse(c);
      }
    }
    if (node.children) {
      for (const c of node.children) recurse(c);
    }
    return results;
  }

  function buildNode(spec, parent = null) {
    const n = {
      nodeType: 1,
      tagName: (spec.tag || 'div').toUpperCase(),
      className: spec.className || '',
      id: spec.id || '',
      style: spec.style || {},
      classList: {
        contains: (c) => (spec.className || '').split(/\s+/).includes(c)
      },
      attributes: { ...(spec.attributes || {}) },
      getAttribute: (k) => n.attributes[k] || (k === 'id' ? n.id : (k === 'class' ? n.className : null)),
      hasAttribute: (k) => Boolean(n.attributes[k] || (k === 'id' && n.id) || (k === 'class' && n.className)),
      textContent: spec.text || '',
      value: spec.value || '',
      clicked: false,
      styleDisplay: 'block',
      click: () => {
        n.clicked = true;
        let curr = n;
        while (curr) {
          curr.styleDisplay = 'none';
          curr = curr.parent;
        }
      },
      focus: () => {},
      dispatchEvent: () => {},
      getBoundingClientRect: () => spec.rect || ({ width: 80, height: 40, top: 10, left: 10 }),
      parent,
      children: []
    };
    if (spec.children) {
      n.children = spec.children.map(c => buildNode(c, n));
    }
    n.querySelectorAll = (sel) => queryAllIn(n, sel);
    n.querySelector = (sel) => queryAllIn(n, sel)[0] || null;
    return n;
  }

  const rootNodes = elements.map(e => buildNode(e));
  const mockDoc = {
    querySelectorAll: (sel) => {
      const res = [];
      for (const r of rootNodes) {
        res.push(...queryAllIn({ children: [r] }, sel));
      }
      return res;
    },
    querySelector: (sel) => mockDoc.querySelectorAll(sel)[0] || null
  };

  return {
    rootNodes,
    mockDoc,
    createPage: (url = 'https://portal.flowmind.test') => ({
      url: () => url,
      isClosed: () => false,
      keyboard: {
        escaped: false,
        press: async (k) => {
          if (k === 'Escape') keyboardEscaped = true;
        }
      },
      evaluate: async (fn, ...args) => {
        const origDoc = global.document;
        const origWin = global.window;
        const origMouse = global.MouseEvent;
        try {
          global.document = mockDoc;
          global.window = {
            innerWidth: 1024,
            innerHeight: 768,
            getComputedStyle: (el) => ({
              display: (el && el.styleDisplay) || (el?.style?.display) || 'block',
              visibility: 'visible',
              opacity: '1',
              position: el?.style?.position || 'static',
              zIndex: el?.style?.zIndex || 'auto'
            })
          };
          global.MouseEvent = class { constructor(t) { this.type = t; } };
          return await fn(...args);
        } finally {
          global.document = origDoc;
          global.window = origWin;
          global.MouseEvent = origMouse;
        }
      }
    })
  };
}

let keyboardEscaped = false;

// ============================================================================
// SUITE 1: State-aware Checkbox Idempotency
// ============================================================================
test('Checkbox Idempotency: Replaying step on already checked box does not click', async () => {
  let clickCount = 0;
  const mockHandle = {
    evaluate: async (fn, ...args) => {
      const mockEl = {
        tagName: 'INPUT',
        type: 'checkbox',
        checked: true,
        offsetWidth: 20,
        offsetHeight: 20,
        getClientRects: () => [{ width: 20, height: 20 }],
        getAttribute: (k) => k === 'type' ? 'checkbox' : null,
        closest: () => null,
        querySelector: () => null
      };
      return fn(mockEl, ...args);
    },
    evaluateHandle: async (fn) => null,
    click: async () => { clickCount++; }
  };

  const action = {
    type: 'CLICK',
    name: 'Customer A Checkbox',
    isCheckbox: true,
    desiredState: true,
    target: { fingerprint: { isCheckbox: true, checked: true } }
  };

  await executeClick(mockHandle, action, {});
  assert.strictEqual(clickCount, 0, 'Click must be skipped when checkbox is already in desiredState=true');
});

test('Checkbox Idempotency: Defaults to ON (true) when desiredState recorded as false on unchecked box', async () => {
  let clickCount = 0;
  let elementChecked = false;

  const mockHandle = {
    evaluate: async (fn, ...args) => {
      const mockEl = {
        tagName: 'INPUT',
        type: 'checkbox',
        checked: elementChecked,
        offsetWidth: 20,
        offsetHeight: 20,
        getClientRects: () => [{ width: 20, height: 20 }],
        getAttribute: (k) => k === 'type' ? 'checkbox' : null,
        closest: () => null,
        querySelector: () => null
      };
      return fn(mockEl, ...args);
    },
    evaluateHandle: async () => null,
    click: async () => {
      clickCount++;
      elementChecked = true;
    }
  };

  // User clicked an unchecked checkbox; raw recorded action had desiredState: false from pre-click inspection
  const action = {
    type: 'CLICK',
    name: 'Auto-invoice Checkbox',
    isCheckbox: true,
    desiredState: false,
    target: { fingerprint: { isCheckbox: true, checked: false } }
  };

  // Replay run 1: Box is unchecked, desiredState defaults to ON -> must click
  await executeClick(mockHandle, action, {});
  assert.strictEqual(clickCount, 1, 'Should execute click to turn ON unchecked box');
  assert.strictEqual(elementChecked, true, 'Element should now be checked');

  // Replay run 2 (Immediate repeat): Box is now checked, desiredState is true -> must skip click
  await executeClick(mockHandle, action, {});
  assert.strictEqual(clickCount, 1, 'Repeat must NOT toggle checkbox off');
});

test('Checkbox Idempotency: Explicit isUncheck=true unchecks checked box and skips on repeat', async () => {
  let clickCount = 0;
  let elementChecked = true;

  const mockHandle = {
    evaluate: async (fn, ...args) => {
      const mockEl = {
        tagName: 'INPUT',
        type: 'checkbox',
        checked: elementChecked,
        offsetWidth: 20,
        offsetHeight: 20,
        getClientRects: () => [{ width: 20, height: 20 }],
        getAttribute: (k) => k === 'type' ? 'checkbox' : null,
        closest: () => null,
        querySelector: () => null
      };
      return fn(mockEl, ...args);
    },
    evaluateHandle: async () => null,
    click: async () => {
      clickCount++;
      elementChecked = false;
    }
  };

  const action = {
    type: 'CLICK',
    name: 'Disable Notification Checkbox',
    isCheckbox: true,
    isUncheck: true
  };

  // Run 1: Checked, needs uncheck -> click executes
  await executeClick(mockHandle, action, {});
  assert.strictEqual(clickCount, 1, 'Must click to uncheck');
  assert.strictEqual(elementChecked, false, 'Checkbox is now unchecked');

  // Run 2: Already unchecked -> click skipped
  await executeClick(mockHandle, action, {});
  assert.strictEqual(clickCount, 1, 'Must skip click when already unchecked');
});

test('Checkbox Idempotency: Angular Material multi-select option with pseudo-checkbox', async () => {
  let clickCount = 0;
  let isSelected = false;

  const mockOptionEl = {
    tagName: 'MAT-OPTION',
    getAttribute: (k) => k === 'aria-selected' ? (isSelected ? 'true' : 'false') : null,
    classList: {
      contains: (cls) => cls === 'mat-mdc-option' || (isSelected && cls === 'mat-mdc-option-selected')
    },
    offsetWidth: 100,
    offsetHeight: 30,
    getClientRects: () => [{ width: 100, height: 30 }],
    closest: (sel) => sel.includes('mat-option') ? mockOptionEl : null,
    querySelector: (sel) => {
      if (sel.includes('.mat-pseudo-checkbox-checked')) {
        return isSelected ? { classList: { contains: () => true } } : null;
      }
      if (sel.includes('mat-pseudo-checkbox')) {
        return { classList: { contains: (c) => isSelected && c === 'mat-pseudo-checkbox-checked' } };
      }
      return null;
    }
  };

  const mockHandle = {
    evaluate: async (fn, ...args) => fn(mockOptionEl, ...args),
    evaluateHandle: async () => null,
    click: async () => {
      clickCount++;
      isSelected = true;
    }
  };

  const action = {
    type: 'CLICK',
    name: 'Florida Division Option Checkbox',
    isCheckbox: true,
    desiredState: true,
    target: { fingerprint: { tagName: 'mat-pseudo-checkbox', isCheckbox: true } }
  };

  // Run 1: Not selected -> click
  await executeClick(mockHandle, action, {});
  assert.strictEqual(clickCount, 1, 'Click executed to select option');

  // Run 2: Already selected -> skip
  await executeClick(mockHandle, action, {});
  assert.strictEqual(clickCount, 1, 'Option selection preserved without inversion on repeat');
});

// ============================================================================
// SUITE 2: Smart Interruption Recovery with Case Q
// ============================================================================
test('Case Q: Transparent backdrop (.cdk-overlay-transparent-backdrop) is strictly preserved', async () => {
  keyboardEscaped = false;
  const handler = new InterruptionHandler({ autoAcceptDialogs: true });

  const dom = createTestDOM([
    {
      tag: 'div',
      className: 'cdk-overlay-backdrop cdk-overlay-transparent-backdrop',
      style: { display: 'block', visibility: 'visible' }
    },
    {
      tag: 'div',
      className: 'cdk-overlay-pane',
      children: [{
        tag: 'div',
        role: 'listbox',
        children: [{ tag: 'mat-option', text: 'Option A' }]
      }]
    }
  ]);

  const page = dom.createPage();
  const dismissed = await handler.dismissBlockingOverlays(page, null);

  assert.strictEqual(dismissed, false, 'dismissBlockingOverlays must return false for transparent backdrop');
  assert.strictEqual(keyboardEscaped, false, 'Must NOT press Escape on transparent backdrop');

  const backdrop = dom.mockDoc.querySelector('.cdk-overlay-transparent-backdrop');
  assert.notStrictEqual(backdrop.style.pointerEvents, 'none', 'Transparent backdrop pointerEvents must NOT be disabled');
  assert.notStrictEqual(backdrop.style.display, 'none', 'Transparent backdrop display must NOT be set to none');
});

test('Case Q: Action targeting dropdown option protects transparent overlay from dismissal', async () => {
  const handler = new InterruptionHandler();

  const optionAction = {
    type: 'CLICK',
    name: 'Select Item 42',
    target: {
      fingerprint: { tagName: 'mat-option', role: 'option', text: 'Item 42' }
    }
  };

  assert.strictEqual(handler.isOptionOrDropdownAction(optionAction), true, 'Must identify action as dropdown option');

  const dom = createTestDOM([
    { tag: 'div', className: 'cdk-overlay-backdrop cdk-overlay-transparent-backdrop' }
  ]);
  const page = dom.createPage();

  const dismissed = await handler.dismissBlockingOverlays(page, optionAction);
  assert.strictEqual(dismissed, false, 'Option action must abort dismissBlockingOverlays immediately');
});

test('Smart Interruption: Blocking modal backdrop (.modal-backdrop / .cdk-overlay-dark-backdrop) is dismissed', async () => {
  const handler = new InterruptionHandler();

  const dom = createTestDOM([
    {
      tag: 'div',
      className: 'cdk-overlay-dark-backdrop',
      style: { display: 'block', visibility: 'visible' }
    },
    {
      tag: 'div',
      className: 'modal',
      children: [
        { tag: 'h2', text: 'Attention Required' },
        { tag: 'button', className: 'close', attributes: { 'aria-label': 'Close' }, text: '×' }
      ]
    }
  ]);

  const page = dom.createPage();
  const dismissed = await handler.dismissBlockingOverlays(page, null);

  assert.strictEqual(dismissed, true, 'Modal with close button must be dismissed');
  const closeBtn = dom.mockDoc.querySelector('button.close');
  assert.strictEqual(closeBtn.clicked, true, 'Close button was clicked');
});

test('Smart Interruption Co-existence: Dark modal is dismissed while transparent backdrop is unmolested', async () => {
  const handler = new InterruptionHandler();

  const dom = createTestDOM([
    {
      tag: 'div',
      className: 'cdk-overlay-backdrop cdk-overlay-transparent-backdrop',
      style: { display: 'block', visibility: 'visible' }
    },
    {
      tag: 'div',
      className: 'modal',
      children: [
        { tag: 'h3', text: 'Attention' },
        { tag: 'button', className: 'x', text: '×' }
      ]
    }
  ]);

  const page = dom.createPage();
  const dismissed = await handler.dismissBlockingOverlays(page, null);

  assert.strictEqual(dismissed, true, 'Modal popup must be dismissed');
  const crossBtn = dom.mockDoc.querySelector('button.x');
  assert.strictEqual(crossBtn.clicked, true, 'Popup close cross clicked');

  const transparentBackdrop = dom.mockDoc.querySelector('.cdk-overlay-transparent-backdrop');
  assert.notStrictEqual(transparentBackdrop.style.pointerEvents, 'none', 'Transparent backdrop must remain untouched');
});

// ============================================================================
// SUITE 3: Table Control Column Alignment
// ============================================================================
test('Table Alignment: Row with expander arrow, checkbox, and action button does not shift data columns', async () => {
  const runner = new LoopReplayRunner({ id: 'adv_table_align', name: 'Table Alignment Flow' });

  // Columns: [0: Checkbox, 1: Expander, 2: Invoice No, 3: Customer, 4: Due Date, 5: Amount, 6: Status, 7: Actions]
  const checkboxTd = {
    tagName: 'TD',
    innerText: '',
    textContent: '',
    classList: { contains: (c) => c === 'mat-column-select' },
    querySelector: (sel) => sel.includes('checkbox') ? { type: 'checkbox' } : null,
    querySelectorAll: () => []
  };

  const expanderTd = {
    tagName: 'TD',
    innerText: '▸',
    textContent: '▸',
    classList: { contains: (c) => c === 'dt-control' },
    querySelector: () => ({ innerText: '▸' }),
    querySelectorAll: () => []
  };

  const invTd = {
    tagName: 'TD',
    innerText: 'INV-7740',
    textContent: 'INV-7740',
    classList: { contains: () => false },
    querySelector: () => null,
    querySelectorAll: () => []
  };

  const custTd = {
    tagName: 'TD',
    innerText: 'Acme Logistics LLC',
    textContent: 'Acme Logistics LLC',
    classList: { contains: () => false },
    querySelector: () => null,
    querySelectorAll: () => []
  };

  const dueDateTd = {
    tagName: 'TD',
    innerText: '2026-11-15',
    textContent: '2026-11-15',
    classList: { contains: () => false },
    querySelector: () => null,
    querySelectorAll: () => []
  };

  const amountTd = {
    tagName: 'TD',
    innerText: '$4,250.00',
    textContent: '$4,250.00',
    classList: { contains: () => false },
    querySelector: () => null,
    querySelectorAll: () => []
  };

  const statusTd = {
    tagName: 'TD',
    innerText: 'Pending Approval',
    textContent: 'Pending Approval',
    classList: { contains: () => false },
    querySelector: () => null,
    querySelectorAll: () => []
  };

  const actionsTd = {
    tagName: 'TD',
    innerText: 'View Details',
    textContent: 'View Details',
    classList: { contains: () => false },
    querySelector: (s) => s.includes('button') ? { textContent: 'View Details' } : null,
    querySelectorAll: () => []
  };

  const cells = [checkboxTd, expanderTd, invTd, custTd, dueDateTd, amountTd, statusTd, actionsTd];

  const headerEls = [
    { innerText: '', textContent: '', querySelector: () => null },
    { innerText: '', textContent: '', querySelector: () => null },
    { innerText: 'Invoice No', textContent: 'Invoice No', querySelector: () => null },
    { innerText: 'Customer', textContent: 'Customer', querySelector: () => null },
    { innerText: 'Due Date', textContent: 'Due Date', querySelector: () => null },
    { innerText: 'Amount', textContent: 'Amount', querySelector: () => null },
    { innerText: 'Status', textContent: 'Status', querySelector: () => null },
    { innerText: 'Actions', textContent: 'Actions', querySelector: () => null }
  ];

  const tableContainer = {
    querySelector: (sel) => sel.includes('thead') || sel.includes('header') ? { querySelectorAll: () => headerEls } : null,
    querySelectorAll: () => headerEls
  };

  const mockRow = {
    tagName: 'TR',
    innerText: '▸ INV-7740 Acme Logistics LLC 2026-11-15 $4,250.00 Pending Approval View Details',
    textContent: '▸ INV-7740 Acme Logistics LLC 2026-11-15 $4,250.00 Pending Approval View Details',
    children: cells,
    querySelectorAll: (sel) => sel.includes('td') ? cells : [],
    querySelector: () => null,
    closest: () => tableContainer,
    parentElement: { closest: () => tableContainer }
  };

  const origGetItemHandle = ItemDiscovery.getItemHandle;
  ItemDiscovery.getItemHandle = async () => ({
    dispose: async () => {},
    asElement: () => ({ evaluate: async (fn) => fn(mockRow) })
  });

  const mockDiscovery = {
    items: [],
    collection: {
      headerColumns: ['Invoice No', 'Customer', 'Due Date', 'Amount', 'Status', 'Actions']
    }
  };

  try {
    // 1. Verify Invoice No matches INV-7740 and NOT expander '▸'
    const resInv = await runner.evaluateItemFilter({}, mockDiscovery, 0, {
      column: 'Invoice No',
      operator: 'equals',
      value: 'INV-7740'
    });
    assert.strictEqual(resInv.matches, true, 'Invoice No matches INV-7740');
    assert.strictEqual(resInv.actualValue, 'INV-7740', 'Actual value for Invoice No must be INV-7740, never ▸');

    // 2. Verify Due Date matches 2026-11-15 without shift into Customer or Amount
    const resDue = await runner.evaluateItemFilter({}, mockDiscovery, 0, {
      column: 'Due Date',
      operator: 'equals',
      value: '2026-11-15'
    });
    assert.strictEqual(resDue.matches, true, 'Due Date matches 2026-11-15');
    assert.strictEqual(resDue.actualValue, '2026-11-15', 'Due Date value aligned cleanly');

    // 3. Verify Amount matches $4,250.00
    const resAmount = await runner.evaluateItemFilter({}, mockDiscovery, 0, {
      column: 'Amount',
      operator: 'contains',
      value: '4,250'
    });
    assert.strictEqual(resAmount.matches, true, 'Amount matches $4,250.00');

    // 4. Verify Status matches Pending Approval
    const resStatus = await runner.evaluateItemFilter({}, mockDiscovery, 0, {
      column: 'Status',
      operator: 'contains',
      value: 'Pending'
    });
    assert.strictEqual(resStatus.matches, true, 'Status matches Pending Approval');
  } finally {
    ItemDiscovery.getItemHandle = origGetItemHandle;
  }
});

test('Table Alignment: Embedded inline unicode expander glyphs (▸, ▼, +, ›, ❯) are stripped from cell text', async () => {
  const runner = new LoopReplayRunner({ id: 'adv_inline_strip', name: 'Inline Glyph Flow' });

  const glyphVariants = [
    { raw: '▸ INV-3001', expected: 'INV-3001' },
    { raw: '▼ INV-3002', expected: 'INV-3002' },
    { raw: '+ INV-3003', expected: 'INV-3003' },
    { raw: '› INV-3004', expected: 'INV-3004' },
    { raw: '❯ INV-3005', expected: 'INV-3005' },
    { raw: '⮞ INV-3006', expected: 'INV-3006' }
  ];

  for (const item of glyphVariants) {
    const invTd = {
      tagName: 'TD',
      innerText: item.raw,
      textContent: item.raw,
      classList: { contains: () => false },
      querySelector: () => null,
      querySelectorAll: () => []
    };

    const headerEls = [{ innerText: 'Invoice No', textContent: 'Invoice No', querySelector: () => null }];
    const tableContainer = {
      querySelector: () => ({ querySelectorAll: () => headerEls }),
      querySelectorAll: () => headerEls
    };

    const mockRow = {
      tagName: 'TR',
      innerText: item.raw,
      textContent: item.raw,
      children: [invTd],
      querySelectorAll: () => [invTd],
      querySelector: () => null,
      closest: () => tableContainer,
      parentElement: { closest: () => tableContainer }
    };

    const origGet = ItemDiscovery.getItemHandle;
    ItemDiscovery.getItemHandle = async () => ({
      dispose: async () => {},
      asElement: () => ({ evaluate: async (fn) => fn(mockRow) })
    });

    try {
      const res = await runner.evaluateItemFilter({}, { collection: { headerColumns: ['Invoice No'] } }, 0, {
        column: 'Invoice No',
        operator: 'equals',
        value: item.expected
      });
      assert.strictEqual(res.matches, true, `Glyph in "${item.raw}" must be stripped to "${item.expected}"`);
    } finally {
      ItemDiscovery.getItemHandle = origGet;
    }
  }
});

// ============================================================================
// SUITE 4: Universal Date Parser & Compound Boolean Filter
// ============================================================================
test('Universal Date Parser: Normalizes ISO, US, EU, dash, dot, and boundary formats accurately', () => {
  // ISO formats
  assert.strictEqual(normalizeDateValue('2026-10-09', 'YYYY-MM-DD'), '2026-10-09');
  assert.strictEqual(normalizeDateValue('2026-10-09T14:45', 'YYYY-MM-DDTHH:mm'), '2026-10-09T14:45');
  assert.strictEqual(normalizeDateValue('2026-10-09', 'YYYY-MM'), '2026-10');

  // US format (MM/DD/YYYY)
  assert.strictEqual(normalizeDateValue('10/09/2026', 'YYYY-MM-DD'), '2026-10-09');
  assert.strictEqual(normalizeDateValue('12/25/2026', 'YYYY-MM-DD'), '2026-12-25');

  // EU format (DD/MM/YYYY)
  assert.strictEqual(normalizeDateValue('25/12/2026', 'YYYY-MM-DD'), '2026-12-25'); // Day > 12 detects DD
  assert.strictEqual(normalizeDateValue('09/10/2026', 'DD/MM/YYYY'), '09/10/2026');

  // Slash ISO
  assert.strictEqual(normalizeDateValue('2026/10/09', 'YYYY-MM-DD'), '2026-10-09');

  // Dash & dot layouts
  assert.strictEqual(normalizeDateValue('25-12-2026', 'YYYY-MM-DD'), '2026-12-25');
  assert.strictEqual(normalizeDateValue('15.08.2026', 'YYYY-MM-DD'), '2026-08-15');

  // Single digit day/month
  assert.strictEqual(normalizeDateValue('2026-1-5', 'YYYY-MM-DD'), '2026-01-05');
});

test('Universal Date Setter: Invokes prototype value setter and dispatches input/change/blur', async () => {
  let prototypeSetterCalled = false;
  let dispatchedEvents = [];

  class MockHTMLInputElement {
    constructor() {
      this._val = '';
    }
    get value() { return this._val; }
    set value(v) {
      prototypeSetterCalled = true;
      this._val = v;
    }
  }

  const mockInput = new MockHTMLInputElement();
  mockInput.tagName = 'INPUT';
  mockInput.type = 'date';
  mockInput.id = 'dueDate';
  mockInput.offsetWidth = 150;
  mockInput.offsetHeight = 30;
  mockInput.getClientRects = () => [{ width: 150, height: 30 }];
  mockInput.focus = () => {};
  mockInput.dispatchEvent = (evt) => { dispatchedEvents.push(evt.type); };

  const origWin = global.window;
  const origHTMLInput = global.HTMLInputElement;
  try {
    global.HTMLInputElement = MockHTMLInputElement;
    global.window = {
      HTMLInputElement: MockHTMLInputElement
    };

    const mockHandle = {
      focus: async () => {},
      evaluate: async (fn, ...args) => fn(mockInput, ...args)
    };

    const action = {
      type: 'TYPE',
      name: 'Due Date Field',
      value: '2026-11-20',
      target: { fingerprint: { type: 'date' } }
    };

    await executeType(mockHandle, action, {});

    assert.strictEqual(prototypeSetterCalled, true, 'HTMLInputElement prototype setter was invoked');
    assert.strictEqual(mockInput.value, '2026-11-20', 'Input received normalized ISO date string');
    assert.ok(dispatchedEvents.includes('input'), 'input event dispatched');
    assert.ok(dispatchedEvents.includes('change'), 'change event dispatched');
    assert.ok(dispatchedEvents.includes('blur'), 'blur event dispatched');
  } finally {
    global.window = origWin;
    global.HTMLInputElement = origHTMLInput;
  }
});

test('Compound Boolean Filter: matchMode=all (AND) with equals, contains, and dateBetween boundaries', () => {
  const filterConfig = normalizeItemFilter({
    matchMode: 'all',
    conditions: [
      { field: 'Type', operator: 'equals', value: 'Invoice' },
      { field: 'Status', operator: 'contains', value: 'Active' },
      { field: 'DueDate', operator: 'dateBetween', value: { from: '2026-06-01', to: '2026-06-30' } }
    ]
  });

  // 1. All match
  const res1 = evaluateItemFilter(filterConfig, {
    Type: 'Invoice',
    Status: 'Active Account',
    DueDate: '2026-06-15'
  });
  assert.strictEqual(res1.matches, true, 'Row matching all conditions passes');

  // 2. Boundary match: Exactly dateFrom
  const resFrom = evaluateItemFilter(filterConfig, {
    Type: 'Invoice',
    Status: 'Active',
    DueDate: '2026-06-01'
  });
  assert.strictEqual(resFrom.matches, true, 'Inclusive dateFrom boundary must match');

  // 3. Boundary match: Exactly dateTo
  const resTo = evaluateItemFilter(filterConfig, {
    Type: 'Invoice',
    Status: 'Active',
    DueDate: '2026-06-30'
  });
  assert.strictEqual(resTo.matches, true, 'Inclusive dateTo boundary must match');

  // 4. One day before dateFrom -> must fail
  const resBefore = evaluateItemFilter(filterConfig, {
    Type: 'Invoice',
    Status: 'Active',
    DueDate: '2026-05-31'
  });
  assert.strictEqual(resBefore.matches, false, 'Date before range must not match');

  // 5. One day after dateTo -> must fail
  const resAfter = evaluateItemFilter(filterConfig, {
    Type: 'Invoice',
    Status: 'Active',
    DueDate: '2026-07-01'
  });
  assert.strictEqual(resAfter.matches, false, 'Date after range must not match');

  // 6. Type mismatch -> must fail
  const resTypeMismatch = evaluateItemFilter(filterConfig, {
    Type: 'Credit Memo',
    Status: 'Active',
    DueDate: '2026-06-15'
  });
  assert.strictEqual(resTypeMismatch.matches, false, 'Type mismatch must fail AND filter');
});

test('Compound Boolean Filter: matchMode=any (OR) matches if at least one condition holds', () => {
  const filterConfig = normalizeItemFilter({
    matchMode: 'any',
    conditions: [
      { field: 'Category', operator: 'equals', value: 'Urgent' },
      { field: 'Priority', operator: 'equals', value: 'High' }
    ]
  });

  const res1 = evaluateItemFilter(filterConfig, { Category: 'Normal', Priority: 'High' });
  assert.strictEqual(res1.matches, true, 'Matches second condition in OR');

  const res2 = evaluateItemFilter(filterConfig, { Category: 'Urgent', Priority: 'Low' });
  assert.strictEqual(res2.matches, true, 'Matches first condition in OR');

  const res3 = evaluateItemFilter(filterConfig, { Category: 'Normal', Priority: 'Low' });
  assert.strictEqual(res3.matches, false, 'Fails when neither condition matches in OR');
});

test('Compound Boolean Filter: Prototype pollution resistance', () => {
  const maliciousInput = JSON.parse('{"__proto__": {"polluted": true}, "conditions": [{"field": "Name", "operator": "equals", "value": "Test"}]}');
  const normalized = normalizeItemFilter(maliciousInput);

  assert.strictEqual(Object.prototype.polluted, undefined, 'Prototype must NOT be polluted');
  assert.strictEqual(normalized.conditions.length, 1);
});

// ============================================================================
// SUITE 5: Multi-Tab Manager
// ============================================================================
test('Multi-Tab Manager: Configures CDP download behavior on new secondary tabs', async () => {
  const tabManager = new TabManager({ downloadsDir: 'C:\\FlowMind\\Downloads' });

  let cdpCommands = [];
  const mockTarget = {
    type: () => 'page',
    page: async () => ({
      url: () => 'https://portal.flowmind.test/export',
      isClosed: () => false
    }),
    createCDPSession: async () => ({
      send: async (cmd, params) => {
        cdpCommands.push({ cmd, params });
      },
      detach: async () => {}
    })
  };

  const browserListeners = {};
  const mockBrowser = {
    pages: async () => [],
    on: (evt, fn) => { browserListeners[evt] = fn; },
    off: (evt, fn) => { delete browserListeners[evt]; }
  };

  await tabManager.initialize(mockBrowser, null);
  await browserListeners['targetcreated'](mockTarget);

  const downloadCmd = cdpCommands.find(c => c.cmd === 'Page.setDownloadBehavior');
  assert.ok(downloadCmd, 'CDP command Page.setDownloadBehavior must be dispatched');
  assert.strictEqual(downloadCmd.params.behavior, 'allow');
  assert.strictEqual(downloadCmd.params.downloadPath, 'C:\\FlowMind\\Downloads');
});

test('Multi-Tab Manager: Cleans up auxiliary tabs while protecting primary portal and dashboard tabs', async () => {
  const tabManager = new TabManager();

  const closedTabs = [];
  function createPage(url, id) {
    let closed = false;
    return {
      _id: id,
      url: () => url,
      isClosed: () => closed,
      close: async () => {
        closed = true;
        closedTabs.push(url);
      },
      bringToFront: async () => {},
      evaluate: async () => true,
      target: () => ({ _targetId: id, url: () => url })
    };
  }

  const primaryPortalTab = createPage('https://erp.company.com/#/invoices', 'primary_tab');
  const dashboardTab = createPage('http://localhost:3000/dashboard', 'dash_tab');
  const userGithubTab = createPage('https://github.com/company/repo', 'user_tab');
  const auxiliaryViewerTab = createPage('https://erp.company.com/viewer/7f91823a-e01b-4112-9c31-891029384756', 'guid_aux');
  const auxiliaryBlobTab = createPage('blob:https://erp.company.com/d928374a', 'blob_aux');

  const mockBrowser = {
    pages: async () => [primaryPortalTab, dashboardTab, userGithubTab, auxiliaryViewerTab, auxiliaryBlobTab],
    on: () => {},
    off: () => {}
  };

  await tabManager.initialize(mockBrowser, primaryPortalTab, { targetUrl: 'https://erp.company.com/#/invoices' });

  // Verify initial classification
  assert.strictEqual(tabManager.getPrimaryPage(), primaryPortalTab, 'Primary page accurately resolved');
  assert.ok(tabManager.protectedPageIds.has('primary_tab'), 'Primary portal is protected');
  assert.ok(tabManager.protectedPageIds.has('dash_tab'), 'Dashboard is protected');
  assert.ok(tabManager.protectedPageIds.has('user_tab'), 'User pre-existing tab is protected');

  // Perform cleanup of auxiliary tabs
  await tabManager.cleanupAuxiliaryTabs();

  // Verify auxiliary tabs are closed
  assert.strictEqual(auxiliaryViewerTab.isClosed(), true, 'GUID viewer auxiliary tab was closed');
  assert.strictEqual(auxiliaryBlobTab.isClosed(), true, 'Blob auxiliary tab was closed');

  // Verify protected tabs are completely intact
  assert.strictEqual(primaryPortalTab.isClosed(), false, 'Primary portal tab MUST NEVER be closed');
  assert.strictEqual(dashboardTab.isClosed(), false, 'Dashboard tab MUST NEVER be closed');
  assert.strictEqual(userGithubTab.isClosed(), false, 'User pre-existing tab MUST NEVER be closed');
});

test('Multi-Tab Manager: Duplicate primary tab is closed and focus returned', async () => {
  const tabManager = new TabManager();

  let dupClosed = false;
  let primaryFocused = false;

  const primaryPage = {
    _id: 'p1',
    url: () => 'https://erp.company.com/#/invoices',
    isClosed: () => false,
    bringToFront: async () => { primaryFocused = true; },
    evaluate: async () => true,
    target: () => ({ _targetId: 'p1' })
  };

  const duplicatePage = {
    _id: 'dup1',
    url: () => 'https://erp.company.com/#/invoices',
    isClosed: () => dupClosed,
    close: async () => { dupClosed = true; },
    bringToFront: async () => {},
    evaluate: async () => true,
    target: () => ({ _targetId: 'dup1' })
  };

  const browserListeners = {};
  const mockBrowser = {
    pages: async () => [primaryPage],
    on: (evt, fn) => { browserListeners[evt] = fn; },
    off: () => {}
  };

  await tabManager.initialize(mockBrowser, primaryPage, { targetUrl: 'https://erp.company.com/#/invoices' });

  // Simulate new duplicate target created
  await browserListeners['targetcreated']({
    type: () => 'page',
    page: async () => duplicatePage
  });

  assert.strictEqual(dupClosed, true, 'Duplicate portal tab must be closed');
  assert.strictEqual(primaryFocused, true, 'Primary portal page must be brought to front');
});
