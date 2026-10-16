# ReFlow UI Redesign — Phase 1 Baseline

**Recorded:** 2026-10-16  
**Repository:** `AbuZar-Babar/ReFlow`  
**Working branch:** `feat/landing-page-redesign`  
**Source snapshot inspected:** `68cc673033ff47ac8743a6d2c350bf286d1c6fa8`  
**Audit document:** [SCREEN_AUDIT.md](./SCREEN_AUDIT.md)

## Purpose

Record the known starting point before any further UI redesign. This is a source-level baseline and workflow agreement, not a runtime quality report.

## Git and change-safety baseline

- The UI redesign work is isolated on `feat/landing-page-redesign`.
- `main` is not the working branch and must not be modified or merged without separate approval.
- The source snapshot includes the dashboard-header alignment change in commit `68cc673033ff47ac8743a6d2c350bf286d1c6fa8`.
- Phase 1 added documentation only. No application source, styling, API, database, or engine files were changed.
- The inventory commit is `8af1b4f531ec13b959daa514ff8792246cd5e6b6` (documentation-only).
- Do not infer that the application is passing build, lint, or browser checks from this audit; those checks were not run in this phase.

## Current UI architecture observed

- Web app: Next.js App Router under `apps/web/src/app`.
- Shared dashboard shell: dashboard layout, sidebar, header and shared status components.
- Core product UI: workflow library, visual editor, execution preflight, run monitoring, artifacts, runners and settings.
- Landing page: composed from components under `apps/web/src/components/landing/`.
- Shared theme definitions: `apps/web/src/app/globals.css`; written design guidance: root `DESIGN.md`.
- Desktop worker: Electron renderer under `apps/desktop/src/renderer/`; excluded from the web UI redesign scope.

## Baseline limitations

Not yet verified in a live browser:
- Current visual appearance at desktop, tablet and mobile widths.
- Real behavior of every button, menu, modal, drawer, form and route.
- Loading, empty, error, success, disconnected-worker and action-required states.
- Authenticated versus unauthenticated navigation and organization permissions.
- Build, lint, unit tests, integration tests or end-to-end flows for this exact branch snapshot.
- Current deployment status.

## Design decision required before implementation

The source is visually mixed: root `DESIGN.md` describes a dark architectural identity; the landing page uses near-black surfaces with emerald accents; dashboard theme tokens include multiple dark palettes with cyan/indigo accents and also expose a light mode. A previously discussed direction for the redesign was light, minimal and teal.

Before changing global tokens or shared primitives, explicitly choose:
1. Whether the new direction applies to the **whole web app** or only selected surfaces.
2. The default appearance (light, dark, or system).
3. The primary accent and semantic status colors.
4. Whether user-selectable themes remain supported.
5. Which existing theme preferences and persisted settings must be preserved.

Do not implement a new global theme until this is resolved.

## Working protocol

For each screen:
1. Inspect its source and dependencies.
2. Document current actions and states.
3. Propose the smallest useful UI change set.
4. Get approval for the scope.
5. Implement without changing API contracts or business logic unless separately approved.
6. Run appropriate checks and perform a manual browser smoke check.
7. Review the diff for unrelated changes.
8. Commit the verified change before moving to the next screen.

If verification cannot be performed, mark the screen as unverified instead of reporting it as complete.

## Next step

Start with **Dashboard / Overview**. Inspect its rendered layout and the shared header/sidebar, record current behavior and responsive issues, and propose a screen-specific change list. Do not begin implementation until that proposal is reviewed.
