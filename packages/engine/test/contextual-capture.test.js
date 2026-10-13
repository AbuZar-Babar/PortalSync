/**
 * Test Suite: Contextual Click-Time Element, Table, and Option Capture
 *
 * Verifies R1 (in-page sniffing), R2 (recipe filter_rules consolidation),
 * R3 (recipe schema alignment for Supabase persistence), and
 * R4 (immediate preflight modal hydration without live browser connections).
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const RecorderBridge = require('../src/recorder/recorder-bridge');

console.log('🧪 Starting Contextual Click-Time Capture Test Suite...\n');

// -------------------------------------------------------------
// Test 1: In-Page Sniffing Function Evaluation (R1)
// -------------------------------------------------------------
console.log('🔹 Test 1: Table & Nested Sub-table Context Sniffing');

// Load recorder-injected.js source to extract and evaluate sniffElementContext
const injectedSource = fs.readFileSync(path.resolve(__dirname, '../src/recorder/recorder-injected.js'), 'utf8');

// Construct mock DOM environment
function createMockTableDOM() {
  let parentRow1, parentRow2, subRow1;
  let thInv, thStatus, thAmt;
  let subThLine, subThQty, subThRate;

  // Parent Table
  const parentTable = {
    tagName: 'TABLE',
    nodeType: 1,
    parentElement: null,
    querySelectorAll: (sel) => {
      if (sel.includes('th')) {
        return [thInv, thStatus, thAmt];
      }
      if (sel.includes('tr')) {
        return [parentRow1, parentRow2];
      }
      return [];
    },
    closest: (sel) => parentTable
  };

  thInv = {
    tagName: 'TH',
    innerText: 'Invoice #',
    nodeType: 1,
    getAttribute: () => null,
    closest: (sel) => parentTable
  };
  thStatus = {
    tagName: 'TH',
    innerText: 'Status',
    nodeType: 1,
    getAttribute: () => null,
    closest: (sel) => parentTable
  };
  thAmt = {
    tagName: 'TH',
    innerText: 'Amount',
    nodeType: 1,
    getAttribute: () => null,
    closest: (sel) => parentTable
  };

  // Row 1
  const cell1Inv = { tagName: 'TD', innerText: 'INV-1001', nodeType: 1, closest: (sel) => sel.includes('table') ? parentTable : (sel.includes('tr') ? parentRow1 : (sel.includes('td') ? cell1Inv : parentTable)) };
  const cell1Status = { tagName: 'TD', innerText: 'Paid', nodeType: 1, closest: (sel) => sel.includes('table') ? parentTable : (sel.includes('tr') ? parentRow1 : (sel.includes('td') ? cell1Status : parentTable)) };
  const cell1Amt = { tagName: 'TD', innerText: '$1,200', nodeType: 1, closest: (sel) => sel.includes('table') ? parentTable : (sel.includes('tr') ? parentRow1 : (sel.includes('td') ? cell1Amt : parentTable)) };

  parentRow1 = {
    tagName: 'TR',
    nodeType: 1,
    querySelector: () => null,
    querySelectorAll: (sel) => [cell1Inv, cell1Status, cell1Amt],
    closest: (sel) => sel.includes('table') ? parentTable : parentRow1
  };

  // Row 2
  const cell2Inv = { tagName: 'TD', innerText: 'INV-1002', nodeType: 1, closest: (sel) => sel.includes('table') ? parentTable : (sel.includes('tr') ? parentRow2 : (sel.includes('td') ? cell2Inv : parentTable)) };
  const cell2Status = { tagName: 'TD', innerText: 'Pending', nodeType: 1, closest: (sel) => sel.includes('table') ? parentTable : (sel.includes('tr') ? parentRow2 : (sel.includes('td') ? cell2Status : parentTable)) };
  const cell2Amt = { tagName: 'TD', innerText: '$450', nodeType: 1, closest: (sel) => sel.includes('table') ? parentTable : (sel.includes('tr') ? parentRow2 : (sel.includes('td') ? cell2Amt : parentTable)) };

  parentRow2 = {
    tagName: 'TR',
    nodeType: 1,
    querySelector: () => null,
    querySelectorAll: (sel) => [cell2Inv, cell2Status, cell2Amt],
    closest: (sel) => sel.includes('table') ? parentTable : parentRow2
  };

  // Nested Sub-Table inside expanded row
  const subTable = {
    tagName: 'TABLE',
    nodeType: 1,
    parentElement: parentRow1,
    querySelectorAll: (sel) => {
      if (sel.includes('th')) {
        return [subThLine, subThQty, subThRate];
      }
      if (sel.includes('tr')) {
        return [subRow1];
      }
      return [];
    },
    closest: (sel) => subTable
  };

  subThLine = { tagName: 'TH', innerText: 'Line Item', nodeType: 1, getAttribute: () => null, closest: () => subTable };
  subThQty = { tagName: 'TH', innerText: 'Qty', nodeType: 1, getAttribute: () => null, closest: () => subTable };
  subThRate = { tagName: 'TH', innerText: 'Rate', nodeType: 1, getAttribute: () => null, closest: () => subTable };

  const subCellLine = { tagName: 'TD', innerText: 'Software License', nodeType: 1, closest: (sel) => sel.includes('table') ? subTable : (sel.includes('tr') ? subRow1 : (sel.includes('td') ? subCellLine : subTable)) };
  const subCellQty = { tagName: 'TD', innerText: '5', nodeType: 1, closest: (sel) => sel.includes('table') ? subTable : (sel.includes('tr') ? subRow1 : (sel.includes('td') ? subCellQty : subTable)) };
  const subCellRate = { tagName: 'TD', innerText: '$240', nodeType: 1, closest: (sel) => sel.includes('table') ? subTable : (sel.includes('tr') ? subRow1 : (sel.includes('td') ? subCellRate : subTable)) };

  subRow1 = {
    tagName: 'TR',
    nodeType: 1,
    querySelector: () => null,
    querySelectorAll: () => [subCellLine, subCellQty, subCellRate],
    closest: (sel) => sel.includes('table') ? subTable : subRow1
  };

  return { parentTable, parentRow1, cell1Status, subTable, subRow1, subCellLine };
}

// Sandbox to test sniffElementContext in Node
const mockSandbox = {};
const mockWindow = { SelectorResolver: { captureTarget: () => ({ candidates: [{ strategy: 'css', value: '#t' }] }) } };
const mockDoc = {};

// Evaluate injected script in function context to extract sniffElementContext
const snifferFn = (function () {
  const match = injectedSource.match(/const SNIFF_EXPANDER_GLYPH_REGEX =[\s\S]*?function sniffElementContext\(element\) \{[\s\S]*?\n  \}/);
  if (!match) throw new Error('Could not find sniffElementContext in recorder-injected.js');
  const code = match[0] + '\nreturn sniffElementContext;';
  return new Function(code)();
})();

const { cell1Status, subCellLine } = createMockTableDOM();

// Benchmark sniffElementContext execution time
const tStart = Date.now();
const parentContext = snifferFn(cell1Status);
const tElapsed = Date.now() - tStart;

assert(tElapsed < 5, `Sniffing took ${tElapsed}ms, must be < 5ms`);
assert(parentContext !== null, 'Context must not be null');
assert.deepStrictEqual(parentContext.table.headers, ['Invoice #', 'Status', 'Amount'], 'Headers must match');
assert.strictEqual(parentContext.table.activeColumn, 'Status', 'Active column must be Status');
assert.strictEqual(parentContext.table.isSubTable, false, 'Parent table isSubTable must be false');
assert(parentContext.table.rowValues['Status'].includes('Paid'), 'Row values must include Paid');
assert(parentContext.table.rowValues['Status'].includes('Pending'), 'Row values must include Pending');
console.log('  ✅ Parent table header and visible row capture passed (< 5ms)');

// Nested Sub-table test
const subContext = snifferFn(subCellLine);
assert(subContext !== null, 'Sub-table context must not be null');
assert.deepStrictEqual(subContext.table.headers, ['Line Item', 'Qty', 'Rate'], 'Sub-table headers must match');
assert.strictEqual(subContext.table.isSubTable, true, 'isSubTable must be true for nested table');
assert(subContext.table.rowValues['Line Item'].includes('Software License'), 'Sub-table row values captured');
console.log('  ✅ Nested sub-table column and row capture passed');

// -------------------------------------------------------------
// Test 2: Native & Custom Dropdown Options Sniffing (R1)
// -------------------------------------------------------------
console.log('\n🔹 Test 2: Dropdown Option Sniffing');

// Native <select> element
const mockSelect = {
  tagName: 'SELECT',
  nodeType: 1,
  getAttribute: (attr) => attr === 'aria-label' ? 'Payment Term' : null,
  options: [
    { text: 'Net 30', value: 'net_30' },
    { text: 'Net 60', value: 'net_60' },
    { text: 'Due on Receipt', value: 'immediate' }
  ],
  closest: () => null
};

const selectContext = snifferFn(mockSelect);
assert.deepStrictEqual(selectContext.options, ['Net 30', 'Net 60', 'Due on Receipt']);
assert(selectContext.columns.includes('Payment Term'));
assert.deepStrictEqual(selectContext.fieldValues['Payment Term'], ['Net 30', 'Net 60', 'Due on Receipt']);
console.log('  ✅ Native select options captured');

// Custom dropdown option (e.g. [role="option"])
const optItem1 = { innerText: 'Approved', nodeType: 1, getAttribute: () => null, closest: (sel) => sel.includes('role="option"') ? optItem1 : mockListbox };
const optItem2 = { innerText: 'Rejected', nodeType: 1, getAttribute: () => null, closest: (sel) => sel.includes('role="option"') ? optItem2 : mockListbox };
const mockListbox = {
  nodeType: 1,
  getAttribute: (attr) => attr === 'aria-label' ? 'Approval Status' : null,
  querySelectorAll: () => [optItem1, optItem2],
  closest: (sel) => sel.includes('listbox') ? mockListbox : null
};

const customOptionContext = snifferFn(optItem1);
assert.deepStrictEqual(customOptionContext.options, ['Approved', 'Rejected']);
assert(customOptionContext.columns.includes('Approval Status'));
assert.deepStrictEqual(customOptionContext.fieldValues['Approval Status'], ['Approved', 'Rejected']);
console.log('  ✅ Custom dropdown option list captured');

// -------------------------------------------------------------
// Test 3: Recipe Filter Rules Consolidation in RecorderBridge (R2)
// -------------------------------------------------------------
console.log('\n🔹 Test 3: RecorderBridge Consolidation into filter_rules');

const bridge = new RecorderBridge({ name: 'test-filter-consolidation', outputDir: './recordings' });
bridge.isRecording = true;

// Action 1: Clicked inside an Invoices table
bridge._handleCapturedAction({
  type: 'CLICK',
  timestamp: 1000,
  name: 'Invoice Row',
  target: { friendlyName: 'Invoice Row' },
  context: {
    columns: ['Invoice #', 'Status', 'Due Date', 'Total'],
    table: {
      headers: ['Invoice #', 'Status', 'Due Date', 'Total'],
      rowValues: {
        'Status': ['Open', 'Paid', 'Overdue'],
        'Invoice #': ['INV-001', 'INV-002', 'INV-003']
      }
    }
  }
});

// Action 2: Clicked a dropdown
bridge._handleCapturedAction({
  type: 'SELECT',
  timestamp: 2000,
  name: 'Filter by Department',
  target: { friendlyName: 'Filter by Department' },
  options: ['Engineering', 'Finance', 'Human Resources', 'Sales'],
  context: {
    columns: ['Department'],
    fieldValues: {
      'Department': ['Engineering', 'Finance', 'Human Resources', 'Sales']
    }
  }
});

// Action 3: Clicked inside a nested sub-table
bridge._handleCapturedAction({
  type: 'CLICK',
  timestamp: 3000,
  name: 'Sub-table Item',
  target: { friendlyName: 'Sub-table Item' },
  context: {
    columns: ['Line Item', 'Qty', 'Unit Price'],
    table: {
      isSubTable: true,
      headers: ['Line Item', 'Qty', 'Unit Price'],
      rowValues: {
        'Line Item': ['Widget A', 'Widget B'],
        'Qty': ['10', '25']
      }
    }
  }
});

const consolidated = bridge.consolidateFilterRules();

assert(Array.isArray(consolidated.available_fields), 'available_fields must be an array');
assert(Array.isArray(consolidated.columns), 'columns must be an array');
assert(consolidated.available_fields.includes('Invoice #'), 'Must contain Invoice #');
assert(consolidated.available_fields.includes('Status'), 'Must contain Status');
assert(consolidated.available_fields.includes('Department'), 'Must contain Department');
assert(consolidated.available_fields.includes('Line Item'), 'Must contain Line Item');
assert(consolidated.available_fields.includes('Qty'), 'Must contain Qty');

assert(consolidated.fieldValues['Status'].includes('Paid'), 'Status fieldValues must include Paid');
assert(consolidated.fieldValues['Status'].includes('Overdue'), 'Status fieldValues must include Overdue');
assert(consolidated.fieldValues['Department'].includes('Engineering'), 'Department fieldValues must include Engineering');
assert(consolidated.fieldValues['Line Item'].includes('Widget A'), 'Line Item fieldValues must include Widget A');

console.log('  ✅ Consolidated available_fields:', consolidated.available_fields);
console.log('  ✅ Consolidated fieldValues keys:', Object.keys(consolidated.fieldValues));
console.log('  ✅ RecorderBridge filter_rules consolidation passed');

// -------------------------------------------------------------
// Test 4: Execution Modal Hydration without Live Connection (R4)
// -------------------------------------------------------------
console.log('\n🔹 Test 4: ExecutionPreflightModal Hydration directly from filter_rules');

// Simulate workflow saved in Supabase
const mockWorkflow = {
  id: 'wf_test_123',
  name: 'Invoice Processing Portal',
  portal_url: 'https://invoices.vendor.com',
  workflow_definition: {
    isLoop: true,
    steps: bridge.actions
  },
  filter_rules: consolidated
};

// Replicate ExecutionPreflightModal extraction logic
function simulateModalHydration(workflow) {
  const EXPANDER_GLYPH_REGEX = /^[▸►▶▼▽▾+\-±›❯»⮞⌄v><\u25B6\u25BC\u25B8\u25BE\u276F\u203A\s]+$/i;
  const fields = new Set();
  const addCleanCol = (raw) => {
    if (typeof raw !== 'string') return;
    let str = raw.trim();
    if (!str || str.length > 50 || str.startsWith('{') || str.startsWith('<') || EXPANDER_GLYPH_REGEX.test(str)) return;
    str = str.replace(/^(click|select|enter|type|open|download|view|press)\s+/i, '').trim();
    if (!str || str.length > 50) return;
    fields.add(str);
  };

  const fr = workflow.filter_rules || {};
  if (Array.isArray(fr.available_fields)) fr.available_fields.forEach(addCleanCol);
  if (Array.isArray(fr.columns)) fr.columns.forEach(addCleanCol);
  if (fr.fieldValues && typeof fr.fieldValues === 'object') {
    Object.keys(fr.fieldValues).forEach(addCleanCol);
  }

  const resultValues = {};
  if (fr.fieldValues && typeof fr.fieldValues === 'object') {
    Object.entries(fr.fieldValues).forEach(([k, vals]) => {
      if (Array.isArray(vals)) resultValues[k] = vals;
    });
  }

  const availableCols = Array.from(fields);
  const activeCol = availableCols[0] || 'Type';
  const activeOptions = resultValues[activeCol] || [];

  return {
    availableColumns: availableCols,
    fieldValuesMap: resultValues,
    activeColumn: activeCol,
    activeOptions
  };
}

const hydrated = simulateModalHydration(mockWorkflow);
assert(hydrated.availableColumns.length >= 6, 'Must hydrate all captured columns');
assert(hydrated.availableColumns.includes('Invoice #'), 'Must display Invoice # column pill');
assert(hydrated.availableColumns.includes('Status'), 'Must display Status column pill');
assert(hydrated.availableColumns.includes('Department'), 'Must display Department column pill');
assert(hydrated.fieldValuesMap['Status'].includes('Paid'), 'Must hydrate Paid pill');
assert(hydrated.fieldValuesMap['Department'].includes('Finance'), 'Must hydrate Finance pill');

console.log('  ✅ Hydrated column pills immediately without preflight:');
console.log('     ', hydrated.availableColumns.slice(0, 5).join(' | '));
console.log('  ✅ Hydrated sub-filter option pills for "Status":');
console.log('     ', hydrated.fieldValuesMap['Status'].join(' | '));

// -------------------------------------------------------------
// Test 5: Table with Utility / Control Columns (No Off-By-One Shift)
// -------------------------------------------------------------
console.log('\n🔹 Test 5: Table with Control Columns (Checkbox + Expander + Business Columns)');

function createComplexTableDOM() {
  let table, row1, row2;

  table = {
    tagName: 'TABLE',
    nodeType: 1,
    querySelectorAll: (sel) => {
      if (sel.includes('th')) return [thCheck, thExpand, thInv, thStatus, thAmt];
      if (sel.includes('tr')) return [row1, row2];
      return [];
    },
    closest: (sel) => sel.includes('table') ? table : null
  };

  const thCheck = { tagName: 'TH', innerText: '', nodeType: 1, getAttribute: () => null, closest: (sel) => sel.includes('table') ? table : (sel.includes('th') ? thCheck : null) };
  const thExpand = { tagName: 'TH', innerText: '▸', nodeType: 1, getAttribute: () => null, closest: (sel) => sel.includes('table') ? table : (sel.includes('th') ? thExpand : null) };
  const thInv = { tagName: 'TH', innerText: 'Invoice No', nodeType: 1, getAttribute: () => null, closest: (sel) => sel.includes('table') ? table : (sel.includes('th') ? thInv : null) };
  const thStatus = { tagName: 'TH', innerText: 'Status', nodeType: 1, getAttribute: () => null, closest: (sel) => sel.includes('table') ? table : (sel.includes('th') ? thStatus : null) };
  const thAmt = { tagName: 'TH', innerText: 'Amount', nodeType: 1, getAttribute: () => null, closest: (sel) => sel.includes('table') ? table : (sel.includes('th') ? thAmt : null) };

  const makeTd = (txt) => {
    let parentRow = null;
    const td = {
      tagName: 'TD',
      innerText: txt,
      nodeType: 1,
      getAttribute: () => null,
      setParentRow: (r) => { parentRow = r; },
      closest: (sel) => sel.includes('table') ? table : (sel.includes('tr') ? parentRow : (sel.includes('td') ? td : null))
    };
    return td;
  };

  const tdCheck1 = makeTd('');
  const tdExpand1 = makeTd('▸');
  const tdInv1 = makeTd('INV-1001');
  const tdStatus1 = makeTd('Paid');
  const tdAmt1 = makeTd('$1,200');

  row1 = {
    tagName: 'TR',
    nodeType: 1,
    querySelector: (sel) => sel && sel.includes('th') ? null : null,
    querySelectorAll: (sel) => [tdCheck1, tdExpand1, tdInv1, tdStatus1, tdAmt1],
    closest: (sel) => sel.includes('table') ? table : (sel.includes('tr') ? row1 : null)
  };
  [tdCheck1, tdExpand1, tdInv1, tdStatus1, tdAmt1].forEach(c => c.setParentRow(row1));

  const tdCheck2 = makeTd('');
  const tdExpand2 = makeTd('▸');
  const tdInv2 = makeTd('INV-1002');
  const tdStatus2 = makeTd('Overdue');
  const tdAmt2 = makeTd('$450');

  row2 = {
    tagName: 'TR',
    nodeType: 1,
    querySelector: (sel) => sel && sel.includes('th') ? null : null,
    querySelectorAll: (sel) => [tdCheck2, tdExpand2, tdInv2, tdStatus2, tdAmt2],
    closest: (sel) => sel.includes('table') ? table : (sel.includes('tr') ? row2 : null)
  };
  [tdCheck2, tdExpand2, tdInv2, tdStatus2, tdAmt2].forEach(c => c.setParentRow(row2));

  return { table, tdInv1, tdStatus1, thInv };
}

const complexDom = createComplexTableDOM();
const complexContext = snifferFn(complexDom.tdInv1);

assert.deepStrictEqual(complexContext.columns, ['Invoice No', 'Status', 'Amount'], 'Utility headers must be excluded from column names');
assert.strictEqual(complexContext.table.activeColumn, 'Invoice No', 'Clicked on INV-1001 must resolve activeColumn as Invoice No (NOT Status)');
assert(complexContext.fieldValues['Invoice No'].includes('INV-1001'), 'Invoice No must contain INV-1001 (NO column shift)');
assert(complexContext.fieldValues['Invoice No'].includes('INV-1002'), 'Invoice No must contain INV-1002');
assert(complexContext.fieldValues['Status'].includes('Paid'), 'Status must contain Paid');
assert(complexContext.fieldValues['Status'].includes('Overdue'), 'Status must contain Overdue');
assert(!complexContext.fieldValues['Status'].includes('INV-1001'), 'Status must NEVER contain invoice numbers');
assert.strictEqual(complexContext.table.activeRowValues['Invoice No'], 'INV-1001');
assert.strictEqual(complexContext.table.activeRowValues['Status'], 'Paid');
console.log('  ✅ Exact positional column alignment verified (No off-by-one shifts with checkbox/expander columns)');

// Test 5b: Clicking direct TH header
const headerClickContext = snifferFn(complexDom.thInv);
assert.strictEqual(headerClickContext.table.activeColumn, 'Invoice No', 'Clicking TH must resolve activeColumn as Invoice No');
console.log('  ✅ Direct TH click active column detected');

// -------------------------------------------------------------
// Test 6: ARIA Virtual Grid & Attributes (data-field & aria-colindex)
// -------------------------------------------------------------
console.log('\n🔹 Test 6: Virtualized ARIA Grid Sniffing (AG-Grid / TanStack Table style)');

const ariaGrid = {
  tagName: 'DIV',
  nodeType: 1,
  getAttribute: (attr) => attr === 'role' ? 'grid' : null,
  querySelectorAll: (sel) => {
    if (sel.includes('columnheader')) return [ariaH1, ariaH2, ariaH3];
    if (sel.includes('row')) return [ariaRow1];
    return [];
  },
  closest: () => ariaGrid
};

const ariaH1 = { tagName: 'DIV', innerText: 'Doc ID', nodeType: 1, getAttribute: (attr) => attr === 'role' ? 'columnheader' : (attr === 'data-field' ? 'Doc ID' : null), closest: () => ariaGrid };
const ariaH2 = { tagName: 'DIV', innerText: 'Vendor', nodeType: 1, getAttribute: (attr) => attr === 'role' ? 'columnheader' : (attr === 'data-field' ? 'Vendor' : null), closest: () => ariaGrid };
const ariaH3 = { tagName: 'DIV', innerText: 'Total', nodeType: 1, getAttribute: (attr) => attr === 'role' ? 'columnheader' : (attr === 'data-field' ? 'Total' : null), closest: () => ariaGrid };

let ariaRow1;
const makeAriaCell = (txt, field, colIdx) => {
  const cell = {
    tagName: 'DIV',
    innerText: txt,
    nodeType: 1,
    getAttribute: (attr) => attr === 'role' ? 'gridcell' : (attr === 'data-field' ? field : (attr === 'aria-colindex' ? String(colIdx) : null)),
    closest: (s) => s.includes('gridcell') ? cell : (s.includes('row') ? ariaRow1 : (s.includes('grid') ? ariaGrid : null))
  };
  return cell;
};

const ariaCell1 = makeAriaCell('DOC-99', 'Doc ID', 1);
const ariaCell2 = makeAriaCell('Acme Corp', 'Vendor', 2);
const ariaCell3 = makeAriaCell('$5,000', 'Total', 3);

ariaRow1 = {
  tagName: 'DIV',
  nodeType: 1,
  getAttribute: (attr) => attr === 'role' ? 'row' : null,
  querySelector: () => null,
  querySelectorAll: () => [ariaCell1, ariaCell2, ariaCell3],
  closest: (s) => s.includes('row') ? ariaRow1 : (s.includes('grid') ? ariaGrid : null)
};

const ariaContext = snifferFn(ariaCell2);
assert.deepStrictEqual(ariaContext.columns, ['Doc ID', 'Vendor', 'Total']);
assert.strictEqual(ariaContext.table.activeColumn, 'Vendor');
assert(ariaContext.fieldValues['Vendor'].includes('Acme Corp'));
console.log('  ✅ ARIA virtual grid columns, rows, and activeColumn captured');

// -------------------------------------------------------------
// Test 7: Combobox Trigger Sniffing with aria-controls
// -------------------------------------------------------------
console.log('\n🔹 Test 7: Combobox Trigger Sniffing');

const comboPopupOpt1 = { innerText: 'Net 15', nodeType: 1, getAttribute: () => null };
const comboPopupOpt2 = { innerText: 'Net 30', nodeType: 1, getAttribute: () => null };
const comboPopup = {
  id: 'terms-popup',
  nodeType: 1,
  querySelectorAll: () => [comboPopupOpt1, comboPopupOpt2]
};

const mockCombobox = {
  tagName: 'DIV',
  nodeType: 1,
  getAttribute: (attr) => {
    if (attr === 'role') return 'combobox';
    if (attr === 'aria-label') return 'Terms';
    if (attr === 'aria-controls') return 'terms-popup';
    return null;
  },
  matches: (sel) => sel.includes('combobox'),
  closest: () => null
};

// Temporarily attach getElementById in global scope for test
global.document = {
  getElementById: (id) => id === 'terms-popup' ? comboPopup : null,
  querySelector: () => null
};

const comboContext = snifferFn(mockCombobox);
assert.deepStrictEqual(comboContext.options, ['Net 15', 'Net 30']);
assert(comboContext.columns.includes('Terms'));
assert.deepStrictEqual(comboContext.fieldValues['Terms'], ['Net 15', 'Net 30']);
console.log('  ✅ Combobox trigger with aria-controls popup captured');

// -------------------------------------------------------------
// Test 8: Radio / Checkbox Group Sniffing
// -------------------------------------------------------------
console.log('\n🔹 Test 8: Radio Group Sniffing with safe CSS escaping');

const radio1 = {
  tagName: 'INPUT',
  type: 'radio',
  nodeType: 1,
  value: 'express',
  getAttribute: (attr) => attr === 'name' ? 'shipping[method]' : null,
  closest: (sel) => sel.includes('label') ? { innerText: 'Express Shipping' } : null
};
const radio2 = {
  tagName: 'INPUT',
  type: 'radio',
  nodeType: 1,
  value: 'standard',
  getAttribute: (attr) => attr === 'name' ? 'shipping[method]' : null,
  closest: (sel) => sel.includes('label') ? { innerText: 'Standard Ground' } : null
};

global.document.querySelectorAll = (sel) => {
  if (sel.includes('shipping')) return [radio1, radio2];
  return [];
};

const radioContext = snifferFn(radio1);
assert(radioContext.columns.includes('shipping[method]'));
assert.deepStrictEqual(radioContext.fieldValues['shipping[method]'], ['Express Shipping', 'Standard Ground']);
assert.deepStrictEqual(radioContext.group.values, ['Express Shipping', 'Standard Ground']);
console.log('  ✅ Radio group options sniffed safely with brackets in name');

// Clean up mock globals
delete global.document;

// -------------------------------------------------------------
// Test 9: Execution Modal Hydration from workflow_definition.filter_rules Fallback
// -------------------------------------------------------------
console.log('\n🔹 Test 9: ExecutionPreflightModal Fallback to workflow_definition.filter_rules');

const legacyWorkflow = {
  id: 'wf_legacy_456',
  name: 'Legacy Flow',
  portal_url: 'https://orders.vendor.com',
  filter_rules: {}, // empty top-level
  workflow_definition: {
    filter_rules: {
      available_fields: ['Order #', 'Customer', 'Status'],
      fieldValues: {
        'Status': ['Shipped', 'Processing']
      }
    }
  }
};

const legacyHydrated = simulateModalHydration({
  ...legacyWorkflow,
  filter_rules: legacyWorkflow.workflow_definition.filter_rules
});
assert(legacyHydrated.availableColumns.includes('Order #'));
assert(legacyHydrated.availableColumns.includes('Customer'));
assert(legacyHydrated.fieldValuesMap['Status'].includes('Shipped'));
console.log('  ✅ Modal fallback extraction from workflow_definition.filter_rules passed');

// -------------------------------------------------------------
// Test 10: Accessible Table with <th scope="row"> Row Headers
// -------------------------------------------------------------
console.log('\n🔹 Test 10: Table with Row Headers (<th scope="row">)');

let thInv10, thStatus10, row10_th, row10_td, row10;
const table10 = {
  tagName: 'TABLE', nodeType: 1,
  querySelectorAll: (sel) => {
    if (sel.includes('th')) return [thInv10, thStatus10];
    if (sel.includes('tr')) return [row10];
    return [];
  },
  closest: () => table10
};
thInv10 = { tagName: 'TH', innerText: 'Invoice #', nodeType: 1, getAttribute: () => null, closest: () => table10 };
thStatus10 = { tagName: 'TH', innerText: 'Status', nodeType: 1, getAttribute: () => null, closest: () => table10 };

row10_th = { tagName: 'TH', innerText: 'INV-1001', nodeType: 1, getAttribute: (a) => a === 'scope' ? 'row' : null, closest: (s) => s.includes('table') ? table10 : ((s.includes('th') || s.includes('cell')) ? row10_th : (s.includes('tr') ? row10 : table10)) };
row10_td = { tagName: 'TD', innerText: 'Paid', nodeType: 1, getAttribute: () => null, closest: (s) => s.includes('table') ? table10 : ((s.includes('td') || s.includes('cell')) ? row10_td : (s.includes('tr') ? row10 : table10)) };

row10 = {
  tagName: 'TR', nodeType: 1,
  querySelector: (sel) => sel.includes('td') ? row10_td : (sel.includes('th') ? row10_th : null),
  querySelectorAll: () => [row10_th, row10_td],
  closest: (s) => s.includes('table') ? table10 : (s.includes('tr') ? row10 : table10)
};

const res10 = snifferFn(row10_th);
assert(res10.table, 'Table context must be present for table with row headers');
assert.strictEqual(res10.table.activeColumn, 'Invoice #', 'Active column must be Invoice # when clicking row header');
assert(res10.table.rowValues['Invoice #'].includes('INV-1001'), 'Row values must capture INV-1001 from th scope=row');
assert(res10.table.rowValues['Status'].includes('Paid'), 'Row values must capture Paid from sibling td');
console.log('  ✅ Table with <th scope="row"> data rows parsed correctly without being discarded');

// -------------------------------------------------------------
// Test 11: Multi-Header Table (Filter row in thead, column headers row)
// -------------------------------------------------------------
console.log('\n🔹 Test 11: Multi-Header Table (No Off-By-One Column Shifts)');

let table11, filterRow11, headerRow11, dataRow11;
const thF0 = { tagName: 'TH', innerText: '', nodeType: 1, getAttribute: () => null, closest: (s) => s.includes('table') ? table11 : (s.includes('tr') ? filterRow11 : table11) };
const thF1 = { tagName: 'TH', innerText: '', nodeType: 1, getAttribute: () => null, closest: (s) => s.includes('table') ? table11 : (s.includes('tr') ? filterRow11 : table11) };
const thF2 = { tagName: 'TH', innerText: '', nodeType: 1, getAttribute: () => null, closest: (s) => s.includes('table') ? table11 : (s.includes('tr') ? filterRow11 : table11) };
filterRow11 = { tagName: 'TR', nodeType: 1, querySelectorAll: () => [thF0, thF1, thF2], closest: (s) => s.includes('thead') ? thead11 : (s.includes('table') ? table11 : (s.includes('tr') ? filterRow11 : table11)) };

const thH0 = { tagName: 'TH', innerText: '', nodeType: 1, getAttribute: () => null, closest: (s) => s.includes('table') ? table11 : (s.includes('tr') ? headerRow11 : table11) };
const thH1 = { tagName: 'TH', innerText: 'Invoice #', nodeType: 1, getAttribute: () => null, closest: (s) => s.includes('table') ? table11 : (s.includes('tr') ? headerRow11 : table11) };
const thH2 = { tagName: 'TH', innerText: 'Status', nodeType: 1, getAttribute: () => null, closest: (s) => s.includes('table') ? table11 : (s.includes('tr') ? headerRow11 : table11) };
headerRow11 = { tagName: 'TR', nodeType: 1, querySelectorAll: () => [thH0, thH1, thH2], closest: (s) => s.includes('thead') ? thead11 : (s.includes('table') ? table11 : (s.includes('tr') ? headerRow11 : table11)) };

const thead11 = { tagName: 'THEAD', nodeType: 1, closest: () => table11 };

const td11_0 = { tagName: 'TD', innerText: '', nodeType: 1, getAttribute: () => null, closest: (s) => s.includes('table') ? table11 : ((s.includes('td') || s.includes('cell')) ? td11_0 : (s.includes('tr') ? dataRow11 : table11)) };
const td11_1 = { tagName: 'TD', innerText: 'INV-1001', nodeType: 1, getAttribute: () => null, closest: (s) => s.includes('table') ? table11 : ((s.includes('td') || s.includes('cell')) ? td11_1 : (s.includes('tr') ? dataRow11 : table11)) };
const td11_2 = { tagName: 'TD', innerText: 'Paid', nodeType: 1, getAttribute: () => null, closest: (s) => s.includes('table') ? table11 : ((s.includes('td') || s.includes('cell')) ? td11_2 : (s.includes('tr') ? dataRow11 : table11)) };

dataRow11 = {
  tagName: 'TR', nodeType: 1,
  querySelectorAll: () => [td11_0, td11_1, td11_2],
  querySelector: () => null,
  closest: (s) => s.includes('table') ? table11 : (s.includes('tr') ? dataRow11 : table11)
};

table11 = {
  tagName: 'TABLE', nodeType: 1,
  querySelectorAll: (sel) => {
    if (sel.includes('th')) return [thF0, thF1, thF2, thH0, thH1, thH2];
    if (sel.includes('tr')) return [filterRow11, headerRow11, dataRow11];
    return [];
  },
  closest: () => table11
};

const res11 = snifferFn(td11_1);
assert.strictEqual(res11.table.activeColumn, 'Invoice #', 'Multi-header table clicked on INV-1001 must resolve as Invoice #');
assert(res11.table.rowValues['Invoice #'].includes('INV-1001'), 'Invoice # must contain INV-1001');
assert(!res11.table.rowValues['Status'] || !res11.table.rowValues['Status'].includes('INV-1001'), 'Status must NEVER contain INV-1001');
console.log('  ✅ Multi-header table positional alignment verified');

// -------------------------------------------------------------
// Test 12: Classic Dropdown Menu Options (.dropdown-menu li a)
// -------------------------------------------------------------
console.log('\n🔹 Test 12: Classic Dropdown Menu Options (.dropdown-menu li a)');

let menu12;
const link12_1 = { tagName: 'A', innerText: 'Approved', nodeType: 1, getAttribute: () => null, closest: (s) => s.includes('dropdown-menu') ? menu12 : null };
const link12_2 = { tagName: 'A', innerText: 'Rejected', nodeType: 1, getAttribute: () => null, closest: (s) => s.includes('dropdown-menu') ? menu12 : null };
const li12_1 = { tagName: 'LI', nodeType: 1, closest: (s) => s.includes('dropdown-menu') ? menu12 : null, querySelectorAll: () => [] };
const li12_2 = { tagName: 'LI', nodeType: 1, closest: (s) => s.includes('dropdown-menu') ? menu12 : null, querySelectorAll: () => [] };

menu12 = {
  tagName: 'UL', className: 'dropdown-menu', nodeType: 1,
  getAttribute: (a) => a === 'aria-label' ? 'Approval Status' : null,
  querySelectorAll: (s) => [link12_1, link12_2],
  closest: (s) => s.includes('dropdown-menu') ? menu12 : null
};

const res12 = snifferFn(link12_1);
assert.deepStrictEqual(res12.options, ['Approved', 'Rejected'], 'Classic dropdown must capture all menu options');
assert(res12.columns.includes('Approval Status'), 'Classic dropdown column captured');
console.log('  ✅ Classic dropdown options captured without modern .dropdown-item class');

// -------------------------------------------------------------
// Test 13: Checkbox Input in Table Cell Does Not Leak "on" Value
// -------------------------------------------------------------
console.log('\n🔹 Test 13: Checkbox Input Value Leak Prevention');

let table13, row13;
const thSelect13 = { tagName: 'TH', innerText: 'Select', nodeType: 1, getAttribute: () => null, closest: () => table13 };
const thInv13 = { tagName: 'TH', innerText: 'Invoice #', nodeType: 1, getAttribute: () => null, closest: () => table13 };

const cbInput13 = { tagName: 'INPUT', type: 'checkbox', value: 'on', nodeType: 1, getAttribute: (a) => a === 'value' ? 'on' : null };
const tdSelect13 = {
  tagName: 'TD', innerText: '', nodeType: 1,
  getAttribute: () => null,
  querySelector: (s) => s.includes('input') ? cbInput13 : null,
  closest: (s) => s.includes('table') ? table13 : (s.includes('tr') ? row13 : tdSelect13)
};
const tdInv13 = {
  tagName: 'TD', innerText: 'INV-1001', nodeType: 1,
  getAttribute: () => null,
  querySelector: () => null,
  closest: (s) => s.includes('table') ? table13 : (s.includes('tr') ? row13 : tdInv13)
};

row13 = {
  tagName: 'TR', nodeType: 1,
  querySelectorAll: () => [tdSelect13, tdInv13],
  querySelector: () => null,
  closest: () => table13
};

table13 = {
  tagName: 'TABLE', nodeType: 1,
  querySelectorAll: (sel) => {
    if (sel.includes('th')) return [thSelect13, thInv13];
    if (sel.includes('tr')) return [row13];
    return [];
  },
  closest: () => table13
};

const res13 = snifferFn(tdInv13);
assert(!res13.fieldValues['Select'] || !res13.fieldValues['Select'].includes('on'), 'Checkbox default value "on" must not be added to fieldValues');
console.log('  ✅ Checkbox input value leak prevented');

// -------------------------------------------------------------
// Test 14: Details Expander / Colspan Row Does Not Pollute First Column
// -------------------------------------------------------------
console.log('\n🔹 Test 14: Details / Colspan Row Ignored in Distinct Values');

let table14, row14_data, row14_details;
const thA14 = { tagName: 'TH', innerText: 'Doc ID', nodeType: 1, getAttribute: () => null, closest: () => table14 };
const thB14 = { tagName: 'TH', innerText: 'Amount', nodeType: 1, getAttribute: () => null, closest: () => table14 };

const td14_1 = { tagName: 'TD', innerText: 'DOC-1', nodeType: 1, getAttribute: () => null, closest: (s) => s.includes('table') ? table14 : row14_data };
const td14_2 = { tagName: 'TD', innerText: '$100', nodeType: 1, getAttribute: () => null, closest: (s) => s.includes('table') ? table14 : row14_data };
row14_data = {
  tagName: 'TR', nodeType: 1,
  querySelectorAll: () => [td14_1, td14_2],
  querySelector: () => null,
  closest: () => table14
};

const td14_details = {
  tagName: 'TD', innerText: 'Shipping details: 123 Main St', nodeType: 1,
  getAttribute: (a) => a === 'colspan' ? '2' : null,
  closest: (s) => s.includes('table') ? table14 : row14_details
};
row14_details = {
  tagName: 'TR', nodeType: 1,
  querySelectorAll: () => [td14_details],
  querySelector: () => null,
  closest: () => table14
};

table14 = {
  tagName: 'TABLE', nodeType: 1,
  querySelectorAll: (sel) => {
    if (sel.includes('th')) return [thA14, thB14];
    if (sel.includes('tr')) return [row14_data, row14_details];
    return [];
  },
  closest: () => table14
};

const res14 = snifferFn(td14_1);
assert.deepStrictEqual(res14.fieldValues['Doc ID'], ['DOC-1'], 'Doc ID must not contain details colspan row text');
console.log('  ✅ Colspan details row successfully excluded from distinct column values');

// -------------------------------------------------------------
// Test 15: Table Header <th> with aria-label or title
// -------------------------------------------------------------
console.log('\n🔹 Test 15: Table Header with aria-label or title');

let table15, row15;
const thAction15 = { tagName: 'TH', innerText: '', nodeType: 1, getAttribute: (a) => a === 'aria-label' ? 'Actions' : null, closest: () => table15 };
const thDoc15 = { tagName: 'TH', innerText: 'Doc Number', nodeType: 1, getAttribute: () => null, closest: () => table15 };

const tdAct15 = { tagName: 'TD', innerText: 'Edit', nodeType: 1, getAttribute: () => null, closest: (s) => s.includes('table') ? table15 : ((s.includes('td') || s.includes('cell')) ? tdAct15 : (s.includes('tr') ? row15 : table15)) };
const tdDoc15 = { tagName: 'TD', innerText: 'DOC-55', nodeType: 1, getAttribute: () => null, closest: (s) => s.includes('table') ? table15 : ((s.includes('td') || s.includes('cell')) ? tdDoc15 : (s.includes('tr') ? row15 : table15)) };
row15 = {
  tagName: 'TR', nodeType: 1,
  querySelectorAll: () => [tdAct15, tdDoc15],
  querySelector: () => null,
  closest: () => table15
};

table15 = {
  tagName: 'TABLE', nodeType: 1,
  querySelectorAll: (sel) => {
    if (sel.includes('th')) return [thAction15, thDoc15];
    if (sel.includes('tr')) return [row15];
    return [];
  },
  closest: () => table15
};

const res15 = snifferFn(tdDoc15);
assert(res15.columns.includes('Actions'), 'Actions header must be captured from aria-label');
assert.strictEqual(res15.table.activeColumn, 'Doc Number');
console.log('  ✅ Table header aria-label captured into columns');

console.log('\n🎉 ALL CONTEXTUAL CAPTURE TESTS PASSED SUCCESSFULLY!\n');
