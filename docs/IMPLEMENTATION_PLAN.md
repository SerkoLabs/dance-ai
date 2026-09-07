# Dance AI — Implementation Plan

Status: **Stage 07 — PASS**  
Inputs: `README.md`, `docs/PRODUCT_SPEC.md`, `docs/USER_FLOWS.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`

## 1. Planning rules

- Work in dependency order.
- Complete one small, reviewable task at a time.
- Do not broaden MVP scope during implementation.
- Every coding task must preserve the security/privacy boundaries defined in `docs/ARCHITECTURE.md` and `docs/DATABASE.md`.
- Database changes happen only through reviewed migrations.
- A task is complete only after its acceptance criteria and listed verification pass, or the gate is explicitly marked `PARTIAL` with a blocker.
- The first real end-to-end vertical slice is Phase 3 and must not use hidden production-critical mocks.

## 2. Phase map

| Phase | Purpose | Beta requirement |
|---|---|---|
| Phase 0 | Repository/tooling foundation | Required |
| Phase 1 | App shell/navigation | Required |
| Phase 2 | Auth + data/security foundation | Required |
| Phase 3 | First real vertical slice | Required |
| Phase 4 | Remaining core MVP | Required |
| Phase 5 | Social/community | N/A for MVP |
| Phase 6 | Notifications/localization | Notifications N/A; localization decision later |
| Phase 7 | Privacy/security hardening | Required |
| Phase 8 | Analytics/performance/reliability | Required |
| Phase 9 | Store/release readiness | Required |

---

# Phase 0 — Repository/tooling foundation

## P0-01 — Scaffold Expo application

**Purpose:** establish the root mobile application with current Expo/React Native conventions and strict TypeScript.

**Work:**
- scaffold current stable Expo app with Expo Router and TypeScript;
- keep `app/` routes minimal until Phase 1;
- enable strict TypeScript settings supported by the scaffold;
- commit package lockfile;
- add baseline npm scripts for start, lint, typecheck, test and export/build sanity.

**Affected areas:** `package.json`, lockfile, `app/`, `tsconfig.json`, Expo config.

**Dependencies:** none.

**Acceptance criteria:**
- app dependency graph installs from lockfile;
- Expo config resolves;
- TypeScript project has strict checking enabled;
- no product feature is falsely represented as complete.

**Verification:** `npm ci`, `npm run lint`, `npm run typecheck`, Expo config/export sanity command.

**Complexity:** S.

**Risk notes:** use current official Expo package versions; do not pin remembered versions manually if scaffold can determine them.

## P0-02 — Add approved mobile dependencies only

**Purpose:** install the minimum packages already required by approved architecture.

**Work:**
- add Supabase JS client;
- Expo SecureStore;
- Expo Camera;
- Expo Video;
- Expo media picker package chosen from current official SDK;
- TanStack Query;
- React Native URL polyfill if required by current Supabase guidance;
- testing packages only where not already scaffolded.

**Affected areas:** `package.json`, lockfile.

**Dependencies:** P0-01.

**Acceptance criteria:** every dependency maps to an approved MVP capability; no analytics, AI, social, UI-kit, or state-management dependency is added speculatively.

**Verification:** clean install + Expo dependency compatibility check + typecheck.

**Complexity:** S.

**Risk notes:** TUS/resumable upload dependency is intentionally deferred to the upload task so React Native file-source compatibility can be validated against current docs before committing to a package.

## P0-03 — Environment/configuration boundary

**Purpose:** make public client configuration explicit while preventing privileged secret leakage.

**Work:**
- add `.env.example` with client-safe variable names only;
- add configuration parser/validator for public Supabase URL and publishable key;
- fail safely when configuration is absent;
- ensure `.env*` secret files are ignored;
- document server-only variables separately without placing values in git.

**Affected areas:** `.env.example`, `.gitignore`, `src/lib/config/`, docs.

**Dependencies:** P0-01.

**Acceptance criteria:** mobile bundle has no service-role variable; missing config produces controlled startup state; repository contains no credential value.

**Verification:** secret-pattern scan, unit test for config validation, typecheck.

**Complexity:** S.

## P0-04 — Mobile test/lint baseline

**Purpose:** make quality gates executable before feature work.

**Work:**
- configure ESLint using Expo-compatible defaults;
- configure unit/component test runner compatible with the selected Expo SDK;
- add one smoke test for configuration/error utility;
- normalize scripts used locally and in CI.

**Affected areas:** lint/test config, `src/test/`, `package.json`.

**Dependencies:** P0-01.

**Acceptance criteria:** lint/typecheck/test commands return success on baseline application.

**Verification:** `npm run lint`, `npm run typecheck`, `npm test -- --runInBand` or equivalent selected script.

**Complexity:** S.

## P0-05 — Scaffold Python analysis worker

**Purpose:** establish the replaceable trusted compute service before writing pose logic.

**Work:**
- create Python package under `services/analysis-worker/`;
- define configuration, structured logging, job runner boundary and health command;
- add pytest baseline;
- add Dockerfile with non-root runtime where practical;
- do not add MediaPipe/FFmpeg pipeline code yet beyond dependency/runtime probe.

**Affected areas:** `services/analysis-worker/`.

**Dependencies:** none.

**Acceptance criteria:** worker package imports, tests pass, container definition contains no secret, and worker cannot start a real job without explicit server configuration.

**Verification:** Python tests, compile/import check; container build when Docker is available.

**Complexity:** S.

## P0-06 — Supabase repository structure

**Purpose:** prepare reviewed migration/function/test paths without changing a remote database.

**Work:**
- initialize `supabase/` project structure/config if tooling permits;
- create migration/function/test directories;
- add README/run instructions for local Supabase;
- do not create production resources or migrations yet.

**Affected areas:** `supabase/`.

**Dependencies:** none.

**Acceptance criteria:** repository has an unambiguous place for migrations, Edge Functions and RLS tests; no remote database has been changed.

**Verification:** Supabase config parse/start command where local CLI + Docker are available; otherwise mark that sub-check PARTIAL and keep repository structure valid.

**Complexity:** S.

## P0-07 — CI baseline

**Purpose:** prevent later merges that fail basic mobile/worker checks.

**Work:**
- GitHub Actions workflow for clean Node install, lint, typecheck, unit tests and Expo config/export sanity;
- Python setup and pytest/compile check;
- add Supabase checks only when Phase 2 migrations exist and can run deterministically.

**Affected areas:** `.github/workflows/ci.yml`.

**Dependencies:** P0-01, P0-04, P0-05.

**Acceptance criteria:** workflow contains no secrets; checks map exactly to repository scripts; local equivalents pass before relying on CI.

**Verification:** local commands + GitHub Actions run after push.

**Complexity:** S.

### Phase 0 gate

Pass when mobile install/lint/typecheck/test/config-export checks and worker tests pass; unavailable Docker/Supabase-local checks may be `PARTIAL` if they do not block app foundation.

---

# Phase 1 — App shell/navigation

## P1-01 — App providers and startup boundary

**Purpose:** establish controlled app startup and error handling.

**Work:** root providers for query client, safe configuration state, auth bootstrap placeholder interface, status bar/safe area as required; startup error screen with retry.

**Dependencies:** Phase 0.

**Acceptance criteria:** missing config does not crash; configured app reaches intended shell; provider composition is testable.

**Verification:** component tests, typecheck, lint.

**Complexity:** S.

## P1-02 — Auth/app route groups

**Purpose:** establish navigation matching `docs/USER_FLOWS.md` without pretending backend flows exist.

**Work:** create `(auth)` and `(app)` groups; welcome/sign-in placeholders, Projects, New Dance, Project resolver, Section Learn, Camera, Attempt Review/Status/Feedback, Full Practice, Settings routes; unavailable actions clearly disabled until their phase.

**Dependencies:** P1-01.

**Acceptance criteria:** all approved MVP screens have a route purpose; no social/community route; back behavior is sane; unfinished flows are visibly unavailable rather than mock-successful.

**Verification:** route/render tests + Expo Router route/type generation check.

**Complexity:** M.

## P1-03 — Minimal design primitives and state screens

**Purpose:** avoid duplicated ad-hoc UI while keeping design system intentionally small.

**Work:** Button, Screen, LoadingState, EmptyState, ErrorState, OfflineBanner, Score/Confidence primitives only as required; accessibility labels/touch targets.

**Dependencies:** P1-01.

**Acceptance criteria:** shell screens can represent loading/empty/error/offline states without custom one-off patterns; controls are keyboard/screen-reader friendly where applicable.

**Verification:** component tests + accessibility assertions where supported.

**Complexity:** S.

### Phase 1 gate

App starts, route shell navigates, startup and basic error states do not crash, and unfinished features are not presented as working.

---

# Phase 2 — Authentication and secure data foundation

## P2-01 — Implement database migration #1

**Purpose:** translate the approved `DATABASE.md` schema into executable SQL.

**Work:** create tables, constraints, indexes, timestamp functions, late cyclic FKs and status checks; no RLS policies yet in this task.

**Dependencies:** Phase 0, `docs/DATABASE.md`.

**Acceptance criteria:** migration applies from a clean local Supabase instance; schema matches approved fields/relations; no table contains secrets/raw frames.

**Verification:** clean migration apply + schema assertions.

**Complexity:** M.

## P2-02 — Grants, RLS and Storage migration

**Purpose:** establish real authorization before mobile data access.

**Work:** enable RLS; revoke broad grants; add exact SELECT policies; create three private buckets/restrictions; own-prefix Storage INSERT/SELECT policies; service-only analysis artifact bucket; lock down queue functions namespace/execute rights.

**Dependencies:** P2-01.

**Acceptance criteria:** authenticated A can see own allowed rows/objects; authenticated B and anon cannot; mobile cannot forge status/scores/jobs/progress or directly delete immutable Storage videos.

**Verification:** pgTAP/SQL allow-and-deny matrix from `DATABASE.md`.

**Complexity:** M.

**Risk notes:** P1 security gate. Must not advance on unresolved cross-user access.

## P2-03 — Durable analysis-job RPCs

**Purpose:** make worker processing atomic/idempotent.

**Work:** service-only claim, renew lease, complete/fail helpers; SKIP LOCKED-equivalent safe claiming; idempotency constraints and retry semantics.

**Dependencies:** P2-01, P2-02.

**Acceptance criteria:** concurrent claim cannot return same job; expired leases recover; authenticated/anon cannot execute privileged queue operations.

**Verification:** concurrency/database tests.

**Complexity:** M.

## P2-04 — Supabase mobile client/session adapter

**Purpose:** connect Expo to Supabase without weakening authorization.

**Work:** typed client initialization, secure session storage/refresh lifecycle according to current official guidance, auth state boundary, user-scoped query-cache clearing on sign-out.

**Dependencies:** P0-02, P0-03, P2-02.

**Acceptance criteria:** publishable key only; no service key; valid session survives restart; expired session returns to auth; auth bootstrap has loading/error states.

**Verification:** unit/integration tests + real local/test Supabase login when available.

**Complexity:** M.

## P2-05 — Email OTP authentication flow

**Purpose:** complete UF-01 using real Supabase Auth.

**Work:** email entry, validation, request OTP, OTP verification flow selected to avoid deep-link complexity in the first slice, resend/error handling, signed-in route guard, sign-out.

**Dependencies:** P2-04.

**Acceptance criteria:** new user can authenticate; returning session persists; failure does not crash; no permissions requested during onboarding.

**Verification:** auth integration test against local/test Supabase + route tests.

**Complexity:** M.

### Phase 2 gate

No unresolved P0/P1 authorization defect; auth works against a real Supabase environment; RLS/storage allow-and-deny tests pass.

---

# Phase 3 — First real end-to-end vertical slice

**Vertical slice definition:**

`email auth → choose a device dance video → private resumable upload → trusted finalization → real worker reference analysis → ready sections → learn first section → camera attempt → private upload → real worker temporal comparison → deterministic feedback → retry → persisted personal-best/progress`

Device-video import is the only required import path for this gate. URL import is not allowed to delay proving the product core.

## P3-01 — Project upload allocation/finalization Edge Functions

**Purpose:** create a reference upload without letting the client forge ownership/state/jobs.

**Work:** authenticated `create-project-upload` and `finalize-project-upload`; immutable path allocation; ownership checks; object verification; idempotent reference job enqueue.

**Dependencies:** Phase 2.

**Acceptance criteria:** client cannot choose another user ID/path; missing/wrong object cannot queue analysis; duplicate finalize creates no duplicate active job.

**Verification:** authorized/unauthorized/idempotency Edge Function tests.

**Complexity:** M.

## P3-02 — Device picker, source validation and resumable upload

**Purpose:** implement UF-02 with real private media.

**Work:** just-in-time media picking, local duration/size/type pre-check, preview/confirm, project allocation, TUS upload using a React-Native-compatible approach confirmed from current official/provider guidance, progress/retry/cancel, finalize call.

**Dependencies:** P3-01.

**Acceptance criteria:** supported video uploads privately; >limit/unsupported media fails before heavy processing; retry does not create duplicate project/job; user sees progress/error.

**Verification:** mobile tests + real upload to local/test Supabase; inspect cross-user read denial.

**Complexity:** M.

## P3-03 — Reference worker media normalization and pose extraction

**Purpose:** turn a real uploaded dance into a versioned body-motion sequence.

**Work:** worker downloads private object, verifies media, FFmpeg normalization, bounded frame sampling, MediaPipe Pose Landmarker VIDEO mode `num_poses=1`, confidence gating, body-only persisted artifact, temp cleanup.

**Dependencies:** P0-05, P2-03, P3-01.

**Acceptance criteria:** supported fixture/reference produces time-aligned body landmarks; low tracking confidence is explicit; face-specific persisted data is omitted; temp files removed; failures categorized.

**Verification:** pytest unit/integration fixture + one real queued job.

**Complexity:** L.

## P3-04 — Reference segmentation and project-ready transaction

**Purpose:** produce learnable ordered sections.

**Work:** smoothing/motion-energy heuristic, bounded section ranges, approximate equal-duration fallback when appropriate, persist reference analysis + sections, atomically activate analysis and mark project ready.

**Dependencies:** P3-03.

**Acceptance criteria:** at least one valid ordered non-overlapping section; active section set is unique; retry does not duplicate; terminal low-quality failure is recoverable in UI.

**Verification:** segmentation invariant tests + DB integration test.

**Complexity:** M.

## P3-05 — Processing status, Projects and section list

**Purpose:** let user leave/reopen and resume real analysis state.

**Work:** Projects query, project resolver, bounded status polling, ready/failed/offline states, ordered sections/progress.

**Dependencies:** P3-04.

**Acceptance criteria:** app restart does not lose project; no fabricated ETA; polling stops on terminal state; own projects only.

**Verification:** component/query integration tests + RLS cross-user test.

**Complexity:** M.

## P3-06 — Section playback learning mode

**Purpose:** deliver the `watch → slow → try` learning step.

**Work:** private source playback, constrain loop to section timeline, 1x/.75x/.5x, mirror visual transform, orientation semantics documented/tested.

**Dependencies:** P3-05.

**Acceptance criteria:** section loops within practical player tolerance; speed/mirror work; display transform does not silently corrupt analysis coordinates.

**Verification:** playback state tests + simulator/device smoke test.

**Complexity:** M.

## P3-07 — Attempt allocation, camera and private upload

**Purpose:** capture a user attempt safely and submit it for analysis.

**Work:** authenticated attempt allocation/finalization Edge Functions; JIT camera permission; full-body framing guidance; visible countdown/recording; muted recording; bounded duration; preview/discard; resumable private upload; retry.

**Dependencies:** P3-06, P2-03.

**Acceptance criteria:** no microphone permission; camera never records before explicit start; denied permission recovers; discard deletes local temp; duplicate finalize cannot duplicate attempt-analysis job; cross-user access denied.

**Verification:** permission-state tests + device/simulator capture + Edge Function tests + Storage RLS tests.

**Complexity:** L.

## P3-08 — Attempt pose extraction, temporal alignment and scoring

**Purpose:** compute a real result instead of a demo score.

**Work:** same pose pipeline family, mirror/orientation normalization, confidence gating, DTW alignment, timing/upper/lower/torso component errors, versioned 0–100 scores, sanitized attempt result.

**Dependencies:** P3-03, P3-07.

**Acceptance criteria:** comparison uses sequence over time; known synthetic alignment cases behave predictably; low-confidence attempt has no fake precise score; service writes only.

**Verification:** pytest fixtures for time shift, mirrored pose, missing landmarks, score monotonicity + DB integration job.

**Complexity:** L.

## P3-09 — Deterministic feedback and result UI

**Purpose:** make the core value understandable.

**Work:** rank high-confidence component errors; generate 1–3 rule-based corrections with traceability metadata; Feedback UI with movement/timing/overall/confidence and retry CTA.

**Dependencies:** P3-08.

**Acceptance criteria:** successful result is not percentage-only; every message maps to metric/rule/phase/confidence; low confidence routes to capture advice; no medical/sensitive inference.

**Verification:** deterministic rule tests + result UI tests.

**Complexity:** M.

## P3-10 — Retry, personal best and section completion

**Purpose:** prove improvement across attempts.

**Work:** retry same section, attempt history, scoring-version compatibility, trusted best update, threshold/manual completion, persisted progress and next-section CTA.

**Dependencies:** P3-09.

**Acceptance criteria:** failed/incompatible attempt cannot replace best; valid improvement persists after restart; manual move-on available only after at least one valid analyzed attempt.

**Verification:** transaction tests + end-to-end flow repetition.

**Complexity:** M.

## P3-11 — Vertical-slice verification

**Purpose:** gate the architecture on the actual product loop.

**Work:** run complete flow on a realistic Android or iOS simulator/device plus real local/test Supabase and real worker; capture reproducible fixture/steps; verify cross-user isolation and restart recovery.

**Dependencies:** P3-01 through P3-10.

**Acceptance criteria:** tester can finish entire vertical slice without a hidden critical mock; no unresolved P0/P1; relevant lint/typecheck/test/build pass.

**Verification:** documented manual E2E + automated component/database/worker tests + critical audit.

**Complexity:** M.

### Audit #1

Independent review of requirement coverage, runtime correctness, architecture drift, authorization, RLS/Storage, privacy, test gaps, accessibility baseline, dependency health and first-slice UX. Fix P0/P1 before advancing.

---

# Phase 4 — Remaining core MVP

## P4-01 — Low-confidence and terminal-analysis recovery polish

**Purpose:** make unsupported inputs understandable rather than dead ends.

**Work:** framing/visibility guidance, reference unsupported state, re-record/re-upload paths, retryable vs terminal error copy.

**Dependencies:** Phase 3.

**Acceptance criteria:** every analysis failure category has a safe user recovery or explicit terminal explanation.

**Verification:** state-machine/component tests.

**Complexity:** S.

## P4-02 — Full choreography practice

**Purpose:** combine learned sections into the promised final practice.

**Work:** full reference playback, mirror setting, countdown; optional final recording only if section aggregation is already reliable.

**Dependencies:** P3-10.

**Acceptance criteria:** full practice works without fabricating an aggregate score; if aggregate score is shown, only valid compatible section analyses contribute.

**Verification:** playback + aggregation tests when enabled.

**Complexity:** M.

## P4-03 — Project deletion workflow

**Purpose:** provide real privacy control for private media.

**Work:** authenticated delete-project orchestration, logical hide, snapshot Storage cleanup tasks, cleanup worker, retry/failure observability, final DB cleanup.

**Dependencies:** Phase 3 database/worker.

**Acceptance criteria:** project disappears from user reads immediately after accepted deletion; source/attempt/artifact cleanup is idempotent/retryable; another user cannot trigger deletion.

**Verification:** deletion integration tests + Storage object existence checks.

**Complexity:** M.

## P4-04 — Account deletion workflow

**Purpose:** satisfy product/store privacy requirement without orphaning Storage.

**Work:** Settings confirmation, authenticated request, staged all-project cleanup, operational deletion request, delete auth identity at safe end, signed-out terminal state.

**Dependencies:** P4-03.

**Acceptance criteria:** auth row is not deleted before cleanup context is secured; deletion can recover from partial cleanup; deleted user cannot resume app session.

**Verification:** destructive workflow integration test in disposable local/test account.

**Complexity:** L.

## P4-05 — Approved URL-import adapter boundary

**Purpose:** implement README's supported-link path without generic scraping/SSRF.

**Work:** implement **only** a source adapter whose current platform terms/API/access method are explicitly reviewed and lawful; enforce HTTPS/host/DNS/redirect/size/MIME restrictions; ephemeral URL retention; otherwise keep link UI disabled with device-upload fallback.

**Dependencies:** architecture URL boundary, Phase 3.

**Acceptance criteria:** no arbitrary fetch endpoint; private/reserved IPs and unapproved hosts cannot be reached; no cookies/DRM/access-control bypass; importer respects configured media limits.

**Verification:** SSRF/redirect/size/MIME negative tests + source-specific integration test.

**Complexity:** L.

**Blocker rule:** if no lawful supported source adapter can be approved without a material platform/legal decision, stop at this task and request the smallest needed user decision. Do not invent a downloader.

## P4-06 — Project/attempt history polish

**Purpose:** complete resume/history behavior.

**Work:** recent attempts per section, best indicator, processing result resume, stable empty/loading/error states.

**Dependencies:** Phase 3.

**Acceptance criteria:** history uses compatible score versions and remains private; failed attempts never appear as valid best results.

**Verification:** query/component tests.

**Complexity:** S.

### Phase 4 gate

All beta MVP acceptance criteria are implemented except any explicitly documented/deferred URL adapter blocked by a genuine platform/legal constraint approved by user.

---

# Phase 5 — Social/community

**N/A for MVP.** README explicitly excludes social feed, followers, comments, leaderboards and creator marketplace. Do not add them before beta evidence changes scope.

---

# Phase 6 — Notifications/localization

## P6-01 — Centralize user-facing strings

**Purpose:** avoid hard-coding UI copy across features and keep later localization reversible.

**Work:** string catalog/module with English baseline (or product-market language if explicitly approved before this task); no heavy i18n framework unless a second locale is actually approved.

**Dependencies:** Phase 4.

**Acceptance criteria:** major MVP user-facing copy is centralized; error categories map to controlled copy.

**Verification:** lint/test.

**Complexity:** S.

Notifications: **N/A** for MVP; processing resume uses persisted state rather than push notifications.

---

# Phase 7 — Privacy/security hardening

## P7-01 — Security audit and authorization regression suite

**Purpose:** verify no feature drift weakened trust boundaries.

**Work:** run full RLS/Storage cross-user matrix, Edge Function ownership/idempotency tests, job-RPC execute checks, secret scan, URL adapter SSRF tests if enabled, signed-URL lifetime review.

**Dependencies:** Phase 4.

**Acceptance criteria:** no unresolved P0/P1; mobile cannot write trusted scoring/job/progress state; no service credential in client/repository.

**Verification:** automated security tests + focused critical review.

**Complexity:** M.

## P7-02 — Mobile privacy/permission audit

**Purpose:** minimize sensitive capture.

**Work:** confirm camera/media permissions only at point of use; microphone not requested; recording indicator/cancel/discard; local temp cleanup; privacy-safe logs and analytics.

**Dependencies:** Phase 4.

**Acceptance criteria:** app manifests/config request no unnecessary permission; raw video/body data absent from telemetry.

**Verification:** app config inspection + device permission smoke test + log scan.

**Complexity:** S.

---

# Phase 8 — Analytics/performance/reliability

## P8-01 — Privacy-safe product funnel events

**Purpose:** measure whether beta users reach the promised value.

**Work:** trusted allowlisted event writer for approved funnel; pseudonymous IDs, event/app versions, safe properties; no raw media/keypoints/email/signed URL.

**Dependencies:** Phase 3 core flow.

**Acceptance criteria:** funnel events are emitted once/idempotently where appropriate; payload schema rejects unapproved properties.

**Verification:** event-schema tests + DB inspection.

**Complexity:** M.

## P8-02 — Processing metrics and structured operational logs

**Purpose:** diagnose worker failures/cost/performance without sensitive logs.

**Work:** correlation IDs, processing duration, failure category, queue/retry metrics, cleanup failure visibility.

**Dependencies:** Phase 3/4 workers.

**Acceptance criteria:** an operator can trace project/attempt job state without raw frames/keypoints/tokens; worker errors have categories and correlation IDs.

**Verification:** integration-log assertions.

**Complexity:** M.

## P8-03 — Media/worker performance budget

**Purpose:** keep beta compute bounded.

**Work:** benchmark supported fixture set; enforce 60s/50MB source limits, bounded resolution/fps, concurrency/retry caps; record median/p95 processing times locally/test environment.

**Dependencies:** Phase 4.

**Acceptance criteria:** limits are server-enforced; unsupported oversized media never enters heavy pipeline; benchmark is reproducible.

**Verification:** benchmark script + limit tests.

**Complexity:** M.

### Audit #2

Repeat product/security/runtime audit including placeholders, dead code, regressions, performance, privacy, analytics integrity, offline/degraded behavior and production config. Fix P0/P1 before release work.

---

# Phase 9 — Store/release readiness

## P9-01 — Current Apple/Google policy review

**Purpose:** ensure release artifacts match current 2026 store requirements rather than remembered rules.

**Work:** check official current policies for privacy disclosure, camera/media permissions, account deletion, user-generated/private media, data safety/privacy nutrition labels, authentication and any external-link/import behavior; document results.

**Dependencies:** Audit #2.

**Acceptance criteria:** release checklist cites current official sources and maps each collected data/permission to disclosure and actual behavior.

**Verification:** documented policy matrix review.

**Complexity:** M.

## P9-02 — Release configuration and EAS environments

**Purpose:** make signed builds reproducible without committing secrets.

**Work:** EAS configuration, dev/preview/production environment separation, app identifiers/placeholders finalized with user-owned account data only when provided, build profiles, versioning.

**Dependencies:** P9-01.

**Acceptance criteria:** repository config is production-shaped; no credentials committed; unsigned/local or preview build checks pass where possible.

**Verification:** `expo config`, EAS config validation, preview build when user account/credentials permit.

**Complexity:** M.

## P9-03 — Release smoke test / beta readiness

**Purpose:** prove installable candidate performs the primary value action.

**Work:** real Android/iOS target smoke test as supported; auth/import/analyze/attempt/feedback/delete flow; crash/error visibility; rollback/hotfix procedure; beta audience and thresholds.

**Dependencies:** P9-02.

**Acceptance criteria:** no release-blocking policy/security issue; reproducible candidate; beta measures `section_completed` and retry/improvement; external store submission remains a separate explicit action.

**Verification:** device smoke checklist + release critical review.

**Complexity:** M.

---

# 3. Post-beta backlog — explicitly not implementation-plan work yet

Only reconsider after core beta data:
- real-time live coaching;
- social/community features;
- leaderboards/challenges;
- creator marketplace/monetization;
- automatic social publishing;
- multi-person/group choreography;
- learned choreography segmentation model;
- LLM copy rewriting for already-grounded corrections;
- push notifications;
- long-form/professional dance training;
- additional import adapters.

# 4. Stage 07 gate review

Consistency check:
- every Phase 0–4 task maps to an approved README/Product Spec behavior or required infrastructure/security boundary;
- device import is the first real vertical slice and avoids the unapproved arbitrary social-downloader risk;
- no migration or application code appears before planning gate;
- database/RLS work precedes real client data mutation;
- feedback remains deterministic and traceable in MVP;
- privacy deletion/security are not postponed until after release;
- no social/community scope has entered beta plan.

**Gate result: PASS.** The next eligible work is Phase 0 repository/tooling foundation, beginning with P0-01.
