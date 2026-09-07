# AGENTS.md — AI App Development Operating System

This repository uses a deterministic, document-first software delivery lifecycle. This file is the canonical behavioral contract for AI coding agents.

## 0. Instruction priority

1. Explicit user instructions in the current task.
2. This `AGENTS.md`.
3. `docs/AI_DEVELOPMENT_PLAYBOOK.md`.
4. `docs/MODEL_ROUTING.md` for cost-aware model selection.
5. Project-specific approved documents in `docs/`.
6. Relevant `SKILL.md` files.
7. Existing implementation conventions inferred from the codebase.

If instructions conflict, follow the higher-priority source. Never silently resolve a material conflict: record it in `docs/PROJECT_STATUS.md`.

## 1. Core objective

Build the smallest coherent product that satisfies the approved product specification with production-grade engineering discipline.

Optimize for correctness before breadth, one complete vertical slice before many partial features, explicit acceptance criteria, secure-by-default data access, measurable product behavior, small reviewable changes, current official documentation for version-sensitive decisions, and minimal unnecessary complexity.

Do not optimize for maximum feature count, speculative architecture, unrequested redesigns, impressive but unused abstractions, or replacing working code merely because another approach is fashionable.

## 2. Default execution mode — CONTINUOUS AUTONOMY

The default behavior for a product repository is **continuous autonomous execution**.

Once the user asks the agent to build, continue, complete, develop, finish, or bring the repository through the lifecycle, that single authorization applies to all eligible lifecycle stages and implementation phases until one of the explicit stop conditions below occurs.

The agent MUST NOT stop merely because one lifecycle stage completed, a document was created, Stage 07 completed, a phase gate passed, the next task belongs to a later implementation phase, a routine architecture/database choice can be derived from approved documents, a test failed but can be fixed safely, a reviewer found fixable P0/P1 issues, or a preferred reviewer model is unavailable and a permitted fallback exists.

Instead, the agent should finish the current stage/task, run its gate, fix failures that are within scope, update `docs/PROJECT_STATUS.md`, determine the next eligible stage/task, and continue automatically.

### Explicit stop conditions

Stop and ask the user only when continuing would require irreversible/destructive data loss not already approved; meaningful external spend or a paid commitment not already approved; changing the product promise, MVP scope, business model, or a major user-facing requirement; credentials, secrets, legal ownership, store accounts, certificates, domains, payment accounts, or other assets only the user can provide; a major new vendor/platform dependency not already implied or approved; a materially consequential legal/privacy/compliance/payment-policy choice that cannot be derived safely; production deployment/store submission/public release/payment activation when explicit authorization is required; an unresolved contradiction between authoritative product documents that materially changes the product; or a blocker that cannot be solved with repository access and available tools.

When blocked, ask only for the smallest missing decision or credential required to proceed.

### Review fallback

If `docs/MODEL_ROUTING.md` requests a preferred critical reviewer such as Astra but that model is unavailable, use the strongest permitted available fallback, mark the review `FALLBACK`, record the actual model used, continue if no unresolved P0/P1 remains, and never pretend the preferred model ran.

## 3. Mandatory lifecycle — do not reorder

01. IDEA  
02. README.md  
03. docs/PRODUCT_SPEC.md  
04. docs/USER_FLOWS.md  
05. docs/ARCHITECTURE.md  
06. docs/DATABASE.md  
07. docs/IMPLEMENTATION_PLAN.md  
08. Implementation Phase 0 — repository/tooling foundation  
09. Implementation Phase 1 — app shell/navigation  
10. First end-to-end vertical slice  
11. Audit #1  
12. Core feature implementation  
13. Audit #2  
14. Store/release readiness  
15. Beta readiness

The ordering is invariant. A stage may be marked `N/A` only when it genuinely does not apply. Never skip a stage without recording the reason.

If later-stage documents or code already exist while an earlier mandatory artifact is missing, repair/create the earliest incomplete artifact, preserve valid later work, reconcile downstream artifacts, record material changes, and continue from the earliest eligible implementation point.

## 4. Phase detection and automatic progression

At the start of every task and after every completed gate: read `AGENTS.md`; read `docs/AI_DEVELOPMENT_PLAYBOOK.md`; inspect `docs/PROJECT_STATUS.md` if present; inspect repository evidence and approved docs; determine the earliest incomplete mandatory lifecycle stage or implementation task; reconcile that with explicit user instructions; perform the eligible work; verify its gate; fix in-scope failures; update `docs/PROJECT_STATUS.md`; and continue unless an explicit stop condition applies.

A README containing the marker `AI_PLAYBOOK_TEMPLATE` is a template README and does not count as the project's product README.

If `docs/PROJECT_STATUS.md` conflicts with the actual repository, repository evidence and approved artifacts win.

## 5. Source-of-truth hierarchy

- `README.md`: product promise, target user, MVP scope, non-goals.
- `docs/PRODUCT_SPEC.md`: detailed product behavior and acceptance criteria.
- `docs/USER_FLOWS.md`: navigation and user journeys.
- `docs/ARCHITECTURE.md`: system boundaries and technical design.
- `docs/DATABASE.md`: database/storage/auth/RLS model.
- `docs/IMPLEMENTATION_PLAN.md`: dependency-ordered executable tasks.
- `docs/DECISIONS.md`: material architecture/product decisions and rationale.
- `docs/PROJECT_STATUS.md`: current phase, gate state, blockers and next action.
- Code/tests/migrations: implementation truth after coding starts.

Do not introduce behavior that contradicts higher-level approved documents. If code and docs drift, determine which is intended, then synchronize both.

## 6. Research-before-decision rule

Use current primary/official sources when a decision depends on framework/library versions, app-store rules, privacy/platform policies, security practices, SDK/API capabilities, payments, authentication, deployment, database behavior, operating-system behavior, or legal/compliance requirements.

Record material findings and source links in the relevant project document. Prefer official vendor documentation, standards bodies, first-party repositories/changelogs, and reputable secondary sources only when necessary. Never treat model memory as authoritative for version-sensitive facts.

## 7. Product discipline

Before implementation progresses, the project must answer: Who is the primary user? What painful job/problem is solved? What is the core repeatable action? What is in MVP? What is explicitly outside MVP? What single behavior demonstrates product value? What are the main failure/empty/loading/offline states? What data is public/private/sensitive/derived? What metrics determine whether beta is working?

Every feature must map to at least one approved user flow and acceptance criterion. No feature may enter the implementation plan merely because it is nice to have.

## 8. Engineering rules

### Always
- Inspect before modifying.
- Preserve working behavior unless change is required.
- Prefer the smallest complete change.
- Use strict typing when supported.
- Validate external input.
- Handle loading, empty, error and retry states where applicable.
- Keep secrets out of client code and git.
- Add or update tests for behavior changed.
- Run relevant lint/typecheck/tests/build before declaring completion.
- Report commands run and failures honestly.
- Keep docs synchronized with material behavior changes.
- Use migrations for database changes after database design is approved.
- Add observability for important failures and critical product events.
- Fix in-scope verification failures before advancing.

### Never
- Never claim tests passed if they were not run.
- Never invent environment variables, credentials, API keys or production data.
- Never expose service-role/admin secrets to mobile/web clients.
- Never weaken auth/RLS/security to make a test pass.
- Never use mock data in a production flow without an explicit, visible marker and removal task.
- Never perform unrelated refactors during a scoped feature task.
- Never rewrite the design system when the user asked to preserve it.
- Never add dependencies without a concrete need.
- Never use destructive database operations without an explicit migration/rollback strategy.
- Never silently change product scope.
- Never stop after merely reporting what should be done next when the next action is safe and authorized; perform it.

## 9. Vertical-slice rule

Before broad feature implementation, deliver one real end-to-end path. A valid vertical slice starts from a real user action, traverses real UI/state, reaches the real backend/database when required, enforces real auth/authorization, persists or retrieves real data, handles success/failure, has tests or reproducible verification, and contains no hidden production-critical mocks.

## 10. Quality gates

A lifecycle stage is complete only if its gate in `docs/AI_DEVELOPMENT_PLAYBOOK.md` passes. Coding phases require relevant tests, typecheck, lint, build/compile where applicable, no known P0/P1 defect in changed scope, acceptance criteria verification, and synchronized status/docs.

If a command cannot run, mark the relevant gate `PARTIAL`, explain why, continue with independent work that is not blocked, and stop only if the blocker prevents safe forward progress.

## 11. Audit protocol

Classify findings as `P0` (security/data-loss/app-unusable/release-blocking), `P1` (major core-flow correctness or authorization failure), `P2` (meaningful quality/UX/performance/maintainability issue), or `P3` (polish/low-risk improvement).

Audit missing implementation, placeholders/TODOs, mock data, broken navigation, runtime risks, typing errors, auth/authorization, database grants/RLS, secret exposure, race conditions, loading/error/empty/offline states, accessibility, localization, privacy, analytics correctness, performance regressions, dependency/security issues, and store-policy risks.

Fix repository-local P0/P1 findings and re-run the gate automatically.

## 12. Mobile defaults

For mobile apps, treat OWASP MASVS categories as the security baseline; verify secure local storage/token handling, deep links if present, minimal permissions, offline/network-loss behavior where material, relevant real-device/simulator targets, and current app-store privacy/account-deletion/UGC/payment/permission requirements.

When Expo/React Native/Supabase is used, load the `expo-supabase-mobile` skill when available.

## 13. Supabase defaults

Design schema/RLS before migrations; enable RLS on every client-exposed table/view unless documented otherwise; explicitly design grants and policies; keep `service_role` server-side only; test allow and deny paths; define storage bucket privacy/object policies; record cascade and soft-delete behavior; index foreign keys, filters and policy predicates where appropriate; do not place privileged business logic in the client.

## 14. Model routing

Read `docs/MODEL_ROUTING.md` before selecting or escalating models. Never claim a specific critical reviewer ran unless the runtime actually used that model.

## 15. Agents and skills

If native custom agents are unavailable, simulate separation of concerns sequentially: orchestrator determines scope, specialist performs work, independent reviewer audits against acceptance criteria, orchestrator resolves findings and updates status.

Do not load every skill preemptively; use progressive disclosure.

## 16. Implementation-plan rules

`docs/IMPLEMENTATION_PLAN.md` must use dependency order, small reviewable tasks, task IDs, purpose/work/affected areas/dependencies/acceptance criteria/verification/complexity, identify the first vertical slice, separate beta must-haves from post-beta work, and include security/testing/store work inside relevant phases.

Default phases: Phase 0 repository/tooling foundation; Phase 1 app shell/navigation; Phase 2 authentication/user model; Phase 3 first vertical slice; Phase 4 core product features; Phase 5 social/community (N/A when irrelevant); Phase 6 notifications/localization (N/A when irrelevant); Phase 7 moderation/security; Phase 8 analytics/performance; Phase 9 store/release readiness.

## 17. Completion and handoff behavior

Do not produce an intermediate completion report and wait if safe authorized work remains. Update project state at each gate and continue.

A final report is appropriate when Stage 15 is reached as far as repository access permits, an explicit stop condition requires user action, the user explicitly requested narrower scope, or the runtime/session is ending.

The final report should include lifecycle stage/task reached, what changed, files materially changed, verification performed, gate status, unresolved blockers requiring user action, and exact next action only when something external remains.

Do not call the project finished when verification is partial or release depends on external user-owned assets.
