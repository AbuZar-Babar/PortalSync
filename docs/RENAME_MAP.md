# ReFlow — Architecture & Legacy Rename Map (`RENAME_MAP.md`)

This document serves as the canonical reference for the Phase 1 rebranding migration from legacy product names (`FlowMind`, `PortalSync`, `Workflow-Capture`) to **ReFlow**.

---

## 1. Package Names & Monorepo Scopes

| Scope / Package | Legacy Identifier | Canonical ReFlow Identifier | Notes |
| :--- | :--- | :--- | :--- |
| **Root Workspace** | `reflow-saas` | `reflow-saas` | Private monorepo root |
| **Engine Core** | `@workflow-capture/engine` | `@reflow/engine` | Monorepo npm package scope updated in `packages/engine/package.json` |
| **Desktop App** | `flowmind-worker` / `portalsync-desktop-worker` | `reflow-worker` | Packaged Electron worker |

---

## 2. Desktop Application & Electron Identity

| Component | Legacy | Canonical ReFlow | Migration Behavior |
| :--- | :--- | :--- | :--- |
| **Application ID (`appId`)** | `com.flowmind.worker` | `com.reflow.worker` | Configured in `apps/desktop/package.json` |
| **Product Name** | `FlowMind Worker` | `ReFlow Worker` | Used in window titles, menu bars, tray tooltips |
| **Electron User Data** | `%APPDATA%\FlowMind Worker` / `~/Library/Application Support/FlowMind Worker` | `%APPDATA%\ReFlow Worker` / `~/Library/Application Support/ReFlow Worker` | **One-time migration:** `apps/desktop/src/main/main.js` checks if the legacy user data directory exists and the new directory does not; if so, it copies all configuration and session state recursively before startup. |
| **Config Directory** | `~/.portalsync/config.json` | `~/.reflow/config.json` | **One-time migration:** `ConfigManager` copies `~/.portalsync/config.json` to `~/.reflow/config.json` on initial boot if found. |
| **Chrome Profile Directory** | `~/.chrome-portalsync` | `~/.chrome-reflow` | Automatically reuses legacy directory if present on disk; otherwise initializes new `.chrome-reflow` profile. |
| **Installer Artifacts (Win)** | `FlowMind-Worker-Setup-*.exe` | `ReFlow-Worker-Setup-*.exe` | Windows NSIS and Portable outputs |
| **Installer Artifacts (Mac)** | `FlowMind-Worker-Setup-*.dmg` | `ReFlow-Worker-Setup-*.dmg` | macOS DMG and ZIP distributions |
| **CI Artifact Names** | `flowmind-worker-windows-x64`<br>`flowmind-worker-macos-intel-x64` | `reflow-worker-windows-x64`<br>`reflow-worker-macos-intel-x64` | GitHub Actions workflow output in `.github/workflows/build-desktop.yml` |

---

## 3. Environment Variables (Precedence & Fallback)

All runner and cloud processes accept `REFLOW_*` environment variables as first-class citizens. When a `PORTALSYNC_*` variable is detected and the corresponding `REFLOW_*` variable is absent, the system falls back to the legacy variable and emits a one-time deprecation warning:

```text
[Deprecation Warning] PORTALSYNC_<KEY> is deprecated. Please use REFLOW_<KEY> instead.
```

| Canonical Variable | Legacy Fallback | Default Value | Purpose |
| :--- | :--- | :--- | :--- |
| `REFLOW_CLOUD_URL` | `PORTALSYNC_CLOUD_URL` | `http://localhost:3000` | Web control plane URL for runner daemon and CLI |
| `REFLOW_RUNNER_TOKEN` | `PORTALSYNC_RUNNER_TOKEN` | `""` | Runner Bearer token (`ps_live_<org_id>`) |
| `REFLOW_CDP_PORT` | `PORTALSYNC_CDP_PORT` | `9222` | Local Chrome DevTools Protocol port |
| `REFLOW_TARGET_FOLDER` | `PORTALSYNC_TARGET_FOLDER` | Resolved user downloads folder | Directory for storing downloaded workflow artifacts |
| `REFLOW_ADMIN_EMAIL` | `PORTALSYNC_ADMIN_EMAIL` | Unset (skips seed) | Email address for local developer admin user |
| `REFLOW_ADMIN_PASSWORD` | `PORTALSYNC_ADMIN_PASSWORD` | Unset (skips seed) | Password for local developer admin user |

---

## 4. Default Storage Folders

To prevent breaking existing local disk workflows while establishing clean defaults:
1. The engine checks if the legacy directory already exists on disk.
2. If the legacy directory exists, it is reused.
3. If not, it defaults to the OS-appropriate user directory under `ReFlow`.

| Storage Type | Legacy Path | Canonical ReFlow Path | Resolution Logic |
| :--- | :--- | :--- | :--- |
| **Downloaded Artifacts** | `~/Downloads/PortalSync`<br>`C:\FlowMind\Downloads` | `~/Downloads/ReFlow` | Reuses `~/Downloads/PortalSync` or `C:\FlowMind\Downloads` if they exist on disk; otherwise defaults to `~/Downloads/ReFlow`. |
| **Invoices Directory** | `C:\FlowMind\Invoices` | `~/Documents/ReFlow/Invoices` | Reuses `C:\FlowMind\Invoices` if present on Windows; otherwise defaults to `~/Documents/ReFlow/Invoices`. |
| **Temporary Execution Runs** | `os.tmpdir()/PortalSync` | `os.tmpdir()/ReFlow` | Isolated execution staging directory |

---

## 5. Webhook Signature Headers

When dispatching outbound webhook test events or live status notifications from the control plane (`POST /api/v1/webhooks/test`):
- Both `X-ReFlow-Signature` and `X-FlowMind-Signature` are transmitted simultaneously.
- Standard GitHub-style `X-Hub-Signature-256` is also included.
- Header values are identical HMAC-SHA256 digests (`sha256=<hex>`) signed using the webhook secret.

```http
POST /your-webhook-endpoint HTTP/1.1
Host: api.example.com
Content-Type: application/json
User-Agent: ReFlow-Webhook-Verifier/1.0 (ReFlow Cloud Control Plane)
X-ReFlow-Delivery: test-ping
X-ReFlow-Event: workflow.test_ping
X-ReFlow-Signature: sha256=d3f28...
X-FlowMind-Delivery: test-ping
X-FlowMind-Event: workflow.test_ping
X-FlowMind-Signature: sha256=d3f28...
X-Hub-Signature-256: sha256=d3f28...
```

---

## 6. Desktop Preload IPC Bridge

The Electron preload script exposes `window.reflow` as the primary API surface and aliases `window.portalsync` to the exact same object for backwards compatibility:

```javascript
// Canonical ReFlow API
await window.reflow.getConfig();
await window.reflow.startRunner();

// Legacy compatibility alias (identical interface)
await window.portalsync.getConfig();
```

---

## 7. Internal Broadcast Channels & Browser DOM Hooks

| Channel / Hook | Legacy Identifier | Canonical ReFlow Identifier | Compatibility Policy |
| :--- | :--- | :--- | :--- |
| **SSE Global Broadcast** | `global.__flowmindBroadcast` | `global.__reflowBroadcast` | Both functions are attached to the global scope in `sse-event-manager.js`. Callers check `__reflowBroadcast` first, falling back to `__flowmindBroadcast`. |
| **Floating Bot Assistant** | `window.FlowMindBot` | `window.ReFlowBot` | Both aliases are registered on `window`. |
| **Theme Change Event** | `flowmind-theme-change`<br>`workflow-capture-theme-change` | `reflow-theme-change` | All three events are dispatched simultaneously during palette transitions. |

---

## 8. Theme Tokens & Storage Keys

| Key / Token | Legacy Values | Canonical ReFlow Value | Behavior |
| :--- | :--- | :--- | :--- |
| **Theme Palette ID** | `flowmind-cyber` | `reflow-cyber` | Stored `flowmind-cyber` or `theme-flowmind-cyber` values are automatically mapped to `reflow-cyber`. Both `.theme-reflow-cyber` and `.theme-flowmind-cyber` CSS classes are maintained in DOM roots. |
| **Theme Storage Key** | `flowmind_theme`<br>`workflow_capture_theme`<br>`wf_dashboard_theme` | `reflow_theme` | `reflow_theme` is written first; legacy keys are maintained as sync targets. |
| **Floating Bot State** | `flowmind_bot_collapsed` | `reflow_bot_collapsed` | Saved in `sessionStorage` under both keys; read with logical fallback. |

---

## 9. Immutable Identifiers (Explicitly Preserved)

The following prefixes and schemas were deliberately **preserved** without modification to maintain system integrity:
1. **Runner Bearer Tokens:** The `ps_live_` token prefix (e.g., `ps_live_<org_id>`) remains intact across all database tables and authentication headers.
2. **Supabase Database Schema:** All table names (`wf_organizations`, `wf_workflows`, `wf_runs`, `wf_artifacts`, `wf_credentials`, `wf_audit_logs`, etc.) and column names remain unchanged.
