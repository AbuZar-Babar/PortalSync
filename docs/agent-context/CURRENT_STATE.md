# ReFlow Current State

## Status
Initial context and a targeted read-only source audit have been completed on `main`. This is not a complete application audit, and no build or test command has been run during this pass. Findings below are based on source inspection, not exploit execution.

## Product direction
ReFlow is being developed as a full-scale SaaS product for hybrid browser automation and RPA. The documented product combines a cloud dashboard/control plane with a local desktop worker and browser automation engine.

## Capabilities described in the README
- Browser workflow recording and replay using Chrome DevTools Protocol.
- Element fingerprinting and selector recovery/self-healing.
- Table and repeated-item discovery, loop detection, and action generalization.
- Workflow editing and preflight filtering.
- Local execution through a desktop worker.
- Run telemetry and human-in-the-loop recovery for authentication challenges.
- Downloaded artifact organization, hash-based deduplication, and optional cloud storage.
- Supabase-backed workflow/run data and security-related features.

These are documented capabilities; implementation completeness and test coverage must be verified feature by feature.

## Targeted audit findings (source review; not runtime-tested)

### F-01 — Runner tokens are not validated as secrets
**Severity: Critical — fix before exposing runner APIs to untrusted clients.**

In `apps/web/src/lib/auth/runner-auth.ts`, `authenticateRunnerOrUser` accepts a token beginning with `ps_live_`, extracts the suffix, resolves it to an organization by UUID/prefix, and returns an authenticated runner context. The inspected path does not compare the presented token with a stored, issued, revocable credential. The runner list route also constructs a deterministic fallback token from the first 16 hexadecimal characters of the organization UUID.

**Impact:** an organization identifier/prefix is effectively being treated as a bearer credential. Anyone who can obtain or infer a valid prefix may be able to authenticate as that organization's runner. This finding is from the code path; it has not been tested against a deployed environment.

**Required follow-up:** introduce high-entropy per-runner credentials, store only a secure verifier/hash where appropriate, compare credentials during authentication, support rotation/revocation, and add tests for wrong, expired/revoked, and cross-organization tokens. Do not preserve the current prefix-as-authentication behavior for compatibility without an explicit migration plan.

### F-02 — Run creation trusts request-supplied organization IDs and does not bind the workflow to the authenticated organization
**Severity: Critical — fix together with F-01.**

In `apps/web/src/app/api/v1/runs/route.ts`, POST derives `effectiveOrgId` from `body.org_id` / `body.orgId` before falling back to the authenticated `orgId`. It then looks up a workflow by ID without filtering by `org_id`; if found, it updates that workflow's execution configuration by workflow ID. Run insertion uses the request-derived `effectiveOrgId`. The shared auth helper returns a Supabase service-role client when `SUPABASE_SERVICE_ROLE_KEY` is configured, so RLS must not be assumed to protect these application-level omissions.

**Impact:** a caller can attempt to create runs under another organization and, when it knows a workflow ID, modify that workflow's loop/filter configuration without an explicit check that the workflow belongs to the authenticated organization. The exact exploitability in a deployed setup depends on environment configuration and available IDs, but the missing authorization binding is visible in source.

**Required follow-up:** derive organization scope from the authenticated context, not request body; query workflows with both `id` and `org_id`; reject mismatches; verify run `org_id` matches the workflow's organization; add negative cross-tenant tests for both session and runner auth.

### F-03 — Desktop bridge state-changing endpoints have no request authentication
**Severity: High risk; confirm intended local threat model and harden.**

In `apps/desktop/src/main/http-bridge.js`, the server binds to `127.0.0.1:49152`. Routes including `POST /record/start`, `POST /record/stop`, `POST /record/reset`, `POST /run/stop`, and `/discover` execute without an authentication check. CORS/PNA origin handling constrains browser access in some circumstances, but it is not authorization for local processes and is not a substitute for authenticating commands.

**Impact:** a local process, or a browser origin admitted by the current policy, may be able to inspect recording state, disrupt recording/execution, or trigger discovery. The existing bridge test suite checks CORS and route behavior but the inspected tests do not assert that unauthenticated state-changing requests are rejected.

**Required follow-up:** add a per-install/session secret or another local authorization mechanism, validate Origin/Host and browser PNA behavior as defense-in-depth, and test unauthenticated/unauthorized requests for every state-changing endpoint. Avoid exposing secrets in URLs or logs.

### F-04 — Runner heartbeat data is stored in the Stripe subscription field
**Severity: Medium design/data-integrity risk; downstream billing impact not yet verified.**

Both `runner-auth.ts` and `apps/web/src/app/api/v1/runners/route.ts` parse and write JSON runner metadata in `wf_organizations.stripe_subscription_id`. The schema declares that column as a Stripe subscription identifier. Search/inspection so far did not establish a separate runner-metadata column or confirm the billing integration's actual use.

**Impact:** writes can overwrite a real Stripe subscription ID and conflate billing and worker state. Do not treat the production impact as confirmed until all billing consumers and migrations are traced.

**Required follow-up:** inspect all Stripe/subscription consumers and migration history, then move runner state into a dedicated table/column with an explicit migration if this is not legacy unused data.

## Test and verification status
- No test, build, or exploit command was executed during this audit.
- The desktop bridge test source was inspected; it covers lifecycle, CORS/PNA headers, basic routes, and recording behavior, but the inspected suite does not cover authorization rejection.
- No application code was changed.
- No changes were made to `main`; these findings are being recorded on `docs/ai-context-foundation`.

## Next actions (priority order)
1. Fix and regression-test runner credential validation and organization scoping (F-01/F-02).
2. Add authentication to state-changing local bridge routes and regression tests (F-03).
3. Trace Stripe subscription consumers and move runner metadata out of the billing field if confirmed necessary (F-04).
4. Run focused tests, then broader build/test checks; record actual outputs rather than inferred success.
5. Trace one complete workflow from recording/discovery through execution, telemetry, and artifacts.

## How to update this file
Update findings only when supported by source, test output, issue, or other concrete evidence. Keep source-review findings distinct from runtime-confirmed behavior. Label unresolved impacts as open questions.
