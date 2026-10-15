# ReFlow Architecture Context

## Status and reliability
This map combines the repository's documented architecture with a targeted source review. It is not a complete audit, and build/test commands have not been run as part of this pass. Source findings and unverified assumptions are labelled separately.

## Product shape
ReFlow is a hybrid browser-automation and RPA platform combining a cloud control plane with a local desktop worker and a Chrome DevTools Protocol (CDP)-based automation engine. Its documented goal is to let users record browser workflows and replay them with collection discovery, loop generalization, recovery, and artifact handling.

## Monorepo layout
The root package uses npm workspaces for `apps/*` and `packages/*`.

- `apps/web`: Next.js web control plane/dashboard, workflow editing, execution monitoring, artifact views, and API routes.
- `apps/desktop`: Electron desktop worker and local HTTP bridge for interaction with a local Chrome instance.
- `packages/engine`: shared CDP automation engine, recorder, discovery logic, replay, loop handling, and runner daemon.
- `supabase/`: database schema and related Supabase configuration.
- `docs/`: project documentation and technical specifications.
- `DESIGN.md`: product UI design direction and design tokens.

## AI instruction files
- Root `AGENTS.md` contains repository-wide collaboration and safety rules on the `docs/ai-context-foundation` branch; it is not yet on `main`.
- `apps/web/AGENTS.md` on `main` contains generated Next.js 16-specific agent guidance. It instructs agents to consult installed Next.js documentation before changing web code.
- `apps/web/CLAUDE.md` includes `@AGENTS.md`; Claude should load the adjacent web instructions and applicable root instructions.
- Before editing another package, search for nested `AGENTS.md`, `CLAUDE.md`, or equivalent instructions.

## Main runtime boundaries

### Web control plane
The Next.js application connects to Supabase for workflow management, execution state, telemetry, and artifact metadata. The shared `authenticateRunnerOrUser` helper currently returns a service-role Supabase client when `SUPABASE_SERVICE_ROLE_KEY` is configured. Consequently, application routes must enforce organization ownership explicitly; database RLS alone cannot be assumed to contain a route-level authorization bug when the service-role key is in use.

### Desktop worker
The Electron process starts or attaches to local Chrome, exposes a localhost bridge, and controls local automation lifecycle. The bridge binds to `127.0.0.1:49152`. Changes here must consider origin validation, local network exposure, command authorization, request validation, process lifecycle, and operating-system differences.

### Automation engine
The documented CDP engine includes recorder, selector resolution, collection discovery, loop detection/generalization, action execution, authentication/HITL handling, downloads, and a runner daemon. Inspect active modules and tests before modifying these systems.

### Cloud/desktop interaction
The documented architecture separates cloud workflow control and telemetry from execution in a local browser. Trace the actual request/job lifecycle end to end, including claiming work, reporting status, handling user intervention, and uploading artifacts.

## Targeted audit findings (read-only source inspection)

### F-01 — Runner authentication is based on organization-prefix resolution, not credential verification
File: `apps/web/src/lib/auth/runner-auth.ts`

The runner-token branch checks for the `ps_live_` prefix, resolves the suffix to an organization by UUID/prefix, and returns a runner-authenticated context. In the inspected flow, it does not compare the submitted token against a stored, issued, revocable secret. `apps/web/src/app/api/v1/runners/route.ts` also has a deterministic fallback token derived from the organization UUID prefix.

**Assessment:** critical authentication design flaw in source. Treat the token suffix as an identifier, not a secret; replace it with high-entropy credentials, validation, revocation/rotation, and negative tests. No deployed exploit test has been performed.

### F-02 — Run POST does not bind the requested organization and workflow ownership
File: `apps/web/src/app/api/v1/runs/route.ts`

The handler allows `body.org_id` / `body.orgId` to override the authenticated organization. It fetches `wf_workflows` by workflow ID without an organization predicate, updates the workflow by ID, and inserts the run using the request-derived organization ID. Since the auth helper uses a service-role client when configured, RLS is not a reliable fallback for these omissions.

**Assessment:** critical cross-tenant authorization risk. Scope all operations to the authenticated organization, check that the workflow and run organization IDs agree, and add cross-tenant denial tests for session and runner authentication.

### F-03 — Local bridge commands are not authenticated
File: `apps/desktop/src/main/http-bridge.js`

The bridge binds to loopback port `49152`. State-changing routes for recording start/stop/reset, active-run stop, and discovery execute without checking a request credential. CORS/PNA can constrain browser requests but does not authenticate local processes and must not be treated as an authorization control.

**Assessment:** high risk requiring a local threat-model decision and hardening. Add a per-install/session authorization mechanism and tests that reject unauthenticated state-changing requests. Retain CORS/PNA checks as defense-in-depth, not the primary control.

### F-04 — Runner metadata is serialized into the Stripe subscription column
Files: `apps/web/src/lib/auth/runner-auth.ts`, `apps/web/src/app/api/v1/runners/route.ts`, and `supabase/schema.sql`

Runner heartbeat code reads/writes JSON in `wf_organizations.stripe_subscription_id`, while the schema defines that column as the Stripe subscription identifier. Billing consumers and migration history have not yet been fully traced.

**Assessment:** medium data-integrity/design risk; downstream billing impact is unverified. Trace all consumers before migration, then separate runner state into a dedicated data model if appropriate.

## Security and data boundaries to preserve
- Treat service-role Supabase access as privileged; validate membership/ownership in server routes.
- Never use organization IDs, UUID prefixes, slugs, or other identifiers as authentication secrets.
- Ensure workflow, run, artifact, and secret access is scoped to the authenticated tenant.
- Localhost binding and CORS/PNA are not substitutes for local command authentication.
- Keep billing identifiers separate from runner heartbeat/state metadata.

## Root commands declared in package.json
- `npm run dev`: delegates to `apps/web`
- `npm run build`: delegates to `apps/web`
- `npm start`: delegates to `apps/web`
- `npm run runner`: invokes `packages/engine/src/runner/cli.js`
- `npm run runner:doctor`: runs the runner doctor command
- `npm run runner:listen`: runs the runner listen command
- `npm run desktop`: starts `apps/desktop`
- `npm run test`: delegates to `packages/engine`

These scripts are declared; this document does not assert that they pass.

## Next audit steps
1. Add focused regression tests for F-01 and F-02 before patching production behavior.
2. Harden and test the local bridge authorization boundary (F-03).
3. Trace all Stripe/subscription consumers and migration history for F-04.
4. Run focused tests and builds in a controlled development environment; record actual output.
5. Trace one complete workflow from recording/discovery through execution, telemetry, and artifact handling.
