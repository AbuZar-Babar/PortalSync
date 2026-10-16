# ReFlow Phase 1 — Dashboard & Shared Navigation Proposal

**Status:** Initial implementation committed; runtime validation pending  
**Branch:** `feat/landing-page-redesign`  
**Scope:** `/dashboard`, shared dashboard shell, sidebar, header  
**Source baseline:** `68cc673033ff47ac8743a6d2c350bf286d1c6fa8`  
**Prepared:** 2026-10-16

## 1. Decisions this proposal follows

- **Audience:** Business users.
- **Primary goal:** Clarity.
- **Visual direction:** Retain the current dark-theme direction.
- **Reference:** Borrow workflow clarity and structural consistency from n8n without copying its technical interaction model wholesale.
- **Advanced controls:** Progressive disclosure.
- **Platform scope:** Web first; Electron desktop UI later.
- **Change tolerance:** Rethink confusing user flows while preserving existing capabilities.
- **Dashboard emphasis:** “What do you want to automate?”
- **Workflow guidance:** Hybrid—guide new users, while allowing experienced users to skip ahead.

This document is a design proposal, not authorization to implement it. No application code, theme tokens, APIs, database schema, or workflow behavior should change until the proposal is approved.

## 2. Audit confidence and current behavior

This assessment is based on source inspection of the working branch. It is **not** a live-browser usability audit. Current rendering, responsive behavior, keyboard interactions, and real-world user comprehension remain unverified.

### Dashboard overview — `apps/web/src/app/dashboard/page.tsx`

Current structure and behavior:

1. Displays a `TwoFactorBanner` when runs require user action.
2. Shows the heading **Overview**, the supporting text “Monitor your workflows and recent activity,” and a **New Workflow** action.
3. Displays four metrics: Workflows, Executions, Success rate, and Invoices downloaded.
4. Shows a Recent executions section with a link to view all runs.
5. Displays run status, elapsed time/duration, processed/downloaded item counts, and progress for some active runs.
6. Opens the global run-details drawer when a recent run is selected.
7. Shows loading placeholders, a data-load error with a retry action, and an empty state that invites users to create a workflow.
8. Loads organization-scoped workflow and run data, subscribes to run changes, and polls periodically while certain runs are active.
9. The New Workflow and empty-state Create workflow actions open `CreatePortalModal`.

The page is useful as an operational summary, but the initial heading and content emphasize monitoring existing work rather than helping a business user understand how to begin.

### Shared shell — `apps/web/src/app/dashboard/layout.tsx`

- Wraps dashboard routes in `DashboardProvider`.
- Shows a full-screen “Connecting to ReFlow Cloud...” loading state while dashboard context is loading.
- Uses a persistent sidebar and top header on ordinary dashboard routes.
- Gives the workflow editor a full-bleed layout without the normal sidebar/header.
- Hosts a global run-details drawer shared across the ordinary dashboard shell.

### Sidebar — `apps/web/src/components/dashboard/Sidebar.tsx`

- Navigation items: Overview, Workflows, Executions, Outputs, Workers, Settings.
- Collapsed by default; users can expand/collapse it.
- Saves the preference in `localStorage` under `wf_saas_sidebar_collapsed`.
- Uses icons and hover/focus tooltips when collapsed.
- Highlights the active route.

The narrow default rail saves space, but icon-only navigation can increase ambiguity for new business users unless labels remain easy to discover.

### Header — `apps/web/src/components/dashboard/Header.tsx`

- Right-aligned refresh action.
- Status link currently says “Worker online” or “No worker connected,” and links to runner management.
- Organization/account menu shows account identity and links to Workspace Settings, Desktop Workers, the public landing page, and Sign out.
- Dropdown closes on outside click.

The term “worker” is implementation-oriented. Any user-facing replacement must remain truthful about the desktop app/worker connection and should not imply that a browser is connected when only a worker heartbeat is known.

## 3. Problem statement

The first screen currently answers: **“How is my automation doing?”**

The selected product direction says it should first answer: **“What can I automate, and what do I do next?”**

The proposal should change the hierarchy, not simply replace the page title. Existing monitoring and operational controls remain available, but become secondary to the first useful task. This is a hypothesis to validate in the browser, not a confirmed usability defect.

## 4. Proposed dashboard hierarchy

### Primary task area

Use a clear, task-oriented opening:

- **Headline:** “What do you want to automate?”
- **Supporting text:** A short, plain-language explanation of ReFlow’s purpose. Draft direction: “Create a workflow to repeat browser tasks and collect the files or information you need.” Validate this wording against the product’s supported capabilities before implementation.
- **Primary action:** “Create a workflow” — opens the existing creation modal. Do not introduce a natural-language task prompt or new automation capability as part of this redesign.
- **Secondary action:** “View workflows” — navigates to the existing workflow library, so experienced users can skip the guided entry point.
- Avoid adding a second competing primary CTA.

The headline is a prompt, not a promise that users can type a task description and have ReFlow generate a workflow. Any such capability would be a separate product decision.

### Existing-work overview

Keep the four existing metrics and Recent executions, but visually subordinate them to the primary task area:

1. Primary task area.
2. Action-required notice, when present.
3. Existing workspace metrics.
4. Recent executions and “View all.”

An action-required/2FA notice is operationally urgent and must not be visually buried below decorative onboarding content. If the banner is present, it should remain prominent and provide a clear action.

Do not add a recent-workflow list or new metrics in this proposal unless source inspection confirms the required data and the user separately approves the additional scope.

### New-user and experienced-user balance

- New users see an explicit first action and a short explanation.
- Users with existing workflows can choose “View workflows” immediately.
- Existing dashboard metrics, run history, refresh, and intervention paths remain available.
- Do not force users through a multi-step wizard from the dashboard.
- Do not add a permanent onboarding checklist until its state, persistence, completion rules, and dismissal behavior have been designed.

## 5. Proposed shared navigation

These are proposed user-facing labels; the route paths and behavior should remain unchanged.

| Current label | Proposed label | Reason / constraint |
|---|---|---|
| Overview | Home | Makes the destination feel like the product starting point. Keep the route `/dashboard`. |
| Workflows | Workflows | Already understandable; retain. |
| Executions | Run history | Uses familiar language while still covering active and completed runs. Confirm whether “Runs” is a more compact fit in the actual layout. |
| Outputs | Files & results | More explicit than “Outputs.” Confirm that this destination contains more than downloadable files before finalizing the label. |
| Workers | Desktop connection | Reduces internal terminology while accurately signaling the desktop app/worker dependency. Confirm against the page’s actual setup and management scope. |
| Settings | Settings | Retain. |

Navigation constraints:

- Preserve all destinations and active-route behavior.
- Keep collapsed navigation as an option and preserve the user’s saved preference.
- Review whether the default should remain collapsed after browser validation; this proposal does **not** authorize changing that default yet.
- Ensure labels are available on hover and keyboard focus when collapsed, with visible accessible names for assistive technology.
- Keep the visual treatment dark, restrained, and consistent with the existing design direction.
- Avoid introducing extra navigation groups or new top-level destinations in this first change.

### Header proposal

- Keep refresh available and preserve its loading/disabled feedback.
- Replace “Worker online” / “No worker connected” with plain language only after verifying the status contract. Candidate wording: “Desktop app connected” / “Desktop app not connected,” with a clear link to setup.
- Keep organization identity, settings access, and sign-out in the account menu.
- Avoid duplicating navigation destinations in the header unless browser review reveals a specific discoverability problem.
- Keep the workflow editor’s full-bleed layout behavior intact.

## 6. Suggested content sketch (not a visual mockup)

```text
┌─────────────────────────────────────────────────────────────────┐
│ ReFlow navigation                         Refresh  Connection  ▾ │
├──────────────┬──────────────────────────────────────────────────┤
│ Home         │ What do you want to automate?                     │
│ Workflows    │ Create a workflow to repeat a browser task.       │
│ Run history  │ [ Create a workflow ]  [ View workflows ]         │
│ Files & ...  │                                                  │
│ Desktop ...  │ [Action required banner, only when relevant]      │
│ Settings     │                                                  │
│              │ Workflows   Runs   Success rate   Files downloaded│
│              │                                                  │
│              │ Recent executions                    View all →  │
│              │ Existing recent-run list / loading / empty / error│
└──────────────┴──────────────────────────────────────────────────┘
```

This is only a hierarchy sketch. It does not prescribe exact spacing, dimensions, responsive breakpoints, colors, or component implementation.

## 7. Dependencies and files likely affected

### Primary files

- `apps/web/src/app/dashboard/page.tsx` — dashboard hierarchy, copy, and CTA labels.
- `apps/web/src/app/dashboard/layout.tsx` — shell layout only if browser review identifies a shell-level issue.
- `apps/web/src/components/dashboard/Sidebar.tsx` — labels and collapsed-navigation discoverability.
- `apps/web/src/components/dashboard/Header.tsx` — connection wording and account/header hierarchy.

### Dependencies to preserve or verify

- `DashboardContext` for organization identity, worker status, refresh behavior, run details, and run stopping.
- `CreatePortalModal` for workflow creation. It currently exposes recording, visual canvas, JSON import, and quick setup paths; these paths are not being redesigned in this proposal.
- `TwoFactorBanner` for runs that require user intervention.
- `RunDetailsDrawer` and `StatusBadge` for run inspection and status representation.
- Supabase organization-scoped workflow/run queries, Realtime updates, active-run polling, and artifact counts.
- Existing route destinations and persisted sidebar preference.
- Shared theme tokens in `apps/web/src/app/globals.css`; no global token changes are proposed here.

Potential cross-screen impact is significant because the header and sidebar are shared across dashboard pages. Label and layout changes must be reviewed on all routes, not only `/dashboard`.

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| New task-first area pushes urgent run intervention out of view | Keep the action-required banner prominent and verify its placement with realistic content. |
| “Desktop connection” is inaccurate for the actual status source | Confirm the status API/heartbeat semantics before changing labels. |
| “Files & results” misrepresents the Outputs page | Inspect that page and finalize the label only after confirming its contents. |
| The primary CTA opens a multi-path modal that remains confusing | Keep modal redesign out of this scope, but record it as the next linked proposal; do not pretend the dashboard alone resolves the full creation journey. |
| Existing users find the task prompt repetitive | Keep “View workflows” immediately available and avoid forcing a wizard or checklist. |
| A visual reordering changes loading, empty, or error-state behavior | Preserve state logic and explicitly review all states before implementation. |
| Shared navigation changes break editor or nested-route active states | Keep paths unchanged and verify exact/nested route highlighting, including the editor’s full-bleed shell exception. |
| Metrics imply more precision than the underlying data supports | Preserve existing calculations in this phase; separately flag any data-definition concern rather than silently changing metric semantics. |
| Narrow screens become crowded | Validate desktop and tablet/narrow widths before accepting the proposal; do not assume the desktop sketch is responsive design. |

## 9. Acceptance criteria

### Task clarity

- A first-time business user can identify the dashboard’s primary purpose and primary action without knowing automation terminology.
- “Create a workflow” opens the same existing creation flow; no new workflow-generation capability is implied.
- “View workflows” takes the user directly to the existing workflow library.
- The task area contains one visually dominant primary action and a clearly secondary shortcut.

### Navigation

- All existing dashboard destinations remain reachable.
- Current and nested route highlighting remains correct.
- Collapsed and expanded states work, tooltips are discoverable by hover and keyboard focus, and the saved preference is preserved.
- Connection status wording accurately reflects the underlying status.
- Account menu settings and sign-out remain functional.

### Operational behavior

- Action-required/2FA cases remain prominent and open the correct run details.
- Refresh behavior, run-detail drawer, stop-run behavior, realtime updates, and active-run polling are unchanged.
- Loading, empty, error/retry, populated, and active-run states remain understandable.
- Metrics retain their current definitions unless a separate data change is approved.

### Visual and accessibility review

- Dark theme is retained; no product-wide theme/token rewrite is included.
- Content hierarchy makes the task-first area more prominent than summary metrics.
- No horizontal overflow or unusable navigation at the agreed web viewport sizes.
- Keyboard focus is visible, icon-only controls have accessible names, and status is not communicated by color alone.
- Changes remain limited to the approved dashboard/shared-shell scope.

### Verification requirement

Before marking the implementation complete, perform a browser review of the dashboard and shared navigation on desktop and a narrow viewport. Exercise primary/secondary navigation, refresh, account menu, empty/error states, action-required state, and workflow-editor navigation. Run relevant checks if available. If a state cannot be reproduced, record it as unverified rather than claiming it passed.

## 10. Out of scope

- Any changes to `main`, merging, or branch cleanup.
- Backend, database, authentication, permissions, workflow format, or execution-engine changes.
- A new natural-language workflow generator.
- Rebuilding `CreatePortalModal` or the workflow editor in this proposal.
- Redesigning the Electron desktop UI.
- A global theme overhaul or removing user theme preferences.
- Removing existing metrics, actions, destinations, or supported workflow creation methods.

## 11. Implementation outcome and verification

The initial approved direction has been implemented on `feat/landing-page-redesign` in three focused commits:

- `3428398300617fd118ce733750da1c118f27cbd9` — task-first dashboard opening and direct workflow-library shortcut.
- `2cce2d57ef6e84f1522dcbe5a3ec94d398030a0a` — clearer sidebar labels with all destination paths preserved.
- `87dc443092e8585bf17ae90f0a5e4706fcdf90c5` — clearer desktop connection wording while preserving the existing status source and route.

### Static source verification performed

- The primary create action still opens the existing `CreatePortalModal`.
- The secondary action points to the existing `/dashboard/workflows` route.
- Existing dashboard data loading, organization scoping, Realtime subscription, active-run polling, stop-run handler, action-required banner, run-details drawer, loading/error/empty states, and metrics were left intact.
- Sidebar destination paths, nested route matching, collapsed/expanded behavior, and the saved preference key were left intact.
- Header refresh, account menu, sign-out behavior, and runner destination were left intact.
- The commit diffs were inspected after writing and the updated source was fetched back from the branch.

### Not yet verified

No build, lint, automated tests, browser interaction checks, or responsive review were run. The connected Desktop Commander device was offline, and no GitHub Actions runs were available for this branch at verification time. Therefore, **functional behavior has been preserved by keeping the changes narrow, but it cannot yet be claimed that the changes passed runtime verification.**

Before considering this work complete, run the web app's available build/type/lint checks and review the dashboard on desktop and a narrow viewport. Exercise workflow creation, workflow-library navigation, refresh, account menu/sign-out, collapsed sidebar navigation, connection status, action-required runs, and run details.

The workflow-creation modal, editor, backend contracts, database queries, execution semantics, theme tokens, and Electron UI remain out of scope.