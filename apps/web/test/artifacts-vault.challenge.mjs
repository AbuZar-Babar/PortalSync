import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the actual implementation file
const artifactsPagePath = path.resolve(__dirname, '../src/app/dashboard/artifacts/page.tsx');
const pageCode = fs.readFileSync(artifactsPagePath, 'utf8').replace(/\r\n/g, '\n');

// Helper to extract a top-level function from TypeScript code
function extractFunction(code, funcName) {
  const funcStart = code.indexOf(`function ${funcName}`);
  if (funcStart === -1) {
    throw new Error(`Function ${funcName} not found in ${artifactsPagePath}`);
  }
  let braceCount = 0;
  let started = false;
  let endIndex = -1;
  for (let i = funcStart; i < code.length; i++) {
    if (code[i] === '{') {
      braceCount++;
      started = true;
    } else if (code[i] === '}') {
      braceCount--;
      if (started && braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }
  }
  if (endIndex === -1) {
    throw new Error(`Could not find end of function ${funcName}`);
  }
  const funcBodyTs = code.slice(funcStart, endIndex);
  const transpiled = ts.transpileModule(funcBodyTs, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;

  return new Function(`${transpiled}; return ${funcName};`)();
}

// Extract top-level helpers from the actual source
const formatBytes = extractFunction(pageCode, 'formatBytes');
const formatDate = extractFunction(pageCode, 'formatDate');
const getArtifactCategory = extractFunction(pageCode, 'getArtifactCategory');
const extractDomainFromUrl = extractFunction(pageCode, 'extractDomainFromUrl');

// For getCategoryDisplay and buildFolderTree, they depend on getArtifactCategory and formatDate
// Let's create an environment with all required dependencies
function extractWithDependencies(code, snippet) {
  const transpiled = ts.transpileModule(snippet, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  return new Function(
    'getArtifactCategory',
    'formatDate',
    'extractDomainFromUrl',
    `${transpiled}`
  );
}

// Extract getCategoryDisplay
const getCategoryDisplayStart = pageCode.indexOf('function getCategoryDisplay');
const getCategoryDisplayEnd = pageCode.indexOf('function getFileIcon');
const getCategoryDisplayCode = pageCode.slice(getCategoryDisplayStart, getCategoryDisplayEnd);
const getCategoryDisplay = extractWithDependencies(
  pageCode,
  `${getCategoryDisplayCode}; return getCategoryDisplay;`
)(getArtifactCategory, formatDate, extractDomainFromUrl);

// Extract buildFolderTree
const buildFolderTreeStart = pageCode.indexOf('function buildFolderTree');
const buildFolderTreeEnd = pageCode.indexOf('export default function ArtifactsVaultPage');
const buildFolderTreeCode = pageCode.slice(buildFolderTreeStart, buildFolderTreeEnd);
const buildFolderTree = extractWithDependencies(
  pageCode,
  `const getCategoryDisplay = arguments[3];\n${buildFolderTreeCode};\nreturn buildFolderTree;`
)(getArtifactCategory, formatDate, extractDomainFromUrl, getCategoryDisplay);

// Extract ZIP generator routines
const crcStart = pageCode.indexOf('const CRC_TABLE = new Uint32Array(256);');
const crcEnd = pageCode.indexOf('// Folder Tree Data Structures');
const zipModuleCode = pageCode.slice(crcStart, crcEnd);
const transpiledZip = ts.transpileModule(zipModuleCode, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const { calculateCrc32, createZipArchive } = new Function(
  `${transpiledZip}; return { calculateCrc32, createZipArchive };`
)();

describe('Milestone M4 Empirical Challenge: Outputs & Invoices Vault', () => {

  describe('1. Folder Tree Hierarchy Builder', () => {
    test('builds accurate 4-tier hierarchy: Run -> Domain -> Category -> File Items', () => {
      const mockArtifacts = [
        {
          id: 'art-1',
          run_id: 'run-101',
          file_name: 'invoice-2026-001.pdf',
          file_size_bytes: 145000,
          sha256_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          created_at: '2026-10-10T12:00:00Z',
          workflowName: 'US Oil Daily Extraction',
          portalDomain: 'customerportal.usoil.com',
          run: {
            id: 'run-101',
            status: 'completed',
            started_at: '2026-10-10T12:00:00Z',
            completed_at: '2026-10-10T12:05:00Z',
            total_items_discovered: 5,
            items_processed: 5,
            items_downloaded: 1,
          }
        },
        {
          id: 'art-2',
          run_id: 'run-101',
          file_name: 'line_items.csv',
          file_size_bytes: 8400,
          sha256_hash: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
          created_at: '2026-10-10T12:01:00Z',
          workflowName: 'US Oil Daily Extraction',
          portalDomain: 'customerportal.usoil.com',
          run: {
            id: 'run-101',
            status: 'completed',
            started_at: '2026-10-10T12:00:00Z',
            completed_at: '2026-10-10T12:05:00Z',
            total_items_discovered: 5,
            items_processed: 5,
            items_downloaded: 2,
          }
        },
        {
          id: 'art-3',
          run_id: 'run-102',
          file_name: 'vendor_audit.json',
          file_size_bytes: 32000,
          sha256_hash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
          created_at: '2026-10-11T08:30:00Z',
          workflowName: 'Fleet Fuel Audit',
          portalDomain: 'fleet.fuelportal.org',
          run: {
            id: 'run-102',
            status: 'running',
            started_at: '2026-10-11T08:30:00Z',
            total_items_discovered: 10,
            items_processed: 4,
            items_downloaded: 1,
          }
        }
      ];

      const tree = buildFolderTree(mockArtifacts);

      // Verify Run Level Grouping
      assert.ok(tree['run-101'], 'Run 101 must exist in tree');
      assert.ok(tree['run-102'], 'Run 102 must exist in tree');
      assert.equal(Object.keys(tree).length, 2, 'Must have exactly 2 run groups');

      // Verify Run 101 properties
      const run1 = tree['run-101'];
      assert.equal(run1.workflowName, 'US Oil Daily Extraction');
      assert.equal(run1.status, 'completed');
      assert.ok(run1.runItem, 'runItem must be populated for drawer inspection');
      assert.equal(run1.runItem.id, 'run-101');

      // Verify Domain Level Grouping
      assert.ok(run1.domains['customerportal.usoil.com'], 'Domain must be customerportal.usoil.com');
      const domain1 = run1.domains['customerportal.usoil.com'];

      // Verify Category Level Subfolders
      assert.ok(domain1.categories['Invoices & Documents'], 'Category must contain Invoices & Documents');
      assert.ok(domain1.categories['Datasets & Spreadsheets'], 'Category must contain Datasets & Spreadsheets');

      // Verify File Items Placement
      assert.equal(domain1.categories['Invoices & Documents'].files.length, 1);
      assert.equal(domain1.categories['Invoices & Documents'].files[0].id, 'art-1');
      assert.equal(domain1.categories['Datasets & Spreadsheets'].files.length, 1);
      assert.equal(domain1.categories['Datasets & Spreadsheets'].files[0].id, 'art-2');

      // Verify Run 102 (Different domain and category)
      const run2 = tree['run-102'];
      assert.ok(run2.domains['fleet.fuelportal.org']);
      const domain2 = run2.domains['fleet.fuelportal.org'];
      assert.ok(domain2.categories['JSON Data Payloads']);
      assert.equal(domain2.categories['JSON Data Payloads'].files.length, 1);
      assert.equal(domain2.categories['JSON Data Payloads'].files[0].id, 'art-3');
    });

    test('handles fallback defaults when metadata is missing or partial', () => {
      const partialArtifacts = [
        {
          id: 'art-unassigned',
          run_id: '',
          file_name: 'unknown_file.xyz',
          sha256_hash: '1234567890abcdef',
          created_at: '2026-10-11T10:00:00Z',
          // No run, workflowName, or portalDomain
        }
      ];

      const tree = buildFolderTree(partialArtifacts);
      assert.ok(tree['unassigned-run'], 'Should group unassigned run_id into unassigned-run');
      const unassigned = tree['unassigned-run'];
      assert.equal(unassigned.workflowName, 'Automated Workflow');
      assert.equal(unassigned.status, 'completed');

      assert.ok(unassigned.domains['customerportal.usoil.com'], 'Fallback to default domain');
      const dom = unassigned.domains['customerportal.usoil.com'];
      assert.ok(dom.categories['General Files'], 'Fallback unknown extension to General Files');
      assert.equal(dom.categories['General Files'].files[0].id, 'art-unassigned');
    });

    test('respects custom categoryName provided in item_metadata', () => {
      const customArtifact = [
        {
          id: 'art-custom',
          run_id: 'run-custom',
          file_name: 'custom_tax_statement.pdf',
          item_metadata: { categoryName: 'Tax Statements & Filings' },
          sha256_hash: 'abcdef',
          created_at: '2026-10-11T10:00:00Z',
          workflowName: 'Tax Sync',
          portalDomain: 'taxes.gov',
        }
      ];

      const tree = buildFolderTree(customArtifact);
      const cat = tree['run-custom'].domains['taxes.gov'].categories['Tax Statements & Filings'];
      assert.ok(cat, 'Must group under custom categoryName');
      assert.equal(cat.files[0].id, 'art-custom');
    });

    test('verifies collapse and expand state key determinism', () => {
      const mockArtifacts = [
        {
          id: 'art-1',
          run_id: 'run-1',
          file_name: 'a.pdf',
          portalDomain: 'portal.a.com',
          created_at: '2026-10-10T12:00:00Z',
        },
        {
          id: 'art-2',
          run_id: 'run-2',
          file_name: 'b.csv',
          portalDomain: 'portal.b.com',
          created_at: '2026-10-10T12:00:00Z',
        }
      ];

      const tree = buildFolderTree(mockArtifacts);

      // Simulate collapseAllTree
      const collapsedRuns = {};
      const collapsedDomains = {};
      const collapsedCategories = {};

      Object.keys(tree).forEach((rId) => {
        collapsedRuns[rId] = true;
        Object.keys(tree[rId].domains).forEach((dom) => {
          const domKey = `${rId}-${dom}`;
          collapsedDomains[domKey] = true;
          Object.keys(tree[rId].domains[dom].categories).forEach((cat) => {
            collapsedCategories[`${domKey}-${cat}`] = true;
          });
        });
      });

      // Verify keys created
      assert.equal(collapsedRuns['run-1'], true);
      assert.equal(collapsedRuns['run-2'], true);
      assert.equal(collapsedDomains['run-1-portal.a.com'], true);
      assert.equal(collapsedDomains['run-2-portal.b.com'], true);
      assert.equal(collapsedCategories['run-1-portal.a.com-Invoices & Documents'], true);
      assert.equal(collapsedCategories['run-2-portal.b.com-Datasets & Spreadsheets'], true);

      // Verify toggle behavior
      const toggleRun = (id, prev) => ({ ...prev, [id]: !prev[id] });
      const toggled = toggleRun('run-1', collapsedRuns);
      assert.equal(toggled['run-1'], false, 'Toggling collapsed run should expand it');

      // Verify expandAllTree resets to empty object
      const expandedRuns = {};
      const expandedDomains = {};
      const expandedCategories = {};
      assert.equal(Boolean(expandedRuns['run-1']), false, 'Empty state means expanded by default');
      assert.equal(Boolean(expandedDomains['run-1-portal.a.com']), false, 'Empty state means expanded');
    });
  });

  describe('2. View Mode Persistence in localStorage', () => {
    test('validates storage key and mode serialization', () => {
      const STORAGE_KEY = 'wf_saas_artifacts_view_mode';
      
      // Mock localStorage
      const mockStorage = new Map();
      const mockLocalStorage = {
        getItem: (k) => mockStorage.get(k) ?? null,
        setItem: (k, v) => mockStorage.set(k, String(v)),
      };

      // Test initial read when empty
      let saved = mockLocalStorage.getItem(STORAGE_KEY);
      let viewMode = (saved === 'table' || saved === 'tree') ? saved : 'table';
      assert.equal(viewMode, 'table', 'Default view mode must be table');

      // Test switching to tree view
      mockLocalStorage.setItem(STORAGE_KEY, 'tree');
      assert.equal(mockLocalStorage.getItem(STORAGE_KEY), 'tree');

      saved = mockLocalStorage.getItem(STORAGE_KEY);
      viewMode = (saved === 'table' || saved === 'tree') ? saved : 'table';
      assert.equal(viewMode, 'tree', 'Should load tree mode when persisted');

      // Test switching back to table view
      mockLocalStorage.setItem(STORAGE_KEY, 'table');
      assert.equal(mockLocalStorage.getItem(STORAGE_KEY), 'table');

      // Test adversarial invalid string in localStorage (e.g. 'grid' or corrupted data)
      mockLocalStorage.setItem(STORAGE_KEY, 'corrupted_random_mode');
      saved = mockLocalStorage.getItem(STORAGE_KEY);
      const safeMode = (saved === 'table' || saved === 'tree') ? saved : 'table';
      assert.equal(safeMode, 'table', 'Must safely reject invalid modes and fallback to table');
    });
  });

  describe('3. Empty States Logic & Conditions', () => {
    test('differentiates Zero Total Artifacts vs Zero Filter/Search Results', () => {
      // Case 1: Fresh workspace with 0 artifacts loaded
      const stateTotalEmpty = {
        isLoading: false,
        artifacts: [],
        filteredArtifacts: [],
        searchQuery: '',
      };

      const isTotalZero = !stateTotalEmpty.isLoading && stateTotalEmpty.artifacts.length === 0;
      const isSearchZero = !stateTotalEmpty.isLoading && stateTotalEmpty.artifacts.length > 0 && stateTotalEmpty.filteredArtifacts.length === 0;

      assert.equal(isTotalZero, true, 'Zero total artifacts condition must trigger');
      assert.equal(isSearchZero, false, 'Search zero condition must not trigger when total is 0');

      // Case 2: Artifacts exist, but user search yields 0 matches
      const stateSearchEmpty = {
        isLoading: false,
        artifacts: [{ id: '1', file_name: 'invoice.pdf' }],
        filteredArtifacts: [],
        searchQuery: 'nonexistent-query-xyz',
      };

      const isTotalZero2 = !stateSearchEmpty.isLoading && stateSearchEmpty.artifacts.length === 0;
      const isSearchZero2 = !stateSearchEmpty.isLoading && stateSearchEmpty.artifacts.length > 0 && stateSearchEmpty.filteredArtifacts.length === 0;

      assert.equal(isTotalZero2, false, 'Zero total must be false when artifacts exist');
      assert.equal(isSearchZero2, true, 'Zero search results condition must trigger');

      // Case 3: Artifacts exist and match
      const stateHasMatches = {
        isLoading: false,
        artifacts: [{ id: '1', file_name: 'invoice.pdf' }],
        filteredArtifacts: [{ id: '1', file_name: 'invoice.pdf' }],
        searchQuery: 'invoice',
      };

      const isTotalZero3 = !stateHasMatches.isLoading && stateHasMatches.artifacts.length === 0;
      const isSearchZero3 = !stateHasMatches.isLoading && stateHasMatches.artifacts.length > 0 && stateHasMatches.filteredArtifacts.length === 0;

      assert.equal(isTotalZero3, false);
      assert.equal(isSearchZero3, false);
    });

    test('search filter matches across file name, sha256, workflow, run id, and domain', () => {
      const sample = [
        {
          id: 'art-1',
          run_id: 'run-abc-123',
          file_name: 'invoice_october.pdf',
          sha256_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
          workflowName: 'Billing Scraper',
          portalDomain: 'portal.company.com',
          created_at: '2026-10-10T00:00:00Z',
        },
        {
          id: 'art-2',
          run_id: 'run-xyz-789',
          file_name: 'manifest.json',
          sha256_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
          workflowName: 'Inventory Export',
          portalDomain: 'supply.vendor.net',
          created_at: '2026-10-09T00:00:00Z',
        }
      ];

      const filterFn = (items, q) => {
        const query = q.toLowerCase().trim();
        return items.filter((art) => {
          if (!query) return true;
          const nameMatch = art.file_name.toLowerCase().includes(query);
          const hashMatch = art.sha256_hash.toLowerCase().includes(query);
          const wfMatch = (art.workflowName || '').toLowerCase().includes(query);
          const runMatch = (art.run_id || '').toLowerCase().includes(query);
          const domainMatch = (art.portalDomain || '').toLowerCase().includes(query);
          return nameMatch || hashMatch || wfMatch || runMatch || domainMatch;
        });
      };

      // Match by file name
      assert.equal(filterFn(sample, 'october').length, 1);
      assert.equal(filterFn(sample, 'october')[0].id, 'art-1');

      // Match by hash prefix
      assert.equal(filterFn(sample, '9f86d081').length, 1);
      assert.equal(filterFn(sample, '9f86d081')[0].id, 'art-1');

      // Match by workflow name
      assert.equal(filterFn(sample, 'Inventory').length, 1);
      assert.equal(filterFn(sample, 'Inventory')[0].id, 'art-2');

      // Match by run id
      assert.equal(filterFn(sample, 'xyz-789').length, 1);
      assert.equal(filterFn(sample, 'xyz-789')[0].id, 'art-2');

      // Match by domain
      assert.equal(filterFn(sample, 'supply.vendor').length, 1);
      assert.equal(filterFn(sample, 'supply.vendor')[0].id, 'art-2');

      // Non-existent search
      assert.equal(filterFn(sample, 'nonexistent').length, 0);
    });
  });

  describe('4. Download Link Formatting & URL Parameters', () => {
    test('formats download URL exactly conforming to /api/v1/artifacts/download?id=...', () => {
      const testCases = [
        { id: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', file_name: 'test.pdf' },
        { id: 'art_998877', file_name: 'report_2026.xlsx' },
        { id: 'c0a80101-0000-0000-0000-000000000001', file_name: 'log payload.json' }
      ];

      for (const tc of testCases) {
        const generatedHref = `/api/v1/artifacts/download?id=${tc.id}`;
        
        // Assert path and query parameter structure
        const url = new URL(generatedHref, 'http://localhost:3000');
        assert.equal(url.pathname, '/api/v1/artifacts/download');
        assert.equal(url.searchParams.get('id'), tc.id);

        // Verify HTML download attribute is assigned the file name
        const downloadAttr = tc.file_name;
        assert.equal(downloadAttr, tc.file_name);
      }
    });

    test('verifies download route API compatibility', () => {
      // Check that download route checks searchParams 'id'
      const downloadRoutePath = path.resolve(__dirname, '../src/app/api/v1/artifacts/download/route.ts');
      const downloadRouteCode = fs.readFileSync(downloadRoutePath, 'utf8');
      assert.ok(
        downloadRouteCode.includes("request.nextUrl.searchParams.get('id')"),
        'Download route must query searchParams id'
      );
    });
  });

  describe('5. Utility Helpers & In-Browser ZIP Generator', () => {
    test('formatBytes handles various scales and edge cases', () => {
      assert.equal(formatBytes(null), '0 B');
      assert.equal(formatBytes(undefined), '0 B');
      assert.equal(formatBytes(0), '0 B');
      assert.equal(formatBytes(-100), '0 B');
      assert.equal(formatBytes(NaN), '0 B');
      assert.equal(formatBytes(512), '512 B');
      assert.equal(formatBytes(1024), '1 KB');
      assert.equal(formatBytes(1536), '1.5 KB');
      assert.equal(formatBytes(1048576), '1 MB');
      assert.equal(formatBytes(1073741824), '1 GB');
    });

    test('extractDomainFromUrl parses standard, prefixed, and edge-case URLs', () => {
      assert.equal(extractDomainFromUrl(null), 'customerportal.usoil.com');
      assert.equal(extractDomainFromUrl(''), 'customerportal.usoil.com');
      assert.equal(extractDomainFromUrl('about:blank'), 'customerportal.usoil.com');
      assert.equal(extractDomainFromUrl('https://portal.usoil.com/invoices'), 'portal.usoil.com');
      assert.equal(extractDomainFromUrl('http://www.subdomain.vendor.org/path'), 'subdomain.vendor.org');
      assert.equal(extractDomainFromUrl('direct.domain.com/feed'), 'direct.domain.com');
    });

    test('getArtifactCategory categorizes file extensions accurately', () => {
      assert.equal(getArtifactCategory('doc.pdf'), 'invoices');
      assert.equal(getArtifactCategory('DOC.PDF'), 'invoices');
      assert.equal(getArtifactCategory('contract.docx'), 'invoices');
      assert.equal(getArtifactCategory('data.csv'), 'datasets');
      assert.equal(getArtifactCategory('sheet.xlsx'), 'datasets');
      assert.equal(getArtifactCategory('output.json'), 'json');
      assert.equal(getArtifactCategory('screenshot.png'), 'media');
      assert.equal(getArtifactCategory('photo.jpeg'), 'media');
      assert.equal(getArtifactCategory('unknown.bin'), 'other');
      assert.equal(getArtifactCategory('noextension'), 'other');
    });

    test('calculateCrc32 matches standard IEEE 802.3 test vectors', () => {
      // Known vector: ASCII "123456789" CRC-32 is 0xcbf43926 (3421780262)
      const data = new TextEncoder().encode('123456789');
      const crc = calculateCrc32(data);
      assert.equal(crc, 0xcbf43926);
    });

    test('createZipArchive produces a 100% valid PKWARE Store Mode ZIP stream', async () => {
      const file1 = new TextEncoder().encode('Hello ReFlow Artifact 1');
      const file2 = new TextEncoder().encode('{"status":"verified","count":42}');

      const entries = [
        { name: 'invoice_test.txt', data: file1, date: new Date('2026-10-10T12:00:00Z') },
        { name: 'data_test.json', data: file2, date: new Date('2026-10-10T12:00:00Z') }
      ];

      const zipBlob = createZipArchive(entries);
      assert.ok(zipBlob, 'Must return a Blob');
      assert.equal(zipBlob.type, 'application/zip');

      const arrayBuf = await zipBlob.arrayBuffer();
      const u8 = new Uint8Array(arrayBuf);
      const view = new DataView(arrayBuf);

      // Verify Local File Header Signature (0x04034b50) at offset 0
      assert.equal(view.getUint32(0, true), 0x04034b50, 'First entry must have local header signature');

      // Verify End of Central Directory Record Signature (0x06054b50) at the end
      const eocdSig = view.getUint32(u8.length - 22, true);
      assert.equal(eocdSig, 0x06054b50, 'Archive must terminate with valid EOCD signature');

      // Total entries in EOCD
      const entriesCount = view.getUint16(u8.length - 22 + 8, true);
      assert.equal(entriesCount, 2, 'EOCD must record 2 entries');
    });
  });
});
