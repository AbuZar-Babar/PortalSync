# FlowMind Platform Architecture

## 1. System Overview

FlowMind (PortalSync) is a hybrid enterprise browser automation and RPA platform designed for resilient web workflow capture, intelligent element discovery, and autonomous replay.

The platform bridges a modern cloud control plane with a local desktop automation daemon and Chrome DevTools Protocol (CDP) engine. This architecture ensures high-speed execution, complete bypass of remote cloud IP bans/bot detection, and native support for 2FA / Human-in-the-Loop (HITL) authentication.

```text
┌────────────────────────────────────────────────────────┐
│                   Next.js Web App                      │
│     (Marketing Landing, Dashboard, Visual Editor,      │
│               Run Telemetry API /v1)                   │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS / WebSocket
                           ▼
┌────────────────────────────────────────────────────────┐
│                   Supabase Cloud                       │
│    (PostgreSQL, Row-Level Security, Storage Buckets)   │
└──────────────────────────▲─────────────────────────────┘
                           │ Polling / Telemetry
                           ▼
┌────────────────────────────────────────────────────────┐
│            Desktop Runner & Engine Bridge              │
│  (Electron Tray Client, Runner Daemon, HTTP Bridge)    │
└──────────────────────────┬─────────────────────────────┘
                           │ Chrome DevTools Protocol (CDP :9222)
                           ▼
┌────────────────────────────────────────────────────────┐
│                   Local Chromium                       │
│      (Workflow Recording, Autonomous Replay,           │
│        Target Element Actions, Tab Management)         │
└────────────────────────────────────────────────────────┘
```

---

## 2. Monorepo Organization

The project is structured as an npm workspaces monorepo:

| Directory | Component | Technology | Responsibility |
|---|---|---|---|
| `apps/web` | Cloud Web Plane | Next.js 16, React 19, Tailwind CSS v4, Lucide | Marketing landing page, Supabase auth, customer dashboard, visual workflow editor (Drawflow), and telemetry API (`/api/v1/*`). |
| `apps/desktop` | Desktop Client & Tray | Electron, Node.js | Desktop tray application, Chrome spawner, local HTTP bridge (`127.0.0.1:49152`), desktop runner controller, and packaging. |
| `packages/engine` | Core Automation Engine | Node.js, Puppeteer-core, CDP | Browser automation engine, workflow recorder bridge, action executors, interruption recovery, and headless runner daemon. |
| `tests/` | E2E & Integration Suite | Native Node.js test harness | 4-tier opaque-box test suite verifying API contracts, state transitions, artifact tracking, CLI diagnostics, and lifecycles. |
| `docs/` | Documentation | Markdown | Architectural specifications, API contracts, and integration guides. |

---

## 3. Core Engine Architecture (`packages/engine`)

The engine operates over native Chrome DevTools Protocol (port 9222) using `puppeteer-core`. Key subsystems include:

### 3.1 LoopReplayRunner & Action Executors
- **Multi-Strategy Resolution**: Resolves target elements across IDs, CSS selectors, normalized text, attributes, and evaluated XPaths.
- **State-Aware Checkbox Idempotency**: Automatically inspects checkbox and toggle states (`checked`, `aria-checked`) prior to clicks to guarantee idempotent execution.
- **Table Control Column Alignment**: Distinguishes data columns from expander arrows, selection checkboxes, and action menus to ensure consistent tabular data extraction.

### 3.2 InterruptionHandler & Popup Recovery
- **Autonomous Detection**: Identifies unexpected overlays, modal dialogs, cookie banners, and survey popups during replay.
- **Target Protection Tree**: Inspects the active step's target and builds a protected DOM ancestor set, ensuring legitimate in-workflow dialogs (e.g. nested registration forms) are never dismissed prematurely.
- **Smart Escape Suppression**: Suppresses `Escape` key actions if the target element resides inside an active modal container.

### 3.3 Multi-Tab Manager
- Tracks popup windows, redirects, and auxiliary tabs opened during file downloads or third-party authentications.
- Automatically synchronizes CDP listeners across opened targets and safely switches execution back to the primary context upon completion.

---

## 4. Runner Daemon & Cloud Bridge

The runner daemon (`packages/engine/src/runner/runner-daemon.js`) connects local browser execution with cloud-scheduled jobs:

1. **Authentication**: Uses organization tokens (`Authorization: Bearer ps_live_<org_id>` or `x-runner-token: ps_live_<org_id>`).
2. **Polling Loop**: Continuously queries `GET /api/v1/runs?status=pending` every 10–15 seconds.
3. **Atomic Claiming**: Transitions runs via `PATCH /api/v1/runs` (`status: 'running'`) with conflict handling to avoid double-execution across multiple daemon instances.
4. **90-Second Human-in-the-Loop (HITL) 2FA Intervention**:
   - Detects login verification, SMS/authenticator prompts, and CAPTCHAs.
   - Transitions run state to `requires_action` with an active 90-second resolution window.
   - Listens for user completion in the local browser; resumes workflow upon resolution or marks the run as failed on timeout.
5. **Deduplication & Storage**:
   - Calculates cryptographic SHA-256 hashes of downloaded artifacts.
   - Saves files to organized local directories (`~/Downloads/PortalSync/` or custom folders).
   - If `upload_to_cloud: true` is configured, syncs artifacts to Supabase Storage for direct web access.
   - Registers artifacts with the cloud catalog via `POST /api/v1/artifacts`.

---

## 5. API Contracts (`apps/web/src/app/api/v1`)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/runs` | `GET` | Retrieve execution runs filtered by `status` (e.g., `pending`). |
| `/api/v1/runs` | `POST` | Create a new run trigger (`status: 'pending'`). |
| `/api/v1/runs` | `PATCH` | Atomic status transitions (`running`, `requires_action`, `completed`, `failed`). |
| `/api/v1/workflows` | `GET`, `POST`, `PATCH` | Query and persist workflows, visual canvas layout, and execution definition. |
| `/api/v1/artifacts` | `GET`, `POST` | Register downloaded files (with SHA-256 and size) and retrieve artifact telemetry. |
| `/api/v1/artifacts/download` | `GET` | Fetch signed URLs or download local/synced artifacts. |

---

## 6. Testing & Quality Verification

Testing uses a lightweight native Node.js test harness (`tests/helpers/test-harness.js`) requiring zero external dependencies:

- **Tier 1 (Feature Coverage)**: Cloud API contracts, dashboard component schemas, desktop runner CLI, and localhost HTTP bridge.
- **Tier 2 (Boundary & Corner Cases)**: Authentication failures, illegal state transitions, malformed payloads, SHA-256 collision handling, and 90s HITL clock edges.
- **Tier 3 (Cross-Feature Lifecycles)**: Multi-component end-to-end orchestration, concurrency arbitration, and hybrid storage routing.
- **Tier 4 (Real-World Scenarios)**: High-volume invoice batch extraction and network interruption simulation.
