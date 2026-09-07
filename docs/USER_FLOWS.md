# Dance AI — User Flows

Status: **Stage 04 planning artifact**  
Inputs: `README.md`, `docs/PRODUCT_SPEC.md`

## Navigation map

- Auth Stack
  - Welcome
  - Email Sign-in
  - Auth Link/OTP Completion
- App Stack
  - Projects
  - New Dance
  - Project Processing
  - Project Detail / Sections
  - Section Learn
  - Attempt Camera
  - Attempt Review
  - Attempt Processing
  - Feedback
  - Full Practice
  - Settings
  - Delete Account

No social/community screens exist in MVP.

---

## UF-01 — First launch and authentication

**Start:** app launched with no valid session.

1. App initializes configuration.
2. If configuration fails → show startup error with retry; do not enter a broken app shell.
3. Show Welcome with product promise and `Continue with email`.
4. User enters email.
5. Invalid email → inline validation, remain on screen.
6. Submit → loading state.
7. Network/auth error → non-sensitive error + retry.
8. Auth provider accepts request → show `Check your email`/OTP state.
9. User completes valid auth link/OTP.
10. Session is established.
11. Navigate to Projects.

**Returning user branch:** valid persisted session → Projects directly.

**Expired session branch:** refresh fails → return to Auth Stack without deleting local cached UI state unnecessarily.

**Terminal outcome:** authenticated Projects screen.

---

## UF-02 — Empty projects → create first dance from device video

**Start:** authenticated user on Projects with zero projects.

1. Empty state explains the core action and shows `Add a dance`.
2. Tap `Add a dance` → New Dance.
3. Choose `From device`.
4. App requests minimum media permission only if platform picker requires it.
5. Permission denied → explain and offer retry/settings where applicable; `Back` remains available.
6. User selects video.
7. Local validation runs.
8. Unsupported/corrupt/too-large media → show reason, `Choose another`.
9. Valid media → preview + `Analyze this dance`.
10. Confirm → create project record + signed/private upload path.
11. Upload progress shown.
12. Upload failure → retry/cancel; retry must not create duplicate projects.
13. Upload complete → processing job requested.
14. Navigate to Project Processing.

**Terminal outcome:** project exists in queued/processing state.

---

## UF-03 — Create dance from URL

**Start:** New Dance.

1. Choose `From link`.
2. Paste URL.
3. Client performs basic URL format validation only.
4. Submit URL to server-side importer validation.
5. Unsupported host/restricted media/not legally retrievable → explain `This link cannot be imported`; offer `Choose a video from your device`.
6. Supported source → create private project and start import/processing.
7. Navigate to Project Processing.

**Recovery:** network failure keeps entered URL locally for retry.

**Terminal outcome:** queued/processing project or safe unsupported state.

---

## UF-04 — Processing project

**Start:** open a project in `queued` or `processing`.

1. Show source thumbnail/metadata if safe and available.
2. Show state text (`Preparing video`, `Analyzing movement`, `Building lesson`) without fabricated exact ETA.
3. App refreshes bounded job status.
4. User may leave; project remains persisted.
5. Reopen app/project → latest server state is fetched.
6. Network offline → show cached last state + offline banner.
7. Retryable processing failure → show failure category + `Retry analysis`.
8. Retry action is disabled while request is in flight and backend enforces idempotency.
9. Unsupported/low-quality terminal failure → explain why and offer `Use another video` or delete project.
10. Ready → navigate/show Project Detail with ordered sections.

**Terminal outcomes:** ready, retryable failed, terminal unsupported, deleted.

---

## UF-05 — Learn first section

**Start:** Project Detail for a ready project.

1. Show ordered sections with states: not started, practicing, complete.
2. Tap first incomplete section.
3. Section Learn loads bounded reference clip.
4. Loading failure → retry without losing section.
5. Clip loops.
6. User changes speed among 1.0x / 0.75x / 0.5x.
7. User toggles mirror view if desired.
8. Tap `Try it`.
9. Navigate to Attempt Camera.

**Terminal outcome:** camera preparation for the selected section.

---

## UF-06 — Camera permission and framing

**Start:** Attempt Camera before recording.

1. Check camera permission.
2. Not determined → show rationale, then OS permission request.
3. Denied → show permission-denied state with `Open settings` where supported and `Back to lesson`.
4. Granted → camera preview.
5. Show framing guidance: full body visible, stable phone, enough space, reference section duration.
6. User can switch supported camera orientation only if intentionally designed; MVP defaults to one predictable mode.
7. Tap `Start`.
8. Short countdown.
9. Recording begins with visible indicator.
10. Recording stops automatically at bounded duration or user cancels.
11. Navigate to Attempt Review.

**Recovery:** if camera initialization fails → retry or return to lesson.

---

## UF-07 — Review, discard, or submit attempt

**Start:** Attempt Review with local temporary recording.

1. Preview recorded attempt.
2. `Discard` → delete local temp file and return to Attempt Camera.
3. `Try again` → same as discard then camera.
4. `Submit` → validate local file then begin private upload.
5. Upload progress.
6. Network failure → retain temp file for bounded retry and show retry/cancel.
7. Successful upload → create/confirm attempt record and analysis job.
8. Navigate to Attempt Processing.

**Terminal outcomes:** discarded, queued for analysis, user leaves with safely recoverable pending upload if supported.

---

## UF-08 — Attempt processing and low-confidence recovery

**Start:** Attempt Processing.

1. Show non-blocking analysis status.
2. User may leave; attempt persists.
3. Success with sufficient confidence → Feedback.
4. Success but low tracking/alignment confidence → Feedback in `Needs another try` mode.
5. Low-confidence screen explains concrete capture problem when known (e.g. body not fully visible, severe occlusion, tracking lost).
6. CTA `Record again` returns to camera.
7. Retryable worker failure → `Retry analysis`.
8. Terminal invalid attempt → `Record again`.

**Terminal outcome:** actionable feedback or recoverable re-record path.

---

## UF-09 — Feedback → retry → personal best

**Start:** Feedback for a valid attempt.

1. Show overall progress score, movement score, timing score, confidence, and 1–3 prioritized corrections.
2. If previous valid attempts exist, show change vs previous/best using compatible scoring version only.
3. Primary CTA `Try again` → Attempt Camera for same section.
4. User records/submits another attempt.
5. New valid result arrives.
6. If score improves above previous best → show `Personal best` state.
7. If completion threshold met → mark section complete and show `Next section`.
8. If threshold not met → keep `Try again`; after at least one valid attempt also allow `Move on anyway` with explicit user choice.

**Terminal outcomes:** section complete, continue practicing, or user exits project.

---

## UF-10 — Progress through all sections

**Start:** Project Detail with at least one completed section.

1. Completed sections show progress/best score.
2. Next incomplete section is emphasized.
3. User repeats UF-05 through UF-09.
4. When all sections complete → surface `Full practice` CTA.

**Terminal outcome:** all sections complete or user pauses and resumes later.

---

## UF-11 — Full choreography practice

**Start:** ready project with at least one completed section; strongest CTA after all complete.

1. Open Full Practice.
2. Show full reference with mirror setting and 1.0x default.
3. User starts countdown and practices entire choreography.
4. If full-recording scoring is enabled by implementation plan, user may record and submit a final attempt through the same private pipeline.
5. If aggregate scoring is not reliable/implemented, do not show fabricated final score.
6. Return to Project Detail.

**Terminal outcome:** guided full practice completed.

---

## UF-12 — Resume from app restart

**Start:** app reopened after prior use.

1. Restore valid session.
2. Load Projects.
3. Each project displays authoritative latest state.
4. Tap project.
5. Queued/processing → UF-04.
6. Ready → Project Detail.
7. Pending attempt analysis → user may open attempt status/feedback from section history.

**Terminal outcome:** user resumes without recreating project or losing persisted progress.

---

## UF-13 — Offline/network-loss behavior

**Start:** any cloud-dependent screen loses connectivity.

1. Keep safe cached/read-only UI where available.
2. Show offline state; never silently treat action as successful.
3. Disable new cloud analysis actions while offline.
4. Local camera recording may proceed only if the app can safely preserve the pending attempt for later upload; otherwise explain connectivity requirement before recording.
5. On reconnection, user explicitly retries or app safely resumes idempotent reads/uploads according to implementation.

**Terminal outcome:** synchronized state after reconnection or unchanged local/cached state.

---

## UF-14 — Delete a project

**Start:** Project Detail or project overflow menu.

1. Tap `Delete project`.
2. Confirmation explains source/attempt/progress data will be deleted.
3. Cancel → no change.
4. Confirm → destructive action enters loading state.
5. Backend validates ownership and marks/deletes project according to retention design.
6. Project disappears from active list immediately after successful authorization/transition.
7. Async storage cleanup, if used, is observable/retryable server-side.
8. Repeated deletion request is idempotent.

**Error:** network/server failure leaves project visible with retry; do not pretend deletion succeeded.

**Terminal outcome:** project inaccessible to user and cleanup scheduled/completed.

---

## UF-15 — Delete account

**Start:** Settings.

1. Tap `Delete account`.
2. Explain account and private dance data impact.
3. Require confirmation and re-authentication if security design requires it.
4. Confirm → server-side deletion workflow.
5. Auth/session is revoked/terminated according to provider behavior.
6. Navigate to signed-out state.
7. Backend cleanup removes or queues removal of owned project/media/derived data according to retention policy.

**Failure:** if request fails before accepted deletion, keep user signed in and show retry; if accepted asynchronously, show completion state consistent with backend contract.

**Terminal outcome:** account disabled/deleted and data cleanup initiated/completed.

---

## Screen-state checklist

| Screen | Loading | Empty | Error | Offline | Permission state |
|---|---|---|---|---|---|
| Welcome/Auth | yes | N/A | yes | yes | N/A |
| Projects | yes | yes | yes | cached/offline | N/A |
| New Dance | validation/upload | N/A | yes | yes | media picker |
| Processing | yes | N/A | retryable/terminal | cached | N/A |
| Project Detail | yes | no usable sections impossible for ready project | yes | cached | N/A |
| Section Learn | player load | N/A | retry | local/cache dependent | N/A |
| Attempt Camera | camera init | N/A | camera error | conditional | camera denied/granted |
| Attempt Review | upload | N/A | upload retry | pending | N/A |
| Attempt Processing | yes | N/A | retry/re-record | cached | N/A |
| Feedback | yes | no valid result routes to recovery | yes | cached | N/A |
| Settings | yes | N/A | yes | limited | N/A |

## Flow-to-feature coverage

- F01 → UF-01, UF-12
- F02 → UF-02, UF-03
- F03/F04 → UF-04
- F05 → UF-05
- F06 → UF-06, UF-07
- F07/F08 → UF-08, UF-09
- F09 → UF-09, UF-10
- F10 → UF-11
- F11 → UF-12, UF-14, UF-15
- Cross-cutting offline → UF-13

Every MVP feature is reachable through at least one defined flow.
