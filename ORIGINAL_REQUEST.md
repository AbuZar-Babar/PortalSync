# Original User Request

## Initial Request — 2026-10-09T17:40:21Z

Combine the advanced browser automation engine from **Workflow Capture** (`c:\Users\AbuZar\Desktop\Fyp\Workflow-Capture` on branch `origin/(ADDING-LANDING-PAGE)`) with the cloud control plane from **Workflow Capture SaaS** (`c:\Users\AbuZar\Desktop\Fyp\Workflow-Capture-SaaS`) into a unified, production-ready enterprise SaaS platform branded **FlowMind**.

Working directory: `c:\Users\AbuZar\Desktop\Fyp\Workflow-Capture-SaaS`  
Source engine directory: `c:\Users\AbuZar\Desktop\Fyp\Workflow-Capture`  
Integrity mode: development  

## Requirements

### R1. Upgrade Core Automation Engine & QA Suites (`packages/engine`)
Synchronize the core engine modules in `packages/engine/src/` from `Workflow-Capture` (`origin/(ADDING-LANDING-PAGE)`):
- Multi-Tab Manager (`src/replay/tab-manager.js`) to handle popup windows and secondary tab downloads.
- Smart Interruption Recovery (`src/replay/interruption-handler.js`) with Case Q transparent backdrop/overlay preservation.
- State-aware Checkbox Idempotency (`src/replay/action-executors.js`, `src/recorder/recorder-bridge.js`) to prevent accidental un-checking.
- Table Control Column Alignment (`src/shared/field-detector.js`, `src/shared/selector-resolver.js`) ignoring expander arrows/checkboxes so data columns never shift.
- Universal Date Parser & Compound Boolean Filter Engine (`src/shared/item-filter.js`, `src/shared/page-inspector.js`, `src/shared/item-discovery.js`).
- Port all 22 automated test suites and HTML test fixtures from `Workflow-Capture/test/` to `packages/engine/test/`.
- Preserve the Cloud Runner Bridge in `packages/engine/src/runner/` (`runner-daemon.js`, `cloud-client.js`, `hitl-detector.js`, `dedup-helper.js`, `cli.js`) ensuring seamless compatibility with the upgraded `LoopReplayRunner`.

### R2. High-Fidelity FlowMind Public Landing Page (`apps/web/src/app/page.tsx`)
Transform the public homepage using the FlowMind aesthetic from WC's `landing.html`:
- Modern dark space aesthetic (`#060913`) with cyan and indigo ambient glow.
- Hero section with live badges, copy, and animated product showcase.
- Interactive 3-way feature tab switcher (Record Once, Discover Intelligently, Replay Resiliently).
- Video demo modal displaying `public/videos/landing-demo.mp4`.
- Integrated 3-tier SaaS pricing grid (`Starter $29/mo`, `Pro $99/mo`, `Enterprise $249/mo`) linking to Supabase `/signup`.
- Supabase auth navigation (`/login`, `/signup`).

### R3. Dedicated Full-Page Visual Workflow Editor (`apps/web/src/app/dashboard/workflows/[id]/edit`)
Implement an interactive visual workflow canvas using Drawflow in Next.js 16:
- Dedicated full-screen route (`/dashboard/workflows/[id]/edit/page.tsx`) with top bar (Back to Dashboard, Workflow Name, Zoom/Pan controls, Save to Cloud, Run Now).
- Custom styled node cards (Actions: Click/Type/Select, Navigate, Wait, Loop Start, Item Extraction, File Download) with Quixotic Slate/Emerald theme.
- Interactive step property drawer to configure selectors, timeouts, and values.
- Two-way persistence with Supabase: loads workflow from `/api/v1/workflows` and saves both the visual graph and compiled execution `steps` array into `workflow_definition`.

### R4. Dashboard Modernization & Guided Empty State (`apps/web/src/app/dashboard`)
- Update branding and header to **FlowMind**.
- Add clean empty state: when no workflows exist in the organization, display an interactive card guiding the user to "Create Your First Workflow".
- Add "Open Visual Canvas" action button to existing workflow cards linking directly to `/dashboard/workflows/[id]/edit`.
- Update `CreatePortalModal.tsx` to support the full trio: Web-to-Desktop recording trigger, Visual Canvas Builder link, and JSON import/export.

### R5. Hybrid Storage & Telemetry Integration
- Downloaded files remain stored locally by default with SHA-256 deduplication and registration in Supabase (`wf_run_artifacts`).
- Support hybrid cloud upload: if `upload_to_cloud: true` is configured in `workflow_definition`, the runner uploads the file to Supabase Storage for direct download from the web dashboard drawer.

## Acceptance Criteria

### Core Automation Engine (`packages/engine`)
- [ ] All 22 test suites in `packages/engine/test/` execute and pass 100% via `node --test` without broken dependencies.
- [ ] `packages/engine/src/runner/cli.js doctor` completes all diagnostics successfully.
- [ ] `packages/engine/src/runner/runner-daemon.js` boots, connects to Chrome CDP, claims runs, and executes workflows with the upgraded `LoopReplayRunner`.
- [ ] 90-second HITL 2FA intervention remains intact and triggers `requires_action` state upon challenge detection.

### Web Application (`apps/web`)
- [ ] `npm run build` in `apps/web` succeeds with 0 TypeScript errors and 0 ESLint errors.
- [ ] Landing page (`/`) renders responsive FlowMind hero, interactive tabs, video modal, and pricing cards without console errors.
- [ ] Navigating to `/dashboard/workflows/[id]/edit` renders the full-screen Drawflow visual canvas, allows creating/connecting nodes, and successfully saves changes to Supabase.
- [ ] First-time dashboard view displays the clean guided empty state.
- [ ] All 115 tests in `tests/run-all-tests.js` pass cleanly.

## Verification Resources
- Engine test suites: `packages/engine/test/*.test.js` (including `checkbox-idempotency.test.js`, `item-filter.test.js`, `exception-tab-management.test.js`, `multi-checkbox-workflow.test.js`, `table-expander-field-alignment.test.js`, `universal-date-handler.test.js`).
- SaaS E2E test suite: `tests/run-all-tests.js` (Tiers 1–4).
- Production build verification: `npm run build --prefix apps/web`.

## Follow-up — 2026-10-09T19:30:42Z

The server was restarted. Please resume the teamwork workflow, complete the independent victory audit, and provide the final evaluation report.
