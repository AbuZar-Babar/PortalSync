/**
 * Test Suite: Generic Row Filter & Document Discrimination (Invoices vs Credit Memos)
 */

const assert = require('assert');
const LoopReplayRunner = require('../src/replay/loop-replay-runner');
const ItemDiscovery = require('../src/shared/item-discovery');

// Mock element simulating a table row in ERP grid (e.g. iRely, DevExpress, SAP)
function createMockRowElement({ typeValue, docNumber, customer }) {
  return {
    asElement: () => ({
      evaluate: async (fn) => {
        // Mock the DOM evaluation callback inside evaluateItemFilter
        const mockDomContext = {
          innerText: `${docNumber} ${typeValue} ${customer} Download`,
          textContent: `${docNumber} ${typeValue} ${customer} Download`,
          querySelectorAll: (sel) => {
            return [
              { innerText: docNumber, textContent: docNumber },
              { innerText: typeValue, textContent: typeValue },
              { innerText: customer, textContent: customer },
              { innerText: 'Download', textContent: 'Download' }
            ];
          },
          closest: () => ({
            querySelectorAll: (sel) => {
              return [
                { innerText: 'Doc Number', textContent: 'Doc Number' },
                { innerText: 'Type', textContent: 'Type' },
                { innerText: 'Customer', textContent: 'Customer' },
                { innerText: 'Action', textContent: 'Action' }
              ];
            }
          })
        };
        return fn(mockDomContext);
      }
    }),
    dispose: async () => {}
  };
}

async function runFilterTests() {
  console.log('🧪 Starting Row Filtering & Document Discrimination Test Suite...\n');

  // -------------------------------------------------------------
  // Test 1: Runner initializes with rowFilter
  // -------------------------------------------------------------
  console.log('🔹 Test 1: LoopReplayRunner constructor receives rowFilter');
  const runner = new LoopReplayRunner({
    workflowId: 'wf_filter_test_1',
    runId: 'test_run_filter_1',
    rowFilter: { column: 'Type', value: 'Invoice' }
  });
  assert.deepStrictEqual(runner.rowFilter, { column: 'Type', value: 'Invoice' });
  console.log('  ✅ LoopReplayRunner correctly stored rowFilter\n');

  // -------------------------------------------------------------
  // Test 2: evaluateItemFilter correctly accepts Invoices and rejects Credit Memos
  // -------------------------------------------------------------
  console.log('🔹 Test 2: evaluateItemFilter targets Invoice column');
  
  const originalGetItemHandle = ItemDiscovery.getItemHandle;

  try {
    // 2a: Testing an "Invoice" row against filter { column: 'Type', value: 'Invoice' }
    const invoiceRowHandle = createMockRowElement({
      docNumber: 'SI-177926',
      typeValue: 'Invoice',
      customer: 'Metro Market'
    });
    ItemDiscovery.getItemHandle = async () => invoiceRowHandle;

    const resInvoice = await runner.evaluateItemFilter(null, {}, 0, { column: 'Type', value: 'Invoice' });
    assert.strictEqual(resInvoice.matches, true, 'Invoice row should match target "Invoice"');
    assert.strictEqual(resInvoice.column, 'type');
    assert.strictEqual(resInvoice.actualValue, 'Invoice');
    console.log('  ✅ "Invoice" row matched successfully:', resInvoice.reason);

    // 2b: Testing a "Credit Memo" row against filter { column: 'Type', value: 'Invoice' }
    const creditMemoRowHandle = createMockRowElement({
      docNumber: 'CM-004812',
      typeValue: 'Credit Memo',
      customer: 'Corner Grocer'
    });
    ItemDiscovery.getItemHandle = async () => creditMemoRowHandle;

    const resCreditMemo = await runner.evaluateItemFilter(null, {}, 1, { column: 'Type', value: 'Invoice' });
    assert.strictEqual(resCreditMemo.matches, false, 'Credit Memo row should NOT match target "Invoice"');
    assert.strictEqual(resCreditMemo.column, 'type');
    assert.strictEqual(resCreditMemo.actualValue, 'Credit Memo');
    console.log('  ✅ "Credit Memo" row skipped successfully:', resCreditMemo.reason);

    // 2c: Inverted test: user wants "Credit Memo" rows only
    const resTargetCredit = await runner.evaluateItemFilter(null, {}, 1, { column: 'Type', value: 'Credit Memo' });
    assert.strictEqual(resTargetCredit.matches, true, 'Credit Memo row should match when target is Credit Memo');
    console.log('  ✅ Dynamic switch: "Credit Memo" matched when target is Credit Memo');

    // 2d: No filter or __any__ accepts all
    const resAny = await runner.evaluateItemFilter(null, {}, 1, { column: 'Type', value: '__any__' });
    assert.strictEqual(resAny.matches, true, '__any__ must accept all rows');

    const resNone = await runner.evaluateItemFilter(null, {}, 1, null);
    assert.strictEqual(resNone.matches, true, 'null filter must accept all rows');
    console.log('  ✅ No filter / __any__ correctly accepts all rows\n');

  } finally {
    ItemDiscovery.getItemHandle = originalGetItemHandle;
  }

  console.log('🎉 All Row Filter & Discrimination Tests Passed!\n');
}

runFilterTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
