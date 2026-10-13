# FlowMind (PortalSync)

Autonomous enterprise browser automation and RPA platform. FlowMind bridges a modern cloud control plane with a local desktop automation daemon and Chrome DevTools Protocol (CDP) engine for resilient web workflow capture, intelligent element discovery, and reliable replay without breaking on 2FA, popups, or anti-bot protections.

---

## Key Capabilities

- **Resilient Autonomous Replay**: Multi-strategy selector resolution across IDs, CSS selectors, normalized text, and evaluated XPaths.
- **Smart Interruption Recovery**: Automatically detects and dismisses unexpected overlays, cookie banners, and survey popups while protecting in-workflow modals and dialog inputs.
- **Visual Workflow Editor**: Interactive full-page visual workflow canvas (`/dashboard/workflows/[id]/edit`) built on Drawflow and Next.js 16.
- **90-Second Human-in-the-Loop (HITL) 2FA**: Detects 2FA, OTP, and CAPTCHA challenges, alerts the cloud dashboard, and provides a 90s countdown for user resolution before cleanly resuming.
- **State-Aware Checkbox Idempotency**: Inspects DOM and ARIA checkbox states to prevent accidental toggling on replay.
- **Multi-Tab Orchestration**: Manages auxiliary tabs and popups during downloads and authentication flows.
- **Hybrid Artifact Storage & Deduplication**: Computes cryptographic SHA-256 hashes of all downloaded files, deduplicates local storage, and optionally syncs artifacts to Supabase Storage.

---

## Monorepo Architecture

```text
Workflow-Capture-SaaS/
├── apps/
│   ├── web/               # Next.js 16 Web Control Plane & Customer Dashboard
│   └── desktop/           # Electron Desktop Client & Local HTTP Bridge (:49152)
├── packages/
│   └── engine/            # Core Browser Automation Engine & Runner Daemon
├── tests/                 # 4-Tier Zero-Dependency E2E Test Suite
├── docs/                  # System Architecture & Technical Specifications
└── DESIGN.md              # FlowMind Design System Tokens & Editorial Guidelines
```

For an in-depth breakdown of the technical design, data flows, and state machines, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). For design tokens and typography hierarchy, refer to [DESIGN.md](DESIGN.md).

---

## Tech Stack

- **Cloud Web App**: Next.js 16 (App Router, Turbopack, React 19), Tailwind CSS v4, TypeScript, Lucide Icons, Drawflow
- **Database & Auth**: Supabase (PostgreSQL with Row-Level Security, Storage Buckets)
- **Desktop Application**: Electron, Node.js, Localhost HTTP Bridge (`127.0.0.1:49152`)
- **Automation Engine**: Node.js, Puppeteer-core, Chrome DevTools Protocol (`127.0.0.1:9222`)
- **Test Suite**: Native Node.js test harness (Zero external dependencies)

---

## Getting Started

### Prerequisites

- **Node.js**: `20.x` or higher (tested on Node 20+ and Node 25)
- **Google Chrome**: Launched with remote debugging enabled (`--remote-debugging-port=9222`)
- **Supabase**: Account with configured schema (`wf_organizations`, `wf_workflows`, `wf_execution_runs`, `wf_run_artifacts`)

---

### 1. Web Control Plane (`apps/web`)

```bash
# From repository root:
npm run dev

# Or directly in apps/web:
cd apps/web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the marketing landing page and access `/dashboard`.

---

### 2. Desktop Application (`apps/desktop`)

The desktop app runs in the system tray, automatically coordinates Chrome instances on port 9222, and provides the local HTTP bridge on port 49152 for web-to-desktop workflow recording.

```bash
# Launch Electron desktop client:
npm run desktop

# Package desktop executables:
npm run desktop:build        # Windows installer / portable exe
npm run desktop:build:mac    # macOS dmg / zip
npm run desktop:build:all    # Multi-platform build
```

---

### 3. Headless Runner Daemon (`packages/engine`)

The headless runner daemon polls the cloud control plane for pending execution runs and executes workflows locally:

```bash
# Run system and CDP diagnostics:
npm run runner:doctor

# Start polling daemon:
npm run runner:listen

# Execute a specific workflow directly:
node packages/engine/src/runner/cli.js run <workflow_id_or_file>
```

---

## Testing & Verification

The repository includes a comprehensive 4-tier integration test suite built with zero external npm dependencies:

```bash
# Run the complete test suite:
npm test

# Run individual test tiers:
node tests/tier1-features/test-r1-cloud-api.js
node tests/tier1-features/test-r2-dashboard.js
node tests/tier1-features/test-r3-desktop-runner.js
node tests/tier2-boundaries/test-status-transitions.js
node tests/tier3-interactions/test-cross-feature-lifecycle.js
node tests/tier4-realworld/test-invoice-capture-scenario.js
```
