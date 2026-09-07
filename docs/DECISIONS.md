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
