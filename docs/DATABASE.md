# Dance AI — Database, Storage, Auth, and RLS Design

Status: **Stage 06 — FALLBACK authorization review completed with gpt-5.6-sol**  
Inputs: `README.md`, `docs/PRODUCT_SPEC.md`, `docs/USER_FLOWS.md`, `docs/ARCHITECTURE.md`

## 1. Design principles

- Supabase Auth owns identity; application tables reference `auth.users(id)`.
- All user product data is private.
- Authenticated mobile clients get only the minimum grants required for direct reads and Storage upload/read.
- Trusted job state, analysis artifacts, scores, feedback generation, deletion orchestration, and worker state are server/service-only writes.
- RLS is enabled on every client-exposed table.
- Grants and RLS are both explicit. No table is considered safe merely because a policy exists.
- `service_role` is server/worker only and never ships to the mobile client.
- Heavy/privileged workflows use Edge Functions + service credentials.
- Database tables store metadata and product state; large video and pose artifacts live in private Storage.
- All scoring/analysis outputs carry version metadata.

## 2. Common conventions

- Primary keys: `uuid`, generated server-side.
- User ownership: `user_id uuid not null references auth.users(id)`.
- Timestamps: `timestamptz` in UTC.
- Mutable tables: `created_at not null default now()`, `updated_at not null default now()` maintained by a reviewed trigger/function.
- Status-like fields: `text` + explicit `check` constraints instead of Postgres enums to keep changes migration-friendly.
- Scores: `numeric(5,2)` constrained to `0..100`.
- Confidence: `numeric(5,4)` constrained to `0..1` when numeric; user-facing qualitative state stored separately when useful.
- Durations: integer milliseconds (`integer` where safely bounded; `bigint` only when needed).
- Object paths: text, immutable after finalization.
- JSONB: only for bounded structured metrics/config, never as a substitute for core relational ownership fields.

## 3. Roles

### `anon`

- No application table privileges.
- No application Storage object access.
- Supabase Auth endpoints operate according to Supabase Auth itself, not app-table grants.

### `authenticated`

- SELECT only on explicitly owner-readable application tables.
- No direct INSERT/UPDATE/DELETE grants on core project/analysis tables.
- Direct Storage INSERT + SELECT only for own object paths in `dance-sources` and `dance-attempts`.
- No direct delete/upsert of immutable video objects.
- No access to service-only analysis artifact bucket.

### `service_role`

- Used by Edge Functions and analysis worker only.
- Performs privileged application writes and Storage cleanup.
- Must still validate user ownership in user-initiated Edge Functions before acting with bypass privileges.

No custom application DB role is required for MVP.

---

# 4. Tables

## 4.1 `projects`

One learnable choreography project owned by one user.

| Column | Type | Null | Default / constraint | Notes |
|---|---|---:|---|---|
| `id` | uuid | no | generated | PK |
| `user_id` | uuid | no | FK `auth.users(id)` | owner |
| `source_kind` | text | no | check `device`, `url` | original import path |
| `status` | text | no | check `uploading`, `queued`, `processing`, `ready`, `failed_retryable`, `failed_terminal`, `deleting` | authoritative project state |
| `display_name` | text | yes | max bounded length | optional UI label; filename-derived allowed |
| `source_object_path` | text | yes | unique when not null | Storage path after device upload/import |
| `source_original_filename` | text | yes | bounded/sanitized display metadata | never used as object path directly |
| `source_mime_type` | text | yes |  | trusted only after server verification |
| `source_size_bytes` | bigint | yes | check >= 0 | verified server-side |
| `source_duration_ms` | integer | yes | check > 0 | verified server-side |
| `failure_code` | text | yes | allowed internal category | no raw stack trace |
| `active_reference_analysis_id` | uuid | yes | FK added after `reference_analyses` exists | current successful reference analysis |
| `created_at` | timestamptz | no | now() |  |
| `updated_at` | timestamptz | no | now() |  |
| `deleted_at` | timestamptz | yes |  | logical deletion boundary |

**PK:** `id`.

**FK:** `user_id → auth.users(id) on delete cascade`.

**Indexes:**
- `(user_id, deleted_at, updated_at desc)` for Projects list.
- `(user_id, status)` for active processing list.
- unique partial index on `source_object_path where source_object_path is not null`.

**Soft delete:** yes. `deleted_at` immediately hides the project from user reads; async cleanup removes Storage and dependent rows. No restore in MVP.

**Ownership:** user.

**Classification:** private.

---

## 4.2 `reference_analyses`

Versioned trusted analysis of a project reference video.

| Column | Type | Null | Constraint / purpose |
|---|---|---:|---|
| `id` | uuid | no | PK |
| `project_id` | uuid | no | FK projects |
| `user_id` | uuid | no | denormalized owner for auditing/indexing; must match project owner via trusted writer |
| `status` | text | no | `queued`, `processing`, `succeeded`, `failed_retryable`, `failed_terminal` |
| `pipeline_version` | text | no | analysis pipeline build/version |
| `pose_model_version` | text | no | pose backend/model identifier |
| `segmentation_version` | text | no | segmentation algorithm version |
| `sampling_fps` | numeric(5,2) | no | > 0 |
| `tracking_confidence` | numeric(5,4) | yes | 0..1 aggregate |
| `segmentation_confidence` | text | yes | `high`, `medium`, `low` |
| `artifact_object_path` | text | yes | service-only Storage path |
| `section_count` | integer | yes | >= 0 |
| `error_code` | text | yes | bounded category |
| `started_at` | timestamptz | yes |  |
| `completed_at` | timestamptz | yes |  |
| `created_at` | timestamptz | no | now() |
| `updated_at` | timestamptz | no | now() |

**FKs:** `project_id → projects(id) on delete cascade`, `user_id → auth.users(id) on delete cascade`.

**Indexes:** `(project_id, created_at desc)`, `(status, created_at)` for operations.

**Client access:** none required. Project and sections expose sanitized owner-readable state.

**Soft delete:** no; follows project lifecycle.

---

## 4.3 `sections`

Ordered practice ranges produced by one reference analysis.

| Column | Type | Null | Constraint / purpose |
|---|---|---:|---|
| `id` | uuid | no | PK |
| `project_id` | uuid | no | FK projects |
| `reference_analysis_id` | uuid | no | FK reference_analyses |
| `user_id` | uuid | no | owner, trusted denormalization |
| `position` | integer | no | >= 1 |
| `start_ms` | integer | no | >= 0 |
| `end_ms` | integer | no | > start_ms |
| `segmentation_confidence` | text | no | `high`, `medium`, `low` |
| `created_at` | timestamptz | no | now() |

**Unique:** `(reference_analysis_id, position)`.

**Indexes:** `(project_id, position)`, `(user_id, project_id)`.

**Client access:** SELECT own sections only when parent project is not deleted and `projects.active_reference_analysis_id = sections.reference_analysis_id`.

**Soft delete:** no; inactive historical sections remain inaccessible through active-section policy or are cleaned with old analysis according to retention policy.

---

## 4.4 `section_progress`

Current user progress for an active section.

| Column | Type | Null | Constraint / purpose |
|---|---|---:|---|
| `section_id` | uuid | no | PK + FK sections |
| `project_id` | uuid | no | FK projects |
| `user_id` | uuid | no | owner |
| `best_attempt_id` | uuid | yes | FK attempts, added after attempts table |
| `best_score` | numeric(5,2) | yes | 0..100 |
| `valid_attempt_count` | integer | no | default 0, >= 0 |
| `completed_at` | timestamptz | yes |  |
| `completion_mode` | text | yes | `threshold`, `manual` |
| `created_at` | timestamptz | no | now() |
| `updated_at` | timestamptz | no | now() |

**Unique:** `section_id` (PK).

**Indexes:** `(user_id, project_id)`, `(project_id, completed_at)`.

**Client access:** SELECT own. No direct client write; worker/Edge Function updates trusted progress.

**Soft delete:** no; cascade with section/project cleanup.

---

## 4.5 `attempts`

One user-recorded submission for one section.

| Column | Type | Null | Constraint / purpose |
|---|---|---:|---|
| `id` | uuid | no | PK |
| `user_id` | uuid | no | owner |
| `project_id` | uuid | no | FK projects |
| `section_id` | uuid | no | FK sections |
| `status` | text | no | `uploading`, `queued`, `processing`, `succeeded`, `low_confidence`, `failed_retryable`, `failed_terminal`, `deleting` |
| `object_path` | text | yes | unique when not null |
| `mime_type` | text | yes | server-verified |
| `size_bytes` | bigint | yes | >= 0 |
| `duration_ms` | integer | yes | > 0 |
| `practice_mirrored` | boolean | no | default false |
| `camera_facing` | text | no | check `front`, `back` |
| `attempt_number` | integer | no | >= 1; assigned trusted-side |
| `failure_code` | text | yes | bounded category |
| `submitted_at` | timestamptz | yes |  |
| `created_at` | timestamptz | no | now() |
| `updated_at` | timestamptz | no | now() |
| `deleted_at` | timestamptz | yes |  |

**Unique:** `(section_id, attempt_number)`; partial unique `object_path where object_path is not null`.

**Indexes:** `(user_id, section_id, created_at desc)`, `(project_id, status)`, `(section_id, status)`.

**Client access:** SELECT own non-deleted attempts. Creation/finalization occurs through trusted orchestration; mobile does not choose status or attempt number.

**Soft delete:** yes only as an immediate privacy/access boundary before physical object cleanup; no restore.

---

## 4.6 `attempt_analyses`

Trusted internal comparison output. Not directly exposed to mobile.

| Column | Type | Null | Constraint / purpose |
|---|---|---:|---|
| `id` | uuid | no | PK |
| `attempt_id` | uuid | no | FK attempts |
| `project_id` | uuid | no | FK projects |
| `section_id` | uuid | no | FK sections |
| `user_id` | uuid | no | owner |
| `reference_analysis_id` | uuid | no | exact reference version used |
| `status` | text | no | `processing`, `succeeded`, `low_confidence`, `failed` |
| `pipeline_version` | text | no |  |
| `pose_model_version` | text | no |  |
| `alignment_version` | text | no |  |
| `scoring_version` | text | no |  |
| `feedback_rule_version` | text | no |  |
| `tracking_confidence` | numeric(5,4) | yes | 0..1 |
| `alignment_confidence` | numeric(5,4) | yes | 0..1 |
| `overall_score` | numeric(5,2) | yes | 0..100 |
| `movement_score` | numeric(5,2) | yes | 0..100 |
| `timing_score` | numeric(5,2) | yes | 0..100 |
| `component_metrics` | jsonb | yes | bounded internal metrics; schema-versioned |
| `artifact_object_path` | text | yes | service-only analysis artifact |
| `low_confidence_reason` | text | yes | bounded category |
| `created_at` | timestamptz | no | now() |
| `completed_at` | timestamptz | yes |  |

**Unique:** `(attempt_id, pipeline_version, reference_analysis_id)` or stronger idempotency key chosen in migration.

**Indexes:** `(attempt_id, created_at desc)`, `(user_id, created_at desc)`, `(status, created_at)`.

**Client access:** none.

**Soft delete:** no; cascade with attempt/project.

---

## 4.7 `attempt_results`

Sanitized owner-readable result for an attempt. Exactly one current result per attempt.

| Column | Type | Null | Constraint / purpose |
|---|---|---:|---|
| `attempt_id` | uuid | no | PK + FK attempts |
| `user_id` | uuid | no | owner |
| `project_id` | uuid | no | FK projects |
| `section_id` | uuid | no | FK sections |
| `reference_analysis_id` | uuid | no | exact reference |
| `scoring_version` | text | no | compatibility boundary |
| `result_state` | text | no | `valid`, `low_confidence` |
| `overall_score` | numeric(5,2) | yes | 0..100; null for low-confidence |
| `movement_score` | numeric(5,2) | yes | 0..100 |
| `timing_score` | numeric(5,2) | yes | 0..100 |
| `confidence` | numeric(5,4) | no | 0..1 |
| `is_personal_best` | boolean | no | trusted computed flag |
| `meets_completion_threshold` | boolean | no | trusted server config |
| `low_confidence_reason` | text | yes | safe user-facing category |
| `created_at` | timestamptz | no | now() |
| `updated_at` | timestamptz | no | now() |

**Indexes:** `(user_id, section_id, created_at desc)`.

**Client access:** SELECT own only.

**Soft delete:** no; follows attempt.

---

## 4.8 `feedback_items`

Deterministic coaching statements associated with an attempt result.

| Column | Type | Null | Constraint / purpose |
|---|---|---:|---|
| `id` | uuid | no | PK |
| `attempt_id` | uuid | no | FK attempts |
| `user_id` | uuid | no | owner |
| `rank` | smallint | no | 1..3 |
| `message` | text | no | bounded user-facing text |
| `metric_key` | text | no | traceability to deterministic rule |
| `phase_start_ms` | integer | yes | >= 0 |
| `phase_end_ms` | integer | yes | > start when both present |
| `confidence` | numeric(5,4) | no | 0..1 |
| `rule_version` | text | no |  |
| `created_at` | timestamptz | no | now() |

**Unique:** `(attempt_id, rank)`.

**Indexes:** `(attempt_id, rank)`, `(user_id, attempt_id)`.

**Client access:** SELECT own only.

**Soft delete:** no; follows attempt.

---

## 4.9 `analysis_jobs`

Service-only durable work queue.

| Column | Type | Null | Constraint / purpose |
|---|---|---:|---|
| `id` | uuid | no | PK |
| `job_type` | text | no | `reference_analysis`, `attempt_analysis`, `storage_cleanup`, `url_import` |
| `user_id` | uuid | yes | owner context; nullable only for system cleanup when auth user already gone |
| `project_id` | uuid | yes | FK projects where lifecycle permits |
| `attempt_id` | uuid | yes | FK attempts |
| `idempotency_key` | text | no | unique |
| `status` | text | no | `queued`, `claimed`, `processing`, `succeeded`, `failed_retryable`, `failed_terminal` |
| `priority` | smallint | no | default 100 |
| `attempt_count` | integer | no | default 0 |
| `max_attempts` | integer | no | bounded >=1 |
| `available_at` | timestamptz | no | default now() |
| `claimed_by` | text | yes | worker instance ID |
| `lease_expires_at` | timestamptz | yes | crash recovery |
| `started_at` | timestamptz | yes |  |
| `completed_at` | timestamptz | yes |  |
| `error_code` | text | yes | bounded category |
| `created_at` | timestamptz | no | now() |
| `updated_at` | timestamptz | no | now() |

**Unique:** `idempotency_key`.

**Indexes:**
- `(status, available_at, priority, created_at)` for claiming.
- `(project_id, job_type, created_at desc)`.
- `(attempt_id, job_type, created_at desc)`.
- `(lease_expires_at)` partial where status in claimed/processing.

**Client access:** none.

**Soft delete:** no; operational retention then purge.

---

## 4.10 `job_events`

Append-only operational state/change log without raw user media/body data.

| Column | Type | Null | Purpose |
|---|---|---:|---|
| `id` | bigint identity | no | PK |
| `job_id` | uuid | no | FK analysis_jobs |
| `event_type` | text | no | state/progress/error category |
| `worker_id` | text | yes |  |
| `metadata` | jsonb | yes | bounded non-sensitive operational values |
| `created_at` | timestamptz | no | now() |

**Index:** `(job_id, created_at)`.

**Client access:** none.

**Retention:** short operational window, proposed 30 days for beta unless legal/privacy policy requires shorter.

---

## 4.11 `product_events`

Privacy-safe beta funnel events.

| Column | Type | Null | Purpose |
|---|---|---:|---|
| `id` | bigint identity | no | PK |
| `user_id` | uuid | yes | pseudonymous account ID |
| `project_id` | uuid | yes | optional context |
| `attempt_id` | uuid | yes | optional context |
| `event_name` | text | no | allowlisted event name |
| `event_version` | smallint | no | default 1 |
| `platform` | text | yes | `ios`, `android` |
| `app_version` | text | yes |  |
| `properties` | jsonb | yes | bounded allowlisted non-sensitive properties |
| `created_at` | timestamptz | no | now() |

**Indexes:** `(event_name, created_at)`, `(user_id, created_at)`.

**Write path:** trusted Edge Function or server-side instrumentation. Do not grant arbitrary client INSERT in first implementation.

**Client read:** none.

**Retention:** beta analytics retention proposed 90 days, reviewed before external beta.

---

## 4.12 `storage_cleanup_tasks`

Service-only physical cleanup queue to make deletion observable/idempotent.

| Column | Type | Null | Purpose |
|---|---|---:|---|
| `id` | uuid | no | PK |
| `user_id` | uuid | yes | original owner context |
| `project_id_snapshot` | uuid | yes | may outlive deleted project row |
| `bucket_id` | text | no | expected private bucket |
| `object_path` | text | no | exact immutable path |
| `status` | text | no | `queued`, `processing`, `succeeded`, `failed_retryable`, `failed_terminal` |
| `attempt_count` | integer | no | default 0 |
| `available_at` | timestamptz | no | now() |
| `last_error_code` | text | yes | category only |
| `created_at` | timestamptz | no | now() |
| `completed_at` | timestamptz | yes |  |

**Unique:** `(bucket_id, object_path)` to make cleanup idempotent.

**Client access:** none.

**Retention:** purge successful task records after operational audit window.

---

## 4.13 `account_deletion_requests`

Service-only audit/control state for account deletion.

| Column | Type | Null | Purpose |
|---|---|---:|---|
| `id` | uuid | no | PK |
| `user_id` | uuid | no initially | requested account ID |
| `status` | text | no | `requested`, `cleaning`, `auth_delete_pending`, `completed`, `failed_retryable`, `failed_terminal` |
| `requested_at` | timestamptz | no | now() |
| `completed_at` | timestamptz | yes |  |
| `error_code` | text | yes | category only |

Do not rely on a FK that would delete the request row when `auth.users` is removed if the row is required to prove cleanup completion. Migration may intentionally store `user_id` as UUID without cascading FK or snapshot it before auth deletion.

**Unique partial:** one active request per `user_id`.

**Client access:** none; user initiates through authenticated Edge Function.

---

## 4.14 `url_import_requests`

Service-only and feature-gated. Exists only if at least one reviewed URL adapter is enabled.

| Column | Type | Null | Purpose |
|---|---|---:|---|
| `id` | uuid | no | PK |
| `user_id` | uuid | no | owner |
| `project_id` | uuid | no | FK projects |
| `adapter_key` | text | no | allowlisted adapter |
| `source_host` | text | no | normalized host |
| `source_url_encrypted_or_ephemeral` | text | yes | implementation must avoid long retention; never analytics/logs |
| `status` | text | no | validation/import lifecycle |
| `created_at` | timestamptz | no | now() |
| `expires_at` | timestamptz | no | short retention |

The exact URL-storage mechanism is intentionally deferred until a lawful source adapter is approved. Generic arbitrary URL fetch is forbidden.

---

# 5. Foreign-key and cascade behavior

Recommended relationships:

- `auth.users → projects`: `on delete cascade` only after account-deletion orchestration has already snapshotted/queued Storage cleanup. Direct auth deletion must not be the first step.
- `projects → reference_analyses`: cascade.
- `projects → sections`: cascade.
- `projects → attempts`: cascade.
- `reference_analyses → sections`: cascade.
- `sections → section_progress`: cascade.
- `sections → attempts`: cascade.
- `attempts → attempt_analyses`: cascade.
- `attempts → attempt_results`: cascade.
- `attempts → feedback_items`: cascade.

`analysis_jobs` and cleanup/audit tables should not be blindly cascaded away before operational cleanup is complete. Their FK strategy may use nullable/set-null/snapshotted identifiers as appropriate.

`projects.active_reference_analysis_id` uses `on delete set null` and is set only by trusted writer after a successful analysis transaction.

`section_progress.best_attempt_id` uses `on delete set null`.

# 6. RLS and grants

## 6.1 Global grants posture

For every app table in exposed `public` schema:

1. `enable row level security`.
2. `revoke all from anon, authenticated`.
3. grant only the exact operations below.
4. create separate policies per operation; avoid broad `for all` policies.
5. use explicit `to authenticated`.

## 6.2 Client-readable tables

Grant `SELECT` to `authenticated` on:
- `projects`
- `sections`
- `section_progress`
- `attempts`
- `attempt_results`
- `feedback_items`

Do **not** grant client access to:
- `reference_analyses`
- `attempt_analyses`
- `analysis_jobs`
- `job_events`
- `storage_cleanup_tasks`
- `account_deletion_requests`
- `url_import_requests`
- `product_events`

No direct client INSERT/UPDATE/DELETE on the six owner-readable tables in first implementation. Mutations happen through narrow trusted functions/Edge Functions. This prevents clients from manufacturing status, score, completion, ownership, or job state.

## 6.3 Policy predicates

### `projects SELECT`

Conceptual predicate:

`auth.uid() is not null AND user_id = auth.uid() AND deleted_at is null`

### `sections SELECT`

Require all:
- `sections.user_id = auth.uid()`
- parent project belongs to caller and is not deleted
- `projects.active_reference_analysis_id = sections.reference_analysis_id`

### `section_progress SELECT`

`user_id = auth.uid()` plus parent project not deleted.

### `attempts SELECT`

`user_id = auth.uid() AND deleted_at is null` plus parent project not deleted.

### `attempt_results SELECT`

`user_id = auth.uid()` plus corresponding attempt/project remains visible.

### `feedback_items SELECT`

`user_id = auth.uid()` plus corresponding attempt/project remains visible.

Denormalized `user_id` is not trusted from the client because clients cannot insert/update these rows; it exists to simplify and speed owner policies.

# 7. Storage design and RLS

Current Supabase docs indicate Storage uses RLS on `storage.objects`, recommends TUS resumable uploads for large files, and advises treating the Storage schema as read-only metadata. Actual object deletion must go through the Storage API.

## 7.1 Buckets

### `dance-sources`

- private.
- per-bucket max: 50 MB for beta.
- allowed video MIME types finalized in migration after device compatibility tests.
- canonical path: `<user_uuid>/<project_uuid>/<immutable_object_uuid>.<ext>`.

Authenticated Storage policies:

**INSERT:**
- `bucket_id = 'dance-sources'`
- first path segment equals `auth.uid()::text`
- path structure has expected segment count/pattern where practical
- no upsert in mobile upload code

**SELECT:**
- same user path predicate.
- required both for playback and because current Storage upload behavior may need SELECT visibility of the newly inserted metadata row.

**UPDATE:** none for authenticated.

**DELETE:** none for authenticated; deletion uses trusted server Storage API so DB+Storage cleanup remains coordinated.

### `dance-attempts`

- private.
- per-bucket max: 25 MB.
- canonical path: `<user_uuid>/<project_uuid>/<section_uuid>/<attempt_uuid>.<ext>`.
- authenticated INSERT/SELECT own path only.
- no UPDATE/DELETE grants.

### `analysis-artifacts`

- private.
- service-only.
- no `authenticated`/`anon` object policies.
- canonical paths include project/analysis or attempt/analysis immutable IDs, not emails/names.

## 7.2 Storage object ownership

Do not rely only on Supabase `owner_id`. Path-based `auth.uid()` policy and product-table ownership are the explicit authorization design. `owner_id` may be an additional defense but is not the sole boundary.

## 7.3 Signed URLs

- Only for private objects.
- short expiry suitable for playback.
- created only when RLS/ownership permits select.
- never logged or stored in analytics.
- revocation limitation means expiry must be short and deletion should not assume a previously issued signed URL becomes instantly invalid before expiry.

# 8. Trusted functions / RPC contracts

These are design contracts, not migrations yet.

## `claim_analysis_job(worker_id, lease_seconds)`

- service-only execute grant.
- atomically selects one eligible queued/retry job by priority/time using row lock + skip-locked semantics.
- increments attempt count and sets lease.
- returns only the claimed job.
- no authenticated/anon execute.

## `renew_analysis_job_lease(job_id, worker_id, lease_seconds)`

- service-only.
- only current claimant can renew a nonterminal job.

## `complete_analysis_job(...)`

- service-only transaction updates trusted outputs + terminal job state.
- completion is idempotent.

Client-facing trusted operations are preferably Edge Functions rather than broad SECURITY DEFINER RPCs. If an RPC is exposed to `authenticated`, its execute grants, `search_path`, ownership checks, and allowed arguments receive separate security review.

# 9. Edge Function mutation contracts

## `create-project-upload`

Authenticated caller. Creates server-owned project placeholder and returns immutable expected Storage path/upload metadata. Caller never supplies arbitrary `user_id` or trusted status.

## `finalize-project-upload`

Authenticated caller. Verifies caller owns project, exact expected object exists, size/type/duration policy passes, then updates source metadata and inserts idempotent `reference_analysis` job.

## `create-attempt-upload`

Authenticated caller. Validates project/section ownership and active reference version; allocates attempt number/ID/path.

## `finalize-attempt-upload`

Authenticated caller. Verifies exact expected object, then queues idempotent attempt analysis.

## `delete-project`

Authenticated caller. Verifies ownership; sets logical deletion boundary, snapshots all object paths into `storage_cleanup_tasks`, prevents new jobs/uploads, then triggers cleanup. Repeated calls are idempotent.

## `delete-account`

Authenticated caller. Verifies current user; marks account-deletion request; logically hides/locks projects; snapshots cleanup work; completes object/data cleanup; deletes/revokes auth identity only at the safe final stage. Never delete `auth.users` first and hope Storage cascades.

# 10. State transition constraints

Trusted writers enforce legal transitions.

### Project

- `uploading → queued → processing → ready`
- `queued|processing → failed_retryable`
- `failed_retryable → queued`
- relevant states → `failed_terminal`
- non-deleted active states → `deleting`

Client cannot set any of these directly.

### Attempt

- `uploading → queued → processing → succeeded|low_confidence`
- processing path may reach retryable/terminal failure
- retry reuses/new analysis job according to idempotency design, not a client status mutation
- any active state → `deleting` during parent deletion

### Job

- `queued → claimed → processing → succeeded`
- `claimed|processing → failed_retryable → queued` after `available_at`
- retry exhaustion/nonrecoverable → `failed_terminal`
- expired lease returns job to eligible state via trusted recovery process.

# 11. Data validation constraints

Migration must encode at least:
- score range 0–100,
- confidence range 0–1,
- positive durations,
- `sections.end_ms > start_ms`,
- `feedback rank between 1 and 3`,
- bounded status values,
- bounded attempt counts/max attempts,
- attempt project/section ownership consistency enforced in trusted write logic and, where practical, composite FK/trigger checks,
- active reference analysis must belong to the same project,
- best attempt must belong to the same section/user and compatible scoring version; enforce in trusted transaction if relational FK alone is insufficient.

# 12. Index strategy

Indexes are justified by:
- owner RLS predicates (`user_id`),
- foreign keys,
- project/section lists,
- job claim filters,
- active processing state polling,
- attempt history.

Every FK column used in joins/policies gets an index unless the PK/unique index already covers it.

Avoid speculative indexes on JSONB metrics until query evidence exists.

# 13. Deletion and retention

## Project deletion

1. `deleted_at` set and `status='deleting'` in trusted transaction.
2. RLS immediately stops returning project/sections/attempts/results.
3. Object paths copied to cleanup tasks.
4. Storage API deletes source, attempts, analysis artifacts.
5. Cleanup retries persist failures.
6. Dependent DB rows are hard-deleted after Storage cleanup is confirmed or according to a safe compensating workflow.

Target: physical private-media cleanup within 24 hours during beta operations; exact privacy-policy wording must match actual capability before release.

## Account deletion

- Same project cleanup for all owned projects.
- Auth identity deletion occurs only after cleanup is safely scheduled/completed and required snapshots no longer depend on cascading rows.
- Operational deletion request can outlive auth row long enough to record completion.

## Worker temporary files

Deleted immediately after job completion/failure handling; not represented as durable DB records.

## Proposed beta retention

- active source videos: until project/account deletion.
- active attempt videos: until project/account deletion; optional future auto-pruning not in MVP.
- analysis artifacts: while project/attempt needed, then deletion with parent.
- job events: 30 days.
- product events: 90 days.
- raw URLs for approved imports: shortest feasible window, deleted after import or expiry.

Retention values are implementation defaults to be reconciled with the privacy policy before beta.

# 14. Migration strategy

No database mutation occurs during Stage 06.

Implementation order after this document is approved:

1. bootstrap extensions/functions common to project;
2. create tables without cyclic late FKs;
3. add late FKs such as `projects.active_reference_analysis_id` and `section_progress.best_attempt_id`;
4. add constraints/indexes;
5. enable RLS + revoke grants;
6. add explicit grants/policies;
7. create private Storage buckets/restrictions through supported Supabase migration/API approach;
8. add Storage object policies;
9. add service-only job-claim functions with locked-down execute grants;
10. add pgTAP allow/deny tests;
11. verify migration from a clean local database.

Every schema change after beta uses a new forward migration; do not edit already-applied production migrations.

# 15. RLS/security test matrix

Tests must create at least `user_a`, `user_b`, and unauthenticated context.

## Projects

- ALLOW: A selects own active project.
- DENY: B selects A project.
- DENY: anon selects any project.
- DENY: A directly inserts project through Data API when INSERT grant absent.
- DENY: A directly updates project status/owner.
- DENY: A directly deletes project row.
- DENY/hidden: A selects own logically deleted project.

## Sections/progress

- ALLOW: A selects active sections/progress for own project.
- DENY: B selects A sections/progress.
- DENY: A reads section from inactive historical reference analysis if policy exposes active version only.
- DENY: A directly marks progress complete.

## Attempts/results/feedback

- ALLOW: A selects own non-deleted attempt/result/feedback.
- DENY: B selects A attempt/result/feedback.
- DENY: A directly inserts a forged high-score result or feedback.
- DENY: A directly changes `user_id`, status, attempt number, score, completion state.

## Internal tables

- DENY: authenticated selects `attempt_analyses`, `reference_analyses`, `analysis_jobs`, `job_events`, cleanup/deletion tables.
- DENY: anon all operations.

## Storage `dance-sources`

- ALLOW: A uploads new object only under A canonical prefix.
- ALLOW: A selects own object.
- DENY: A uploads under B prefix.
- DENY: B selects A object.
- DENY: A direct update/upsert where no UPDATE privilege/policy exists.
- DENY: A direct delete.
- DENY: anon upload/read.

## Storage `dance-attempts`

Same cross-user allow/deny matrix.

## Storage `analysis-artifacts`

- DENY: A/B/anon all object access.
- ALLOW: trusted service test can write/read/delete.

## Trusted job functions

- DENY: authenticated executes claim/complete functions.
- ALLOW: service role claims one eligible job.
- VERIFY: two concurrent claims never return same job.
- VERIFY: expired lease can recover job.
- VERIFY: duplicate completion is idempotent.

# 16. Authorization gate review — FALLBACK

Preferred reviewer: `gpt-6-astra`.  
Actual available reviewer: `gpt-5.6-sol`.  
Gate: **FALLBACK**.

Findings resolved in the design:

- **P1: client could forge scores/progress/job state if broad writes were granted** → core tables are client SELECT-only; trusted mutations go through Edge Functions/service worker.
- **P1: cross-user media access** → private buckets + authenticated own-prefix INSERT/SELECT policies; no public buckets.
- **P1: deletion could remove DB metadata but leave billable/private objects** → object deletion uses Storage API and durable cleanup tasks; Storage schema is treated as metadata/read-only.
- **P1: deleting Auth user first could destroy ownership context before Storage cleanup** → account deletion explicitly stages cleanup before auth identity removal.
- **P1: service-only queue RPC accidentally executable by clients** → service-only execute grant is a mandatory migration/test condition.
- **P2: signed URLs remain valid until expiry** → use short-lived signed URLs and do not promise instant revocation beyond actual provider semantics.
- **P2: TUS upload may require SELECT visibility of new metadata** → Storage SELECT own-path policy is required alongside INSERT; no upsert/update permission.
- **P2: historical scoring version could overwrite personal best** → best/progress writes are trusted and constrained to compatible scoring/reference versions.

Unresolved P0/P1 findings: **none identified in the database/RLS design scope**.

Stage 06 gate result: **FALLBACK PASS**. Proceed to implementation planning; no migration has been run yet.
