/**
 * ReFlow — Download Organization & Hybrid Deduplication Unit Tests
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');
const LoopReplayRunner = require('../src/replay/loop-replay-runner');

console.log('\n🧪 Starting Download Organization & Deduplication Test Suite...\n');

const TEST_DIR = path.resolve(__dirname, 'scratch_test_downloads');

// Cleanup helper
function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  const testWfDownloads = path.resolve(process.cwd(), 'downloads', 'city-mart-monthly-invoices-export');
  if (fs.existsSync(testWfDownloads)) {
    fs.rmSync(testWfDownloads, { recursive: true, force: true });
  }
  const testRunDir = path.resolve(process.cwd(), 'Run', '2026-10-02_03-42-18');
  if (fs.existsSync(testRunDir)) {
    fs.rmSync(testRunDir, { recursive: true, force: true });
  }
  const testGenericRunDir = path.resolve(process.cwd(), 'Run', '2026-10-02_09-99-99');
  if (fs.existsSync(testGenericRunDir)) {
    fs.rmSync(testGenericRunDir, { recursive: true, force: true });
  }
  const testGenericWf = path.resolve(process.cwd(), 'downloads', 'sample-generic-flow');
  if (fs.existsSync(testGenericWf)) {
    fs.rmSync(testGenericWf, { recursive: true, force: true });
  }
}

cleanup();
fs.mkdirSync(TEST_DIR, { recursive: true });

async function runTests() {
  try {
    // -------------------------------------------------------------
    // Test 1: Runner directory hierarchy & slug generation
    // -------------------------------------------------------------
    console.log('🔹 Test 1: Runner directory hierarchy & slug generation');
    const runner = new LoopReplayRunner({
      runId: 'test_run_123',
      workflowId: 'wf_city_mart_999',
      workflowName: 'City Mart / Monthly Invoices & Export',
      userId: 'user_tester'
    });

    assert.strictEqual(
      runner.workflowSlug,
      'city-mart-monthly-invoices-export',
      'Workflow name must be slugified cleanly'
    );
    const today = new Date().toISOString().split('T')[0];
    assert.strictEqual(runner.dateStr, today, 'Date string must match current YYYY-MM-DD');
    assert(
      runner.structuredDownloadsDir.endsWith(path.join(runner.workflowSlug, today)),
      'structuredDownloadsDir must end with <slug>/<date>'
    );
    console.log('  ✅ Directory hierarchy & slug generation passed\n');

    // -------------------------------------------------------------
    // Test 2: processAndStoreDownload: hash, copy & manifest sync
    // -------------------------------------------------------------
    console.log('🔹 Test 2: processAndStoreDownload creates files & manifest.json');
    
    // Create simulated downloaded file in runner staging area
    runner.initDirectories();
    const stagingFile = path.join(runner.downloadsDir, 'invoice_001.pdf');
    const testContent = 'PDF-1.4 Fake PDF Content for Invoice 001 - ' + Date.now();
    fs.writeFileSync(stagingFile, testContent, 'utf8');

    const expectedHash = crypto.createHash('sha256').update(testContent).digest('hex');

    const stored = runner.processAndStoreDownload(stagingFile, 'invoice:#001', 'Invoice #001');

    assert(stored, 'processAndStoreDownload should return stored metadata object');
    assert.strictEqual(stored.filename, 'invoice_001.pdf', 'Filename must match');
    assert.strictEqual(stored.fileHash, expectedHash, 'SHA256 hash must match file content');
    assert(fs.existsSync(stored.path), 'Organized file must exist at structured path');

    // Verify workflow manifest.json was created
    const manifestPath = path.join(runner.workflowDownloadsBaseDir, 'manifest.json');
    assert(fs.existsSync(manifestPath), 'Workflow downloads manifest.json must exist');
    const manifestJson = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.strictEqual(manifestJson.workflowId, 'wf_city_mart_999');
    assert(manifestJson.downloads.some(d => d.fileHash === expectedHash), 'Manifest must contain the downloaded file');

    console.log('  ✅ processAndStoreDownload passed\n');

    // -------------------------------------------------------------
    // Test 3: checkIfAlreadyDownloaded detects existing items
    // -------------------------------------------------------------
    console.log('🔹 Test 3: checkIfAlreadyDownloaded detects duplicate item before clicking');
    
    // Query with the key used above
    const checkDuplicate = runner.checkIfAlreadyDownloaded('invoice:#001');
    assert.strictEqual(checkDuplicate.isDuplicate, true, 'Should detect item as duplicate');
    assert.strictEqual(checkDuplicate.record.filename, 'invoice_001.pdf');

    // Query with an unknown key
    const checkUnknown = runner.checkIfAlreadyDownloaded('invoice:#999');
    assert.strictEqual(checkUnknown.isDuplicate, false, 'Unknown item should not be a duplicate');

    // Verify that if file is deleted from disk, isDuplicate becomes false
    const existingFilePath = path.resolve(process.cwd(), checkDuplicate.record.filePath);
    const backupPath = existingFilePath + '.bak';
    fs.renameSync(existingFilePath, backupPath);

    const checkMissingFile = runner.checkIfAlreadyDownloaded('invoice:#001');
    assert.strictEqual(checkMissingFile.isDuplicate, false, 'Missing file on disk must not trigger duplicate skip');

    // Restore file
    fs.renameSync(backupPath, existingFilePath);
    const checkRestored = runner.checkIfAlreadyDownloaded('invoice:#001');
    assert.strictEqual(checkRestored.isDuplicate, true, 'Restored file should be recognized as duplicate again');

    console.log('  ✅ Duplicate detection passed\n');

    // -------------------------------------------------------------
    // Test 4: forceRedownload bypass
    // -------------------------------------------------------------
    console.log('🔹 Test 4: forceRedownload bypasses skipping');
    const normalRunner = new LoopReplayRunner({
      workflowId: 'wf_city_mart_999',
      forceRedownload: false
    });
    assert.strictEqual(normalRunner.forceRedownload, false);

    const forcedRunner = new LoopReplayRunner({
      workflowId: 'wf_city_mart_999',
      forceRedownload: true
    });
    assert.strictEqual(forcedRunner.forceRedownload, true);
    console.log('  ✅ forceRedownload option passed\n');

    // -------------------------------------------------------------
    // Test 5: Run/<timestamp>/<domain>/<Category>/<filename> hierarchy
    // -------------------------------------------------------------
    console.log('🔹 Test 5: Run/<timestamp>/<domain>/<Category>/<filename> hierarchy creation');
    const runRunner = new LoopReplayRunner({
      runId: 'run_test_run_hierarchy',
      workflowId: 'wf_oil_portal_123',
      workflowName: 'US Oil Customer Portal Sync',
      targetUrl: 'https://customerportal.usoil.com/invoices',
      startedAt: '2026-10-02T03:42:18.000Z'
    });

    assert.strictEqual(runRunner.portalDomain, 'customerportal.usoil.com', 'Domain must be extracted correctly');
    assert.strictEqual(runRunner.runTimestamp, '2026-10-02_03-42-18', 'Run timestamp must match YYYY-MM-DD_HH-mm-ss');

    runRunner.initDirectories();
    const rawStaging1 = path.join(runRunner.downloadsDir, 'invoice_raw.pdf');
    fs.writeFileSync(rawStaging1, 'PDF fake content for ACME invoice', 'utf8');

    const storedInvoice = runRunner.processAndStoreDownload(
      rawStaging1,
      'item_inv_1',
      'Invoice #1',
      { 'Invoice Number': 'INV-10234', 'Customer': 'ACME', 'Date': '2026-09-30' }
    );

    assert(storedInvoice, 'storedInvoice must be returned');
    assert.strictEqual(storedInvoice.filename, 'INV-10234_ACME_2026-09-30.pdf');
    assert.strictEqual(storedInvoice.category, 'Invoices');
    assert.strictEqual(
      storedInvoice.runPath,
      'Run/2026-10-02_03-42-18/customerportal.usoil.com/Invoices/INV-10234_ACME_2026-09-30.pdf'
    );
    assert(fs.existsSync(path.resolve(process.cwd(), storedInvoice.runPath)), 'File must exist in Run/ hierarchy');

    const rawStaging2 = path.join(runRunner.downloadsDir, 'payment_raw.pdf');
    fs.writeFileSync(rawStaging2, 'PDF fake content for payment', 'utf8');

    const storedPayment = runRunner.processAndStoreDownload(
      rawStaging2,
      'item_pay_1',
      'Payment #1',
      { 'Payment ID': 'PAY-88321', 'Date': '2026-09-30', 'Type': 'Payment' }
    );

    assert(storedPayment, 'storedPayment must be returned');
    assert.strictEqual(storedPayment.filename, 'PAY-88321_2026-09-30.pdf');
    assert.strictEqual(storedPayment.category, 'Payments');
    assert.strictEqual(
      storedPayment.runPath,
      'Run/2026-10-02_03-42-18/customerportal.usoil.com/Payments/PAY-88321_2026-09-30.pdf'
    );
    assert(fs.existsSync(path.resolve(process.cwd(), storedPayment.runPath)), 'File must exist in Run/ hierarchy');

    console.log('  ✅ Run/<timestamp>/<domain>/<Category>/<filename> hierarchy passed\n');

    // -------------------------------------------------------------
    // Test 6: Generic filename differentiation (InvoiceMainReport.pdf)
    // -------------------------------------------------------------
    console.log('🔹 Test 6: Generic filename differentiation (InvoiceMainReport.pdf)');
    const genericRunner = new LoopReplayRunner({
      runId: 'run_test_generic_diff',
      workflowId: 'wf_sample_generic',
      workflowName: 'Sample Generic Flow',
      targetUrl: 'https://portal.example.test/login#home',
      startedAt: '2026-10-02_09-99-99'
    });
    genericRunner.initDirectories();

    // 6a: First invoice downloads as InvoiceMainReport.pdf with fields
    const file1Path = path.join(genericRunner.downloadsDir, 'InvoiceMainReport.pdf');
    fs.writeFileSync(file1Path, 'PDF content invoice 1 DR-1468-260921182926', 'utf8');
    const stored1 = genericRunner.processAndStoreDownload(
      file1Path,
      'invoice:DR-1468-260921182926',
      'DR-1468-260921182926 (Invoice)',
      { 'Invoice Number': 'DR-1468-260921182926', 'Type': 'Invoice', 'Date': '2026-09-21' }
    );
    assert.strictEqual(stored1.filename, 'DR-1468-260921182926_2026-09-21.pdf');
    assert(fs.existsSync(stored1.path));

    // 6b: Second invoice downloads also as InvoiceMainReport.pdf, but content is DIFFERENT (different invoice inside)
    fs.writeFileSync(file1Path, 'PDF content invoice 2 DR-1468-26091913502 - totally different inside', 'utf8');
    const stored2 = genericRunner.processAndStoreDownload(
      file1Path,
      'invoice:DR-1468-26091913502',
      'DR-1468-26091913502 (Invoice)',
      { 'Invoice Number': 'DR-1468-26091913502', 'Type': 'Invoice', 'Date': '2026-09-19' }
    );
    assert.strictEqual(stored2.filename, 'DR-1468-26091913502_2026-09-19.pdf');
    assert.notStrictEqual(stored1.fileHash, stored2.fileHash);
    assert(fs.existsSync(stored2.path));
    assert(fs.existsSync(stored1.path), 'Previous invoice file must not be overwritten');

    // 6c: Third download arrives late without explicit item context, but with generic filename
    fs.writeFileSync(file1Path, 'PDF content invoice 3 completely unassociated with item context', 'utf8');
    const stored3 = genericRunner.processAndStoreDownload(file1Path);
    assert(stored3.filename.startsWith('InvoiceMainReport_'), 'Must be disambiguated with content hash');
    assert.notStrictEqual(stored3.fileHash, stored2.fileHash);

    // 6d: Check deduplication recognizes content difference
    const dedupeDiff = genericRunner.checkIfAlreadyDownloaded('invoice:DR-99999', null, {}, 'unknown_hash_123');
    assert.strictEqual(dedupeDiff.isDuplicate, false, 'Different content hash must not be marked as duplicate');

    const dedupeSame = genericRunner.checkIfAlreadyDownloaded(null, null, {}, stored1.fileHash);
    assert.strictEqual(dedupeSame.isDuplicate, true, 'Matching content hash must be recognized as duplicate');

    console.log('  ✅ Generic filename differentiation passed\n');

    console.log('🎉 ALL DOWNLOAD ORGANIZATION & DEDUPLICATION TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    cleanup();
  }
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  cleanup();
  process.exit(1);
});
