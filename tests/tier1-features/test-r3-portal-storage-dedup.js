/**
 * Tier 1 Feature Coverage: R3 Engine Portal Storage & Cryptographic Deduplication
 * 
 * Verifies:
 *  - F27: Portal Name Sanitization & Windows Device Immunity (4 tests)
 *  - F28: Organized Directory Path Resolution (3 tests)
 *  - F29: Cross-Run Cryptographic Deduplication (loadExistingHashesFromDir) (4 tests)
 *  - F30: Filename Collision Handling & Portal Subdirectory Isolation (3 tests)
 * Total: 14 test cases
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { TestHarness, Assert } = require('../helpers/test-harness');
const {
  computeSha256,
  getFileChecksum,
  ArtifactTracker,
  sanitizePortalName,
  resolvePortalStorageDir,
} = require('../../packages/engine/src/runner/dedup-helper');

const harness = new TestHarness('Tier 1: R3 Portal Storage & Deduplication Coverage');

let testRootDir = '';

harness.beforeAll(() => {
  testRootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portalsync-r3-test-'));
});

harness.afterAll(() => {
  if (testRootDir && fs.existsSync(testRootDir)) {
    try {
      fs.rmSync(testRootDir, { recursive: true, force: true });
    } catch {}
  }
});

// =========================================================================
// FEATURE 27: Portal Name Sanitization & Windows Device Immunity (4 tests)
// =========================================================================
harness.describe('F27: Portal Name Sanitization & Windows Device Immunity', () => {
  harness.it('F27.1: Strips illegal Windows and POSIX filesystem characters', () => {
    const raw = 'Supplier / Invoices : 2026 * ? < > | \\';
    const sanitized = sanitizePortalName(raw);

    Assert.equal(
      sanitized,
      'Supplier _ Invoices _ 2026 _ _ _ _ _ _',
      'Illegal characters replaced with underscores'
    );
    Assert.ok(!/[<>:"/\\|?*]/.test(sanitized), 'Sanitized string must not contain illegal chars');
  });

  harness.it('F27.2: Path traversal immunity prevents directory climbing', () => {
    const raw = '../../secret/portal/name/../sub';
    const sanitized = sanitizePortalName(raw);

    Assert.ok(!sanitized.includes('..'), 'Path traversal .. must be removed');
    Assert.ok(!sanitized.includes('/'), 'Forward slashes replaced');
    Assert.ok(!sanitized.includes('\\'), 'Backslashes replaced');
    Assert.equal(sanitized, '__secret_portal_name__sub', 'Path traversal sequences and slashes neutralized safely');

    const simple = sanitizePortalName('../../secret/portal');
    Assert.ok(!simple.includes('..'));
    Assert.equal(simple, '__secret_portal');
  });

  harness.it('F27.3: Windows reserved device names are safely suffixed with _portal', () => {
    const reservedDevices = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM9', 'LPT1', 'LPT9'];
    for (const dev of reservedDevices) {
      const sanitized = sanitizePortalName(dev);
      Assert.equal(sanitized, `${dev}_portal`, `Reserved device ${dev} must be suffixed with _portal`);
    }

    // Also with extensions like CON.txt
    const conWithExt = sanitizePortalName('con.txt');
    Assert.equal(conWithExt, 'con.txt_portal', 'Reserved device name with extension suffixed');
  });

  harness.it('F27.4: Edge cases: whitespace, empty string, long strings, leading/trailing dots', () => {
    Assert.equal(sanitizePortalName(''), 'DefaultPortal', 'Empty string returns DefaultPortal');
    Assert.equal(sanitizePortalName('   \t  '), 'DefaultPortal', 'Whitespace string returns DefaultPortal');
    Assert.equal(sanitizePortalName(null), 'DefaultPortal', 'null returns DefaultPortal');
    Assert.equal(sanitizePortalName(undefined), 'DefaultPortal', 'undefined returns DefaultPortal');

    // Strips leading and trailing dots and spaces
    Assert.equal(sanitizePortalName('...my.portal...'), 'my.portal', 'Strips leading and trailing dots');
    Assert.equal(sanitizePortalName('  Portal A  '), 'Portal A', 'Trims leading and trailing whitespace');

    // Long names (>100 chars) are safely bounded
    const longName = 'A'.repeat(150);
    const sanitizedLong = sanitizePortalName(longName);
    Assert.ok(sanitizedLong.length <= 100, 'Sanitized name must not exceed 100 characters');
  });
});

// =========================================================================
// FEATURE 28: Organized Directory Path Resolution (3 tests)
// =========================================================================
harness.describe('F28: Organized Directory Path Resolution', () => {
  harness.it('F28.1: Defaults to ~/Downloads/PortalSync/<SanitizedPortalName>', () => {
    const resolved = resolvePortalStorageDir(null, 'Acme Invoices');
    const expectedBase = path.join(os.homedir(), 'Downloads', 'PortalSync', 'Acme Invoices');
    Assert.equal(resolved, path.resolve(expectedBase), 'Matches default user Downloads structure');
  });

  harness.it('F28.2: Resolves under custom base folder with sanitized portal subfolder', () => {
    const customBase = path.join(testRootDir, 'CustomDownloads');
    const resolved = resolvePortalStorageDir(customBase, 'Vendor / Invoices');

    const expected = path.join(customBase, 'Vendor _ Invoices');
    Assert.equal(resolved, path.resolve(expected), 'Resolves sanitized portal subfolder under custom base');
  });

  harness.it('F28.3: Prevents double-nesting when base directory already ends with portal name', () => {
    const baseEndingWithPortal = path.join(testRootDir, 'Storage', 'AcmePortal');
    const resolved = resolvePortalStorageDir(baseEndingWithPortal, 'AcmePortal');

    Assert.equal(
      resolved,
      path.resolve(baseEndingWithPortal),
      'Avoids repeating portal name as a subfolder if already present'
    );
  });
});

// =========================================================================
// FEATURE 29: Cross-Run Cryptographic Deduplication (loadExistingHashesFromDir) (4 tests)
// =========================================================================
harness.describe('F29: Cross-Run Cryptographic Deduplication', () => {
  harness.it('F29.1: Pre-scans existing directory and populates seenHashes on startup', () => {
    const portalDir = path.join(testRootDir, 'portal-dedup-scan');
    fs.mkdirSync(portalDir, { recursive: true });

    // Seed existing files
    const file1 = path.join(portalDir, 'invoice_jan.pdf');
    const file2 = path.join(portalDir, 'invoice_feb.pdf');
    fs.writeFileSync(file1, 'PDF-CONTENT-JAN-2026-AAA');
    fs.writeFileSync(file2, 'PDF-CONTENT-FEB-2026-BBB');

    const hash1 = computeSha256(file1);
    const hash2 = computeSha256(file2);

    const tracker = new ArtifactTracker();
    const count = tracker.loadExistingHashesFromDir(portalDir);

    Assert.equal(count, 2, 'Pre-loaded count must be 2');
    Assert.ok(tracker.hasHash(hash1), 'Tracker must contain hash1');
    Assert.ok(tracker.hasHash(hash2), 'Tracker must contain hash2');
  });

  harness.it('F29.2: Zero duplicates guarantee across restarts: identical download flagged isDuplicate: true', () => {
    const portalDir = path.join(testRootDir, 'portal-restart-test');
    fs.mkdirSync(portalDir, { recursive: true });

    const existingFile = path.join(portalDir, 'previous_run_invoice.pdf');
    fs.writeFileSync(existingFile, 'INVOICE-BINARY-BYTES-12345');
    const expectedHash = computeSha256(existingFile);

    // Daemon restarts: new tracker loads existing directory
    const newDaemonTracker = new ArtifactTracker();
    newDaemonTracker.loadExistingHashesFromDir(portalDir);

    // Simulated browser downloads identical file in temp dir
    const tempDownload = path.join(testRootDir, 'temp_download.pdf');
    fs.writeFileSync(tempDownload, 'INVOICE-BINARY-BYTES-12345');

    const result = newDaemonTracker.processAndSaveArtifact(tempDownload, portalDir, 'new_invoice.pdf');
    Assert.equal(result.isDuplicate, true, 'Must flag identical file as duplicate');
    Assert.equal(result.hash, expectedHash, 'Hash must match previous file');
  });

  harness.it('F29.3: Directory scan ignores transient download files (.crdownload, .tmp, dot-files)', () => {
    const portalDir = path.join(testRootDir, 'portal-transient-test');
    fs.mkdirSync(portalDir, { recursive: true });

    fs.writeFileSync(path.join(portalDir, 'valid.pdf'), 'VALID-PDF-DATA');
    fs.writeFileSync(path.join(portalDir, 'in_progress.pdf.crdownload'), 'INCOMPLETE-BYTES');
    fs.writeFileSync(path.join(portalDir, 'temp_swap.tmp'), 'TEMP-BYTES');
    fs.writeFileSync(path.join(portalDir, '.ds_store'), 'METADATA');

    const tracker = new ArtifactTracker();
    const count = tracker.loadExistingHashesFromDir(portalDir);

    Assert.equal(count, 1, 'Only finalized valid file hash should be indexed');
    Assert.ok(tracker.hasHash(computeSha256('VALID-PDF-DATA')), 'Valid file hash must be present');
  });

  harness.it('F29.4: loadExistingHashesFromDir handles non-existent or invalid directory paths gracefully', () => {
    const tracker = new ArtifactTracker();
    const count1 = tracker.loadExistingHashesFromDir(path.join(testRootDir, 'non-existent-subfolder'));
    Assert.equal(count1, 0, 'Non-existent directory returns 0 without error');

    const count2 = tracker.loadExistingHashesFromDir(null);
    Assert.equal(count2, 0, 'Null path returns 0');
  });
});

// =========================================================================
// FEATURE 30: Filename Collision Handling & Portal Subdirectory Isolation (3 tests)
// =========================================================================
harness.describe('F30: Filename Collision Handling & Portal Subdirectory Isolation', () => {
  harness.it('F30.1: Filename collision with divergent content creates unique suffixed file without overwriting', () => {
    const targetDir = path.join(testRootDir, 'collision-test');
    fs.mkdirSync(targetDir, { recursive: true });

    const sourceFile1 = path.join(testRootDir, 'source_jan.pdf');
    const sourceFile2 = path.join(testRootDir, 'source_feb.pdf');
    fs.writeFileSync(sourceFile1, 'FIRST-INVOICE-CONTENT');
    fs.writeFileSync(sourceFile2, 'SECOND-INVOICE-DIFFERENT-CONTENT');

    const tracker = new ArtifactTracker();

    // Save first file as "invoice.pdf"
    const res1 = tracker.processAndSaveArtifact(sourceFile1, targetDir, 'invoice.pdf');
    Assert.equal(res1.isDuplicate, false);
    Assert.equal(res1.fileName, 'invoice.pdf');
    Assert.ok(fs.existsSync(path.join(targetDir, 'invoice.pdf')));

    // Clear tracker memory to simulate independent run with same target filename but different content
    tracker.clear();

    // Save second file also requested as "invoice.pdf"
    const res2 = tracker.processAndSaveArtifact(sourceFile2, targetDir, 'invoice.pdf');
    Assert.equal(res2.isDuplicate, false);
    Assert.notEqual(res2.fileName, 'invoice.pdf', 'Must generate suffixed filename');
    Assert.ok(res2.fileName.startsWith('invoice_'), 'Must include original name prefix');
    Assert.ok(res2.fileName.endsWith('.pdf'), 'Must preserve extension');
    Assert.ok(fs.existsSync(path.join(targetDir, res2.fileName)), 'Suffixed file must exist on disk');

    // Both files must be intact on disk with distinct content
    const content1 = fs.readFileSync(path.join(targetDir, 'invoice.pdf'), 'utf8');
    const content2 = fs.readFileSync(path.join(targetDir, res2.fileName), 'utf8');
    Assert.equal(content1, 'FIRST-INVOICE-CONTENT');
    Assert.equal(content2, 'SECOND-INVOICE-DIFFERENT-CONTENT');
  });

  harness.it('F30.2: Filename collision with identical content avoids rewrite and re-indexes hash', () => {
    const targetDir = path.join(testRootDir, 'identical-collision-test');
    fs.mkdirSync(targetDir, { recursive: true });

    const sourceFile = path.join(testRootDir, 'source_same.pdf');
    fs.writeFileSync(sourceFile, 'EXACT-SAME-FILE-CONTENT');

    const tracker = new ArtifactTracker();
    const res1 = tracker.processAndSaveArtifact(sourceFile, targetDir, 'report.pdf');
    Assert.equal(res1.isDuplicate, false);

    // Reset tracker memory
    tracker.clear();

    // Process again
    const res2 = tracker.processAndSaveArtifact(sourceFile, targetDir, 'report.pdf');
    Assert.equal(res2.isDuplicate, false);
    Assert.equal(res2.fileName, 'report.pdf', 'Re-uses original filename without suffixing');
    Assert.ok(tracker.hasHash(res2.hash), 'Hash is registered in tracker');
  });

  harness.it('F30.3: Multi-portal isolation guarantees separate subfolders without crosstalk', () => {
    const baseDir = path.join(testRootDir, 'multi-portal');
    const portalAlphaDir = resolvePortalStorageDir(baseDir, 'Portal Alpha');
    const portalBetaDir = resolvePortalStorageDir(baseDir, 'Portal Beta');

    fs.mkdirSync(portalAlphaDir, { recursive: true });
    fs.mkdirSync(portalBetaDir, { recursive: true });

    const fileAlpha = path.join(testRootDir, 'alpha_doc.pdf');
    const fileBeta = path.join(testRootDir, 'beta_doc.pdf');
    fs.writeFileSync(fileAlpha, 'ALPHA-PORTAL-DATA');
    fs.writeFileSync(fileBeta, 'BETA-PORTAL-DATA');

    const trackerAlpha = new ArtifactTracker();
    const trackerBeta = new ArtifactTracker();

    trackerAlpha.processAndSaveArtifact(fileAlpha, portalAlphaDir, 'statement.pdf');
    trackerBeta.processAndSaveArtifact(fileBeta, portalBetaDir, 'statement.pdf');

    Assert.ok(fs.existsSync(path.join(portalAlphaDir, 'statement.pdf')));
    Assert.ok(fs.existsSync(path.join(portalBetaDir, 'statement.pdf')));

    const alphaContent = fs.readFileSync(path.join(portalAlphaDir, 'statement.pdf'), 'utf8');
    const betaContent = fs.readFileSync(path.join(portalBetaDir, 'statement.pdf'), 'utf8');
    Assert.equal(alphaContent, 'ALPHA-PORTAL-DATA');
    Assert.equal(betaContent, 'BETA-PORTAL-DATA');
    Assert.notEqual(portalAlphaDir, portalBetaDir, 'Portals reside in completely isolated subfolders');
  });
});

module.exports = { harness };
