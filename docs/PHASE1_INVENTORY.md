# PHASE 1 CLEANUP INVENTORY

Generated: 2026-10-13T19:03:14.961Z  
Monorepo Root: `Workflow-Capture-SaaS`  
Active Branch: `chore/phase1-cleanup`  
Canonical Product: **ReFlow** (`@reflow`, `REFLOW_`)

---

## 0. Baseline Test & Build Results

| Check | Target / Command | Result | Details |
| :--- | :--- | :--- | :--- |
| **Package Installation** | `npm install` | **PASS** | 728 packages audited, 0 blocking install errors |
| **Engine Tests** | `npm test --prefix packages/engine` | **PASS** | **68 / 68 passing** (0 failing, 0 skipped), duration ~42.2s |
| **Web App Build** | `npm run build --prefix apps/web` | **PASS** | Compiled in 15.5s, TypeScript checked in 11.7s, **18 / 18 static pages generated** |
| **Web App Lint** | `npm run lint --prefix apps/web` | **BASELINE FAIL** | 84 problems (55 errors, 29 warnings) in pre-existing React 19 / ESLint 9 rules |

> **Note on Baseline Lint:** The 84 pre-existing ESLint issues are existing code constraints (ref access in `VisualWorkflowEditor.tsx`, state setting in `DashboardContext.tsx`). Phase 1 will not introduce regressions to this baseline.

---

## 1. Inventory Summary

| Category | Description | Hit Count |
| :--- | :--- | :--- |
| **2a. Hardcoded Machine / Absolute Paths** | Hardcoded developer absolute paths, worktrees, and debug drives | 14 |
| **2b. Personal Identity & Fake Defaults** | Developer name, personal email, invented hostnames & platforms | 25 |
| **2c. Customer / Domain Profiles** | CityMart customer profile files and references | 93 |
| **2d(i). Legacy Names — Comments & Docs** | Comments, JSDoc headers, and markdown documentation | 79 |
| **2d(ii). Legacy Names — UI Strings** | User-facing labels, badges, headers, and theme classes | 271 |
| **2d(iii). Legacy Names — Packages & Imports** | Package names in `package.json` and import specifiers | 3 |
| **2d(iv). Legacy Names — Environment Variables** | `PORTALSYNC_*` env variables | 16 |
| **2d(v). Legacy Names — CI & Electron App Metadata** | GitHub actions, Electron `appId`, `productName`, installer artifacts | 34 |
| **2d(vi). Legacy Names — Default Folders / Files** | `~/Downloads/PortalSync`, `C:\FlowMind\Invoices`, etc. | 12 |
| **2d(vii). Legacy Names — Storage & Config Keys** | `localStorage`, `sessionStorage`, config keys, `window.portalsync` | 41 |
| **2d(viii). Legacy Names — Code Internals** | Internal channel identifiers and HTTP headers (`X-FlowMind-Signature`, `__flowmindBroadcast`) | 227 |
| **2e. Stray & Duplicate Files** | Duplicate HTML test fixtures and stray scripts (REPORT ONLY) | 4 |

---

## 2. Detailed Findings by Category

### 2a. Hardcoded Absolute or Machine-Specific Paths

Hardcoded machine paths, developer worktrees, and fixed drive locations.

**Total hits:** 14

| File:Line | Content snippet |
| :--- | :--- |
| `.gitignore:7` | `.agents/` |
| `apps/desktop/src/main/http-bridge.js:21` | `path.resolve(__dirname, '../../../../../Workflow-Capture-agent-worktrees/multi-agent-integration/node_modules'),` |
| `apps/desktop/src/main/http-bridge.js:22` | `path.resolve(__dirname, '../../../../Workflow-Capture-agent-worktrees/multi-agent-integration/node_modules'),` |
| `apps/desktop/src/main/http-bridge.js:23` | `path.resolve(__dirname, '../../../../../Workflow-Capture-agent-worktrees/main/node_modules'),` |
| `apps/desktop/src/main/http-bridge.js:26` | `path.resolve('C:/Users/AbuZar/Desktop/Fyp/Workflow-Capture-agent-worktrees/multi-agent-integration/node_modules')` |
| `apps/desktop/test-http-bridge.js:24` | `path.resolve(__dirname, '../../../Workflow-Capture-agent-worktrees/multi-agent-integration/node_modules'),` |
| `apps/desktop/test-http-bridge.js:25` | `path.resolve(__dirname, '../../Workflow-Capture-agent-worktrees/multi-agent-integration/node_modules'),` |
| `apps/desktop/test-http-bridge.js:26` | `path.resolve(__dirname, '../../../Workflow-Capture-agent-worktrees/main/node_modules'),` |
| `apps/desktop/test-http-bridge.js:29` | `path.resolve('C:/Users/AbuZar/Desktop/Fyp/Workflow-Capture-agent-worktrees/multi-agent-integration/node_modules')` |
| `apps/web/src/app/api/v1/runners/download/route.ts:13` | `path.join('c:', 'Users', 'AbuZar', 'Desktop', 'Fyp', 'Workflow-Capture-SaaS', 'apps', 'desktop', 'dist', fileName),` |
| `apps/web/src/components/dashboard/CreatePortalModal.tsx:1167` | `placeholder="C:\FlowMind\Invoices or /Users/name/Invoices"` |
| `apps/web/src/components/dashboard/CreatePortalModal.tsx:1290` | `placeholder="C:\FlowMind\Invoices or /Users/name/Invoices"` |
| `packages/engine/src/runner/runner.test.js:232` | `storage_path: 'C:/Downloads/PortalSync/local_invoice.pdf',` |
| `packages/engine/src/runner/runner.test.js:236` | `assert.strictEqual(artifactPayload.storage_path, 'C:/Downloads/PortalSync/local_invoice.pdf');` |

### 2b. Personal Identity & Fake Defaults

Developer identity (AbuZar Babar, personal email), fake hostnames (AbuZar-Laptop), and hardcoded version strings.

**Total hits:** 25

| File:Line | Content snippet |
| :--- | :--- |
| `apps/desktop/src/main/http-bridge.js:26` | `path.resolve('C:/Users/AbuZar/Desktop/Fyp/Workflow-Capture-agent-worktrees/multi-agent-integration/node_modules')` |
| `apps/desktop/test-http-bridge.js:29` | `path.resolve('C:/Users/AbuZar/Desktop/Fyp/Workflow-Capture-agent-worktrees/multi-agent-integration/node_modules')` |
| `apps/web/src/app/api/v1/runners/download/route.ts:13` | `path.join('c:', 'Users', 'AbuZar', 'Desktop', 'Fyp', 'Workflow-Capture-SaaS', 'apps', 'desktop', 'dist', fileName),` |
| `apps/web/src/app/api/v1/runners/route.ts:63` | `platform: runnerMeta.platform \|\| 'Windows 11 x64',` |
| `apps/web/src/app/api/v1/runners/route.ts:64` | `engineVersion: runnerMeta.version \|\| 'v1.4.0 (Enterprise Engine)',` |
| `apps/web/src/app/api/v1/runners/route.ts:123` | `platform: body.platform \|\| request.headers.get('x-runner-platform') \|\| existingMeta.platform \|\| 'Windows 11 x64',` |
| `apps/web/src/app/api/v1/runners/route.ts:124` | `version: body.version \|\| request.headers.get('x-runner-version') \|\| existingMeta.version \|\| 'v1.4.0 (Enterprise Engin...` |
| `apps/web/src/app/dashboard/runners/page.tsx:246` | `hostname: r.hostname \|\| 'AbuZar-Laptop',` |
| `apps/web/src/app/dashboard/runners/page.tsx:249` | `platform: r.platform \|\| 'Windows 11 x64',` |
| `apps/web/src/app/dashboard/runners/page.tsx:250` | `engineVersion: r.engineVersion \|\| 'v1.4.0 (Enterprise Engine)',` |
| `apps/web/src/app/dashboard/runners/page.tsx:292` | `hostname: meta.hostname \|\| (isOnline ? 'AbuZar-Laptop' : 'FlowMind Desktop Worker'),` |
| `apps/web/src/app/dashboard/runners/page.tsx:295` | `platform: meta.platform \|\| 'Windows 11 x64',` |
| `apps/web/src/app/dashboard/runners/page.tsx:296` | `engineVersion: meta.version \|\| 'v1.4.0 (Enterprise Engine)',` |
| `apps/web/src/app/dashboard/runners/page.tsx:332` | `platform: 'Windows 11 x64',` |
| `apps/web/src/app/dashboard/runners/page.tsx:333` | `engineVersion: 'v1.4.0 (Enterprise Engine)',` |
| `apps/web/src/lib/auth/runner-auth.ts:223` | `hostname: incomingHostname \|\| currentMeta.hostname \|\| 'AbuZar-Laptop',` |
| `apps/web/src/lib/auth/runner-auth.ts:224` | `platform: incomingPlatform \|\| currentMeta.platform \|\| 'Windows 11 x64',` |
| `apps/web/src/lib/auth/runner-auth.ts:225` | `version: incomingVersion \|\| currentMeta.version \|\| 'v1.4.0 (Enterprise Engine)',` |
| `apps/web/test/theming-system.challenge.mjs:191` | `platform: 'Windows 11 x64',` |
| `packages/engine/src/auth/auth-controller.js:150` | `let user = db.findOne('users', u => u.email === 'abuzarbabar53@gmail.com');` |
| `packages/engine/src/auth/auth-controller.js:158` | `username: 'Abuzar Babar',` |
| `packages/engine/src/auth/auth-controller.js:159` | `email: 'abuzarbabar53@gmail.com',` |
| `packages/engine/src/dashboard/public/report.html:734` | `<span class="author-val">AbuZar Babar</span>` |
| `packages/engine/src/runner/cloud-client.js:70` | `headers['x-runner-version'] = 'v1.4.0 (Enterprise Engine)';` |
| `packages/engine/src/runner/cloud-client.js:403` | `version: 'v1.4.0 (Enterprise Engine)',` |

### 2c. Customer & Portal Profiles (CityMart)

CityMart domain profile definition and references across the engine and dashboard.

**Total hits:** 93

| File:Line | Content snippet |
| :--- | :--- |
| `apps/web/src/app/dashboard/settings/page.tsx:275` | `name: 'ERP / CityMart (Patient Polling & Async Grids)',` |
| `apps/web/src/app/dashboard/settings/page.tsx:483` | `name: 'CityMart Supplier Portal',` |
| `apps/web/src/app/dashboard/settings/page.tsx:484` | `targetDomain: 'supplier.citymart.com',` |
| `apps/web/src/app/dashboard/settings/page.tsx:485` | `placeholder: '{{secret:citymart_auth}}',` |
| `packages/engine/src/api/bot-config-controller.js:125` | `name: 'ERP / CityMart (Patient Polling & Async Grids)',` |
| `packages/engine/src/profiles/citymart.profile.js:1` | `/**` |
| `packages/engine/src/profiles/citymart.profile.js:2` | `* Workflow Capture — Citymart Domain Profile` |
| `packages/engine/src/profiles/citymart.profile.js:3` | `*` |
| `packages/engine/src/profiles/citymart.profile.js:4` | `* Encapsulates portal-specific conventions for Citymart (iRely i21):` |
| `packages/engine/src/profiles/citymart.profile.js:5` | `* - Voucher document prefixes (SI, INV, DR, TX, CM)` |
| `packages/engine/src/profiles/citymart.profile.js:6` | `* - ExtJS grid classes and checkbox selectors` |
| `packages/engine/src/profiles/citymart.profile.js:7` | `* - Default report naming conventions` |
| `packages/engine/src/profiles/citymart.profile.js:8` | `*` |
| `packages/engine/src/profiles/citymart.profile.js:9` | `* Core engine modules must NEVER contain these hardcoded patterns directly.` |
| `packages/engine/src/profiles/citymart.profile.js:10` | `* Instead, they query the active profile registry (if any profile is enabled).` |
| `packages/engine/src/profiles/citymart.profile.js:11` | `*/` |
| `packages/engine/src/profiles/citymart.profile.js:13` | `'use strict';` |
| `packages/engine/src/profiles/citymart.profile.js:15` | `const CitymartProfile = {` |
| `packages/engine/src/profiles/citymart.profile.js:16` | `id: 'citymart',` |
| `packages/engine/src/profiles/citymart.profile.js:17` | `name: 'Citymart / iRely i21 Web Portal',` |
| `packages/engine/src/profiles/citymart.profile.js:18` | `matchDomains: ['citymart.i21web.com', 'i21web.com'],` |
| `packages/engine/src/profiles/citymart.profile.js:20` | `// Document identification pattern` |
| `packages/engine/src/profiles/citymart.profile.js:21` | `documentIdRegex: /\b((?:SI\|INV\|DR\|TX\|CM)-\d+(?:[-_]\w+)*\|\b\d{5,10}\b)/i,` |
| `packages/engine/src/profiles/citymart.profile.js:23` | `// Document type classification` |
| `packages/engine/src/profiles/citymart.profile.js:24` | `classifyDocumentType(text) {` |
| `packages/engine/src/profiles/citymart.profile.js:25` | `if (!text) return null;` |
| `packages/engine/src/profiles/citymart.profile.js:26` | `if (/\bcredit\s*memo\b/i.test(text)) return 'Credit Memo';` |
| `packages/engine/src/profiles/citymart.profile.js:27` | `if (/\binvoice\b/i.test(text)) return 'Invoice';` |
| `packages/engine/src/profiles/citymart.profile.js:28` | `if (/\border\b/i.test(text)) return 'Order';` |
| `packages/engine/src/profiles/citymart.profile.js:29` | `return null;` |
| `packages/engine/src/profiles/citymart.profile.js:30` | `},` |
| `packages/engine/src/profiles/citymart.profile.js:32` | `// Known grid classes` |
| `packages/engine/src/profiles/citymart.profile.js:33` | `gridClasses: [` |
| `packages/engine/src/profiles/citymart.profile.js:34` | `'x-grid',` |
| `packages/engine/src/profiles/citymart.profile.js:35` | `'x-grid-row',` |
| `packages/engine/src/profiles/citymart.profile.js:36` | `'x-grid-cell',` |
| `packages/engine/src/profiles/citymart.profile.js:37` | `'x-grid-cell-special',` |
| `packages/engine/src/profiles/citymart.profile.js:38` | `'x-grid-cell-row-checker',` |
| `packages/engine/src/profiles/citymart.profile.js:39` | `'x-selmodel-column',` |
| `packages/engine/src/profiles/citymart.profile.js:40` | `'x-column-header-text'` |
| `packages/engine/src/profiles/citymart.profile.js:41` | `],` |
| `packages/engine/src/profiles/citymart.profile.js:43` | `// Generic export file naming` |
| `packages/engine/src/profiles/citymart.profile.js:44` | `genericFileNames: ['invoicemainreport.pdf', 'mainreport.pdf']` |
| `packages/engine/src/profiles/citymart.profile.js:45` | `};` |
| `packages/engine/src/profiles/citymart.profile.js:47` | `module.exports = CitymartProfile;` |
| `packages/engine/src/profiles/index.js:1` | `/**` |
| `packages/engine/src/profiles/index.js:2` | `* Workflow Capture — Domain Profile Registry` |
| `packages/engine/src/profiles/index.js:3` | `*` |
| `packages/engine/src/profiles/index.js:4` | `* Manages domain-specific profiles. The core engine is 100% generic by default.` |
| `packages/engine/src/profiles/index.js:5` | `* If a profile matches the target domain or is explicitly specified, profile-specific` |
| `packages/engine/src/profiles/index.js:6` | `* hints augment generic extraction.` |
| `packages/engine/src/profiles/index.js:7` | `*/` |
| `packages/engine/src/profiles/index.js:9` | `'use strict';` |
| `packages/engine/src/profiles/index.js:11` | `const citymartProfile = require('./citymart.profile');` |
| `packages/engine/src/profiles/index.js:13` | `const registeredProfiles = [citymartProfile];` |
| `packages/engine/src/profiles/index.js:15` | `class ProfileRegistry {` |
| `packages/engine/src/profiles/index.js:16` | `/**` |
| `packages/engine/src/profiles/index.js:17` | `* Find profile matching a given URL or hostname.` |
| `packages/engine/src/profiles/index.js:18` | `* Returns null if no profile matches (system runs in pure generic mode).` |
| `packages/engine/src/profiles/index.js:19` | `*/` |
| `packages/engine/src/profiles/index.js:20` | `static getProfileForUrl(url = '') {` |
| `packages/engine/src/profiles/index.js:21` | `if (!url) return null;` |
| `packages/engine/src/profiles/index.js:22` | `try {` |
| `packages/engine/src/profiles/index.js:23` | `const parsed = new URL(url.startsWith('http') ? url : \`https://${url}\`);` |
| `packages/engine/src/profiles/index.js:24` | `const hostname = parsed.hostname.toLowerCase();` |
| `packages/engine/src/profiles/index.js:25` | `for (const profile of registeredProfiles) {` |
| `packages/engine/src/profiles/index.js:26` | `if (profile.matchDomains && profile.matchDomains.some(d => hostname.includes(d.toLowerCase()))) {` |
| `packages/engine/src/profiles/index.js:27` | `return profile;` |
| `packages/engine/src/profiles/index.js:28` | `}` |
| `packages/engine/src/profiles/index.js:29` | `}` |
| `packages/engine/src/profiles/index.js:30` | `} catch {}` |
| `packages/engine/src/profiles/index.js:31` | `return null;` |
| `packages/engine/src/profiles/index.js:32` | `}` |
| `packages/engine/src/profiles/index.js:34` | `/**` |
| `packages/engine/src/profiles/index.js:35` | `* Get profile by ID` |
| `packages/engine/src/profiles/index.js:36` | `*/` |
| `packages/engine/src/profiles/index.js:37` | `static getProfileById(id = '') {` |
| `packages/engine/src/profiles/index.js:38` | `return registeredProfiles.find(p => p.id === id) \|\| null;` |
| `packages/engine/src/profiles/index.js:39` | `}` |
| `packages/engine/src/profiles/index.js:40` | `}` |
| `packages/engine/src/profiles/index.js:42` | `module.exports = ProfileRegistry;` |
| `packages/engine/src/recorder/index.js:8` | `*   npm run record -- --name citymart-search` |
| `packages/engine/test/download-deduplication.test.js:37` | `const testGenericWf = path.resolve(process.cwd(), 'downloads', 'citymart-generic-flow');` |
| `packages/engine/test/download-deduplication.test.js:45` | `d.workflowId !== 'wf_citymart_generic'` |
| `packages/engine/test/download-deduplication.test.js:301` | `workflowId: 'wf_citymart_generic',` |
| `packages/engine/test/download-deduplication.test.js:302` | `workflowName: 'Citymart Generic Flow',` |
| `packages/engine/test/download-deduplication.test.js:303` | `targetUrl: 'https://citymart.i21web.com/iRelyProd/login#home',` |
| `packages/engine/test/filter-api-runtime.test.js:64` | `url: () => 'https://citymart.i21web.com/portal',` |
| `packages/engine/test/row-filter-discrimination.test.js:89` | `{ type: 'NAVIGATE', url: 'https://citymart.i21web.com/search-invoices' },` |
| `packages/engine/test/table-expander-field-alignment.test.js:19` | `// Test 1: CityMart Complex Table with Checkbox + Expander Arrow` |
| `packages/engine/test/table-expander-field-alignment.test.js:22` | `console.log('🔹 Test 1: CityMart Complex Table (Checkbox + Expander Arrow + Invoice Columns)');` |
| `packages/engine/test/table-expander-field-alignment.test.js:33` | `function createCityMartComplexRow({ invNo, issued, due, amount, status, actionText = 'Download PDF' }) {` |
| `packages/engine/test/table-expander-field-alignment.test.js:148` | `const mockRowEl = createCityMartComplexRow({` |

## 2d. Legacy Product Names

### 2d(i). Comments and Doc Headers

Documentation, JSDoc blocks, and code comments referencing PortalSync, FlowMind, or Workflow-Capture.

**Total hits:** 79

| File:Line | Content snippet |
| :--- | :--- |
| `DESIGN.md:4` | `- **Product:** ReFlow (Autonomous Browser Automation & Workflow Capture Engine)` |
| `README.md:3` | `Autonomous enterprise browser automation and RPA platform. ReFlow bridges a modern cloud control plane with a local d...` |
| `apps/desktop/src/main/main.js:64` | `// Register custom protocol clients for deep linking (e.g. flowmind:// or portalsync://)` |
| `apps/web/src/app/globals.css:27` | `/* 1. FlowMind Cyber (Default Neon) */` |
| `docs/ARCHITECTURE.md:5` | `ReFlow is a hybrid enterprise browser automation and RPA platform designed for resilient web workflow capture, intell...` |
| `packages/engine/src/api/bot-config-controller.js:2` | `* Workflow Capture — Bot Configuration & Stealth API Controller` |
| `packages/engine/src/api/run-controller.js:2` | `* Workflow Capture — Run Execution API Controller` |
| `packages/engine/src/api/secret-controller.js:2` | `* Workflow Capture — Secret API Controller` |
| `packages/engine/src/auth/auth-controller.js:2` | `* Workflow Capture — Authentication Controller` |
| `packages/engine/src/auth/auth-middleware.js:2` | `* Workflow Capture — Authentication & Security Middleware` |
| `packages/engine/src/auth/password-util.js:2` | `* Workflow Capture — Password Hashing & Verification` |
| `packages/engine/src/auth/secret-util.js:2` | `* Workflow Capture — Secret Utility` |
| `packages/engine/src/auth/token-service.js:2` | `* Workflow Capture — JWT Token Service` |
| `packages/engine/src/dashboard/public/css/components.css:1022` | `#flowmindFloatingBot,` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:2` | `* FlowMind Floating Bot Assistant (Ultra-Lightweight & Non-Intrusive)` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:311` | `* FlowMind Human Disturbance Alert Styles` |
| `packages/engine/src/dashboard/public/css/variables.css:1` | `/* Workflow Capture — Clean SaaS Design Tokens` |
| `packages/engine/src/dashboard/public/js/api.js:2` | `* Workflow Capture — Centralized API Client` |
| `packages/engine/src/dashboard/public/js/auth.js:2` | `* Workflow Capture — Client-Side Authentication Manager` |
| `packages/engine/src/dashboard/public/js/components/executionModal.js:2` | `* Workflow Capture — Workflow Execution & Loop Review Modal` |
| `packages/engine/src/dashboard/public/js/components/header.js:2` | `* Workflow Capture — Header Component` |
| `packages/engine/src/dashboard/public/js/components/modal.js:2` | `* Workflow Capture — Step Inspector Modal Component` |
| `packages/engine/src/dashboard/public/js/components/robotAvatar.js:2` | `* FlowMind / Workflow Agent — Lightweight Robotic Assistant Avatar` |
| `packages/engine/src/dashboard/public/js/components/sidebar.js:2` | `* Workflow Capture — Sidebar Component` |
| `packages/engine/src/dashboard/public/js/components/theme.js:2` | `* Workflow Capture — Theme Component Re-export` |
| `packages/engine/src/dashboard/public/js/components/toast.js:2` | `* Workflow Capture — Toast Notifications Component` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:2` | `* FlowMind Floating Bot Assistant Component` |
| `packages/engine/src/dashboard/public/js/main.js:2` | `* Workflow Capture — Application Entry Point (Main SPA Initializer)` |
| `packages/engine/src/dashboard/public/js/router.js:2` | `* Workflow Capture — Client-Side Hash Router` |
| `packages/engine/src/dashboard/public/js/sse.js:2` | `* Workflow Capture — Server-Sent Events (SSE) Bus` |
| `packages/engine/src/dashboard/public/js/theme.js:2` | `* Workflow Capture — Global Theme Manager (Light / Dark Mode & Palette Support)` |
| `packages/engine/src/dashboard/public/js/utils/dom.js:2` | `* Workflow Capture — Centralized DOM & String Utilities` |
| `packages/engine/src/dashboard/public/js/views/artifactsView.js:2` | `* Workflow Capture — Modernized Files View (Artifacts / Downloads Vault)` |
| `packages/engine/src/dashboard/public/js/views/botConfigView.js:2` | `* Workflow Capture — Modernized Settings View` |
| `packages/engine/src/dashboard/public/js/views/consoleView.js:2` | `* Workflow Capture — Modernized Activity View` |
| `packages/engine/src/dashboard/public/js/views/executionView.js:2` | `* Workflow Capture — Live Execution View with Embedded Console & Step Progression` |
| `packages/engine/src/dashboard/public/js/views/overviewView.js:2` | `* Workflow Capture — Modernized Dashboard (Overview View)` |
| `packages/engine/src/dashboard/public/js/views/secretsView.js:2` | `* Workflow Capture — Modernized Secrets View` |
| `packages/engine/src/dashboard/public/js/views/workflowEditorView.js:2` | `* Workflow Capture — Modernized Workflow Editor View` |
| `packages/engine/src/dashboard/public/js/views/workflowsView.js:2` | `* Workflow Capture — Modern Workflows Library View` |
| `packages/engine/src/dashboard/server.js:2` | `* Workflow Capture — Interactive Web Dashboard Server Bootstrap` |
| `packages/engine/src/database/db.js:2` | `* Workflow Capture — Persistent JSON Database Store` |
| `packages/engine/src/engine/execution-state-machine.js:2` | `* Workflow Capture — Execution State Machine` |
| `packages/engine/src/engine/intent-resolver.js:2` | `* Workflow Capture — Runtime User Intent Resolver` |
| `packages/engine/src/engine/question-generator.js:2` | `* Workflow Capture — Intelligent Question Generator` |
| `packages/engine/src/engine/workflow-knowledge.js:2` | `* Workflow Capture — Generalized Workflow Knowledge Model` |
| `packages/engine/src/profiles/citymart.profile.js:2` | `* Workflow Capture — Citymart Domain Profile` |
| `packages/engine/src/profiles/index.js:2` | `* Workflow Capture — Domain Profile Registry` |
| `packages/engine/src/replay/download-manager.js:2` | `* Workflow Capture — Dedicated Download Manager & Validation Engine` |
| `packages/engine/src/replay/human-mouse.js:2` | `* Workflow Capture — Human-like Mouse Movement & Keystroke Dynamics` |
| `packages/engine/src/replay/interruption-handler.js:2` | `* Workflow Capture — Universal Exception & Interruption Handler` |
| `packages/engine/src/replay/loop-replay-runner.js:2` | `* Workflow Capture - Intelligent Replay & Batch Execution Runner` |
| `packages/engine/src/replay/pagination-manager.js:2` | `* Workflow Capture — Robust Pagination & Duplicate Protection Manager` |
| `packages/engine/src/replay/result-validator.js:2` | `* Workflow Capture — Result Validator & Execution Reporting Engine` |
| `packages/engine/src/replay/tab-manager.js:2` | `* Workflow Capture — Intelligent Tab & Window Manager` |
| `packages/engine/src/runner/cli.js:4` | `* PortalSync Desktop Runner CLI` |
| `packages/engine/src/runner/cli.js:6` | `* Command-line interface for the PortalSync desktop browser automation runner.` |
| `packages/engine/src/runner/cli.js:270` | `// 3. PortalSync Cloud API Connectivity Check` |
| `packages/engine/src/runner/cloud-client.js:2` | `* PortalSync Cloud Client` |
| `packages/engine/src/runner/cloud-client.js:5` | `* to the PortalSync Next.js Cloud Control Plane (/api/v1/).` |
| `packages/engine/src/runner/runner-daemon.js:2` | `* PortalSync Runner Daemon` |
| `packages/engine/src/shared/action-generalizer.js:2` | `* Workflow Capture — Recorded Action Generalizer` |
| `packages/engine/src/shared/auth-detector.js:2` | `* Workflow Capture — Session Authentication & Login Sequence Detector` |
| `packages/engine/src/shared/collection-detector.js:2` | `* Workflow Capture — Universal Collection Detector` |
| `packages/engine/src/shared/constants.js:2` | `* Shared constants for Workflow Capture & Replay Engine` |
| `packages/engine/src/shared/field-detector.js:2` | `* Workflow Capture — Semantic Field Detector` |
| `packages/engine/src/shared/filter-engine.js:2` | `* Workflow Capture — Universal Filter Engine` |
| `packages/engine/src/shared/item-discovery.js:2` | `* Workflow Capture — Deterministic Item Discovery` |
| `packages/engine/src/shared/loop-confidence-engine.js:2` | `* Workflow Capture — Loop Confidence Engine` |
| `packages/engine/src/shared/loop-detector.js:2` | `* Workflow Capture — Intelligent Loop & Repeating Pattern Detector` |
| `packages/engine/src/shared/repeating-pattern-detector.js:2` | `* Workflow Capture — Universal Repeating Pattern Detector` |
| `packages/engine/src/shared/runtime-contract.js:2` | `* Workflow Capture — Normalized Runtime Data Contract` |
| `packages/engine/src/shared/scanner.js:2` | `* Workflow Capture — Universal Deep Page Scanner` |
| `packages/engine/src/shared/types.js:2` | `* JSDoc Type Definitions for Workflow Capture & Replay` |
| `packages/engine/src/utils/errors.js:2` | `* Custom structured errors for Workflow Capture & Replay` |
| `packages/engine/src/utils/url-helper.js:30` | `* Checks if a given URL belongs to the Workflow Capture dashboard itself` |
| `packages/engine/test/adversarial/adversarial-engine.test.js:2` | `* Adversarial Stress & Edge Case Test Suite for FlowMind Engine` |
| `packages/engine/test/cross-portal-synthetic.test.js:2` | `* Workflow Capture — Universal Cross-Portal Synthetic Test Suite` |
| `packages/engine/test/download-deduplication.test.js:2` | `* Workflow Capture — Download Organization & Hybrid Deduplication Unit Tests` |

### 2d(ii). UI Strings and Visual Templates

User-facing display strings, headers, buttons, cards, toasts, and CSS classes.

**Total hits:** 271

| File:Line | Content snippet |
| :--- | :--- |
| `apps/desktop/scripts/build-all.js:20` | `console.log('  FlowMind Worker — Cross-Platform Build Runner');` |
| `apps/desktop/src/main/main.js:35` | `title: 'FlowMind Local Worker',` |
| `apps/desktop/src/main/main.js:222` | `label: \`FlowMind Local Worker (${statusLabel})\`,` |
| `apps/desktop/src/main/main.js:262` | `label: 'Quit FlowMind Worker',` |
| `apps/desktop/src/main/notifier.js:71` | `title: \`🎬 Workflow Captured — ${workflowName}\`,` |
| `apps/desktop/src/main/notifier.js:89` | `title: 'FlowMind Local Worker',` |
| `apps/desktop/src/renderer/app.js:394` | `if (confirm('Disconnect this local worker from your FlowMind workspace?')) {` |
| `apps/desktop/src/renderer/index.html:6` | `<title>FlowMind Local Worker</title>` |
| `apps/desktop/src/renderer/index.html:16` | `<span class="brand-name">FlowMind Worker</span>` |
| `apps/desktop/src/renderer/index.html:42` | `<p class="setup-desc">Link this computer to your FlowMind workspace to execute browser automation workflows.</p>` |
| `apps/desktop/src/renderer/index.html:224` | `<p class="pref-hint">PortalSync cloud server control plane endpoint.</p>` |
| `apps/web/src/app/dashboard/artifacts/page.tsx:856` | `const fallbackText = \`FlowMind Artifact Archive\nFile: ${art.file_name}\nSHA-256: ${art.sha256_hash}\nSize: ${art.fil...` |
| `apps/web/src/app/dashboard/artifacts/page.tsx:864` | `const errText = \`FlowMind Artifact: ${art.file_name}\nHash: ${art.sha256_hash}\n\`;` |
| `apps/web/src/app/dashboard/artifacts/page.tsx:874` | `vault: 'FlowMind Cloud Outputs & Invoices Vault',` |
| `apps/web/src/app/dashboard/artifacts/page.tsx:903` | `tempLink.download = \`flowmind-artifacts-${dateTag}.zip\`;` |
| `apps/web/src/app/dashboard/artifacts/page.tsx:1310` | `<span title="Synced to FlowMind Cloud Storage">` |
| `apps/web/src/app/dashboard/layout.tsx:56` | `<div className="min-h-screen flex bg-flowmind-canvas text-[var(--foreground,#f8fafc)] selection:bg-[rgba(var(--primar...` |
| `apps/web/src/app/dashboard/layout.tsx:72` | `<main className="flex-1 overflow-y-auto bg-flowmind-canvas p-6 lg:p-8">` |
| `apps/web/src/app/dashboard/runners/page.tsx:292` | `hostname: meta.hostname \|\| (isOnline ? 'AbuZar-Laptop' : 'FlowMind Desktop Worker'),` |
| `apps/web/src/app/dashboard/runners/page.tsx:329` | `hostname: 'FlowMind Desktop Worker',` |
| `apps/web/src/app/dashboard/runners/page.tsx:643` | `details: 'Port: 9222 \| Managed by FlowMind Worker Engine',` |
| `apps/web/src/app/dashboard/runners/page.tsx:741` | `const dockerCmd = \`docker run -d --net=host -e WORKER_TOKEN=${currentToken \|\| 'ps_live_token'} flowmind/worker:latest\`;` |
| `apps/web/src/app/dashboard/runners/page.tsx:1292` | `Google Chrome must be launched with remote debugging enabled so the FlowMind engine can automate browser tabs without...` |
| `apps/web/src/app/dashboard/runs/page.tsx:887` | `FlowMind CDP Engine` |
| `apps/web/src/app/dashboard/settings/page.tsx:61` | `\| 'flowmind-cyber'` |
| `apps/web/src/app/dashboard/settings/page.tsx:318` | `id: 'flowmind-cyber',` |
| `apps/web/src/app/dashboard/settings/page.tsx:319` | `name: 'FlowMind Cyber',` |
| `apps/web/src/app/dashboard/settings/page.tsx:409` | `orgName: 'FlowMind Automation',` |
| `apps/web/src/app/dashboard/settings/page.tsx:410` | `orgSlug: 'flowmind-automation',` |
| `apps/web/src/app/dashboard/settings/page.tsx:417` | `palette: 'flowmind-cyber',` |
| `apps/web/src/app/dashboard/settings/page.tsx:653` | `'flowmind-cyber',` |
| `apps/web/src/app/dashboard/settings/page.tsx:971` | `if (confirm('Restore all configurations to FlowMind recommended defaults?')) {` |
| `apps/web/src/app/dashboard/settings/page.tsx:1087` | `const vaultSeed = orgId \|\| 'flowmind_default_vault_seed';` |
| `apps/web/src/app/dashboard/settings/page.tsx:1228` | `return \`https://api.flowmind.io/v1/hooks/${orgPart}\`;` |
| `apps/web/src/app/dashboard/settings/page.tsx:1751` | `FlowMind` |
| `apps/web/src/app/dashboard/settings/page.tsx:2550` | `FlowMind will post payload updates to this endpoint whenever configured execution events trigger.` |
| `apps/web/src/app/dashboard/settings/page.tsx:2597` | `Used to sign requests with header <code className="text-cyan-400">x-flowmind-signature</code> for tamper-proof verifi...` |
| `apps/web/src/app/globals.css:28` | `[data-theme="flowmind-cyber"],` |
| `apps/web/src/app/globals.css:29` | `.theme-flowmind-cyber {` |
| `apps/web/src/app/globals.css:173` | `[data-mode="light"][data-theme="flowmind-cyber"],` |
| `apps/web/src/app/globals.css:174` | `.light.theme-flowmind-cyber {` |
| `apps/web/src/app/globals.css:250` | `--color-flowmind-canvas: var(--canvas-bg);` |
| `apps/web/src/app/globals.css:251` | `--color-flowmind-surface: var(--surface-bg);` |
| `apps/web/src/app/globals.css:252` | `--color-flowmind-sidebar: var(--sidebar-bg);` |
| `apps/web/src/app/globals.css:253` | `--color-flowmind-header: var(--header-bg);` |
| `apps/web/src/app/globals.css:254` | `--color-flowmind-border: var(--border-color);` |
| `apps/web/src/app/globals.css:255` | `--color-flowmind-cyan: var(--primary-color);` |
| `apps/web/src/app/globals.css:256` | `--color-flowmind-sky: #38bdf8;` |
| `apps/web/src/app/globals.css:257` | `--color-flowmind-indigo: var(--accent-color);` |
| `apps/web/src/app/globals.css:258` | `--color-flowmind-emerald: #10b981;` |
| `apps/web/src/app/globals.css:269` | `FlowMind Design Tokens & Ambient Theme Adaptation` |
| `apps/web/src/app/globals.css:272` | `.bg-flowmind-canvas {` |
| `apps/web/src/app/layout.tsx:33` | `var validPalettes = ['flowmind-cyber', 'charcoal-indigo', 'emerald-matrix', 'slate-dark', 'crimson-rose', 'forest'];` |
| `apps/web/src/app/layout.tsx:44` | `theme = 'flowmind-cyber';` |
| `apps/web/src/app/login/page.tsx:33` | `aria-label="FlowMind Home"` |
| `apps/web/src/app/login/page.tsx:36` | `<span className="text-xl font-extrabold tracking-tight text-white">FlowMind.</span>` |
| `apps/web/src/app/onboarding/page.tsx:127` | `aria-label="FlowMind Home"` |
| `apps/web/src/app/onboarding/page.tsx:130` | `<span className="text-xl font-extrabold tracking-tight text-white">FlowMind.</span>` |
| `apps/web/src/app/page.tsx:74` | `aria-label="FlowMind Home"` |
| `apps/web/src/app/page.tsx:77` | `<span className="text-base font-extrabold tracking-tight text-white">FlowMind.</span>` |
| `apps/web/src/app/page.tsx:161` | `Record what you do in Google Chrome once. FlowMind remembers your clicks and repeats your task in seconds with zero m...` |
| `apps/web/src/app/page.tsx:281` | `{/* 02 / How FlowMind Works (n8n-style Node Pipeline & Step Inspector) */}` |
| `apps/web/src/app/page.tsx:305` | `Launch the FlowMind operations console and create your first automated routine in minutes.` |
| `apps/web/src/app/page.tsx:341` | `<span className="font-extrabold text-white">FlowMind.</span>` |
| `apps/web/src/app/signup/page.tsx:39` | `aria-label="FlowMind Home"` |
| `apps/web/src/app/signup/page.tsx:42` | `<span className="text-xl font-extrabold tracking-tight text-white">FlowMind.</span>` |
| `apps/web/src/app/signup/page.tsx:48` | `Record once in Google Chrome. FlowMind repeats your routine in seconds.` |
| `apps/web/src/components/dashboard/CreatePortalModal.tsx:170` | `const [canvasTargetFolder, setCanvasTargetFolder] = useState('C:\\FlowMind\\Invoices');` |
| `apps/web/src/components/dashboard/CreatePortalModal.tsx:177` | `const [quickTargetFolder, setQuickTargetFolder] = useState('C:\\FlowMind\\Invoices');` |
| `apps/web/src/components/dashboard/CreatePortalModal.tsx:191` | `const [recordTargetFolder, setRecordTargetFolder] = useState('C:\\FlowMind\\Invoices');` |
| `apps/web/src/components/dashboard/CreatePortalModal.tsx:514` | `target_folder: canvasTargetFolder \|\| 'C:\\FlowMind\\Invoices',` |
| `apps/web/src/components/dashboard/CreatePortalModal.tsx:563` | `target_folder: canvasTargetFolder \|\| 'C:\\FlowMind\\Invoices',` |
| `apps/web/src/components/dashboard/CreatePortalModal.tsx:615` | `let exportFileName = \`${(parsedMetadata?.name \|\| 'flowmind-recipe').toLowerCase().replace(/\s+/g, '-')}.json\`;` |
| `apps/web/src/components/dashboard/CreatePortalModal.tsx:619` | `name: 'Sample FlowMind Portal Recipe',` |
| `apps/web/src/components/dashboard/CreatePortalModal.tsx:623` | `name: 'Sample FlowMind Portal Recipe',` |
| `apps/web/src/components/dashboard/CreatePortalModal.tsx:648` | `exportFileName = 'flowmind-sample-recipe.json';` |
| `apps/web/src/components/dashboard/CreatePortalModal.tsx:1379` | `Supports FlowMind &amp; Chrome recorder export schemas` |
| `apps/web/src/components/dashboard/RunDetailsDrawer.tsx:471` | `FlowMind Desktop Engine Bridge v1.0` |
| `apps/web/src/components/landing/FeatureCapabilities.tsx:116` | `Most automation tools crash when websites change their buttons or popup layouts. FlowMind is built with smart resilie...` |
| `apps/web/src/components/landing/FeatureTabSwitcher.tsx:35` | `'Perform your workflow naturally in genuine Google Chrome. FlowMind communicates directly with the Chrome DevTools Pr...` |
| `apps/web/src/components/landing/FeatureTabSwitcher.tsx:63` | `'FlowMind penetrates nested cross-domain iframes, ShadowDOM boundaries, and legacy ExtJS/AgGrid web tables. Its unive...` |
| `apps/web/src/components/landing/FeatureTabSwitcher.tsx:91` | `'Replay workflows at 24x human speed (0.75s per step). FlowMind continuously heals broken selectors using multi-attri...` |
| `apps/web/src/components/landing/FeatureTabSwitcher.tsx:130` | `Switch through the three core phases that make FlowMind reliable on real-world business websites.` |
| `apps/web/src/components/landing/FeatureTabSwitcher.tsx:214` | `FLOWMIND_CORE // {current.id.toUpperCase()}` |
| `apps/web/src/components/landing/HeroProductShowcase.tsx:84` | `<span className="truncate max-w-[200px] text-zinc-300">app.flowmind.ai/invoices</span>` |
| `apps/web/src/components/landing/PricingSection.tsx:334` | `FlowMind communicates via standard Chrome DevTools Protocol (CDP) port 9222. It requires zero browser extensions and ...` |
| `apps/web/src/components/landing/ProductDemoSimulator.tsx:15` | `FlowMind maps DOM geometry, records keystrokes and Bézier mouse paths via Chrome DevTools Protocol, and transitions i...` |
| `apps/web/src/components/landing/ProductDemoSimulator.tsx:106` | `<span className="truncate text-zinc-300">https://engine.flowmind.ai/workspace/invoices</span>` |
| `apps/web/src/components/landing/RobotMascot.tsx:9` | `aria-label="FlowMind 3D Robot Mascot"` |
| `apps/web/src/components/landing/ScrollProductShowcase.tsx:35` | `detail: 'FlowMind listens via Chrome DevTools Protocol, mapping click coordinates, hierarchy, and input fields withou...` |
| `apps/web/src/components/landing/ScrollProductShowcase.tsx:45` | `url: 'flowmind.internal/canvas/pipeline-902',` |
| `apps/web/src/components/landing/ScrollProductShowcase.tsx:54` | `url: 'flowmind.internal/recovery-engine/live',` |
| `apps/web/src/components/landing/ScrollProductShowcase.tsx:63` | `url: 'flowmind.internal/runner/headless-exec',` |
| `apps/web/src/components/landing/VideoDemoModal.tsx:93` | `aria-label="FlowMind Video Demo Modal"` |
| `apps/web/src/components/landing/VideoDemoModal.tsx:104` | `FlowMind Browser Replay Demonstration` |
| `apps/web/src/components/landing/WorkflowNodePipeline.tsx:32` | `description: 'Do your task once in Google Chrome. FlowMind captures your clicks naturally.',` |
| `apps/web/src/components/landing/WorkflowNodePipeline.tsx:202` | `Scroll down to see how FlowMind turns your repetitive daily clicks into an autonomous, self-healing routine.` |
| `apps/web/src/components/workflow-editor/WorkflowEditorClient.tsx:15` | `FlowMind Canvas` |
| `apps/web/src/components/workflow-editor/drawflow-theme.css:2` | `FlowMind - Dedicated Drawflow Theme (Quixotic Slate / Emerald)` |
| `apps/web/src/context/DashboardContext.tsx:9` | `\| 'flowmind-cyber'` |
| `apps/web/src/context/DashboardContext.tsx:19` | `'flowmind-cyber',` |
| `apps/web/src/context/DashboardContext.tsx:64` | `new CustomEvent('workflow-capture-theme-change', {` |
| `apps/web/src/context/DashboardContext.tsx:105` | `const [theme, setThemeState] = useState<ThemePaletteId>('flowmind-cyber');` |
| `apps/web/src/context/DashboardContext.tsx:114` | `let initialTheme: ThemePaletteId = 'flowmind-cyber';` |
| `apps/web/src/context/DashboardContext.tsx:158` | `window.addEventListener('workflow-capture-theme-change', handleCustomChange);` |
| `apps/web/src/context/DashboardContext.tsx:162` | `window.removeEventListener('workflow-capture-theme-change', handleCustomChange);` |
| `packages/engine/src/dashboard/public/css/components.css:10` | `.flowmind-app-topbar {` |
| `packages/engine/src/dashboard/public/css/components.css:27` | `.flowmind-topbar-left {` |
| `packages/engine/src/dashboard/public/css/components.css:34` | `.flowmind-topbar-brand {` |
| `packages/engine/src/dashboard/public/css/components.css:45` | `.flowmind-topbar-brand:hover {` |
| `packages/engine/src/dashboard/public/css/components.css:70` | `.flowmind-topbar-center {` |
| `packages/engine/src/dashboard/public/css/components.css:77` | `.flowmind-engine-pill {` |
| `packages/engine/src/dashboard/public/css/components.css:135` | `.flowmind-topbar-right {` |
| `packages/engine/src/dashboard/public/css/components.css:1023` | `.flowmind-floating-bot-root {` |
| `packages/engine/src/dashboard/public/css/components.css:2166` | `FlowMind / Workflow Agent — Futuristic Robotic UI Component Suite` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:6` | `.flowmind-floating-bot-root {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:22` | `.flowmind-floating-bot-root * {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:27` | `.flowmind-floating-mascot-btn {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:45` | `.flowmind-floating-mascot-btn:hover {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:49` | `.flowmind-floating-mascot-btn:active {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:53` | `.flowmind-mascot-svg-wrap {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:60` | `.flowmind-mascot-glow {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:74` | `.flowmind-orbital-ring {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:88` | `.flowmind-floating-card {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:106` | `.flowmind-floating-bot-root.is-collapsed .flowmind-floating-card {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:114` | `.flowmind-card-head {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:123` | `.flowmind-card-title {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:134` | `.flowmind-card-dot {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:140` | `animation: flowmindPulseDot 1.8s ease-in-out infinite;` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:143` | `.flowmind-card-close {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:155` | `.flowmind-card-close:hover {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:161` | `.flowmind-steps-wrap {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:168` | `.flowmind-steps-line {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:179` | `.flowmind-step-item {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:192` | `.flowmind-step-item:hover {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:197` | `.flowmind-step-icon {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:210` | `.flowmind-step-teach .flowmind-step-icon {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:215` | `.flowmind-step-teach:hover .flowmind-step-icon {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:222` | `.flowmind-step-learn .flowmind-step-icon {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:227` | `.flowmind-step-learn:hover .flowmind-step-icon {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:234` | `.flowmind-step-remember .flowmind-step-icon {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:239` | `.flowmind-step-remember:hover .flowmind-step-icon {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:246` | `.flowmind-step-run .flowmind-step-icon {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:251` | `.flowmind-step-run:hover .flowmind-step-icon {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:257` | `.flowmind-step-label {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:265` | `.flowmind-step-item:hover .flowmind-step-label {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:270` | `@keyframes flowmindMascotBob {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:279` | `@keyframes flowmindPulseDot {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:284` | `@keyframes flowmindOrbitalSlow {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:291` | `.flowmind-floating-bot-root {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:295` | `.flowmind-floating-mascot-btn {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:299` | `.flowmind-floating-card {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:303` | `.flowmind-speech-bubble {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:315` | `.flowmind-speech-bubble {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:335` | `.flowmind-floating-bot-root.is-alert-state .flowmind-speech-bubble {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:343` | `.flowmind-bubble-tail {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:356` | `.flowmind-bubble-head {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:365` | `.flowmind-bubble-badge {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:376` | `.flowmind-bubble-pulse-dot {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:382` | `animation: flowmindAlertPing 1.2s ease-in-out infinite;` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:385` | `.flowmind-bubble-close {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:397` | `.flowmind-bubble-close:hover {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:403` | `.flowmind-bubble-body {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:407` | `.flowmind-bubble-msg {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:415` | `.flowmind-bubble-msg strong {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:420` | `.flowmind-highlight-step {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:427` | `.flowmind-bubble-meta {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:435` | `.flowmind-bubble-tag {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:444` | `.flowmind-bubble-time {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:450` | `.flowmind-bubble-actions {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:456` | `.flowmind-btn-stop-flow {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:473` | `.flowmind-btn-stop-flow:hover {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:481` | `.flowmind-btn-ack {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:496` | `.flowmind-btn-ack:hover {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:502` | `.flowmind-floating-bot-root.is-alert-state #fbmEyeLeft,` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:503` | `.flowmind-floating-bot-root.is-alert-state #fbmEyeRight {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:506` | `animation: flowmindEyeAlertPulse 1.2s infinite alternate !important;` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:509` | `.flowmind-floating-bot-root.is-alert-state .flowmind-mascot-glow {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:513` | `.flowmind-floating-bot-root.is-alert-state .flowmind-orbital-ring {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:518` | `.flowmind-floating-bot-root.is-alert-state .flowmind-mascot-svg-wrap {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:519` | `animation: flowmindAlertWiggle 0.6s ease-in-out infinite alternate !important;` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:523` | `.flowmind-step-run.is-disturbed .flowmind-step-icon {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:530` | `.flowmind-step-run.is-disturbed .flowmind-step-label {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:535` | `@keyframes flowmindAlertPing {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:541` | `@keyframes flowmindEyeAlertPulse {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:546` | `@keyframes flowmindAlertWiggle {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:552` | `.flowmind-floating-bot-root {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:558` | `.flowmind-floating-mascot-btn {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:567` | `.flowmind-floating-mascot-btn:hover {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:571` | `.flowmind-mascot-svg-wrap {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:574` | `.flowmind-mascot-glow,` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:575` | `.flowmind-orbital-ring {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:578` | `.flowmind-floating-card {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:586` | `.flowmind-card-head {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:589` | `.flowmind-card-title,` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:590` | `.flowmind-step-label {` |
| `packages/engine/src/dashboard/public/css/floating-bot.css:593` | `.flowmind-step-item:hover {` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:17` | `.flowmind-app-topbar {` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:27` | `.flowmind-topbar-left,` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:29` | `.flowmind-topbar-right {` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:34` | `.flowmind-topbar-brand {` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:57` | `.flowmind-brand-text {` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:62` | `.flowmind-brand-text .badge-tag {` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:76` | `.flowmind-engine-pill {` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:422` | `.flowmind-app-topbar {` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:429` | `.flowmind-topbar-center {` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:477` | `.flowmind-app-topbar {` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:556` | `[data-mode="dark"] .flowmind-app-topbar,` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:569` | `[data-theme="dark"] .flowmind-app-topbar,` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:582` | `[data-theme="crimson"] .flowmind-app-topbar,` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:595` | `[data-theme="crimson-dark"] .flowmind-app-topbar,` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:608` | `[data-theme="charcoal-crimson"] .flowmind-app-topbar,` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:621` | `[data-theme="sage-dark"] .flowmind-app-topbar,` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:634` | `[data-theme="forest-dark"] .flowmind-app-topbar,` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:2129` | `.flowmind-topbar-left {` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:2133` | `.status-indicator-pill.flowmind-engine-pill {` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:2141` | `.status-indicator-pill.flowmind-engine-pill .status-dot {` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:2146` | `.status-indicator-pill.flowmind-engine-pill #cdpText {` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:2197` | `.flowmind-topbar-brand:hover .topbar-robot-avatar {` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:2201` | `.flowmind-topbar-brand:focus-visible {` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:2208` | `.flowmind-topbar-brand {` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:4511` | `:root[data-theme="sage"] .flowmind-app-topbar,` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:4512` | `:root[data-theme="mint"] .flowmind-app-topbar {` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:4573` | `:root[data-theme="crimson-light"] .flowmind-app-topbar,` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:4574` | `:root[data-palette="crimson"][data-mode="light"] .flowmind-app-topbar {` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:4645` | `:root[data-theme="sage-dark"] .flowmind-app-topbar,` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:4646` | `:root[data-palette="sage"][data-mode="dark"] .flowmind-app-topbar,` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:4647` | `:root[data-theme="forest-dark"] .flowmind-app-topbar {` |
| `packages/engine/src/dashboard/public/index.html:6` | `<title>Workflow Capture — Browser Automation</title>` |
| `packages/engine/src/dashboard/public/index.html:66` | `<!-- Main Workflow Capture Dashboard Shell Container -->` |
| `packages/engine/src/dashboard/public/index.html:70` | `<header class="app-header flowmind-app-topbar">` |
| `packages/engine/src/dashboard/public/index.html:71` | `<div class="header-left flowmind-topbar-left">` |
| `packages/engine/src/dashboard/public/index.html:72` | `<a href="#overview" class="header-brand flowmind-topbar-brand" title="Workflow Agent Platform">` |
| `packages/engine/src/dashboard/public/index.html:74` | `<div class="flowmind-brand-text">` |
| `packages/engine/src/dashboard/public/index.html:85` | `<div class="header-right flowmind-topbar-right">` |
| `packages/engine/src/dashboard/public/index.html:87` | `<div class="status-indicator-pill flowmind-engine-pill" id="headerStatusPill" role="status" aria-live="polite" title=...` |
| `packages/engine/src/dashboard/public/index.html:295` | `<h2 id="authTitle" style="font-size:1.35rem; font-weight:700; margin-bottom:0.25rem; color:var(--text-primary);">Work...` |
| `packages/engine/src/dashboard/public/landing.html:6` | `<title>FlowMind — AI Workflow Automation</title>` |
| `packages/engine/src/dashboard/public/landing.html:521` | `<a aria-label="FlowMind Home" class="flex items-center gap-2.5 group focus:outline-none" href="#">` |
| `packages/engine/src/dashboard/public/landing.html:532` | `<span class="text-xl font-extrabold tracking-tight text-white leading-none">FlowMind</span>` |
| `packages/engine/src/dashboard/public/landing.html:757` | `Watch FlowMind map UI geometry, record human actions, and instantly switch to 24x autonomous robotic replay.` |
| `packages/engine/src/dashboard/public/landing.html:834` | `<p class="text-xs text-slate-400 leading-relaxed">FlowMind executes the full workflow autonomously.</p>` |
| `packages/engine/src/dashboard/public/landing.html:857` | `<span class="truncate text-slate-200 font-medium">https://app.flowmind.ai/workspace/invoices</span>` |
| `packages/engine/src/dashboard/public/landing.html:1045` | `<span>FlowMind Autonomous Replay</span>` |
| `packages/engine/src/dashboard/public/landing.html:1254` | `Launch the FlowMind operations center and train your robotic AI agent in seconds.` |
| `packages/engine/src/dashboard/public/landing.html:1275` | `<span class="font-bold text-white">FlowMind AI</span>` |
| `packages/engine/src/dashboard/public/landing.html:1287` | `<span class="font-bold text-slate-700">FlowMind AI</span>` |
| `packages/engine/src/dashboard/public/report.html:6` | `<title>Workflow Capture — Comprehensive Implementation & Feature Deliverables Report</title>` |
| `packages/engine/src/dashboard/public/report.html:697` | `<span>Workflow Capture</span>` |
| `packages/engine/src/dashboard/public/report.html:721` | `<span class="chip">Workflow Capture Engineering</span>` |
| `packages/engine/src/dashboard/public/report.html:726` | `<h1 class="report-title">Workflow Capture &amp; Intelligent Automation Platform</h1>` |
| `packages/engine/src/dashboard/public/report.html:763` | `<strong>Workflow Capture</strong> solves this by attaching directly to the user's running, authenticated Google Chrom...` |
| `packages/engine/src/dashboard/public/report.html:1277` | `Anti-bot detection software analyzes pointer movement linearity and keystroke intervals. Workflow Capture implements ...` |
| `packages/engine/src/dashboard/public/report.html:1628` | `<span>Workflow Capture</span>` |
| `packages/engine/src/dashboard/public/report.html:1632` | `<p>Prepared by <strong>Workflow Capture Engineering</strong> for product development and technical review.</p>` |
| `packages/engine/src/dashboard/public/report.html:1638` | `<!-- FlowMind Floating Bot Assistant -->` |
| `packages/engine/src/recorder/index.js:85` | `console.log('\n[Workflow Capture] Received SIGINT...');` |
| `packages/engine/src/recorder/recorder-injected.js:1754` | `console.log('[Workflow Capture] In-page recorder listeners attached successfully (v6).');` |
| `packages/engine/src/runner/cli.js:109` | `${colors.bold}${colors.cyan}PortalSync Desktop Runner CLI${colors.reset} v${PKG_VERSION}` |
| `packages/engine/src/runner/cli.js:227` | `console.log(\`${colors.bold}${colors.cyan} PortalSync Desktop Runner Doctor${colors.reset}\`);` |
| `packages/engine/src/runner/cli.js:263` | `console.log(\`   ${colors.yellow}chrome.exe --remote-debugging-port=${port} --user-data-dir="%USERPROFILE%\\.workflow-...` |
| `packages/engine/src/runner/cli.js:271` | `console.log(\`\n${colors.bold}3. PortalSync Cloud Control Plane (${cloudUrl}):${colors.reset}\`);` |
| `packages/engine/src/runner/cli.js:422` | `console.log(\`PortalSync Desktop Runner v${PKG_VERSION}\`);` |
| `packages/engine/test/ecommerce-portal.html:7` | `<title>NovaGear E-Commerce Hub — Workflow Capture Test Portal</title>` |
| `packages/engine/test/ecommerce-portal.html:508` | `workflow capture.` |
| `packages/engine/test/fixtures/ecommerce-portal.html:7` | `<title>NovaGear E-Commerce Hub — Workflow Capture Test Portal</title>` |
| `packages/engine/test/fixtures/ecommerce-portal.html:508` | `workflow capture.` |
| `packages/engine/test/fixtures/library-portal.html:6` | `<title>Alexandria Digital Archive — Workflow Capture Test Portal</title>` |
| `packages/engine/test/fixtures/sales-portal.html:6` | `<title>Stratos Sales & CRM Cloud — Workflow Capture Test Portal</title>` |
| `packages/engine/test/library-portal.html:6` | `<title>Alexandria Digital Archive — Workflow Capture Test Portal</title>` |
| `packages/engine/test/sales-portal.html:6` | `<title>Stratos Sales & CRM Cloud — Workflow Capture Test Portal</title>` |

### 2d(iii). Package Names and Import Specifiers

Package metadata in package.json files and module specifiers.

**Total hits:** 3

| File:Line | Content snippet |
| :--- | :--- |
| `package-lock.json:5275` | `"node_modules/@workflow-capture/engine": {` |
| `package-lock.json:9452` | `"name": "@workflow-capture/engine",` |
| `packages/engine/package.json:2` | `"name": "@workflow-capture/engine",` |

### 2d(iv). Environment Variable Names (PORTALSYNC_*)

Environment variable definitions and lookups.

**Total hits:** 16

| File:Line | Content snippet |
| :--- | :--- |
| `.env.example:18` | `PORTALSYNC_CLOUD_URL=http://localhost:3000` |
| `.env.example:21` | `PORTALSYNC_RUNNER_TOKEN=ps_live_your_org_id_here` |
| `.env.example:24` | `PORTALSYNC_CDP_PORT=9222` |
| `.env.example:28` | `PORTALSYNC_TARGET_FOLDER=` |
| `packages/engine/src/runner/cli.js:222` | `const cloudUrl = options.cloudUrl \|\| process.env.PORTALSYNC_CLOUD_URL \|\| 'http://localhost:3000';` |
| `packages/engine/src/runner/cli.js:223` | `const token = options.token \|\| process.env.PORTALSYNC_RUNNER_TOKEN \|\| '';` |
| `packages/engine/src/runner/cli.js:279` | `log.info(\`No runner token provided. (Specify via --token or PORTALSYNC_RUNNER_TOKEN)\`);` |
| `packages/engine/src/runner/cli.js:345` | `const cloudUrl = options.cloudUrl \|\| process.env.PORTALSYNC_CLOUD_URL \|\| 'http://localhost:3000';` |
| `packages/engine/src/runner/cli.js:346` | `const token = options.token \|\| process.env.PORTALSYNC_RUNNER_TOKEN \|\| '';` |
| `packages/engine/src/runner/cli.js:351` | `log.warn('No runner token provided. Set --token or PORTALSYNC_RUNNER_TOKEN to claim organization runs.');` |
| `packages/engine/src/runner/cli.js:390` | `const cloudUrl = options.cloudUrl \|\| process.env.PORTALSYNC_CLOUD_URL \|\| 'http://localhost:3000';` |
| `packages/engine/src/runner/cli.js:391` | `const token = options.token \|\| process.env.PORTALSYNC_RUNNER_TOKEN \|\| '';` |
| `packages/engine/src/runner/cloud-client.js:28` | `* @param {string} [options.baseUrl] - Base URL of PortalSync Cloud API (default: PORTALSYNC_CLOUD_URL or http://local...` |
| `packages/engine/src/runner/cloud-client.js:29` | `* @param {string} [options.token] - Runner Token ps_live_<org_id> (default: PORTALSYNC_RUNNER_TOKEN)` |
| `packages/engine/src/runner/cloud-client.js:34` | `const rawUrl = options.baseUrl \|\| process.env.PORTALSYNC_CLOUD_URL \|\| 'http://localhost:3000';` |
| `packages/engine/src/runner/cloud-client.js:36` | `const rawToken = options.token \|\| process.env.PORTALSYNC_RUNNER_TOKEN \|\| '';` |

### 2d(v). CI / Build Artifact Names & Electron Metadata

CI workflows, Electron appId, productName, and packaged binary artifact patterns.

**Total hits:** 34

| File:Line | Content snippet |
| :--- | :--- |
| `.github/workflows/build-desktop.yml:35` | `name: flowmind-worker-windows-x64` |
| `.github/workflows/build-desktop.yml:37` | `apps/desktop/dist/FlowMind-Worker-Setup-*.exe` |
| `.github/workflows/build-desktop.yml:38` | `apps/desktop/dist/FlowMind-Worker-Portable-*.exe` |
| `.github/workflows/build-desktop.yml:62` | `name: flowmind-worker-macos-intel-x64` |
| `apps/desktop/BUILD_MAC.md:37` | `"artifactName": "FlowMind-Worker-${version}-mac-x64.${ext}"` |
| `apps/desktop/BUILD_MAC.md:40` | `"title": "FlowMind Worker 1.0.0 (Intel x64)",` |
| `apps/desktop/BUILD_MAC.md:41` | `"artifactName": "FlowMind-Worker-Setup-${version}-mac-x64.${ext}",` |
| `apps/desktop/BUILD_MAC.md:52` | `- **\`schemes: ["flowmind", "portalsync"]\`**: Protocol schemes for deep-link activation.` |
| `apps/desktop/BUILD_MAC.md:88` | `- \`dist/FlowMind-Worker-Setup-1.0.0-mac-x64.dmg\` (~90 MB) — Drag-to-Applications installer` |
| `apps/desktop/BUILD_MAC.md:89` | `- \`dist/FlowMind-Worker-1.0.0-mac-x64.zip\` (~80 MB) — Portable standalone zip archive` |
| `apps/desktop/BUILD_MAC.md:90` | `- \`dist/mac/FlowMind Worker.app\` — Raw application bundle` |
| `apps/desktop/BUILD_MAC.md:97` | `1. When double-clicking on macOS, Gatekeeper may flag: *"FlowMind Worker cannot be opened because Apple cannot check ...` |
| `apps/desktop/BUILD_MAC.md:98` | `2. **User Solution 1**: Right-click (or Control-click) \`FlowMind Worker.app\` in \`/Applications\` and click **Open**, t...` |
| `apps/desktop/BUILD_MAC.md:101` | `xattr -cr "/Applications/FlowMind Worker.app"` |
| `apps/desktop/package-lock.json:2` | `"name": "flowmind-worker",` |
| `apps/desktop/package-lock.json:8` | `"name": "flowmind-worker",` |
| `apps/desktop/package.json:2` | `"name": "flowmind-worker",` |
| `apps/desktop/package.json:3` | `"productName": "FlowMind Worker",` |
| `apps/desktop/package.json:20` | `"appId": "com.flowmind.worker",` |
| `apps/desktop/package.json:21` | `"productName": "FlowMind Worker",` |
| `apps/desktop/package.json:43` | `"name": "FlowMind Worker Protocol",` |
| `apps/desktop/package.json:73` | `"shortcutName": "FlowMind Worker",` |
| `apps/desktop/package.json:74` | `"artifactName": "FlowMind-Worker-Setup-${version}.${ext}"` |
| `apps/desktop/package.json:77` | `"artifactName": "FlowMind-Worker-Portable-${version}.${ext}"` |
| `apps/desktop/package.json:99` | `"artifactName": "FlowMind-Worker-${version}-mac-x64.${ext}"` |
| `apps/desktop/package.json:103` | `"artifactName": "FlowMind-Worker-Setup-${version}-mac-x64.${ext}",` |
| `apps/desktop/src/main/main.js:68` | `app.setAsDefaultProtocolClient('flowmind', process.execPath, [path.resolve(process.argv[1])]);` |
| `apps/desktop/src/main/main.js:69` | `app.setAsDefaultProtocolClient('portalsync', process.execPath, [path.resolve(process.argv[1])]);` |
| `apps/desktop/src/main/main.js:72` | `app.setAsDefaultProtocolClient('flowmind');` |
| `apps/desktop/src/main/main.js:73` | `app.setAsDefaultProtocolClient('portalsync');` |
| `apps/web/src/app/api/v1/runners/download/route.ts:55` | `? 'FlowMind-Worker-Portable-1.0.0.exe'` |
| `apps/web/src/app/api/v1/runners/download/route.ts:56` | `: 'FlowMind-Worker-Setup-1.0.0.exe';` |
| `apps/web/src/app/dashboard/runners/page.tsx:1035` | `download="FlowMind-Worker-Setup-1.0.0.exe"` |
| `apps/web/src/app/dashboard/runners/page.tsx:1044` | `download="FlowMind-Worker-Portable-1.0.0.exe"` |

### 2d(vi). Default Folders and File Paths

Default download directories and local storage paths.

**Total hits:** 12

| File:Line | Content snippet |
| :--- | :--- |
| `.env.example:27` | `# (default: ~/Downloads/PortalSync)` |
| `apps/web/src/components/dashboard/CreatePortalModal.tsx:1167` | `placeholder="C:\FlowMind\Invoices or /Users/name/Invoices"` |
| `apps/web/src/components/dashboard/CreatePortalModal.tsx:1290` | `placeholder="C:\FlowMind\Invoices or /Users/name/Invoices"` |
| `apps/web/src/components/workflow-editor/CustomNodes.tsx:179` | `download_dir: action === 'DOWNLOAD' ? '~/Downloads/PortalSync' : '',` |
| `apps/web/src/components/workflow-editor/PropertyDrawer.tsx:527` | `placeholder="~/Downloads/PortalSync"` |
| `docs/ARCHITECTURE.md:85` | `- Saves files to organized local directories (\`~/Downloads/PortalSync/\` or custom folders).` |
| `packages/engine/src/runner/cli.js:124` | `-d, --target-folder <path>   Directory for downloaded artifacts (default: ~/Downloads/PortalSync)` |
| `packages/engine/src/runner/cli.js:179` | `-d, --target-folder <path>   Destination directory for invoice artifacts (default: ~/Downloads/PortalSync)` |
| `packages/engine/src/runner/cli.js:207` | `-d, --target-folder <path>   Destination directory for invoice artifacts (default: ~/Downloads/PortalSync)` |
| `packages/engine/src/runner/dedup-helper.js:261` | `* @param {string} [baseDir] - Defaults to ~/Downloads/PortalSync` |
| `packages/engine/src/runner/runner.test.js:232` | `storage_path: 'C:/Downloads/PortalSync/local_invoice.pdf',` |
| `packages/engine/src/runner/runner.test.js:236` | `assert.strictEqual(artifactPayload.storage_path, 'C:/Downloads/PortalSync/local_invoice.pdf');` |

### 2d(vii). LocalStorage, SessionStorage, Config Keys & IPC Objects

Browser storage keys, desktop config directory names, and IPC bridge namespaces.

**Total hits:** 41

| File:Line | Content snippet |
| :--- | :--- |
| `apps/desktop/src/main/config-manager.js:7` | `this.configDir = path.join(os.homedir(), '.portalsync');` |
| `apps/desktop/src/main/config-manager.js:18` | `console.error('Failed to create .portalsync directory:', err);` |
| `apps/desktop/src/preload/preload.js:3` | `contextBridge.exposeInMainWorld('portalsync', {` |
| `apps/desktop/src/renderer/app.js:91` | `let currentConfig = await window.portalsync.getConfig();` |
| `apps/desktop/src/renderer/app.js:92` | `let currentStatus = await window.portalsync.getStatus();` |
| `apps/desktop/src/renderer/app.js:96` | `if (typeof window.portalsync.getSystemInfo === 'function') {` |
| `apps/desktop/src/renderer/app.js:97` | `systemInfo = await window.portalsync.getSystemInfo();` |
| `apps/desktop/src/renderer/app.js:144` | `btnMinimize.addEventListener('click', () => window.portalsync.minimizeWindow());` |
| `apps/desktop/src/renderer/app.js:145` | `btnClose.addEventListener('click', () => window.portalsync.closeWindow());` |
| `apps/desktop/src/renderer/app.js:162` | `window.portalsync.openExternal(\`${cloudUrl}/dashboard\`);` |
| `apps/desktop/src/renderer/app.js:176` | `const testRes = await window.portalsync.testConnection({` |
| `apps/desktop/src/renderer/app.js:187` | `currentConfig = await window.portalsync.saveConfig({` |
| `apps/desktop/src/renderer/app.js:196` | `const nextStatus = await window.portalsync.startRunner();` |
| `apps/desktop/src/renderer/app.js:226` | `const next = await window.portalsync.stopRunner();` |
| `apps/desktop/src/renderer/app.js:233` | `const next = await window.portalsync.startRunner();` |
| `apps/desktop/src/renderer/app.js:248` | `await window.portalsync.stopActiveRun();` |
| `apps/desktop/src/renderer/app.js:261` | `window.portalsync.openFolder(currentConfig.targetFolder);` |
| `apps/desktop/src/renderer/app.js:266` | `window.portalsync.openExternal(\`${cloudUrl}/dashboard\`);` |
| `apps/desktop/src/renderer/app.js:338` | `const chosen = await window.portalsync.selectFolder();` |
| `apps/desktop/src/renderer/app.js:377` | `currentConfig = await window.portalsync.saveConfig(payload);` |
| `apps/desktop/src/renderer/app.js:396` | `await window.portalsync.stopRunner();` |
| `apps/desktop/src/renderer/app.js:399` | `currentConfig = await window.portalsync.saveConfig({` |
| `apps/desktop/src/renderer/app.js:433` | `const res = await window.portalsync.startRecording({` |
| `apps/desktop/src/renderer/app.js:451` | `const res = await window.portalsync.stopRecording();` |
| `apps/desktop/src/renderer/app.js:464` | `const state = await window.portalsync.getRecordingStatus();` |
| `apps/desktop/src/renderer/app.js:484` | `if (typeof window.portalsync.onRecordingUpdate === 'function') {` |
| `apps/desktop/src/renderer/app.js:485` | `window.portalsync.onRecordingUpdate((state) => {` |
| `apps/desktop/src/renderer/app.js:493` | `window.portalsync.onStatusUpdate((state) => {` |
| `apps/desktop/src/renderer/app.js:501` | `if (typeof window.portalsync.checkCdpStatus === 'function') {` |
| `apps/desktop/src/renderer/app.js:502` | `const cdp = await window.portalsync.checkCdpStatus();` |
| `apps/web/src/app/dashboard/settings/page.tsx:650` | `localStorage.getItem('flowmind_theme')) as ThemePaletteId \| null;` |
| `apps/web/src/app/dashboard/settings/page.tsx:859` | `localStorage.setItem('flowmind_theme', settings.themes.palette);` |
| `apps/web/src/app/layout.tsx:34` | `var theme = localStorage.getItem('wf_dashboard_theme') \|\| localStorage.getItem('workflow_capture_theme') \|\| localStor...` |
| `apps/web/src/context/DashboardContext.tsx:58` | `localStorage.setItem('flowmind_theme', palette);` |
| `apps/web/test/theming-system.challenge.mjs:122` | `localStorageMap['flowmind_theme'] = palette;` |
| `packages/engine/src/dashboard/public/index.html:37` | `const theme = localStorage.getItem('workflow_capture_theme') \|\| localStorage.getItem('flowmind_theme') \|\| 'crimson';` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:156` | `sessionStorage.setItem('flowmind_bot_collapsed', isCollapsed ? '1' : '0');` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:181` | `if (sessionStorage.getItem('flowmind_bot_collapsed') === '1') {` |
| `packages/engine/src/dashboard/public/js/theme.js:36` | `const saved = localStorage.getItem('workflow_capture_theme') \|\| localStorage.getItem('flowmind_theme');` |
| `packages/engine/src/dashboard/public/js/theme.js:57` | `if (!localStorage.getItem('workflow_capture_theme') && !localStorage.getItem('flowmind_theme')) {` |
| `packages/engine/src/dashboard/public/js/theme.js:124` | `localStorage.setItem('flowmind_theme', theme);` |

### 2d(viii). Code Internals (Signatures, Broadcast Channels, Variables)

Internal code constants, broadcast event channels, webhook signature headers, and variables.

**Total hits:** 227

| File:Line | Content snippet |
| :--- | :--- |
| `apps/desktop/package.json:5` | `"description": "FlowMind Desktop Local Worker & Chrome Automation Engine",` |
| `apps/desktop/package.json:7` | `"author": "FlowMind",` |
| `apps/desktop/package.json:45` | `"flowmind",` |
| `apps/desktop/package.json:46` | `"portalsync"` |
| `apps/desktop/src/main/chrome-spawner.js:12` | `this.profileDir = path.join(os.homedir(), '.chrome-portalsync');` |
| `apps/desktop/src/main/config-manager.js:9` | `this.defaultTargetFolder = path.join(os.homedir(), 'Downloads', 'PortalSync');` |
| `apps/desktop/src/main/engine-resolver.js:74` | `throw new Error(\`Could not resolve FlowMind engine path. Checked: ${path.resolve(__dirname, '../../../../packages/eng...` |
| `apps/desktop/src/main/http-bridge.js:21` | `path.resolve(__dirname, '../../../../../Workflow-Capture-agent-worktrees/multi-agent-integration/node_modules'),` |
| `apps/desktop/src/main/http-bridge.js:22` | `path.resolve(__dirname, '../../../../Workflow-Capture-agent-worktrees/multi-agent-integration/node_modules'),` |
| `apps/desktop/src/main/http-bridge.js:23` | `path.resolve(__dirname, '../../../../../Workflow-Capture-agent-worktrees/main/node_modules'),` |
| `apps/desktop/src/main/http-bridge.js:26` | `path.resolve('C:/Users/AbuZar/Desktop/Fyp/Workflow-Capture-agent-worktrees/multi-agent-integration/node_modules')` |
| `apps/desktop/src/main/http-bridge.js:373` | `config.targetFolder \|\| path.join(os.homedir(), 'Downloads', 'PortalSync'),` |
| `apps/desktop/src/main/main.js:36` | `content: 'FlowMind is running in the background. Click this tray icon anytime to restore the control window.',` |
| `apps/desktop/src/main/main.js:57` | `const urlArg = (commandLine \|\| []).find((arg) => arg.startsWith('flowmind://') \|\| arg.startsWith('portalsync://'));` |
| `apps/desktop/src/main/main.js:128` | `const appName = app.name \|\| 'FlowMind Worker';` |
| `apps/desktop/src/main/main.js:184` | `tray.setToolTip('FlowMind Local Worker');` |
| `apps/desktop/src/main/main.js:218` | `tray.setToolTip(\`FlowMind Local Worker - ${statusLabel}\`);` |
| `apps/desktop/src/main/notifier.js:90` | `body: 'FlowMind is running in the background. Click to restore window.',` |
| `apps/desktop/test-http-bridge.js:24` | `path.resolve(__dirname, '../../../Workflow-Capture-agent-worktrees/multi-agent-integration/node_modules'),` |
| `apps/desktop/test-http-bridge.js:25` | `path.resolve(__dirname, '../../Workflow-Capture-agent-worktrees/multi-agent-integration/node_modules'),` |
| `apps/desktop/test-http-bridge.js:26` | `path.resolve(__dirname, '../../../Workflow-Capture-agent-worktrees/main/node_modules'),` |
| `apps/desktop/test-http-bridge.js:29` | `path.resolve('C:/Users/AbuZar/Desktop/Fyp/Workflow-Capture-agent-worktrees/multi-agent-integration/node_modules')` |
| `apps/web/public/videos/landing-demo.mp4:15288` | `�\`�������8�\|��D0�PVPԩ��[������,�5�b3B�z�?����.�=��#�ej�q�^�ޤ	��?!Az�S�İ���>\|�1�h�����ϰ�8�����5�԰���U�u�...` |
| `apps/web/public/videos/landing-demo.mp4:25883` | `�(-RtB�fyp(�M��p=J������v�y4��^����(�_�nO"E�p�,4��c���=����!/��Wz0ۉU��m���[����X:�Z�zݖ-�%*SBȣ ףC%m�N...` |
| `apps/web/src/app/api/v1/artifacts/download/route.ts:76` | `const fallbackText = \`FlowMind Cloud Artifact Export\nFile: ${artifact.file_name}\nSHA-256: ${artifact.sha256_hash}\n...` |
| `apps/web/src/app/api/v1/runners/download/route.ts:13` | `path.join('c:', 'Users', 'AbuZar', 'Desktop', 'Fyp', 'Workflow-Capture-SaaS', 'apps', 'desktop', 'dist', fileName),` |
| `apps/web/src/app/api/v1/runners/route.ts:55` | `const resolvedHostname = runnerMeta.hostname \|\| (isOnline ? 'Active Desktop Runner' : 'FlowMind Desktop Worker');` |
| `apps/web/src/app/api/v1/runners/route.ts:122` | `hostname: body.hostname \|\| request.headers.get('x-runner-hostname') \|\| existingMeta.hostname \|\| 'FlowMind Desktop Wor...` |
| `apps/web/src/app/api/v1/webhooks/test/route.ts:115` | `source: 'Workflow-Capture-SaaS Control Plane',` |
| `apps/web/src/app/api/v1/webhooks/test/route.ts:117` | `message: 'Authentic webhook ping verification from FlowMind Workspace',` |
| `apps/web/src/app/api/v1/webhooks/test/route.ts:126` | `'User-Agent': 'FlowMind-Webhook-Verifier/1.0 (PortalSync Cloud Control Plane)',` |
| `apps/web/src/app/api/v1/webhooks/test/route.ts:127` | `'X-FlowMind-Delivery': 'test-ping',` |
| `apps/web/src/app/api/v1/webhooks/test/route.ts:128` | `'X-FlowMind-Event': 'workflow.test_ping',` |
| `apps/web/src/app/api/v1/webhooks/test/route.ts:135` | `headers['X-FlowMind-Signature'] = \`sha256=${signature}\`;` |
| `apps/web/test/artifacts-vault.challenge.mjs:516` | `const file1 = new TextEncoder().encode('Hello FlowMind Artifact 1');` |
| `apps/web/test/theming-system.challenge.mjs:16` | `'flowmind-cyber',` |
| `apps/web/test/theming-system.challenge.mjs:76` | `'flowmind-cyber',` |
| `apps/web/test/theming-system.challenge.mjs:125` | `type: 'workflow-capture-theme-change',` |
| `apps/web/test/theming-system.challenge.mjs:154` | `simulateApplyThemeToDOM(root, storage, events, 'flowmind-cyber', 'dark');` |
| `apps/web/test/theming-system.challenge.mjs:155` | `assert.ok(root.classList.has('theme-flowmind-cyber'));` |
| `apps/web/test/theming-system.challenge.mjs:158` | `assert.ok(!root.classList.has('theme-flowmind-cyber'), 'Old theme class should be removed');` |
| `package-lock.json:19` | `"name": "flowmind-worker",` |
| `package-lock.json:7033` | `"node_modules/flowmind-worker": {` |
| `packages/engine/package.json:4` | `"description": "Standalone Core Browser Automation & Replay Engine for Workflow-Capture",` |
| `packages/engine/src/api/run-controller.js:267` | `if (typeof global.__flowmindBroadcast === 'function') {` |
| `packages/engine/src/api/run-controller.js:268` | `global.__flowmindBroadcast('human_intervention', {` |
| `packages/engine/src/auth/token-service.js:10` | `const JWT_SECRET = process.env.JWT_SECRET \|\| 'workflow-capture-secret-key-change-in-prod-2026';` |
| `packages/engine/src/dashboard/public/css/base.css:2` | `Workflow Capture — Base Resets, Global Layout, & Utility Classes` |
| `packages/engine/src/dashboard/public/css/components.css:2` | `Workflow Capture — Reusable UI Components` |
| `packages/engine/src/dashboard/public/css/ui-modernization.css:2` | `Workflow Capture — UI Modernization Overrides` |
| `packages/engine/src/dashboard/public/css/views.css:2` | `Workflow Capture — Dedicated View Layouts (Overview, Workflows, Console, Portals, Tests)` |
| `packages/engine/src/dashboard/public/css/workflow-editor.css:2` | `Workflow Capture — Modernized Visual Workflow Editor Theme` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:7` | `if (document.getElementById('flowmindFloatingBot')) return;` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:21` | `root.id = 'flowmindFloatingBot';` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:22` | `root.className = 'flowmind-floating-bot-root';` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:23` | `root.setAttribute('aria-label', 'FlowMind Bot Assistant');` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:27` | `<div class="flowmind-floating-card" id="flowmindBotCard">` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:28` | `<div class="flowmind-card-head">` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:29` | `<div class="flowmind-card-title">` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:30` | `<span class="flowmind-card-dot"></span>` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:31` | `<span>FlowMind AI</span>` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:33` | `<button class="flowmind-card-close" id="flowmindBotToggleClose" title="Minimize Bot Assistant" aria-label="Minimize">...` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:35` | `<div class="flowmind-steps-wrap">` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:36` | `<div class="flowmind-steps-line"></div>` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:39` | `<a class="flowmind-step-item flowmind-step-teach" id="flowmindStepTeach" title="Teach: Record workflow demonstration">` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:40` | `<div class="flowmind-step-icon">` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:43` | `<span class="flowmind-step-label">Teach</span>` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:47` | `<a class="flowmind-step-item flowmind-step-learn" id="flowmindStepLearn" title="Learn: Self-healing selector inference">` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:48` | `<div class="flowmind-step-icon">` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:51` | `<span class="flowmind-step-label">Learn</span>` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:55` | `<a class="flowmind-step-item flowmind-step-remember" id="flowmindStepRemember" title="Remember: Persistent workflows ...` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:56` | `<div class="flowmind-step-icon">` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:59` | `<span class="flowmind-step-label">Remember</span>` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:63` | `<a class="flowmind-step-item flowmind-step-run" id="flowmindStepRun" title="Run: Autonomous resilient replay">` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:64` | `<div class="flowmind-step-icon">` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:67` | `<span class="flowmind-step-label">Run</span>` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:73` | `<div class="flowmind-speech-bubble" id="flowmindSpeechBubble" role="alert" aria-live="assertive">` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:74` | `<div class="flowmind-bubble-head">` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:75` | `<div class="flowmind-bubble-badge">` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:76` | `<span class="flowmind-bubble-pulse-dot"></span>` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:77` | `<span class="flowmind-bubble-badge-txt">User Interaction Detected</span>` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:79` | `<button class="flowmind-bubble-close" id="flowmindBubbleClose" title="Dismiss Alert" aria-label="Close">&times;</button>` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:81` | `<div class="flowmind-bubble-body">` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:82` | `<p class="flowmind-bubble-msg" id="flowmindBubbleMsg">` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:83` | `Automation paused: Manual mouse or keyboard input was detected on <strong id="flowmindBubbleStep">Step #1</strong>.` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:85` | `<div class="flowmind-bubble-meta">` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:86` | `<span class="flowmind-bubble-tag" id="flowmindBubbleTag">Input Intercepted</span>` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:87` | `<span class="flowmind-bubble-time" id="flowmindBubbleTime">Just now</span>` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:90` | `<div class="flowmind-bubble-actions">` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:91` | `<button class="flowmind-btn-stop-flow" id="flowmindBtnStopReplay" title="Halt replay safely">` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:95` | `<button class="flowmind-btn-ack" id="flowmindBtnAck">` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:99` | `<div class="flowmind-bubble-tail"></div>` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:103` | `<button class="flowmind-floating-mascot-btn" id="flowmindBotMascotBtn" title="Toggle FlowMind Bot Assistant" aria-lab...` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:104` | `<div class="flowmind-mascot-glow"></div>` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:105` | `<div class="flowmind-orbital-ring"></div>` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:106` | `<div class="flowmind-mascot-svg-wrap">` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:149` | `const mascotBtn = document.getElementById('flowmindBotMascotBtn');` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:150` | `const closeBtn = document.getElementById('flowmindBotToggleClose');` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:187` | `const stepTeach = document.getElementById('flowmindStepTeach');` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:188` | `const stepLearn = document.getElementById('flowmindStepLearn');` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:189` | `const stepRemember = document.getElementById('flowmindStepRemember');` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:190` | `const stepRun = document.getElementById('flowmindStepRun');` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:219` | `const bubbleClose = document.getElementById('flowmindBubbleClose');` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:220` | `const bubbleMsg = document.getElementById('flowmindBubbleMsg');` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:221` | `const bubbleStep = document.getElementById('flowmindBubbleStep');` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:222` | `const bubbleTag = document.getElementById('flowmindBubbleTag');` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:223` | `const bubbleTime = document.getElementById('flowmindBubbleTime');` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:224` | `const btnStopReplay = document.getElementById('flowmindBtnStopReplay');` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:225` | `const btnAck = document.getElementById('flowmindBtnAck');` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:239` | `bubbleMsg.innerHTML = \`Automation paused: Manual <strong>${type}${keyInfo}</strong> detected on <strong class="flowmi...` |
| `packages/engine/src/dashboard/public/js/floating-bot.js:355` | `window.FlowMindBot = {` |
| `packages/engine/src/dashboard/public/js/main.js:26` | `const topbarBrand = document.querySelector('.flowmind-topbar-brand');` |
| `packages/engine/src/dashboard/public/js/theme.js:135` | `window.dispatchEvent(new CustomEvent('workflow-capture-theme-change', { detail: { theme, palette, mode } }));` |
| `packages/engine/src/dashboard/public/js/theme.js:136` | `window.dispatchEvent(new CustomEvent('flowmind-theme-change', { detail: { theme, palette, mode } }));` |
| `packages/engine/src/dashboard/public/js/views/botConfigView.js:773` | `window.addEventListener('workflow-capture-theme-change', (e) => {` |
| `packages/engine/src/dashboard/public/videos/landing-demo.mp4:15288` | `�\`�������8�\|��D0�PVPԩ��[������,�5�b3B�z�?����.�=��#�ej�q�^�ޤ	��?!Az�S�İ���>\|�1�h�����ϰ�8�����5�԰���U�u�...` |
| `packages/engine/src/dashboard/public/videos/landing-demo.mp4:25883` | `�(-RtB�fyp(�M��p=J������v�y4��^����(�_�nO"E�p�,4��c���=����!/��Wz0ۉU��m���[����X:�Z�zݖ-�%*SBȣ ףC%m�N...` |
| `packages/engine/src/dashboard/routes/recorder-routes.js:61` | `if (typeof global.__flowmindBroadcast === 'function') {` |
| `packages/engine/src/dashboard/routes/recorder-routes.js:62` | `return global.__flowmindBroadcast(type, payload);` |
| `packages/engine/src/dashboard/server.js:44` | `logger.success(\`🚀 Workflow Capture Dashboard is live at: http://${host}:${port}\`);` |
| `packages/engine/src/dashboard/sse/sse-event-manager.js:16` | `global.__flowmindBroadcast = this.broadcast;` |
| `packages/engine/src/recorder/recorder-bridge.js:299` | `return; // Never record actions on the workflow capture dashboard itself` |
| `packages/engine/src/recorder/recorder-injected.js:644` | `console.warn('[Workflow Capture] Sniffer notice:', err);` |
| `packages/engine/src/recorder/recorder-injected.js:649` | `console.debug(\`[Workflow Capture] Sniff took ${elapsed.toFixed(1)}ms\`);` |
| `packages/engine/src/recorder/recorder-injected.js:689` | `console.warn('[Workflow Capture] captureTarget threw:', err);` |
| `packages/engine/src/recorder/recorder-injected.js:795` | `console.error('[Workflow Capture] Failed to capture action:', err);` |
| `packages/engine/src/recorder/recorder-injected.js:1068` | `console.warn('[Workflow Capture] emitScrollAction error:', err);` |
| `packages/engine/src/recorder/recorder-injected.js:1129` | `console.warn('[Workflow Capture] handleScroll error:', err);` |
| `packages/engine/src/recorder/recorder-injected.js:1479` | `<button id="pauseButton" type="button" aria-label="Pause workflow capture">` |
| `packages/engine/src/recorder/recorder-injected.js:1482` | `<button id="resumeButton" type="button" aria-label="Resume workflow capture" hidden>` |
| `packages/engine/src/recorder/recorder-injected.js:1535` | `console.error('[Workflow Capture] Could not pause recording:', error);` |
| `packages/engine/src/recorder/recorder-injected.js:1545` | `console.error('[Workflow Capture] Could not resume recording:', error);` |
| `packages/engine/src/recorder/recorder-injected.js:1557` | `console.error('[Workflow Capture] Could not save recording:', error);` |
| `packages/engine/src/replay/replay-engine.js:324` | `if (typeof window.__flowmindStopReplayGuard === 'function') {` |
| `packages/engine/src/replay/replay-engine.js:325` | `window.__flowmindStopReplayGuard();` |
| `packages/engine/src/replay/replay-engine.js:327` | `const host = document.getElementById('__flowmind-replay-guard');` |
| `packages/engine/src/replay/replay-engine.js:329` | `window.__flowmindInterventionAttached = false;` |
| `packages/engine/src/replay/replay-engine.js:330` | `window.__flowmindReplayPaused = false;` |
| `packages/engine/src/replay/replay-engine.js:331` | `window.__flowmindReplayLocked = false;` |
| `packages/engine/src/replay/replay-engine.js:348` | `await page.exposeFunction('__flowmindReportIntervention', (eventDetail) => {` |
| `packages/engine/src/replay/replay-engine.js:358` | `['__flowmindResumeReplay', () => this.resume()],` |
| `packages/engine/src/replay/replay-engine.js:359` | `['__flowmindStopReplay', () => this.abort()],` |
| `packages/engine/src/replay/replay-engine.js:360` | `['__flowmindSetReplayLock', (locked) => this.setLocked(locked)]` |
| `packages/engine/src/replay/replay-engine.js:367` | `window.__flowmindAutomatedActionActive = false;` |
| `packages/engine/src/replay/replay-engine.js:368` | `window.__flowmindAutomatedSince = 0;` |
| `packages/engine/src/replay/replay-engine.js:369` | `window.__flowmindReplayPaused = ${this.isPaused};` |
| `packages/engine/src/replay/replay-engine.js:370` | `window.__flowmindReplayLocked = ${this.isLocked};` |
| `packages/engine/src/replay/replay-engine.js:371` | `if (window.__flowmindInterventionAttached) { window.__flowmindUpdateReplayGuard && window.__flowmindUpdateReplayGuard...` |
| `packages/engine/src/replay/replay-engine.js:372` | `window.__flowmindInterventionAttached = true;` |
| `packages/engine/src/replay/replay-engine.js:376` | `host.id = '__flowmind-replay-guard';` |
| `packages/engine/src/replay/replay-engine.js:382` | `shadow.querySelector('.resume').addEventListener('click', () => window.__flowmindResumeReplay && window.__flowmindRes...` |
| `packages/engine/src/replay/replay-engine.js:383` | `shadow.querySelector('.stop').addEventListener('click', () => window.__flowmindStopReplay && window.__flowmindStopRep...` |
| `packages/engine/src/replay/replay-engine.js:384` | `shadow.querySelector('.lock').addEventListener('click', () => window.__flowmindSetReplayLock && window.__flowmindSetR...` |
| `packages/engine/src/replay/replay-engine.js:385` | `window.__flowmindReplayGuardHost = host;` |
| `packages/engine/src/replay/replay-engine.js:386` | `window.__flowmindUpdateReplayGuard = function() {` |
| `packages/engine/src/replay/replay-engine.js:388` | `card.classList.toggle('paused', !!window.__flowmindReplayPaused);` |
| `packages/engine/src/replay/replay-engine.js:389` | `shadow.querySelector('.title').textContent=window.__flowmindReplayPaused?'Workflow paused':'Automation running';` |
| `packages/engine/src/replay/replay-engine.js:390` | `shadow.querySelector('.sub').textContent=window.__flowmindReplayPaused` |
| `packages/engine/src/replay/replay-engine.js:391` | `? (window.__flowmindReplayLocked?'Input blocked. Resume when ready.':'Workflow paused. Resume when ready.')` |
| `packages/engine/src/replay/replay-engine.js:392` | `: (window.__flowmindReplayLocked?'Input lock is on':'Interact with the site to pause');` |
| `packages/engine/src/replay/replay-engine.js:394` | `lock.textContent=window.__flowmindReplayLocked?'Input lock: On':'Input lock: Off';` |
| `packages/engine/src/replay/replay-engine.js:395` | `lock.classList.toggle('on', !!window.__flowmindReplayLocked);` |
| `packages/engine/src/replay/replay-engine.js:396` | `actions.hidden=!window.__flowmindReplayPaused;` |
| `packages/engine/src/replay/replay-engine.js:398` | `window.__flowmindUpdateReplayGuard();` |
| `packages/engine/src/replay/replay-engine.js:402` | `var expected = window.__flowmindAutomatedTarget;` |
| `packages/engine/src/replay/replay-engine.js:403` | `var expectedKey = window.__flowmindAutomatedKey;` |
| `packages/engine/src/replay/replay-engine.js:407` | `if (window.__flowmindAutomatedActionActive) {` |
| `packages/engine/src/replay/replay-engine.js:415` | `if (!isAutomated && window.__flowmindAutomatedUntil && now < window.__flowmindAutomatedUntil) {` |
| `packages/engine/src/replay/replay-engine.js:416` | `var recentTarget = window.__flowmindAutomatedRecentTarget;` |
| `packages/engine/src/replay/replay-engine.js:417` | `var recentKey = window.__flowmindAutomatedRecentKey;` |
| `packages/engine/src/replay/replay-engine.js:427` | `if (window.__flowmindReplayLocked) {` |
| `packages/engine/src/replay/replay-engine.js:431` | `if (window.__flowmindReplayPaused) return;` |
| `packages/engine/src/replay/replay-engine.js:432` | `window.__flowmindReplayPaused = true;` |
| `packages/engine/src/replay/replay-engine.js:433` | `window.__flowmindUpdateReplayGuard && window.__flowmindUpdateReplayGuard();` |
| `packages/engine/src/replay/replay-engine.js:435` | `if (typeof window.__flowmindReportIntervention === 'function') {` |
| `packages/engine/src/replay/replay-engine.js:436` | `window.__flowmindReportIntervention({` |
| `packages/engine/src/replay/replay-engine.js:440` | `locked: !!window.__flowmindReplayLocked,` |
| `packages/engine/src/replay/replay-engine.js:445` | `window.__flowmindReplayInputHandler=onHumanInput;` |
| `packages/engine/src/replay/replay-engine.js:447` | `window.__flowmindStopReplayGuard=function(){` |
| `packages/engine/src/replay/replay-engine.js:449` | `if(host)host.remove(); window.__flowmindInterventionAttached=false;` |
| `packages/engine/src/replay/replay-engine.js:472` | `window.__flowmindReplayPaused=state.paused;` |
| `packages/engine/src/replay/replay-engine.js:473` | `window.__flowmindReplayLocked=state.locked;` |
| `packages/engine/src/replay/replay-engine.js:474` | `window.__flowmindUpdateReplayGuard && window.__flowmindUpdateReplayGuard();` |
| `packages/engine/src/replay/replay-engine.js:485` | `await frame.evaluate(() => window.__flowmindStopReplayGuard && window.__flowmindStopReplayGuard()).catch(() => {});` |
| `packages/engine/src/replay/replay-engine.js:525` | `window.__flowmindAutomatedActionActive = active;` |
| `packages/engine/src/replay/replay-engine.js:527` | `window.__flowmindAutomatedTarget = target \|\| null;` |
| `packages/engine/src/replay/replay-engine.js:528` | `window.__flowmindAutomatedKey = key \|\| null;` |
| `packages/engine/src/replay/replay-engine.js:529` | `window.__flowmindAutomatedSince = Date.now();` |
| `packages/engine/src/replay/replay-engine.js:531` | `window.__flowmindAutomatedUntil = Date.now() + 150;` |
| `packages/engine/src/replay/replay-engine.js:532` | `window.__flowmindAutomatedRecentTarget = window.__flowmindAutomatedTarget \|\| null;` |
| `packages/engine/src/replay/replay-engine.js:533` | `window.__flowmindAutomatedRecentKey = window.__flowmindAutomatedKey \|\| null;` |
| `packages/engine/src/replay/replay-engine.js:534` | `window.__flowmindAutomatedTarget = null;` |
| `packages/engine/src/replay/replay-engine.js:535` | `window.__flowmindAutomatedKey = null;` |
| `packages/engine/src/replay/replay-engine.js:540` | `window.__flowmindAutomatedActionActive = active;` |
| `packages/engine/src/replay/replay-engine.js:542` | `window.__flowmindAutomatedTarget = el;` |
| `packages/engine/src/replay/replay-engine.js:543` | `window.__flowmindAutomatedKey = null;` |
| `packages/engine/src/replay/replay-engine.js:544` | `window.__flowmindAutomatedSince = Date.now();` |
| `packages/engine/src/replay/replay-engine.js:546` | `window.__flowmindAutomatedUntil = Date.now() + 150;` |
| `packages/engine/src/replay/replay-engine.js:547` | `window.__flowmindAutomatedRecentTarget = el;` |
| `packages/engine/src/replay/replay-engine.js:548` | `window.__flowmindAutomatedRecentKey = null;` |
| `packages/engine/src/replay/replay-engine.js:549` | `window.__flowmindAutomatedTarget = null;` |
| `packages/engine/src/replay/replay-engine.js:550` | `window.__flowmindAutomatedKey = null;` |
| `packages/engine/src/runner/cli.js:122` | `-u, --cloud-url <url>        PortalSync Cloud API URL (default: http://localhost:3000)` |
| `packages/engine/src/runner/cli.js:146` | `port connectivity, and PortalSync Cloud API authentication status.` |
| `packages/engine/src/runner/cli.js:150` | `-u, --cloud-url <url>        PortalSync Cloud API URL (default: http://localhost:3000)` |
| `packages/engine/src/runner/cli.js:176` | `-u, --cloud-url <url>        PortalSync Cloud API URL (default: http://localhost:3000)` |
| `packages/engine/src/runner/cli.js:197` | `Fetch a specific workflow definition from the PortalSync Cloud API and` |
| `packages/engine/src/runner/cli.js:205` | `-u, --cloud-url <url>        PortalSync Cloud API URL (default: http://localhost:3000)` |
| `packages/engine/src/runner/cli.js:224` | `const targetFolder = options.targetFolder \|\| path.join(os.homedir(), 'Downloads', 'PortalSync');` |
| `packages/engine/src/runner/cli.js:348` | `const targetFolder = options.targetFolder \|\| path.join(os.homedir(), 'Downloads', 'PortalSync');` |
| `packages/engine/src/runner/cli.js:392` | `const targetFolder = options.targetFolder \|\| path.join(os.homedir(), 'Downloads', 'PortalSync');` |
| `packages/engine/src/runner/dedup-helper.js:266` | `const base = baseDir \|\| path.join(os.homedir(), 'Downloads', 'PortalSync');` |
| `packages/engine/src/runner/runner-daemon.js:94` | `this.targetFolder = options.targetFolder \|\| path.join(os.homedir(), 'Downloads', 'PortalSync');` |
| `packages/engine/src/runner/runner-daemon.js:128` | `this.logger.info(\`Starting PortalSync Runner Daemon (CDP port: ${this.cdpPort}, Poll interval: ${this.pollIntervalMs ...` |
| `packages/engine/src/runner/runner-daemon.js:170` | `this.logger.info('Stopping PortalSync Runner Daemon...');` |
| `packages/engine/src/runner/runner-daemon.js:387` | `runTargetDir = path.join(os.tmpdir(), 'PortalSync', sanitizedPortalName);` |
| `packages/engine/src/runner/runner.test.js:418` | `const expectedDefaultBase = path.join(os.homedir(), 'Downloads', 'PortalSync', 'DefaultPortal');` |
| `packages/engine/src/runner/runner.test.js:422` | `const customBase = path.join(os.tmpdir(), 'PortalSyncTest');` |
| `packages/engine/src/runner/runner.test.js:780` | `const portalDir = path.join(tmpDir, 'PortalSync', 'Acme_Supplier');` |
| `packages/engine/src/utils/cdp-connector.js:78` | `const profileDir = process.env.CHROME_PROFILE_DIR \|\| path.join(os.homedir(), '.workflow-capture', 'chrome-profile');` |
| `packages/engine/test/adversarial/adversarial-engine.test.js:174` | `createPage: (url = 'https://portal.flowmind.test') => ({` |
| `packages/engine/test/adversarial/adversarial-engine.test.js:897` | `const tabManager = new TabManager({ downloadsDir: 'C:\\FlowMind\\Downloads' });` |
| `packages/engine/test/adversarial/adversarial-engine.test.js:903` | `url: () => 'https://portal.flowmind.test/export',` |
| `packages/engine/test/adversarial/adversarial-engine.test.js:927` | `assert.strictEqual(downloadCmd.params.downloadPath, 'C:\\FlowMind\\Downloads');` |
| `packages/engine/test/auth.test.js:149` | `let testUser = db.findOne('users', u => u.email === 'testuser@flowmind.local');` |
| `packages/engine/test/auth.test.js:153` | `email: 'testuser@flowmind.local',` |
| `packages/engine/test/download-deduplication.test.js:246` | `workflowName: 'US Oil Customer Portal Sync',` |

### 2e. Stray and Duplicate Leftover Files (REPORT ONLY)

> **Instruction:** REPORT ONLY, do not delete in Phase 1.

| Stray / Duplicate File | Duplicate Target | Description |
| :--- | :--- | :--- |
| `packages/engine/test/ecommerce-portal.html` | `packages/engine/test/fixtures/ecommerce-portal.html` | Identical test HTML fixture file duplicated in test root and test/fixtures/. |
| `packages/engine/test/library-portal.html` | `packages/engine/test/fixtures/library-portal.html` | Identical test HTML fixture file duplicated in test root and test/fixtures/. |
| `packages/engine/test/sales-portal.html` | `packages/engine/test/fixtures/sales-portal.html` | Identical test HTML fixture file duplicated in test root and test/fixtures/. |
| `apps/desktop/test-http-bridge.js` | `N/A` | Standalone HTTP bridge test script in apps/desktop containing hardcoded agent worktree paths. |

