# PortalSync Test Infrastructure Specification

## 1. Test Philosophy

The PortalSync test infrastructure is designed according to four core architectural principles:

1. **Opaque-Box Contract Verification**:
   Tests interact with system boundaries purely through their public external interfaces:
   - Cloud Control Plane via HTTP REST API v1 endpoints (`/api/v1/runs`, `/api/v1/workflows`, `/api/v1/artifacts`).
   - Desktop Runner via Node.js CLI process execution (`cli.js doctor`, `listen`, `run`), HTTP client requests, and CDP communication on port 9222.
   - Dashboard UI via component interface contracts, state machine models, and schema validation specifications.
   Tests do not rely on internal private implementation details or mutable private state.

2. **Progressive Testability**:
   The suite provides tiered validation:
   - Unit and contract isolation within individual milestones (M1 API, M2 Dashboard, M3 Runner).
   - Integration across pairwise boundaries (M1 ↔ M3, M1 ↔ M2).
   - Full end-to-end multi-agent orchestration (M1 + M2 + M3).

3. **Zero-Dependency Portability**:
   The test harness and test suites are built entirely on native Node.js standard libraries (`node:assert`, `node:http`, `node:crypto`, `node:child_process`, `node:fs`, `node:path`, `node:os`).
   - Requires zero external npm packages (`npm install` is not required to run the test suite).
   - Fully compatible with Node.js 20+ and Node.js 25.6.0 on Windows, Linux, and macOS.
   - Guarantees immediate execution without dependency resolution failures.

4. **Self-Contained & Deterministic Isolation**:
   - Each test creates its own isolated state (ephemeral in-memory database records, temporary directory paths, unique UUIDs).
   - Tests do not rely on global test execution order and clean up all created resources upon completion.
   - Built-in reference mock servers (`mock-cloud-server.js` and `mock-cdp-server.js`) allow deterministic execution in any environment without requiring external cloud accounts or running Chrome instances.

---

## 2. Test Architecture

The testing framework is structured into a 4-tier hierarchy:

```text
tests/
├── helpers/
│   ├── test-harness.js           # Lightweight assertion runner & reporter
│   ├── mock-cloud-server.js      # Reference Cloud REST API server (R1 contracts)
│   ├── mock-cdp-server.js        # Mock Chrome CDP server (port 9222 emulation)
│   └── fixtures.js               # Valid/invalid tokens, sample recorded workflows, file vectors
├── tier1-features/
│   ├── test-r1-cloud-api.js      # >=25 tests: Dual Auth, Polling, Atomic Transitions, Artifacts, Workflows
│   ├── test-r2-dashboard.js      # >=25 tests: Modal modes, Run Now trigger, Drawer artifacts, 2FA badges
│   └── test-r3-desktop-runner.js # >=25 tests: Cloud Client, Daemon loop, 2FA HITL, SHA-256 dedupe, CLI
├── tier2-boundaries/
│   ├── test-token-errors.js      # >=5 tests: Missing, malformed, empty, wrong org, unauthorized
│   ├── test-status-transitions.js# >=5 tests: Illegal state jumps, double claims, invalid enum values
│   ├── test-empty-bodies.js      # >=5 tests: Null bodies, missing required keys, negative bounds, size limits
│   ├── test-file-hash-uniqueness.js # >=5 tests: SHA-256 collision checks, zero-byte file, tampering, deduping
│   └── test-timeout-90s-edge.js  # >=5 tests: 90s boundary, 89.9s resolve, negative remaining clamp, clock skew
├── tier3-interactions/
│   └── test-cross-feature-lifecycle.js # Pairwise state propagation across Cloud API, Daemon, and UI
├── tier4-realworld/
│   └── test-invoice-capture-scenario.js# End-to-end full invoice capture lifecycle simulation
└── run-all-tests.js              # Standalone CLI runner with exit code 0/1, metrics & logs
```

### Reference Servers & Test Harness
- **`mock-cloud-server.js`**: An in-process HTTP server implementing the exact REST API v1 interface contracts specified in `PROJECT.md`. Supports configurable state, simulated race conditions, and latency injection.
- **`mock-cdp-server.js`**: An in-process HTTP server emulating Chrome's Remote Debugging endpoint (`/json/version` and `/json/list`) on port 9222 or custom ports.
- **`test-harness.js`**: An asynchronous test runner providing `describe`, `it`, assertion helpers (`assertEqual`, `assertDeepEqual`, `assertThrows`, `assertRejects`), timing metrics, and tier-specific reporting.

---

## 3. Feature Inventory Mapping

| Feature # | Feature Name | Test File(s) | Tier | Minimum Test Count |
|-----------|--------------|--------------|------|--------------------|
| 1 | Dual Runner Token Auth | `tests/tier1-features/test-r1-cloud-api.js`, `tests/tier2-boundaries/test-token-errors.js` | T1, T2 | 5 (T1) + 5 (T2) |
| 2 | Polling Pending Runs | `tests/tier1-features/test-r1-cloud-api.js` | T1 | 5 |
| 3 | Atomic Run Transitions | `tests/tier1-features/test-r1-cloud-api.js`, `tests/tier2-boundaries/test-status-transitions.js` | T1, T2 | 5 (T1) + 5 (T2) |
| 4 | Artifact Registration API | `tests/tier1-features/test-r1-cloud-api.js`, `tests/tier2-boundaries/test-file-hash-uniqueness.js` | T1, T2 | 5 (T1) + 5 (T2) |
| 5 | Hybrid Storage Preferences | `tests/tier1-features/test-r1-cloud-api.js` | T1 | 5 |
| 6 | Database Column Corrections | `tests/tier1-features/test-r2-dashboard.js` | T1 | 5 |
| 7 | Dual-Mode Portal Creator Modal | `tests/tier1-features/test-r2-dashboard.js` | T1 | 5 |
| 8 | Dashboard "Run Now" Trigger | `tests/tier1-features/test-r2-dashboard.js` | T1 | 5 |
| 9 | Run Details & Artifacts Drawer | `tests/tier1-features/test-r2-dashboard.js` | T1 | 5 |
| 10 | 2FA Countdown Badge & Banner | `tests/tier1-features/test-r2-dashboard.js`, `tests/tier2-boundaries/test-timeout-90s-edge.js` | T1, T2 | 5 (T1) + 5 (T2) |
| 11 | Desktop Cloud Client | `tests/tier1-features/test-r3-desktop-runner.js` | T1 | 5 |
| 12 | Runner Daemon Loop | `tests/tier1-features/test-r3-desktop-runner.js` | T1 | 5 |
| 13 | 90s HITL 2FA Intervention | `tests/tier1-features/test-r3-desktop-runner.js`, `tests/tier2-boundaries/test-timeout-90s-edge.js` | T1, T2 | 5 (T1) + 5 (T2) |
| 14 | SHA-256 Deduplication & Storage | `tests/tier1-features/test-r3-desktop-runner.js`, `tests/tier2-boundaries/test-file-hash-uniqueness.js` | T1, T2 | 5 (T1) + 5 (T2) |
| 15 | Desktop Runner CLI | `tests/tier1-features/test-r3-desktop-runner.js` | T1 | 5 |
| 16 | E2E Testing Suite | `tests/tier3-interactions/test-cross-feature-lifecycle.js`, `tests/tier4-realworld/test-invoice-capture-scenario.js`, `tests/run-all-tests.js` | T3, T4 | 6 (T3) + 4 (T4) |

---

## 4. Coverage Thresholds & Quality Gates

To ensure software delivery integrity, the test suite enforces the following quantitative quality gates:

1. **Tier 1 (Feature Coverage Gate)**:
   - Every single feature (F1 through F15) must have **>= 5 dedicated automated test cases**.
   - Minimum total Tier 1 test count: **75 tests**.

2. **Tier 2 (Boundary & Corner Case Gate)**:
   - Each boundary category (Token Errors, Status Transitions, Empty/Malformed Bodies, Hash Uniqueness, 90s HITL Timeout) must have **>= 5 test cases**.
   - Minimum total Tier 2 test count: **25 tests**.

3. **Tier 3 (Cross-Feature Interaction Gate)**:
   - Minimum 5 pairwise integration scenarios verifying cross-tier state consistency between Cloud API, Runner Daemon, and Dashboard contracts.

4. **Tier 4 (Real-World Scenario Gate)**:
   - Full simulated invoice capture lifecycle including portal authentication, table discovery, invoice downloading, SHA-256 hashing, artifact registration, and dashboard telemetry aggregation.

5. **Pass Rate Gate**:
   - **100% Pass Rate required** across all test suites. Any failure causes the test runner to exit with non-zero exit code `1`.

6. **CLI Doctor Gate**:
   - `node packages/engine/src/runner/cli.js doctor --help` must execute cleanly and exit with code `0`.

---

## 5. Execution Instructions

### Running All Tests
To run the complete multi-tier test suite:
```bash
node tests/run-all-tests.js
```

### Running Specific Tiers
```bash
# Tier 1 Feature Coverage
node tests/tier1-features/test-r1-cloud-api.js
node tests/tier1-features/test-r2-dashboard.js
node tests/tier1-features/test-r3-desktop-runner.js

# Tier 2 Boundary & Corner Cases
node tests/tier2-boundaries/test-token-errors.js
node tests/tier2-boundaries/test-status-transitions.js
node tests/tier2-boundaries/test-empty-bodies.js
node tests/tier2-boundaries/test-file-hash-uniqueness.js
node tests/tier2-boundaries/test-timeout-90s-edge.js

# Tier 3 Cross-Feature Interactions
node tests/tier3-interactions/test-cross-feature-lifecycle.js

# Tier 4 Real-World Scenarios
node tests/tier4-realworld/test-invoice-capture-scenario.js
```

### Exit Codes
- `0`: All tests passed successfully.
- `1`: One or more tests failed, or test runner encountered an unhandled exception.
