# Dance AI — Architecture

Status: **Stage 05 architecture — FALLBACK gate review completed with gpt-5.6-sol**  
Inputs: `README.md`, `docs/PRODUCT_SPEC.md`, `docs/USER_FLOWS.md`  
Research snapshot: 2026-09-07

## 1. Architecture goals

1. Prove the core learning loop before broad features.
2. Keep private dance media and derived body-motion data private by default.
3. Keep CPU-heavy video/pose work outside the mobile client and outside Supabase Edge Functions.
4. Make the pose/model/compute host replaceable without rewriting user flows.
5. Use deterministic, explainable feedback in MVP rather than an LLM that invents coaching.
6. Bound media duration, storage, retries, and worker concurrency so beta costs are controllable.
7. Make every background operation idempotent and resumable from persisted state.

## 2. Chosen stack

### Mobile

- Expo / React Native / TypeScript.
- Expo SDK: scaffold from the current stable `create-expo-app` release; as of the research snapshot, current Expo docs expose SDK 57 package lines.
- Expo Router for file-based navigation and auth/app route groups.
- `expo-camera` for attempt recording.
- `expo-video` for reference/attempt playback.
- system media picker through the current Expo media-picker package selected at scaffold time.
- TanStack Query for remote/server state, retries, polling, and cache invalidation.
- React local state/context for transient UI and auth bootstrap; no separate global state library in MVP.
- `expo-secure-store`-backed native session adapter where compatible with current Supabase guidance; implementation must test token persistence/refresh on both supported mobile platforms.

### Backend/data

- Supabase Auth.
- Supabase Postgres.
- Supabase Storage with private buckets.
- Supabase Edge Functions for short trusted orchestration only: upload finalization, job enqueueing, safe URL-import validation/dispatch, deletion orchestration, and other operations requiring privileged mutation.
- Supabase migrations and pgTAP/RLS tests in repository.

### Analysis worker

- Separate containerized Python worker under `services/analysis-worker/`.
- Media decoding/normalization via FFmpeg invoked as a subprocess; OpenCV may be used only where needed for frame handling.
- MediaPipe Pose Landmarker in VIDEO mode as the initial replaceable pose backend.
- Deterministic temporal alignment/scoring/feedback pipeline implemented in Python.
- Worker connects using server-only Supabase credentials and claims persisted analysis jobs atomically.
- Production container host is intentionally provider-neutral at this stage. A hosting vendor is not required to build/test locally; choosing a paid production compute vendor is a later external decision.

## 3. Current official-source basis

Version-sensitive decisions were checked against current primary documentation:

- Expo Router: https://docs.expo.dev/router/introduction/ and https://docs.expo.dev/versions/latest/sdk/router/
- Expo Camera: https://docs.expo.dev/versions/latest/sdk/camera/
- Expo Video: https://docs.expo.dev/versions/latest/sdk/video/
- Supabase + Expo React Native: https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native
- Supabase React Native Auth: https://supabase.com/docs/guides/auth/quickstarts/react-native
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase resumable uploads: https://supabase.com/docs/guides/storage/uploads/resumable-uploads
- Supabase Storage limits: https://supabase.com/docs/guides/storage/uploads/file-limits
- Supabase Edge Function limits: https://supabase.com/docs/guides/functions/limits
- MediaPipe Pose Landmarker Python API: https://ai.google.dev/edge/api/mediapipe/python/mp/tasks/vision/PoseLandmarker and https://ai.google.dev/edge/api/mediapipe/python/mp/tasks/vision/PoseLandmarkerOptions

Key implications:

- Expo currently provides dedicated camera recording and video playback packages and Expo Router is the recommended file-based routing path for new Expo apps.
- Attempt recording does not need microphone data for pose comparison. Configure `expo-camera` with muted recording and disable Android audio recording permission (`recordAudioAndroid: false`) so MVP requests camera but not microphone.
- Supabase recommends resumable TUS uploads for files larger than 6 MB or unstable networks; dance videos therefore use TUS rather than ordinary multipart uploads.
- Supabase hosted Edge Functions have tight CPU limits, so frame decoding and pose inference must run in the external worker, not in an Edge Function.
- MediaPipe Pose Landmarker supports VIDEO mode, configurable single-pose detection, confidence thresholds, normalized landmarks, and world landmarks, which fits the initial single-primary-dancer MVP.

## 4. Repository structure

```text
/
├─ app/                         # Expo Router routes
│  ├─ _layout.tsx
│  ├─ (auth)/
│  └─ (app)/
├─ src/
│  ├─ components/               # reusable presentation components
│  ├─ features/
│  │  ├─ auth/
│  │  ├─ projects/
│  │  ├─ import/
│  │  ├─ practice/
│  │  ├─ attempts/
│  │  └─ settings/
│  ├─ lib/
│  │  ├─ supabase/
│  │  ├─ query/
│  │  ├─ config/
│  │  ├─ analytics/
│  │  └─ errors/
│  ├─ types/
│  └─ test/
├─ services/
│  └─ analysis-worker/
│     ├─ dance_ai_worker/
│     │  ├─ jobs/
│     │  ├─ media/
│     │  ├─ pose/
│     │  ├─ segmentation/
│     │  ├─ alignment/
│     │  ├─ scoring/
│     │  └─ feedback/
│     ├─ tests/
│     ├─ Dockerfile
│     └─ requirements.txt
├─ supabase/
│  ├─ migrations/
│  ├─ functions/
│  └─ tests/
├─ docs/
├─ .github/workflows/
├─ app.config.ts
├─ package.json
├─ tsconfig.json
└─ .env.example
```

The mobile app remains the root Node/Expo project; the Python worker is deliberately separate and does not introduce a JavaScript monorepo/workspace unless later evidence requires it.

## 5. Mobile navigation

Expo Router route groups:

```text
app/
├─ _layout.tsx                         # providers + auth bootstrap
├─ (auth)/
│  ├─ index.tsx                        # welcome
│  ├─ sign-in.tsx                      # email OTP
│  └─ verify.tsx                       # OTP verification
└─ (app)/
   ├─ _layout.tsx                      # authenticated stack
   ├─ index.tsx                        # projects
   ├─ new-dance.tsx
   ├─ project/[projectId]/index.tsx    # processing/detail resolver
   ├─ section/[sectionId]/learn.tsx
   ├─ section/[sectionId]/camera.tsx
   ├─ attempt/[attemptId]/review.tsx
   ├─ attempt/[attemptId]/status.tsx
   ├─ attempt/[attemptId]/feedback.tsx
   ├─ project/[projectId]/full.tsx
   └─ settings/index.tsx
```

Route guards depend on authoritative auth session state. UI must never treat route hiding as authorization; database/storage policies enforce data access.

## 6. State and data fetching

### Server state

Use TanStack Query for:
- current project list,
- project/section detail,
- attempt history/results,
- processing status polling,
- mutation invalidation and bounded retries.

Polling rules:
- only poll queued/processing resources while the relevant app screen/session is active,
- exponential/backoff or bounded interval (for example 2s → 5s → 10s),
- stop polling on terminal state,
- never enqueue new work merely because a GET/poll repeats.

### Local transient state

Use component state/context for:
- selected playback speed,
- mirror toggle,
- camera countdown,
- temporary local attempt URI before submission,
- upload progress,
- form inputs.

Do not persist raw camera recordings to a general local cache longer than needed.

## 7. Authentication/session lifecycle

MVP auth method: Supabase email OTP.

1. App boots configuration.
2. Supabase client initializes with publishable client key only.
3. Native session adapter restores persisted session.
4. App subscribes to auth state changes and refresh behavior.
5. Valid session enters `(app)` routes.
6. Missing/expired session enters `(auth)` routes.
7. Sign-out clears user-scoped query caches and temporary media references.

`EXPO_PUBLIC_SUPABASE_URL` and the Supabase publishable client key may exist in the client bundle; they are not authorization boundaries. RLS/grants/storage policies are the authorization boundary.

The Supabase `service_role` key is forbidden in Expo environment variables and client code.

## 8. Media limits and upload strategy

Initial beta configuration defaults:

- reference source: <= 60 seconds,
- source file: <= 50 MB,
- attempt capture: section duration + <= 2 seconds bounded lead-in/out,
- attempt file: <= 25 MB,
- accepted source MIME types: a deliberately narrow video allowlist finalized during implementation after device tests.

Why 50 MB initially: it supports common short-form clips, bounds processing cost, and fits Supabase Free-plan global maximum from the current Storage limits documentation. Higher limits are a later configuration/product decision, not an architecture rewrite.

Uploads:
- TUS resumable upload for reference videos and attempts.
- object paths include authenticated user UUID and immutable project/attempt UUID.
- no `upsert` for immutable source/attempt objects.
- upload completion is not trusted from client state alone; a trusted finalizer verifies object existence/metadata before queueing analysis.

## 9. Storage buckets

All MVP buckets are private.

1. `dance-sources`
   - user reference videos.
   - authenticated owner may upload/read own objects according to object path/RLS.
   - worker may read using service credentials.

2. `dance-attempts`
   - user camera attempt videos.
   - same ownership model.

3. `analysis-artifacts`
   - pose sequences, normalized worker artifacts, optional diagnostic JSON.
   - service-only; no authenticated client policies in MVP.

The client receives source/attempt playback access through authenticated Storage access or short-lived signed URLs permitted by RLS. Never make buckets public to simplify playback.

Storage deletes go through Supabase Storage API rather than manually deleting `storage.objects` metadata.

## 10. Background job architecture

### Job types

- `reference_analysis`
- `attempt_analysis`
- `storage_cleanup`
- optional later `url_import`

### Job lifecycle

`queued → claimed → processing → succeeded | failed_retryable | failed_terminal`

Each job has:
- immutable ID,
- owner/project/attempt reference as applicable,
- idempotency key,
- attempt count,
- lease/claimed timestamp,
- next retry time,
- error category,
- worker/model/scoring versions,
- timestamps.

### Claiming

Worker must claim jobs atomically through a database function/RPC that uses row locking (`FOR UPDATE SKIP LOCKED` or equivalent safe pattern). Execute privilege is service-only. Lease expiration permits recovery if a worker dies.

### Retries

- retry only recognized transient categories,
- exponential backoff with maximum attempts,
- every processing stage writes output under immutable/versioned identifiers,
- repeated finalization or retry cannot duplicate the active section set or count one attempt twice.

## 11. Trusted orchestration boundary

Supabase Edge Functions may:
- validate caller JWT,
- verify project/attempt ownership,
- verify uploaded object metadata/path,
- transition a client-created upload placeholder to `queued`,
- insert trusted job rows,
- initiate project/account deletion workflow,
- perform tightly controlled URL-import validation/dispatch.

They may not:
- decode video frames,
- run pose inference,
- compute DTW/scoring over full clips,
- hold open long CPU-heavy requests.

## 12. Reference analysis pipeline

Initial pipeline:

1. Download source from private storage to worker temp space.
2. Verify media independently of client metadata.
3. FFmpeg normalize rotation/container and derive bounded analysis stream.
4. Decode at a bounded sampling rate (initial target 12–15 fps; configurable/versioned).
5. Run MediaPipe Pose Landmarker in VIDEO mode with `num_poses=1`.
6. Reject/flag intervals with insufficient body visibility/tracking confidence.
7. Discard face-specific landmark values from persisted coaching artifacts; retain only body landmarks required for torso/limb analysis.
8. Normalize pose representation for translation/scale using torso anchors; preserve enough orientation metadata for intentional mirror transforms.
9. Smooth high-frequency landmark jitter with a documented deterministic filter.
10. Derive motion velocity/energy curve.
11. Segment at plausible low-motion/change boundaries subject to min/max section duration.
12. If tracking remains usable but segmentation confidence is low, fall back to bounded equal-duration sections and mark `segmentation_confidence=low`.
13. Persist artifact metadata and ordered section timeline.
14. Mark project ready atomically with its active `analysis_version`.

The segmentation heuristic is intentionally simple and replaceable. A learned choreography segmentation model is not required to validate the product.

## 13. Attempt comparison pipeline

1. Normalize attempt media using same pipeline/version family as reference.
2. Produce body landmark sequence.
3. Apply orientation/mirror transform explicitly based on practice setting and camera capture semantics.
4. Confidence gate body visibility/tracking.
5. Normalize scale/translation.
6. Align reference and attempt sequences using Dynamic Time Warping (DTW) over a reduced pose feature vector.
7. Compute component metrics:
   - temporal lead/lag and local timing error,
   - upper-limb direction/joint-angle error,
   - lower-limb direction/joint-angle error,
   - torso orientation/lean error where confidently observable.
8. Convert normalized errors to versioned 0–100 product scores.
9. Persist score and confidence separately.
10. Generate deterministic correction candidates from the largest high-confidence component errors.
11. Return 1–3 prioritized corrections and retry/completion state.

MVP feedback does **not** use a generative model. This avoids hallucinated body instructions, external AI spend, and sending motion data to another vendor. An LLM can later rewrite already-grounded correction facts only if product evidence justifies it.

## 14. Feedback safety/precision

Feedback rules:
- never infer injury, disability, sex/gender, age, identity, weight, health, or other sensitive traits,
- never claim centimeter/degree precision unless calibrated measurement supports it,
- phrase camera-relative/reference-relative differences rather than medical biomechanics,
- if confidence is low, issue capture guidance instead of precise correction,
- correction must carry `metric_key`, `phase/timestamp range`, `confidence`, and `rule_version` so text is traceable.

Example deterministic fact:
`right_wrist_vertical_offset = -0.18 torso_units during final 35%` → `Your right arm stays lower than the reference near the end.`

## 15. URL import security boundary

Direct device upload is the first vertical slice and mandatory beta path.

URL import is implemented only through explicit source adapters/allowlists. Generic arbitrary URL fetching is forbidden because of SSRF, access-control, copyright, and unbounded download risks.

A permitted adapter must enforce:
- HTTPS only,
- source-specific allowlisted hosts,
- no embedded credentials,
- redirect limit and revalidation after every redirect,
- private/reserved IP and localhost rejection after DNS resolution,
- bounded content length and streaming abort,
- video MIME/signature validation,
- no cookies/session scraping from the user,
- no DRM/access-control bypass,
- documented source terms/authorization basis.

Until an adapter satisfies these checks, UI should guide users to import a device video instead.

## 16. Authorization model

Mobile client:
- authenticated JWT only,
- direct reads/writes only where explicit grants + RLS permit,
- cannot create/modify trusted job states, analysis outputs, score versions, ownership IDs of existing resources, or cleanup system state.

Worker/Edge Functions:
- service credentials only in trusted server environment,
- validate ownership before privileged actions initiated by a user,
- privileged SQL/RPC functions revoke execute from `public`, `anon`, and `authenticated` unless intentionally exposed.

Database policy details live in `docs/DATABASE.md`.

## 17. Error model

Public/mobile error categories:
- `network_unavailable`
- `permission_denied`
- `unsupported_media`
- `media_too_large`
- `media_too_long`
- `upload_failed`
- `analysis_low_confidence`
- `analysis_retryable`
- `analysis_unsupported`
- `service_unavailable`
- `unauthorized`
- `unknown`

Raw worker exceptions, SQL errors, object paths, tokens, stack traces, and third-party internals never render directly in the UI.

Errors carry a correlation ID for server/worker diagnosis.

## 18. Observability

MVP repository-local baseline:
- structured JSON logs in Edge Functions and worker,
- correlation IDs from finalization/job through worker completion,
- `job_events` or equivalent persisted state transitions for operational diagnosis,
- privacy-safe product events for the core funnel,
- no raw video, frames, body keypoints, email, or signed URLs in analytics/log messages.

A commercial crash/observability vendor is not selected yet; the architecture exposes a `Telemetry` interface so one can be added before external beta without changing feature code. Selecting a paid external vendor requires explicit approval if it creates spend.

## 19. Analytics

Track the approved funnel using a small internal event abstraction:

`project_created → analysis_ready → first_section_opened → first_attempt_submitted → feedback_viewed → retry_submitted → section_completed`

Events include pseudonymous user UUID/project UUID when needed, app version, platform, event version, and non-sensitive timing/error metadata.

The first implementation may persist events to a restricted Supabase table; analytics vendor export is post-foundation and optional.

## 20. Privacy and retention

- All user media private.
- Attempt audio disabled; microphone permission is not requested in MVP.
- Worker temp files deleted in `finally`/cleanup paths after processing.
- Derived pose artifacts contain only required body landmarks; face-specific landmarks are dropped before persistence.
- Project deletion immediately makes records inaccessible to the user and queues physical object cleanup.
- Cleanup failures are persisted and retried.
- Exact production retention windows are defined in `DATABASE.md` and privacy policy before beta.
- Logs/analytics never become a shadow copy of body/video data.

## 21. Configuration and secrets

Client-visible:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Server/worker only:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- worker model path/checksum/configuration
- any future vendor credentials

Use `.env.example` with names and descriptions only. `.env*` secrets are ignored by git. Runtime config validation fails fast with a safe message.

## 22. Testing strategy

### Mobile
- TypeScript strict typecheck.
- ESLint.
- Jest + React Native Testing Library for UI/state behavior.
- unit tests for error mapping, score display/version compatibility, permission state handling, orientation/mirror transforms.
- integration tests with mocked network only for UI adapter behavior; vertical slice must still be tested against real Supabase locally/test project.

### Database/Supabase
- migrations from clean database.
- pgTAP/RLS allow-and-deny tests for every client-exposed table and Storage policy.
- Edge Function tests for ownership, idempotency, invalid upload path, unauthorized job enqueue, URL adapter rejection.

### Worker
- pytest.
- fixed tiny licensed/test fixture videos committed only if redistribution is allowed; otherwise deterministic synthetic landmark fixtures.
- unit tests for normalization, DTW, segmentation invariants, scoring monotonicity, confidence gating, deterministic feedback.
- integration test from fixture video → pose artifact → sections and attempt → result.

### End-to-end
First mandatory vertical slice:
`email auth → upload device reference → real background analysis → open first section → record/submit attempt → real comparison → feedback → retry/progress persisted`.

No hidden production-critical mock qualifies for the Stage 10 gate.

## 23. CI/CD

GitHub Actions baseline:
- Node install from lockfile,
- lint,
- typecheck,
- mobile unit tests,
- Expo config/export/build sanity command that can run without signing,
- Python dependency install + pytest,
- worker static checks selected during Phase 0,
- Supabase migration/RLS tests when local CLI/Docker runner is available.

Deployment boundaries:
- mobile build: EAS/Expo account integration later; no store submission without user authorization,
- Supabase: migrations/functions deployed from reviewed repository state,
- worker: OCI/Docker image with immutable version tag; production host chosen later.

## 24. Performance assumptions

Beta targets, not guarantees:
- app shell interactive without waiting for analysis worker,
- section playback starts promptly from private storage on normal mobile connection,
- attempt upload progress visible,
- background processing may take tens of seconds; UI is asynchronous and resumable,
- reference videos capped at 60 seconds to control decode/inference time,
- worker processes bounded frame rate/resolution rather than original 4K frames,
- concurrency is server-configured and defaults conservatively.

## 25. Deliberate non-decisions

These are not blockers for repository-local development:
- production analysis-worker hosting vendor,
- commercial crash analytics vendor,
- direct TikTok/Instagram import adapters,
- paid AI/LLM vendor,
- final pricing/business model.

They become human/external decisions only when implementation would create spend, contractual obligations, credentials, or policy exposure.

## 26. Architecture gate review — FALLBACK

Preferred reviewer per `docs/MODEL_ROUTING.md`: `gpt-6-astra`.  
Actual reviewer available in this session: `gpt-5.6-sol`.  
Gate label: **FALLBACK**.

Independent review focus: data privacy, trusted boundaries, CPU placement, URL import, idempotency, mobile permissions, testability.

Findings resolved in this document:
- **P1 risk: heavy pose inference in Edge Functions** → explicitly moved to external container worker because current hosted Edge Function CPU limits are unsuitable.
- **P1 risk: arbitrary URL fetch/SSRF and platform bypass** → generic URL downloader forbidden; allowlisted adapter contract defined; device upload is first vertical slice.
- **P1 risk: client tampering with scores/jobs** → trusted fields/job creation restricted to worker/Edge Function/service boundary.
- **P1 risk: private video exposure** → all Storage buckets private; authenticated/RLS or short-lived authorized access only.
- **P2 privacy: unnecessary microphone/audio collection** → attempt recording muted; Android recording-audio permission disabled; no microphone requirement in MVP.
- **P2 correctness: score drift across algorithm versions** → scoring/model versions required and personal-best comparison constrained to compatible versions.
- **P2 reliability: worker crash/duplicate processing** → persisted jobs, atomic claim/lease, idempotency keys, immutable outputs and bounded retries required.

Unresolved P0/P1 findings: **none identified in the architecture scope**.

Stage 05 gate result: **FALLBACK PASS**. Proceed to database/authorization design.
