# ReFlow Current State

## Status

Initial context snapshot prepared from `README.md`, `DESIGN.md`, and the root `package.json` on the `main` branch. This is a starting point for AI-assisted planning, **not a claim that the entire application or every feature has been audited or tested**.

## Product direction

ReFlow is being developed as a full-scale SaaS product for hybrid browser automation and RPA. The documented product combines a cloud dashboard/control plane with a local desktop worker and browser automation engine.

## Capabilities described in the README

The current README describes these major capabilities:

- Browser workflow recording and replay using Chrome DevTools Protocol.
- Element fingerprinting and selector recovery/self-healing.
- Table and repeated-item discovery, loop detection, and action generalization.
- Workflow editing and preflight filtering.
- Local execution through a desktop worker.
- Run telemetry and human-in-the-loop recovery for authentication challenges.
- Downloaded artifact organization, hash-based deduplication, and optional cloud storage.
- Supabase-backed workflow/run data and security-related features.

These are documented capabilities. Their implementation status, completeness, and current test coverage must be confirmed in code before making a feature-specific claim.

## Repository facts checked for this snapshot

- Repository: `AbuZar-Babar/ReFlow`
- Default branch at time of preparation: `main`
- Root package name: `reflow-saas`
- The root package declares npm workspaces for `apps/*` and `packages/*`.
- Root scripts are declared for web development/build, runner operations, desktop startup/build, and engine tests.
- `README.md` contains a detailed product overview and subsystem map.
- `DESIGN.md` documents a restrained, dark, architectural UI direction.

## Known context gaps

These items still require code-level inspection and should not be treated as confirmed defects:

- Verify that the README's directory structure and module descriptions match the current code.
- Identify existing instructions or AI context files in nested directories, not just the repository root.
- Map the actual end-to-end workflow for recording, discovery/filtering, loop execution, downloads, and run telemetry.
- Establish which tests cover critical paths and which commands can run in the current environment.
- Verify organization/tenant scoping, authorization, Row-Level Security, and secrets handling before security-sensitive changes.
- Confirm whether any overlapping modules are genuinely redundant before consolidating them.

## How to update this file

Update only when a meaningful feature or project-state change is supported by a code change, test output, issue, or other concrete evidence. Label unresolved items as open questions rather than presenting them as facts.
