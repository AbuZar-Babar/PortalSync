/**
 * Tier 2 Boundary & Corner Cases: File Hash Uniqueness & Cryptographic Invariants
 * Tests:
 *  - B4.1: Zero-byte file produces canonical SHA-256 hash e3b0c44298fc...
 *  - B4.2: Duplicate file identical byte stream: flags isDuplicate: true and prevents duplicate register
 *  - B4.3: Single-byte difference triggers avalanche effect (divergent hash)
 *  - B4.4: Filename collision with divergent hashes creates unique suffixed target
 *  - B4.5: Batch deduplication: handles multiple duplicates in sequence accurately
 *  - B4.6: Rejects non-existent source file with descriptive exception
 * Total: 6 test cases (>=5 threshold)
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { TestHarness, Assert } = require('../helpers/test-harness');
const { EMPTY_BUFFER, EMPTY_BUFFER_HASH, createSamplePdf, computeSha256 } = require('../helpers/fixtures');
const { ArtifactTracker } = require('../../packages/engine/src/runner/dedup-helper');

const harness = new TestHarness('Tier 2: File Hash Uniqueness & Dedup Boundaries');
let tempSrcDir = '';
let tempDstDir = '';

harness.beforeEach(() => {
  tempSrcDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-hash-src-'));
  tempDstDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ps-hash-dst-'));
});

harness.afterEach(() => {
  if (tempSrcDir && fs.existsSync(tempSrcDir)) fs.rmSync(tempSrcDir, { recursive: true, force: true });
  if (tempDstDir && fs.existsSync(tempDstDir)) fs.rmSync(tempDstDir, { recursive: true, force: true });
});

harness.describe('File Hash Uniqueness & Cryptographic Deduplication', () => {
  harness.it('B4.1: Zero-byte file produces canonical SHA-256 hash (e3b0c442...)', () => {
    const hash = computeSha256(EMPTY_BUFFER);
    Assert.equal(hash, EMPTY_BUFFER_HASH);
    Assert.equal(hash, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  harness.it('B4.2: Duplicate file identical byte stream: flags isDuplicate: true', () => {
    const tracker = new ArtifactTracker();
    const pdf = createSamplePdf('INV-DUP-1', '100.00');
    const filePath = path.join(tempSrcDir, 'test_dup.pdf');
    fs.writeFileSync(filePath, pdf.buffer);

    const first = tracker.processAndSaveArtifact(filePath, tempDstDir);
    Assert.equal(first.isDuplicate, false);
    Assert.equal(first.hash, pdf.sha256);

    const second = tracker.processAndSaveArtifact(filePath, tempDstDir);
    Assert.equal(second.isDuplicate, true);
    Assert.equal(second.hash, first.hash);
  });

  harness.it('B4.3: Single-byte difference triggers avalanche effect (divergent hash)', () => {
    const baseContent = 'Invoice #1001 for Acme Corp. Total: $500.00';
    const modifiedContent = 'Invoice #1001 for Acme Corp. Total: $500.01'; // 1 character changed

    const hash1 = computeSha256(baseContent);
    const hash2 = computeSha256(modifiedContent);

    Assert.notEqual(hash1, hash2);
    // Verify that most characters differ (avalanche effect)
    let differences = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) differences++;
    }
    Assert.ok(differences > 30, `Expected strong avalanche effect, got ${differences} differing hex chars`);
  });

  harness.it('B4.4: Filename collision with divergent hashes creates unique suffixed target', () => {
    const tracker = new ArtifactTracker();
    const file1 = path.join(tempSrcDir, 'inv1.pdf');
    const file2 = path.join(tempSrcDir, 'inv2.pdf');
    fs.writeFileSync(file1, Buffer.from('PDF Content A'));
    fs.writeFileSync(file2, Buffer.from('PDF Content B'));

    // Both requested to save as "report.pdf"
    const saved1 = tracker.processAndSaveArtifact(file1, tempDstDir, 'report.pdf');
    const saved2 = tracker.processAndSaveArtifact(file2, tempDstDir, 'report.pdf');

    Assert.equal(saved1.fileName, 'report.pdf');
    Assert.notEqual(saved2.fileName, 'report.pdf');
    Assert.ok(saved2.fileName.startsWith('report_'));
    Assert.ok(fs.existsSync(saved1.targetPath));
    Assert.ok(fs.existsSync(saved2.targetPath));
  });

  harness.it('B4.5: Batch deduplication: handles multiple duplicates in sequence accurately', () => {
    const tracker = new ArtifactTracker();
    const uniqueFiles = [
      createSamplePdf('INV-A', '10.00'),
      createSamplePdf('INV-B', '20.00'),
      createSamplePdf('INV-C', '30.00'),
    ];

    // Write them
    uniqueFiles.forEach((f, idx) => {
      fs.writeFileSync(path.join(tempSrcDir, `file_${idx}.pdf`), f.buffer);
    });

    // Ingest all 3 (first pass)
    uniqueFiles.forEach((f, idx) => {
      const res = tracker.processAndSaveArtifact(path.join(tempSrcDir, `file_${idx}.pdf`), tempDstDir);
      Assert.equal(res.isDuplicate, false);
    });

    // Ingest all 3 again (second pass)
    uniqueFiles.forEach((f, idx) => {
      const res = tracker.processAndSaveArtifact(path.join(tempSrcDir, `file_${idx}.pdf`), tempDstDir);
      Assert.equal(res.isDuplicate, true);
    });
  });

  harness.it('B4.6: Rejects non-existent source file with descriptive exception', () => {
    const tracker = new ArtifactTracker();
    Assert.throws(() => {
      tracker.processAndSaveArtifact(path.join(tempSrcDir, 'does-not-exist.pdf'), tempDstDir);
    }, /Source file does not exist/);
  });
});

if (require.main === module) {
  harness.run().then((res) => {
    process.exitCode = res.failed > 0 ? 1 : 0;
  });
}

module.exports = { harness };
