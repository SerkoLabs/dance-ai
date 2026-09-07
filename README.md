# Dance AI

**Promise:** Turn a dance video you saw online into a step-by-step practice lesson with camera-based movement feedback so you can actually learn the choreography, not just watch it.

## Problem

Viral dances are easy to discover and hard to learn. Short-form videos and music clips are optimized for watching, not teaching: choreography is not broken into teachable units, speed is often too high, mirrored orientation is confusing, and learners do not know what they are doing wrong.

## Primary user

A mobile-first beginner or casual dancer who sees a choreography on TikTok, Instagram, YouTube, or in a music video and wants to reproduce it accurately enough to perform or record it.

## Product concept

The user imports or uploads a dance video. Dance AI analyzes the choreography, divides it into small sections, presents each section at learnable speeds, records the user's attempt with the camera, compares the attempt against the reference movement, and returns a small number of concrete corrections. After the sections are learned, the app combines them into a full choreography practice with music.

## Core repeatable loop

`bring a dance → analyze → learn one section → attempt it → receive corrections → retry → unlock next section → perform the full choreography`

The product optimizes for improvement between attempts rather than a single opaque score.

## MVP

1. Import a supported video from the device or provide a supported public video URL.
2. Create a learning project from that reference video.
3. Detect the primary dancer and derive a time-aligned pose/movement representation.
4. Split the reference into short teachable choreography sections.
5. Let the learner preview a section at normal, 0.75x, and 0.5x speed, with mirror control.
6. Record a short user attempt for the current section.
7. Analyze the attempt after recording and compare it with the reference section.
8. Return 1–3 concrete, prioritized corrections covering movement position and/or timing.
9. Track attempt history and personal-best progress per section.
10. Mark sections complete and provide a final full-choreography practice mode.
11. Handle camera/media permission denial, unsupported media, processing failure, network loss, and retry states explicitly.
12. Provide account deletion and deletion of uploaded/derived dance data.

## Explicit non-goals for MVP

- Real-time frame-by-frame coaching while the user is moving.
- Social feed, followers, comments, leaderboards, or creator marketplace.
- Automatic publishing back to TikTok/Instagram/YouTube.
- Multiplayer or live dance classes.
- Full professional dance notation or studio-grade biomechanical assessment.
- Guaranteed support for group choreography, occluded bodies, fast cuts, or videos where a primary dancer cannot be tracked reliably.
- Automatic ingestion that bypasses source-platform rights, access controls, or download restrictions.
- Training a proprietary foundation pose model from scratch.

## Differentiation

Dance AI is not a library of pre-authored dance lessons. Its core value is converting a user-selected choreography into a learnable sequence and explaining what to correct after each attempt. The feedback must be actionable (for example, which limb/phase/timing needs adjustment), not only a percentage score.

## Primary value signal

A user successfully completes at least one imported choreography section after receiving feedback and improves their similarity/timing score across repeated attempts.

## Beta success metrics

- >= 60% of successfully analyzed projects reach the first recorded attempt.
- >= 40% of users who submit a first attempt submit at least one retry after feedback.
- >= 30% of started projects complete at least one choreography section.
- Median processing failure rate for supported media < 5%.
- No unauthorized access to another user's source video, attempt video, pose data, or feedback.

These are initial beta thresholds, not validated business targets.

## Stack constraints

- Mobile: Expo / React Native / TypeScript.
- Backend, database, authentication, and storage: Supabase.
- AI/video processing must remain behind a server-side interface so a compute provider or pose model can be replaced without changing product flows.
- Privileged keys and service-role credentials must never ship in the mobile client.

## Key risks and assumptions

- Pose comparison quality may be weak when camera angle, body proportions, clothing, framing, occlusion, edits, or multiple dancers differ substantially.
- Useful coaching requires temporal alignment; static pose similarity alone is insufficient.
- Video processing can be compute-intensive and may require infrastructure beyond Supabase Edge Functions. Architecture must keep that worker replaceable and cost-bounded.
- Source-platform linking and media import are subject to current platform terms, copyright, and access restrictions. MVP must support lawful user-provided media without bypassing restrictions.
- Camera and uploaded dance recordings are privacy-sensitive. Retention, deletion, access control, and consent must be explicit.
- A single numeric score can mislead users; feedback confidence and low-confidence cases must be surfaced.

## Current status

Lifecycle planning started. Product README is the current product-level source of truth. No application code has been approved by the lifecycle gate yet.
