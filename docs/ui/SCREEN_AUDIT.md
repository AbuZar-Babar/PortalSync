# ReFlow Web UI — Screen Audit

**Audit date:** 2026-10-16  
**Repository:** `AbuZar-Babar/ReFlow`  
**Branch inspected:** `feat/landing-page-redesign`  
**Source baseline:** `68cc673033ff47ac8743a6d2c350bf286d1c6fa8`  
**Scope:** Web UI source inventory and redesign planning only. No application code changed by this audit.

## Audit status and confidence

This is a source-based inventory, not a claim that every route or interaction has been exercised in a browser. The route/component names below were confirmed in the repository tree; behaviors and states marked for verification still require runtime inspection. No tests, production build, responsive review, or end-to-end flows were run as part of this audit.

## 1. Web route inventory

| Priority | Route | Main source | User purpose | Main dependencies / risk areas |
|---|---|---|---|---|
| P1 | `/dashboard` | `apps/web/src/app/dashboard/page.tsx` | Overview of workflows, runs, download totals, and recent activity | Supabase queries, organization context, active-run stop action, run-details drawer, create-workflow modal, 2FA/action-required banner |
| P1 | `/dashboard/workflows` | `apps/web/src/app/dashboard/workflows/page.tsx` | Find, search, create, and manage workflows | Workflow data, create modal, destructive actions, navigation to editor |
| P1 | `/dashboard/workflows/[id]/edit` | `apps/web/src/app/dashboard/workflows/[id]/edit/page.tsx` | Edit an individual workflow visually | Workflow loading/saving, canvas, step selection, property drawer, validation, run/save/cancel paths |
| P1 | `/dashboard/runs` | `apps/web/src/app/dashboard/runs/page.tsx` | Monitor executions and inspect run progress/errors | Supabase Realtime, status transitions, logs, action-required/2FA handling, run details |
| P1 | `/dashboard/artifacts` | `apps/web/src/app/dashboard/artifacts/page.tsx` | Browse and retrieve generated files/artifacts | Artifact metadata, previews/downloads, empty/error states, access boundaries |
| P2 | `/dashboard/runners` | `apps/web/src/app/dashboard/runners/page.tsx` | Connect and manage local workers/runners | Pairing tokens, worker status, diagnostics, revoke/regenerate flows, desktop bridge dependency |
| P2 | `/dashboard/settings` | `apps/web/src/app/dashboard/settings/page.tsx` | Manage workspace, appearance, browser/workflow defaults, notifications, and credentials | Six settings tabs, persisted preferences, secret handling, session-cache actions, save/error feedback |
| P2 | `/onboarding` | `apps/web/src/app/onboarding/page.tsx` | Set up a workspace after authentication | Workspace creation, membership/organization state, validation and redirect |
| P2 | `/login` | `apps/web/src/app/login/page.tsx` | Sign in | Supabase auth, validation, loading/errors, redirect handling |
| P2 | `/signup` | `apps/web/src/app/signup/page.tsx` | Create an account | Supabase auth, validation, account confirmation and redirect handling |
| P3 | `/` | `apps/web/src/app/page.tsx` and landing components | Explain the product and guide visitors to signup/sign-in | Auth modal, navigation, demo interactions, pricing/claims, responsive menu |
| P3 | `/privacy` | `apps/web/src/app/privacy/page.tsx` | Read the privacy policy | Readability, typography, legal content and shared public layout |
| P3 | `/terms` | `apps/web/src/app/terms/page.tsx` | Read the terms of service | Readability, typography, legal content and shared public layout |

**Route note:** `/auth/signout` exists as an auth action route, not a separate screen. API routes are excluded from the screen count. Dynamic editor URLs represent one screen template, not a separate screen for every workflow ID.

## 2. Shared shell and embedded UI

| Surface | Source / location | Why it needs a separate audit |
|---|---|---|
| Dashboard shell/navigation | `apps/web/src/app/dashboard/layout.tsx`, `components/dashboard/Sidebar.tsx`, `Header.tsx` | Navigation clarity, responsive behavior, active route, worker connection indicator, refresh behavior, shared spacing |
| Create Workflow modal | `components/dashboard/CreatePortalModal.tsx` | Multiple entry paths (record in Chrome, visual canvas, JSON import/export, quick form); recording lifecycle and validation |
| Execution preflight | `components/dashboard/ExecutionPreflightModal.tsx` | Standard/batch/loop modes, discovered columns, filters, ALL/ANY logic, date presets, preview and dispatch |
| Visual editor canvas | `components/workflow-editor/VisualWorkflowEditor.tsx`, `CustomNodes.tsx`, `drawflow-theme.css` | Canvas readability, selection, step ordering, node types, zoom/pan, save/cancel/run and unsaved changes |
| Step property inspector | `components/workflow-editor/PropertyDrawer.tsx` | Context-sensitive forms, advanced fields, validation, field dependencies and narrow-screen layout |
| Run details drawer | `components/dashboard/RunDetailsDrawer.tsx` | Log hierarchy, status, duration, item counts, error detail, artifact links and close/navigation behavior |
| Action-required / 2FA banner | `components/dashboard/TwoFactorBanner.tsx` | Urgency, clear next action, countdown/status accuracy, recovery and expired states |
| Landing auth dialog | Landing page component and shared auth UI | Sign-in/sign-up mode, form errors, close behavior, focus management and redirect |
| Video demo modal | `components/landing/VideoDemoModal.tsx` | Playback, close/escape behavior, focus and responsive sizing |
| Confirmations and diagnostics | Workflow/runner/settings surfaces | Destructive-action confirmation, token regeneration/revocation, diagnostics and recovery instructions |
| Shared status / identity UI | `StatusBadge.tsx`, `RobotAvatar.tsx` and shared layout | Consistent status language, color semantics, accessibility and unnecessary decoration |

## 3. High-priority review checklist

For each P1 screen, capture the current UI and verify these states before redesigning it:

- Initial loading and delayed data.
- Successful data with realistic content.
- Empty state with a clear next action.
- Recoverable API/network error and retry path.
- Permission/organization boundary behavior where applicable.
- Destructive action confirmation and cancellation.
- Keyboard/focus behavior for dialogs, drawers, menus and forms.
- Narrow desktop/tablet viewport and horizontal overflow.
- Existing primary actions still invoke the same business behavior.
- No misleading status, sample metrics, or success feedback when an operation failed.

## 4. Initial observations — not yet confirmed defects

1. **Design direction is inconsistent across source files.** `DESIGN.md` describes a dark, architectural visual identity; `globals.css` defines several dark theme palettes and cyan/indigo accents; the landing page uses near-black surfaces and emerald accents. A prior direction discussed for the redesign was light, minimal, and teal. Resolve the intended product-wide direction before broad styling changes.
2. **Settings has six distinct tabs** (`general`, `themes`, `browser`, `workflows`, `notifications`, `security`). Review whether grouping and progressive disclosure can reduce cognitive load without hiding controls.
3. **Workflow creation exposes multiple paths.** The modal should help users choose a starting method and explain the outcome of each path without removing supported capabilities.
4. **Execution preflight combines several advanced concepts.** Review it as a guided sequence: choose execution mode, configure item scope/filters, inspect the summary, then dispatch.
5. **Runner management is operationally dense.** Keep pairing, connectivity, diagnostics, and destructive token actions visually distinct.
6. **Shared components have a wide blast radius.** Header, sidebar, theme tokens, modal primitives, buttons, and status badges should be changed in isolation and checked across routes.

These observations are redesign hypotheses, not verified usability failures. Validate them against actual browser behavior and user intent.

## 5. Recommended redesign sequence

1. Dashboard overview and shared shell
2. Workflow library
3. Create Workflow modal
4. Visual editor and property inspector
5. Execution preflight
6. Runs and run details
7. Artifacts
8. Runners
9. Settings and secrets
10. Login, signup, onboarding
11. Landing page
12. Privacy and terms

This order prioritizes the product's core task path and establishes shared patterns before lower-frequency public pages.

## 6. Scope boundaries

- **Included:** Next.js web screens, shared web components, embedded dialogs/drawers and web responsive behavior.
- **Not included in this UI pass:** Electron desktop UI redesign, backend/engine refactoring, API/database changes, security audit, feature removal, or a new visual implementation.
- Desktop-worker interactions are documented only where the web UI depends on them.
- No code or design-token changes are authorized by this inventory itself.

## 7. Definition of done for each screen

A screen is ready to leave audit/review when:
1. Its purpose and primary action are explicit.
2. Existing actions and dependencies are mapped.
3. Loading, empty, error, success and destructive states are accounted for.
4. A proposed UI change list has been approved.
5. Implementation scope is limited to the agreed screen/shared component.
6. Relevant checks and manual interaction verification pass, and the diff contains no unrelated changes.
