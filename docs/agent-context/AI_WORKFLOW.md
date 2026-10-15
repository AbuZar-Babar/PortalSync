# AI Collaboration & Planning Workflow

## 1. Purpose and Architecture

This document defines the planning, architecture, and review workflow for ReFlow. It is written specifically for human planners, top-tier reasoning models (ChatGPT, Claude, Gemini 4 Argon), and code reviewers.

Implementation rules for the execution model (Gemini Flash) are maintained separately in root [`AGENTS.md`](file:///c:/Users/AbuZar/Desktop/Fyp/Workflow-Capture-SaaS/AGENTS.md).

All prompt handoffs, context sharing, and report transfers between models are handled manually by the user. There is no automated model-to-model communication or direct execution bridge.

## 2. Model Roles and Boundaries

The high-tier models are **not interchangeable**; each fills a specialized role based on its concrete tooling and repository visibility:

- **ChatGPT (The Verifier)**:
  - **Primary responsibility**: Verification, regression checking, and final implementation review.
  - **Tooling advantage**: Can read the GitHub repository directly via GitHub integration to inspect commits, diffs, branches, and code files in place.
  - **Workflow**: Compares actual git commits and pull request diffs against original requirements and acceptance criteria.
- **Claude & Gemini 4 Argon (The Planners)**:
  - **Primary responsibility**: System architecture, multi-file planning, and implementation prompt drafting.
  - **Tooling advantage**: Ingest structured repository context via Repomix snapshot packs to reason over complex logic, dependency graphs, and data flows.
  - **Workflow**: Analyze requirements, apply pushback rules when applicable, formulate trade-offs, and produce self-contained implementation prompts for Flash.
- **Gemini Flash (The Implementer)**:
  - **Primary responsibility**: Local code implementation and test execution in Antigravity.
  - **Tooling advantage**: Direct file modification and terminal execution in the working directory.
  - **Workflow**: Reads root `AGENTS.md`, executes in Quick mode or Careful mode, writes negative tests before sensitive fixes, and returns a structured completion report.

### Why Model Roles Can Change
Roles are not rigid entitlements. They can change when:
- **Repository access changes**: If GitHub integration is unavailable for ChatGPT, Claude or Argon can perform code review from repomix diff packs or commit patches.
- **Quota and rate limits**: When a high-tier model exhausts its usage quotas, another top-tier model assumes planning or review duties.
- **Context window requirements**: A refactor requiring an exceptionally large single-pass context window may require shifting planning to a model with higher token limits.
- **Tooling updates**: When IDE extensions, local plugins, or model platform capabilities evolve.

## 3. Quota Management Rules

Top-tier models consume significant quota and must be used with discipline:

- **Quick fixes skip top-tier models entirely**: Bug fixes, localized tweaks, typos, single-file edits, and straightforward improvements go straight from the user to Gemini Flash. Do not involve ChatGPT, Claude, or Argon for routine edits.
- **Reserve top-tier models for Careful mode**: Involve Claude, Gemini 4 Argon, or ChatGPT only for planning big modules, complex multi-step features, architectural refactors, or high-risk security audits.
- **Prefer narrow Repomix packs over full-repo packs**: When creating context packs for planners, pack only the relevant package or directory (for example, `apps/web`, `packages/engine`, or `apps/desktop`). Never generate or feed a full-monorepo pack when a targeted pack suffices. Narrow packs preserve context window token limits and reduce latency.

## 4. Repomix Snapshot Rules

When generating Repomix packs for planning models:
- **Strictly exclude secrets and environment files**: Never pack `.env`, `.env.*`, API keys, private certs, or credentials. Ensure patterns like `.env*` and `*.pem` are excluded in repomix configurations.
- **Never commit packs to the repository**: Repomix markdown packs (such as `reflow-web.md`, `reflow-engine.md`, `reflow-desktop-db.md`, or `repomix-output.txt`) must remain local, untracked, and ignored. Never stage or commit packs to git.

## 5. Pushback Rules for Big Modules Only

To prevent bureaucratic slowdowns, planners must not question or debate routine changes. Pushback and preliminary questioning are strictly reserved for **big modules**.

### Definition of a Big Module
A change qualifies as a big module if and only if it involves:
1. A new feature or new module.
2. A database schema change (e.g., Supabase table migrations, column alterations, or RLS policy updates).
3. Anything touching authentication, authorization, secrets, runner tokens, or tenant isolation.
4. A new external dependency (npm package or third-party service).
5. A refactoring that spans multiple files or packages.

### The Three Preliminary Questions
When presented with a big module, the planner must not draft an implementation prompt immediately. Instead, the planner must first ask the user **up to three structured questions**:
1. **The Main Goal**: What is the core business and technical outcome required?
2. **Approach Options & Recommendation**: What are the viable implementation approaches, and which one does the planner recommend with trade-offs?
3. **Workflow Changes**: How does this change the existing user journey, runner execution flow, or API contract?

*Small changes and routine fixes get no preliminary questions; the user or planner proceeds immediately with the prompt.*

## 6. Security Checklist for Auth and Tenant Changes

Whenever a task touches authentication (`apps/web/src/lib/auth/`), runner tokens, API routes (`apps/web/src/app/api/v1/`), or tenant isolation, the planner must incorporate this checklist into the prompt, and Flash must implement a test for every item before writing the fix:

- [ ] **Wrong, short, and guessed tokens**:
  - Test rejection of incorrect token strings.
  - Test rejection of short or truncated tokens (e.g., truncated `ps_live_` prefixes).
  - Test rejection of guessed prefixes or fake UUID combinations.
- [ ] **Cross-tenant organization ID spoofing**:
  - Test that passing another organization's ID in query parameters (`?org_id=`), headers, or request bodies (`org_id`, `orgId`) is rejected or ignored.
  - Test that workflow and run operations are strictly scoped to the authenticated organization.
- [ ] **Missing or malformed fields**:
  - Test rejection when authorization headers, required body fields, or token payloads are absent, empty, or malformed.
- [ ] **Test coverage requirement**:
  - Every condition listed above must have an explicit automated test asserting rejection (HTTP 401 Unauthorized or 403 Forbidden).

## 7. Implementation Prompt Structure

When a planner prepares a Careful-mode prompt for Gemini Flash, the prompt must include:
1. **Task Title & Mode**: Clearly marked as Careful mode.
2. **Goal & Source Scope**: Specific user-visible outcome and explicit files to inspect.
3. **Pre-Implementation Test Requirement**: Negative security tests required before fix code.
4. **Requirements & Edge Cases**: Detailed behavioral specifications.
5. **Acceptance Criteria**: Concrete, observable outcomes.
6. **Completion Report Requirement**: Mandate the six required report sections defined in root `AGENTS.md`.

## 8. Review and Verification Standard

When reviewing a completed task:
- ChatGPT inspects the commit directly on GitHub (or Claude/Argon reviews an explicit git diff).
- Verify against the code in the repository, not unverified claims in the completion report.
- Confirm all negative security tests were written and executed.
- Ensure no out-of-scope files were modified.
- If issues remain, issue one targeted correction prompt specifying the exact file and expected behavior.
