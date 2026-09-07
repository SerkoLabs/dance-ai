# Dance AI — Decisions

Material product/architecture decisions are recorded here so later agents do not reopen settled routine choices without new evidence.

## D-001 — Device video is the first import path

**Decision:** The first vertical slice uses a video selected from the user's device. Link import is implemented only after a lawful, source-specific adapter is reviewed.

**Why:** The product promise can be validated without building a generic social-video downloader. Arbitrary URL fetching would create SSRF, access-control, copyright/platform-policy, redirect, and unbounded-download risk before the core learning loop is proven.

**Consequence:** Link UI may exist as disabled/unsupported until an approved adapter exists; the core beta is not blocked by link import unless the product scope is later changed explicitly.

## D-002 — Heavy video/pose analysis runs in a separate Python worker

**Decision:** Supabase Edge Functions orchestrate short trusted operations only. FFmpeg decoding, MediaPipe pose inference, temporal alignment, segmentation, and scoring run in a containerized Python worker.

**Why:** Video/pose processing is CPU-heavy and should be independently scalable/replaceable; current hosted Edge Function CPU limits are unsuitable for this workload.

**Consequence:** A production worker hosting provider remains an external deployment decision, but repository-local worker implementation/testing does not depend on choosing one.

## D-003 — Deterministic feedback before generative AI

**Decision:** MVP coaching text is generated from deterministic scored movement facts/rules rather than an LLM.

**Why:** This keeps feedback traceable, avoids hallucinated corrections, avoids sending motion data to another vendor, and avoids AI inference spend before product value is validated.

**Consequence:** A future LLM may rewrite already-grounded correction facts only after beta evidence and privacy/cost review.

## D-004 — Single primary dancer only in MVP

**Decision:** Initial pose pipeline tracks one primary dancer and may reject/low-confidence group, occluded, fast-cut, or ambiguous videos.

**Why:** Multi-person tracking substantially increases comparison and segmentation complexity without being required to test the primary value proposition.

## D-005 — Attempt audio is not collected

**Decision:** Camera attempts are recorded muted and Android audio recording permission is disabled.

**Why:** Audio is not required for body-pose comparison and would increase privacy/permission surface.

## D-006 — Client cannot directly mutate trusted product state

**Decision:** Mobile authenticated users receive owner-scoped SELECT on product result tables and narrowly scoped Storage upload/read permissions, but core project/job/status/score/progress mutations are performed by trusted Edge Functions/worker code.

**Why:** Prevent clients from forging ownership, scores, progress, job state, or deletion state.

## D-007 — All dance media is private

**Decision:** Source videos, attempt videos, and analysis artifacts use private Supabase Storage buckets. Analysis artifacts are service-only.

**Why:** User camera recordings and derived body-motion data are private by product design.

## D-008 — Version every analysis/scoring output

**Decision:** Reference analyses, attempt analyses, scores and feedback rules carry version identifiers; personal-best comparison requires compatible scoring versions.

**Why:** Algorithm changes must not silently invalidate historical comparisons.

## D-009 — Initial beta media limits

**Decision:** Initial architecture targets reference videos <= 60 seconds and <= 50 MB, attempt recordings <= 25 MB and bounded to the selected section plus small lead-in/out.

**Why:** These limits fit the viral-short-video use case and bound upload/storage/compute cost. They are configuration, not hard-coded product assumptions.

## D-010 — No social/community layer in MVP

**Decision:** No feed, followers, comments, rankings, challenges, marketplace, or automatic social publishing before beta evidence.

**Why:** They do not prove the core value action: learn one imported choreography section and improve through feedback.

## D-011 — Passwordless email OTP is the first authentication flow

**Decision:** The first mobile authentication flow uses `signInWithOtp` plus user-entered email OTP verification rather than a magic-link/deep-link dependency.

**Why:** It satisfies the approved user flow while keeping the first vertical slice independent of mobile deep-link configuration. Supabase documents `{{ .Token }}` email templates and `verifyOtp({ email, token, type: 'email' })` for this flow.

**Evidence reviewed:**
- https://supabase.com/docs/reference/javascript/auth-signinwithotp
- https://supabase.com/docs/reference/javascript/auth-verifyotp
- https://supabase.com/docs/guides/auth/auth-email-templates

**Consequence:** A real Supabase project must configure the auth email template to deliver an OTP before the Phase 2 auth gate can pass.

## D-012 — Native auth session data uses chunked Expo SecureStore

**Decision:** Native Supabase Auth session persistence uses Expo SecureStore. Values are split into bounded UTF-8 chunks with an atomic manifest swap so JWT/session payloads are not forced into a single SecureStore value. Web fallback uses AsyncStorage.

**Why:** Current Supabase Expo guidance demonstrates SecureStore on native but explicitly warns that a single value over roughly 2 KB may fail. Chunking preserves the approved secure-storage boundary without adding an encryption dependency solely to work around the per-value limit.

**Evidence reviewed:**
- https://supabase.com/docs/guides/auth/quickstarts/with-expo-react-native-social-auth
- https://supabase.com/docs/reference/javascript/initializing
- Supabase official Expo social-auth example `lib/supabase.ts`, reviewed at commit `c2ebfebb39ef6c9579c6a30abbf64221e00675a1`.

**Consequence:** Device-level persistence still requires real iOS/Android restart testing before release. User-scoped TanStack Query cache is cleared on identity change/sign-out.

## D-013 — Storage size limits now; exact MIME allowlist after device compatibility evidence

**Decision:** Phase 2 creates all three buckets as private and applies source/attempt size limits plus strict owner-prefix policies. `allowed_mime_types` remains unset until Phase 3 real-device picker/recorder tests establish the exact iOS/Android formats that the worker can decode reliably.

**Why:** Supabase supports bucket-level MIME restrictions, but prematurely guessing the platform MIME set can block valid device media. File type/container remains untrusted input and must be validated by trusted finalization/worker code.

**Evidence reviewed:**
- https://supabase.com/docs/guides/storage/buckets/creating-buckets
- https://supabase.com/docs/guides/storage/schema/helper-functions
- https://supabase.com/docs/guides/storage/schema/design

**Consequence:** MIME restriction must be tightened in a reviewed migration before release after the Phase 3 device matrix is known.
