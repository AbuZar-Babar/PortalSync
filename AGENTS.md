# ReFlow AI Collaboration Instructions

## Purpose

ReFlow is a production-oriented SaaS product for hybrid browser automation and RPA. Treat it as an evolving product, not a student project or disposable prototype. Preserve existing behavior unless the task explicitly changes it.

These instructions support AI-assisted planning, implementation prompts, and review. They do **not** grant any model execution access or require automated model-to-model communication.

## Shared working principles

- Use the repository as the source of truth. Read relevant code and current documentation before making architectural claims.
- Distinguish verified facts from assumptions. If a file, API, behavior, or test has not been inspected, say so.
- Prefer the smallest sound solution that meets the requirements. Do not overengineer simple tasks or introduce abstractions without a concrete benefit.
- Apply constructive pushback only when there is a meaningful correctness, security, maintainability, product, or scope concern, or a clearly better alternative. Explain the concern briefly and propose a practical alternative. If the approach is reasonable, proceed without debate.
- Preserve existing features and contracts unless the task explicitly calls for a change. Pay special attention to discovery, filtering, stored discovered items, loop execution, downloads, authentication/session handling, and the cloud/desktop boundary.
- Never claim that code was changed, a command ran, or a test passed unless there is direct evidence.
- Avoid unrelated refactors and avoid deleting or consolidating modules based only on names or apparent overlap.
- Protect secrets, customer data, tenant isolation, authentication, and authorization. Treat security-sensitive changes as high risk and inspect their surrounding flows and tests.

## For high-tier models preparing implementation prompts

When asked to plan a feature or generate a prompt for Gemini Flash in Antigravity, account for the three-model planning/review group: ChatGPT, Claude, and Gemini 4 Argon. The user manually transfers prompts and findings; do not imply automatic model-to-model communication. Gemini Flash in Antigravity is the implementation agent.

1. Clarify the intended user-visible behavior and success criteria.
2. Inspect the relevant repository files if repository access is available. If not, explicitly instruct the implementer to inspect them before editing.
3. Identify existing patterns, dependencies, integration points, and likely edge cases.
4. Use ChatGPT, Claude, and Gemini 4 Argon as complementary planning/review options, not as mandatory independent reviewers for every task. A lead model may request a focused second opinion when risk or ambiguity justifies it.
5. Briefly flag only material risks or a clearly superior approach.
6. Produce a self-contained prompt that can be pasted into the implementation model. Include:
   - Goal and expected behavior
   - Repository/context summary relevant to the task
   - Instructions to inspect before editing
   - Requirements and constraints
   - Edge cases and failure handling
   - Acceptance criteria
   - Tests/checks to run
   - A required completion report
7. Do not invent filenames, APIs, test results, or implementation details. Mark uncertainties explicitly.

## For implementation reports and reviews

When reviewing a report from an implementation model:

- Compare reported work against the original requirements and acceptance criteria.
- Separate confirmed evidence (such as an actual diff or test output) from the implementer's claims.
- Ask for the diff, relevant files, or test output when necessary to make a reliable judgment.
- Prioritize correctness, regressions, security, tenant boundaries, error handling, and maintainability over style-only preferences.
- Return actionable findings with severity and file/line references when available. If no material issue is found, say so; do not invent criticism.

## Required implementation completion report

The implementer should report:

1. Summary of behavior implemented.
2. Files created or changed.
3. Commands and tests actually run, with pass/fail results.
4. Known gaps, assumptions, or untested cases.
5. Any deviations from the requested plan and why.

## Risk and scope

- For straightforward, low-risk changes, keep the process lightweight.
- For major features, broad refactors, database/schema changes, authentication/authorization, secrets handling, tenant isolation, or destructive changes, inspect first and define acceptance criteria and a test plan.
- Do not perform destructive operations or change production data as an unrequested side effect.
- Keep unrelated work out of the change.

## Keeping context current

Update the agent-context documents when a meaningful feature, architectural decision, confirmed issue, or major project state change makes them inaccurate. Prefer concise durable facts over transient session notes. Do not treat this context as a substitute for inspecting current code.
