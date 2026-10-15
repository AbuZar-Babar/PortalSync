# AI Prompt Generation and Implementation Review Workflow

## Purpose

Use this guide for the three-model planning/review group—ChatGPT, Claude, and Gemini 4 Argon—and the separate implementation agent, Gemini Flash in Antigravity. The user remains the coordinator: prompts and reports are copied manually. This is not an automated multi-agent execution system. If the user's environment labels Argon differently, confirm the exact model label in that environment rather than silently substituting a model.

## Workflow at a glance

1. User describes the desired outcome.
2. A lead planning model (ChatGPT or Claude, depending on the session) checks relevant repository context and code when available.
3. Gemini 4 Argon contributes a complementary analysis or review when useful; it should not repeat work just to satisfy a three-model ritual.
4. The models raise concise concerns only for meaningful flaws, material risks, or a clearly better alternative. If there is no material concern, proceed.
5. The lead model produces one self-contained implementation prompt that incorporates relevant findings and resolves disagreements where possible. If a disagreement materially affects correctness and cannot be resolved from evidence, present the specific decision to the user.
6. User pastes the prompt into Gemini Flash in Antigravity.
7. Gemini Flash inspects the code, implements the change, runs appropriate checks, and reports what happened.
8. User returns the original prompt and implementation report to the lead model. Ideally, include the diff and test output too.
9. The reviewer checks evidence against requirements and produces either approval with caveats or one targeted correction prompt.
10. User decides whether to apply corrections, inspect locally, or accept the result.

## A. Prompt-generation checklist

Before writing the implementation prompt:

- Restate the intended behavior and who/what it affects.
- Inspect relevant files and existing patterns if repository access is available.
- If code access is unavailable, do not guess exact implementation details. Instruct Gemini to inspect the repository and report what it finds before editing if uncertainty affects the design.
- Identify dependencies and integration boundaries.
- Preserve unrelated functionality, especially discovery, filtering, stored discovered items, loop execution, downloads, authentication/session handling, and cloud/desktop interaction where relevant.
- Consider security, tenant isolation, error handling, accessibility, and regression risks when relevant.
- Keep the solution proportional to the task. Do not turn a small change into a broad refactor.
- Define observable acceptance criteria and appropriate tests.

## B. Copy-ready implementation prompt template

Adapt this template to the feature. Remove irrelevant sections instead of filling the prompt with boilerplate.

---

**Task:** [Short feature or bug-fix title]

**Goal and expected behavior**
[Explain the user-visible outcome and how it should work.]

**Repository instructions**
- Read `AGENTS.md` and relevant context documents if present.
- Inspect the actual implementation and tests before editing; do not assume file paths or architecture from this prompt alone.
- Summarize the relevant current behavior and proposed change briefly before making broad or risky edits.

**Requirements**
1. [Specific functional requirement]
2. [Expected edge-case behavior]
3. [Error, loading, empty, or recovery behavior where applicable]

**Constraints**
- Follow existing project patterns and design conventions.
- Preserve unrelated behavior and public interfaces.
- Avoid unrelated refactoring, duplicate implementations, and unnecessary dependencies.
- Do not weaken authentication, authorization, tenant isolation, or secrets handling.
- Do not report tests as passing unless they were run and passed.

**Acceptance criteria**
- [Observable result 1]
- [Observable result 2]
- [Relevant regression case]

**Verification**
- Identify and run the most relevant existing tests.
- Add or update tests for the new behavior where appropriate.
- Run relevant lint/build/type checks when practical.
- If a check cannot run, state why instead of implying success.

**Completion report**
Return:
1. Summary of implementation.
2. Files created or changed.
3. Tests and commands run, with actual outcomes.
4. Known limitations and untested cases.
5. Any deviation from the prompt and the reason.
6. A concise list of anything that needs human verification.

---

## C. Review checklist for the high-tier model

When the user returns the implementation report:

1. Retrieve the original requirements and acceptance criteria; do not review the report in isolation.
2. Check whether the report covers every requirement and edge case.
3. Distinguish claims from evidence. A report alone cannot prove correctness.
4. If possible, inspect the actual diff and test output. If only a report is provided, explicitly state the limits of the review.
5. Check for regressions, broken contracts, error-path gaps, security/tenant-isolation problems, accidental scope expansion, and missing tests.
6. Classify findings as:
   - **Blocker:** unsafe or fundamentally incorrect; do not accept yet.
   - **Important:** likely bug, missing requirement, or significant regression risk.
   - **Minor:** limited polish or low-risk maintainability concern.
   - **No material findings:** the available evidence supports acceptance, with any caveats stated.
7. If corrections are needed, provide one targeted, copy-ready correction prompt that names the issue, expected behavior, and verification. Avoid asking Gemini to rewrite everything unnecessarily.
8. If evidence is insufficient, request the specific missing diff, file, or command output rather than guessing.

## D. Roles and handoffs for the three-model workflow

- **ChatGPT:** Can lead requirements analysis, repository investigation, prompt drafting, evidence review, and final recommendation.
- **Claude:** Can lead the same kind of task when chosen by the user, or provide a focused second opinion on a consequential design or review.
- **Gemini 4 Argon:** The third high-capability planning/review model. Use it for a complementary analysis when it is available in the user's environment; do not assume its access or model label without confirmation.
- **Gemini Flash in Antigravity:** The implementation agent that receives the final prompt, inspects and edits the repository, runs checks, and produces the completion report.

These are default roles, not hard restrictions. The user may choose a different lead. Do not ask all three planning models to independently solve every small task. For routine changes, one lead model is enough; add another reviewer only when the risk, ambiguity, or impact justifies it. The three planning/review models do not automatically communicate with one another—the user transfers relevant prompts and findings manually.

## E. Constructive pushback policy

Push back briefly when the proposed approach creates a meaningful correctness, security, scalability, product, or maintenance problem, or when a clearly better alternative exists. Explain the trade-off and offer a practical alternative.

If the idea is reasonable, proceed. Do not manufacture objections, force every model to debate the decision, or require a formal review for a trivial low-risk change.

## F. Scope and safety

- The planning/review model does not need execution permissions.
- The user manually transfers prompts and reports between models.
- The implementation model should only change the requested scope.
- High-risk database, authentication, authorization, secrets, tenant-isolation, or destructive changes require extra inspection and explicit verification.
- A successful build does not by itself prove feature correctness.
- User acceptance remains the final decision.

## G. What counts as a good result

A good prompt is specific enough to guide implementation but tells Gemini to verify actual code rather than blindly trust assumptions. A good review is evidence-based, concise, and actionable. The objective is a repeatable, low-friction development loop—not a large process that slows down everyday work.
