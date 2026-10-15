# ReFlow Architecture Context

## Status and reliability

This is an initial architecture map based on the repository's current `README.md` and root `package.json`. It is useful for planning, but it is **not yet a code-level audit**. Before proposing changes, inspect the current implementation, relevant tests, and configuration. Update this document when verified code differs from this map.

## Product shape

ReFlow is described as a hybrid browser-automation and RPA platform combining a cloud control plane with a local desktop worker and a Chrome DevTools Protocol (CDP)-based automation engine. Its documented goal is to let users record browser workflows and replay them with collection discovery, loop generalization, recovery, and artifact handling.

## Monorepo layout

The root package uses npm workspaces for `apps/*` and `packages/*`.

- `apps/web`: documented as the Next.js web control plane/dashboard, including workflow editing, execution monitoring, artifact views, and API routes.
- `apps/desktop`: documented as an Electron desktop worker and local HTTP bridge for interaction with a local Chrome instance.
- `packages/engine`: documented as the shared CDP automation engine, recorder, discovery logic, replay, loop handling, and runner daemon.
- `supabase/`: documented database schema and related Supabase configuration.
- `docs/`: project documentation and technical specifications.
- `DESIGN.md`: product UI design direction and design tokens.

Confirm current paths and responsibilities in the code before relying on them for a feature.

## Main runtime boundaries

### Web control plane

The README describes a Next.js application connected to Supabase for workflow management, execution state, realtime telemetry, and artifact metadata. Inspect the relevant routes, server/client boundaries, database access, and Row-Level Security policies before changing this area.

### Desktop worker

The README describes an Electron process that starts or attaches to local Chrome, exposes a localhost bridge, and controls the lifecycle of local automation. Changes to this boundary should consider origin validation, local network exposure, authentication of bridge requests, process lifecycle, and operating-system differences.

### Automation engine

The README describes a CDP-based engine with recorder, selector resolution, collection discovery, loop detection/generalization, action execution, authentication/HITL handling, downloads, and a runner daemon. Inspect the exact current modules and tests before modifying these systems; names in documentation do not establish that a module is active or complete.

### Cloud/desktop interaction

The documented architecture separates cloud workflow control and telemetry from execution in a local browser. Before changing this boundary, trace the actual request/job lifecycle end to end, including claiming work, reporting status, handling user intervention, and uploading artifacts.

## Important behavior to preserve

Unless a task explicitly changes them, investigate and preserve existing behavior related to:

- Workflow recording and replay
- Table/collection discovery and column inspection
- Filters and stored discovered items
- Loop detection, action generalization, and per-item execution
- Downloads, artifact deduplication, and output organization
- Login/session handling and human-in-the-loop authentication recovery
- Cloud run telemetry and local worker lifecycle
- Organization/tenant boundaries and secret handling

This is a precautionary list of product-critical areas, not a claim that every listed behavior has been independently tested.

## Root commands documented in package.json

- `npm run dev`: delegates to `apps/web`
- `npm run build`: delegates to `apps/web`
- `npm start`: delegates to `apps/web`
- `npm run runner`: invokes `packages/engine/src/runner/cli.js`
- `npm run runner:doctor`: runs the runner doctor command
- `npm run runner:listen`: runs the runner listen command
- `npm run desktop`: starts `apps/desktop`
- `npm run test`: delegates to `packages/engine`

These are declared scripts; this document does not assert that they have been executed successfully.

## Guidance for architecture changes

1. Trace the existing behavior from entry point through dependencies and data flow.
2. Find relevant tests and extend them for the new behavior or regression risk.
3. Prefer an existing supported module/pattern over parallel implementations.
4. Avoid merging or deleting similarly named modules without proving their responsibilities and call sites.
5. For database or tenant-sensitive changes, inspect schema, RLS, server authorization, and organization scoping together.
6. Update this map only after checking the implementation.
