# Project: PortalSync Cloud Control Plane & Desktop Runner Bridge

## Architecture
PortalSync connects the local Chrome browser automation engine (`packages/engine`) to the Next.js cloud control plane (`apps/web`). The architecture comprises:
1. **Cloud Control Plane (`apps/web`)**:
   - Next.js 16 (React 19, Turbopack, App Router) running on Node.js.
   - Dual Authentication: Cookie-based sessions for interactive dashboard users; Bearer token (`ps_live_<org_id>`) or `x-runner-token` header for headless desktop runners.
   - REST API v1 (`/api/v1/runs`, `/api/v1/workflows`, `/api/v1/artifacts`): Atomic state machine, polling queue, telemetry sync, artifact catalog.
   - Dashboard UI: Real-time portal management, dual-mode portal creation modal (Quick Setup & JSON Import), "Run Now" dispatcher, execution history drawer with SHA-256 checksums, and 90s HITL 2FA countdown badge/banner.
   - Supabase PostgreSQL: `wf_organizations`, `wf_organization_members`, `wf_workflows`, `wf_execution_runs`, `wf_run_artifacts`.
2. **Desktop Runner Bridge (`packages/engine`)**:
   - Zero-dependency CommonJS architecture running on Node 25 (`util.parseArgs`, native `fetch`, `crypto`, `http`).
   - `cloud-client.js`: Authenticated API communication layer using `ps_live_<org_id>`.
   - `runner-daemon.js`: 10–15s HTTP polling loop against `/api/v1/runs?status=pending`, Chrome CDP connection on port 9222, atomic run claiming, `LoopReplayRunner` execution, 90s Human-in-the-Loop 2FA pause (`requires_action`), SHA-256 deduplication, local storage, and cloud artifact registration.
   - `cli.js`: Command-line interface providing `doctor`, `run <workflow_id>`, and `listen` commands.
3. **E2E Testing & Verification**:
   - Opaque-box test suite verifying API contracts, state transitions, artifact tracking, CLI commands, and TypeScript/ESLint zero-error compilation (115/115 tests passed).

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | Dual Runner Token Auth | Authenticate via `Authorization: Bearer ps_live_<org_id>` or `x-runner-token` with fallback to user session | M1 | Survey E1 | DONE |
| 2 | Polling Pending Runs | `GET /api/v1/runs?status=pending` filtered by authenticated `org_id` | M1 | ORIGINAL_REQUEST R1 | DONE |
| 3 | Atomic Run Transitions | `PATCH /api/v1/runs` enforcing `pending` -> `running` -> `requires_action` -> `completed` / `failed` | M1 | ORIGINAL_REQUEST R1 | DONE |
| 4 | Artifact Registration API | `POST /api/v1/artifacts` registering downloaded files into `wf_run_artifacts` with SHA-256 and size | M1 | ORIGINAL_REQUEST R1 | DONE |
| 5 | Hybrid Storage Preferences | `POST`/`PATCH /api/v1/workflows` persisting `upload_to_cloud` and `target_folder` in `workflow_definition` | M1 | ORIGINAL_REQUEST R1 | DONE |
| 6 | Database Column Corrections | Fix queries in `dashboard/page.tsx` (`org_id` vs `organization_id`, `started_at` vs `created_at`) | M2 | Survey E2 | DONE |
| 7 | Dual-Mode Portal Creator Modal | Quick Setup Form vs Import Recorded JSON modal dialog with validation | M2 | ORIGINAL_REQUEST R2 | DONE |
| 8 | Dashboard "Run Now" Trigger | "Run Now" button creates real run in Supabase with `status: 'pending'` | M2 | ORIGINAL_REQUEST R2 | DONE |
| 9 | Run Details & Artifacts Drawer | Slide-over drawer displaying downloaded invoices, SHA-256 hashes, sizes, and telemetry | M2 | ORIGINAL_REQUEST R2 | DONE |
| 10 | 2FA Countdown Badge & Banner | Prominent `requires_action` status badge with 90s countdown and top alert banner | M2 | ORIGINAL_REQUEST R2 | DONE |
| 11 | Desktop Cloud Client | `cloud-client.js` with native `fetch` and runner token auth for polling, claiming, updating, and artifacts | M3 | ORIGINAL_REQUEST R3 | DONE |
| 12 | Runner Daemon Loop | `runner-daemon.js` with port 9222 check, 10–15s poll loop, run claiming, and `LoopReplayRunner` execution | M3 | ORIGINAL_REQUEST R3 | DONE |
| 13 | 90s HITL 2FA Intervention | Detect 2FA/login challenge, signal `requires_action`, pause 90s, resume or fail on timeout | M3 | ORIGINAL_REQUEST R3 | DONE |
| 14 | SHA-256 Deduplication & Storage | Compute SHA-256 checksums, save to structured local paths, register to cloud | M3 | ORIGINAL_REQUEST R3 | DONE |
| 15 | Desktop Runner CLI | `cli.js` with zero external dependency breakages for `doctor`, `run`, and `listen` | M3 | ORIGINAL_REQUEST R3 | DONE |
| 16 | E2E Testing Suite | Multi-tier test suite covering API, UI components, daemon, CLI doctor, and build quality | M4 | ORIGINAL_REQUEST AC | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Cloud Run Polling & Telemetry API | `apps/web/src/app/api/v1/` routes: auth helper, runs polling/transition, artifacts endpoint, workflows hybrid storage, lint fixes | None | DONE |
| M2 | Dual-Mode Portal Creator & Dashboard UI | `apps/web/src/components/dashboard/` and `apps/web/src/app/dashboard/page.tsx`: modal, drawer, badge, banner, "Run Now", schema fixes | M1 | DONE |
| M3 | Desktop Runner Cloud Bridge & Daemon | `packages/engine/src/runner/`: `cloud-client.js`, `runner-daemon.js`, `cli.js`, 2FA HITL, SHA-256 hashing | M1 | DONE |
| M4 | E2E Testing Suite & Acceptance Gates | Full E2E verification, `npm run build` zero TS/ESLint errors, CLI doctor test, forensic audit | M1, M2, M3 | DONE |

## Interface Contracts
### Desktop Runner ↔ Cloud API
- **Authentication**:
  - Header: `Authorization: Bearer ps_live_<org_id>` or `x-runner-token: ps_live_<org_id>`
  - Format: `ps_live_` followed by org ID (supports full UUID or prefix match)
- **Polling Pending Runs**:
  - `GET /api/v1/runs?status=pending`
  - Response: `{ runs: ExecutionRun[] }`
- **Claiming Run**:
  - `PATCH /api/v1/runs`
  - Body: `{ run_id: string, status: 'running' }`
  - Response: `{ run: ExecutionRun }` (or `409 Conflict` if already claimed)
- **2FA Challenge Signal**:
  - `PATCH /api/v1/runs`
  - Body: `{ run_id: string, status: 'requires_action', error_summary: '2FA challenge detected: awaiting verification' }`
  - Response: `{ run: ExecutionRun }`
- **Completion / Failure Signal**:
  - `PATCH /api/v1/runs`
  - Body: `{ run_id: string, status: 'completed' | 'failed', items_processed: number, items_downloaded: number, completed_at: string, error_summary?: string }`
- **Artifact Registration**:
  - `POST /api/v1/artifacts`
  - Body: `{ run_id: string, file_name: string, file_size_bytes: number, sha256_hash: string, cloud_storage_path?: string, item_metadata?: Record<string, unknown> }`
  - Response: `201 Created` with `{ artifact: RunArtifact }`

### Dashboard UI ↔ Cloud API & Supabase
- **Run Now**:
  - Inserts `wf_execution_runs` with `{ org_id, workflow_id, status: 'pending', started_at: now() }`
- **Workflow Creation**:
  - Inserts `wf_workflows` with `{ org_id, name, portal_url, workflow_definition: { ..., upload_to_cloud: boolean, target_folder: string } }`
- **Artifact Query**:
  - `GET /api/v1/artifacts?run_id=<run_id>` or Supabase query on `wf_run_artifacts` by `run_id`

## Code Layout
- `apps/web/src/lib/auth/runner-auth.ts`: Dual runner-token and session authenticator
- `apps/web/src/app/api/v1/runs/route.ts`: Runs query, creation, and atomic transition handler
- `apps/web/src/app/api/v1/workflows/route.ts`: Workflows listing, creation, and update handler
- `apps/web/src/app/api/v1/artifacts/route.ts`: Run artifacts registration and retrieval
- `apps/web/src/lib/types/database.ts`: Database types and `RunStatus` unions
- `apps/web/src/components/dashboard/`:
  - `CreatePortalModal.tsx`: Quick Setup and JSON Import modal
  - `RunDetailsDrawer.tsx`: Execution details, metrics, and artifact checksum list
  - `StatusBadge.tsx`: Badges for all run states including 90s countdown
  - `TwoFactorBanner.tsx`: Dashboard top banner for 2FA intervention
- `apps/web/src/app/dashboard/page.tsx`: Consolidated dashboard page wiring components
- `packages/engine/src/runner/`:
  - `cloud-client.js`: HTTP client for cloud API
  - `runner-daemon.js`: CDP polling daemon and 2FA handler
  - `dedup-helper.js`: SHA-256 checksum computation and file deduplication
  - `hitl-detector.js`: 2FA challenge detection and 90s countdown resolution
  - `cli.js`: CLI tool (`doctor`, `run`, `listen`)
- `tests/`:
  - `helpers/`: `test-harness.js`, `mock-cloud-server.js`, `mock-cdp-server.js`, `fixtures.js`
  - `tier1-features/`: `test-r1-cloud-api.js`, `test-r2-dashboard.js`, `test-r3-desktop-runner.js`
  - `tier2-boundaries/`: `test-token-errors.js`, `test-status-transitions.js`, `test-empty-bodies.js`, `test-file-hash-uniqueness.js`, `test-timeout-90s-edge.js`
  - `tier3-interactions/`: `test-cross-feature-lifecycle.js`
  - `tier4-realworld/`: `test-invoice-capture-scenario.js`
  - `run-all-tests.js`: Standalone runner
