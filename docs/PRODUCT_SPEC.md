# Dance AI — Product Specification

Status: **Stage 03 planning artifact**  
Source of truth: `README.md`

## 1. Product objective

Dance AI turns a user-selected dance reference video into a structured practice lesson. The minimum valuable outcome is: **the learner completes one choreography section, receives understandable feedback, retries, and measurably improves.**

## 2. Primary user

A beginner or casual mobile dancer who discovers choreography on short-form social media or in a music video and wants to reproduce it without a human instructor.

## 3. Product principles

1. Teach, do not merely replay.
2. Prioritize one actionable correction over many weak observations.
3. Compare change across the user's own attempts, not only absolute similarity.
4. Surface uncertainty instead of pretending low-confidence analysis is precise.
5. Treat source videos, camera recordings, pose data, and feedback as private by default.
6. Do not bypass third-party platform restrictions to obtain media.

## 4. MVP feature inventory

### F01 — First run and authentication

**User goal:** enter the app with minimal friction and obtain a private data boundary.

**Trigger:** first app launch or expired session.

**Preconditions:** network required for initial cloud authentication.

**Happy path:**
1. User sees a short value statement and privacy/camera explanation.
2. User signs in using supported Supabase Auth email OTP/magic-link flow.
3. Session is stored using the platform-appropriate secure/session mechanism supported by the chosen Expo/Supabase integration.
4. User lands on the Projects screen.

**Alternate paths:** existing valid session skips sign-in; expired session requests re-authentication.

**Validation:** syntactically valid email; auth response handled without revealing whether unrelated accounts exist beyond provider behavior.

**Permissions:** no camera/media permission is requested during onboarding. Ask just-in-time when a feature needs it.

**Loading/empty/error:** auth button disables while submitting; network/provider errors show retry; deep-link completion failure offers resend/retry.

**Offline/degraded:** existing session may open cached shell, but cloud-dependent actions are disabled until connectivity returns.

**Analytics:** `auth_started`, `auth_completed`, `auth_failed` with non-sensitive reason category.

**Acceptance criteria:**
- A new user can authenticate and reach Projects.
- An authenticated returning user does not have to sign in on every launch while the session remains valid.
- No service-role or privileged secret is present in client code.
- Auth failure never crashes the app.

**Out of scope:** password login, social OAuth, organization accounts, multi-profile accounts.

---

### F02 — Create project from reference media

**User goal:** bring a choreography into Dance AI.

**Trigger:** tap `New dance`.

**Preconditions:** authenticated user; network available for processing.

**Inputs:**
- device video chosen through the system media picker; or
- public URL from a source explicitly supported by the importer without bypassing access controls.

**Happy path — device media:**
1. User selects a video.
2. App validates type, duration, size, and basic readability.
3. App shows preview and asks user to confirm.
4. App creates a private project and uploads the source.
5. Processing job starts.

**Happy path — supported URL:**
1. User pastes URL.
2. Server validates host/format and checks that the integration is permitted to access the media.
3. If supported, project is created and processing starts.

**Alternate paths:** unsupported URL instructs user to use a legally obtained device video instead; invalid video can be reselected.

**Validation:** exact limits are configuration values documented in architecture; reject non-video types, empty media, corrupt media, over-limit duration/size, or obvious unsupported codecs with a user-readable reason.

**Permissions:** media-library access is requested only when choosing device media and only at the minimum OS permission level required.

**Loading:** upload progress and resumable/retry state when supported.

**Error/retry:** interrupted upload can be retried; failed project creation must not leave a visible project pointing to missing source data.

**Analytics:** `project_create_started`, `source_validation_failed`, `source_upload_completed`, `project_created`.

**Acceptance criteria:**
- User can create a private project from a supported device video.
- Unsupported input fails before paid/heavy processing begins when detectable.
- URL import never implements scraping or access-control bypass.
- Another authenticated user cannot read the project or source media.

**Out of scope:** bulk imports, playlists, automatic social-account crawling.

---

### F03 — Reference processing and choreography segmentation

**User goal:** receive a learnable sequence rather than one long video.

**Trigger:** successful project creation.

**Preconditions:** source is stored privately and job is queued.

**Happy path:**
1. Worker normalizes the source for analysis.
2. Worker identifies a primary dancer or returns low-confidence/unsupported.
3. Worker derives a time-aligned pose representation.
4. Worker identifies motion/change boundaries and produces short ordered sections.
5. Worker stores section metadata and confidence.
6. Project becomes `ready`.

**Section requirements:** ordered, non-overlapping timeline ranges; each references the original source; target section length is usually a few seconds but may adapt to movement boundaries; no section may have end <= start.

**Alternate paths:** if automatic segmentation confidence is insufficient, MVP may fall back to evenly sized short sections only when pose tracking is still usable and the UI labels the result as approximate.

**Error/retry:** processing states are `queued`, `processing`, `ready`, `failed`; retry is idempotent and cannot create duplicate active section sets.

**Analytics:** `analysis_started`, `analysis_ready`, `analysis_failed`, processing duration, failure category, section count. Do not log raw pose/video content.

**Acceptance criteria:**
- A successful analysis produces at least one ordered practice section.
- Each ready section has reference timing and pose data sufficient for attempt comparison.
- A failed analysis has a user-readable reason category and retry when appropriate.
- Re-running the same processing attempt does not duplicate persisted sections.

**Out of scope:** identifying dance style/name, recognizing a celebrity, automatically licensing music, group choreography tracking.

---

### F04 — Analysis progress and recovery

**User goal:** understand what is happening while processing may take time.

**Trigger:** open a project that is not ready.

**Happy path:** app displays persistent project state and periodically refreshes/polls using bounded intervals or subscribes to safe status updates.

**States:** queued, processing, failed-retryable, failed-unsupported, ready.

**Offline/degraded:** cached last-known state remains visible; refresh waits for connectivity.

**Acceptance criteria:**
- User can leave and reopen the app without losing the project state.
- Processing UI never promises a fabricated exact completion time.
- Retry cannot be tapped repeatedly to create parallel duplicate jobs.

---

### F05 — Learn a choreography section

**User goal:** understand one small movement sequence before attempting it.

**Trigger:** tap a ready section.

**Preconditions:** project ready; source playback available.

**Happy path:**
1. Section loops over its own timeline range.
2. User can choose 1.0x, 0.75x, or 0.5x playback.
3. User can toggle mirrored practice view.
4. User proceeds to `Try it` when ready.

**Loading/error:** video loading has retry and does not lose the section selection.

**Acceptance criteria:**
- Playback is constrained to the section range within practical player tolerance.
- Speed and mirror controls visibly affect practice playback.
- Playback controls do not modify the stored reference analysis coordinates; comparison code applies the same orientation transform deliberately.

**Out of scope:** frame-by-frame drawing tools, manual keyframe editing.

---

### F06 — Record an attempt

**User goal:** perform the current section for evaluation.

**Trigger:** tap `Try it`.

**Preconditions:** camera permission; enough local temporary storage; section ready.

**Happy path:**
1. Just-in-time camera permission request if needed.
2. User sees framing guidance and current section duration.
3. Optional short countdown.
4. App records only the required practice interval plus bounded lead-in/out.
5. User can preview, discard, or submit.
6. Submitted attempt uploads privately and enters analysis.

**Permission denied:** explain why camera is needed; allow opening system settings where supported; user can return to learning without camera.

**Validation:** reject zero-length or clearly incomplete/corrupt capture; enforce configured duration/size limits.

**Privacy:** recording begins only after explicit user action and visible capture state.

**Acceptance criteria:**
- Camera is never recording before the user starts an attempt.
- Denied permission does not crash or dead-end the project.
- User can discard an attempt before upload.
- Submitted attempt belongs only to the current authenticated user/project/section.

**Out of scope:** background recording, real-time coaching during capture, recording other users without device-level indication.

---

### F07 — Attempt analysis and temporal comparison

**User goal:** know how closely the attempt matches the reference and where it diverges.

**Trigger:** submitted attempt upload completes.

**Preconditions:** reference pose data exists.

**Happy path:**
1. Worker derives pose sequence for the user attempt.
2. Sequences are normalized for scale/orientation where defensible.
3. Attempt is temporally aligned to the reference.
4. System calculates interpretable component errors such as limb/torso positional deviation and timing offset.
5. System calculates an overall progress score plus confidence.
6. Derived metrics are persisted; raw intermediate data is retained only as documented by data policy.

**Low confidence:** if body tracking or alignment confidence is below threshold, do not issue precise anatomical corrections; return framing/visibility guidance and request another attempt.

**Error/retry:** retry is idempotent; failed analysis preserves the uploaded attempt until retry/deletion policy applies.

**Acceptance criteria:**
- Comparison uses multiple time points, not a single static pose.
- A result cannot be `completed` without both reference and attempt analysis versions.
- Low-confidence analysis cannot masquerade as a high-precision score.
- Another user cannot access attempt video or derived metrics.

---

### F08 — Actionable coaching feedback

**User goal:** receive a small number of corrections they can act on immediately.

**Trigger:** attempt comparison completes successfully.

**Happy path:**
1. Rank detected differences by confidence and likely learning impact.
2. Return 1–3 corrections.
3. Each correction identifies the movement region/phase and the direction of change in plain language.
4. Show overall score, timing subscore, movement subscore, confidence, and comparison to the user's prior best where available.
5. Primary CTA is `Try again`.

**Feedback constraints:** no diagnosis, injury claim, or biomechanical safety guarantee; avoid false physical precision (e.g., centimeters/degrees) unless measurement calibration supports it; never infer protected/sensitive personal attributes.

**Examples of acceptable language:** `Your right arm stays lower than the reference during the second half.` `You start the turn early; wait slightly longer before rotating.`

**Acceptance criteria:**
- Successful feedback has at least one actionable correction unless the attempt is already within completion threshold.
- Feedback statements are traceable to persisted comparison metrics/rules and confidence.
- The UI clearly distinguishes low-confidence results.
- The app does not show only an unexplained percentage.

---

### F09 — Retry, personal best, and section completion

**User goal:** see improvement and know when to move on.

**Trigger:** feedback result screen.

**Happy path:**
1. User retries the same section.
2. Attempt number and score history are retained.
3. Best score is updated only by a successfully analyzed attempt.
4. Section completes when configured score/confidence requirements are met, or the user explicitly chooses `Move on anyway` after at least one analyzed attempt.
5. Next section becomes the primary CTA.

**Acceptance criteria:**
- Failed/incomplete attempts cannot overwrite personal best.
- Progress is based only on the current analysis scoring version or is explicitly migrated/recomputed when scoring changes.
- User can inspect at least recent attempt scores for the current section.

---

### F10 — Full choreography practice

**User goal:** combine learned sections and dance the reference from start to finish.

**Trigger:** all sections are completed or user chooses full practice after completing at least one section.

**Happy path:** play the full reference with selected mirror setting and normal-speed default; provide a simple start/countdown and optional final attempt recording.

**MVP scoring:** final recording may be analyzed using the same section pipeline and aggregated; if full-length processing is not yet reliable, full practice still functions as guided playback and does not fabricate a final score.

**Acceptance criteria:**
- Full practice uses the same reference project and ordered section timeline.
- If an aggregate score is shown, every included section result must be valid and version-compatible.

---

### F11 — Projects, deletion, and privacy controls

**User goal:** resume learning and control stored data.

**Projects screen:** shows own projects only, latest state, section progress, and last activity.

**Delete project:** requires confirmation; removes access immediately and schedules/deletes related source video, attempts, derived pose artifacts, sections, and feedback according to database/storage deletion design.

**Delete account:** available in-app; requires confirmation/re-authentication as appropriate; disables account access and initiates deletion of user-owned project/media/derived data according to retention policy.

**Acceptance criteria:**
- User never sees another user's project in list or detail APIs.
- Project deletion is idempotent.
- Account deletion has a repository-defined cascade/cleanup strategy and is testable.
- Storage cleanup failure is observable and retryable rather than silently leaving orphaned private media forever.

**Out of scope:** shared projects, public profiles, community publishing.

## 5. Cross-cutting states

### Loading
Every network/processing screen has an explicit non-blocking loading state; duplicate destructive or paid/heavy actions are disabled while in flight.

### Empty
Projects has an empty state explaining `Add a dance`; a project with zero usable sections is never marked ready.

### Network loss
Read-only cached shell/state may remain visible. Upload, auth refresh, attempt submission, and cloud analysis actions show offline state and retry after reconnection. MVP does not promise fully offline analysis.

### Errors
User-facing errors use categories (network, permission, unsupported media, processing, service unavailable) rather than raw backend messages or stack traces.

### Accessibility
Controls have accessible labels, touch targets, focus/contrast support, and do not rely on color alone for score/feedback status. Motion-heavy screens respect reduced-motion settings for non-essential animations where practical.

## 6. Data classification

- **Private sensitive-ish media:** source dance uploads when user-provided, user camera attempt videos.
- **Private derived:** pose sequences, normalized keypoints, alignment data, scores, feedback, progress.
- **Private account:** user ID, email/auth metadata.
- **Operational:** job state, error categories, analysis/model versions.
- **Analytics:** pseudonymous event metadata only; no raw video frames, body keypoints, email addresses, or free-form sensitive content in analytics payloads.

No project data is public in MVP.

## 7. Scoring semantics

- Store `analysis_version` and `scoring_version` with generated outputs.
- Overall score is a product metric, not a medical/biomechanical measurement.
- Personal-best comparisons require compatible scoring versions.
- Confidence must be stored separately from score.
- Completion thresholds are server-controlled configuration, not trusted from the client.

## 8. Beta measurement

Primary funnel:
`project_created → analysis_ready → first_section_opened → first_attempt_submitted → feedback_viewed → retry_submitted → section_completed`

Primary quality measures:
- supported-media processing success rate,
- median processing duration,
- first-attempt-to-retry rate,
- section completion rate,
- median score improvement between first valid attempt and best valid retry,
- low-confidence result rate,
- crash-free sessions.

## 9. MVP scope guard

The following may be designed for future extension but must not be implemented as production features before beta evidence: social feed, followers, public sharing, creator monetization, leaderboards, challenges, live coaching, real-time per-frame voice correction, professional biomechanics, automatic social scraping, and proprietary model training.
