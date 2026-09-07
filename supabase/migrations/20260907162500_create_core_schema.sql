-- Dance AI core schema
-- Phase 2 / P2-01
-- Intentionally excludes RLS, grants, Storage policies, and privileged queue RPCs.
-- Those are applied in follow-up migrations after this schema is verified.

begin;

create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_kind text not null check (source_kind in ('device', 'url')),
  status text not null check (
    status in (
      'uploading',
      'queued',
      'processing',
      'ready',
      'failed_retryable',
      'failed_terminal',
      'deleting'
    )
  ),
  display_name text null check (display_name is null or char_length(display_name) between 1 and 160),
  source_object_path text null,
  source_original_filename text null check (
    source_original_filename is null or char_length(source_original_filename) between 1 and 255
  ),
  source_mime_type text null check (
    source_mime_type is null or char_length(source_mime_type) between 1 and 120
  ),
  source_size_bytes bigint null check (source_size_bytes is null or source_size_bytes >= 0),
  source_duration_ms integer null check (source_duration_ms is null or source_duration_ms > 0),
  failure_code text null check (failure_code is null or char_length(failure_code) <= 80),
  active_reference_analysis_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create table public.reference_analyses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (
    status in ('queued', 'processing', 'succeeded', 'failed_retryable', 'failed_terminal')
  ),
  pipeline_version text not null check (char_length(pipeline_version) between 1 and 80),
  pose_model_version text not null check (char_length(pose_model_version) between 1 and 120),
  segmentation_version text not null check (char_length(segmentation_version) between 1 and 80),
  sampling_fps numeric(5,2) not null check (sampling_fps > 0),
  tracking_confidence numeric(5,4) null check (
    tracking_confidence is null or tracking_confidence between 0 and 1
  ),
  segmentation_confidence text null check (
    segmentation_confidence is null or segmentation_confidence in ('high', 'medium', 'low')
  ),
  artifact_object_path text null,
  section_count integer null check (section_count is null or section_count >= 0),
  error_code text null check (error_code is null or char_length(error_code) <= 80),
  started_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects
  add constraint projects_active_reference_analysis_id_fkey
  foreign key (active_reference_analysis_id)
  references public.reference_analyses(id)
  on delete set null;

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  reference_analysis_id uuid not null references public.reference_analyses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  position integer not null check (position >= 1),
  start_ms integer not null check (start_ms >= 0),
  end_ms integer not null,
  segmentation_confidence text not null check (segmentation_confidence in ('high', 'medium', 'low')),
  created_at timestamptz not null default now(),
  constraint sections_time_range_check check (end_ms > start_ms),
  constraint sections_reference_position_key unique (reference_analysis_id, position)
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  section_id uuid not null references public.sections(id) on delete cascade,
  status text not null check (
    status in (
      'uploading',
      'queued',
      'processing',
      'succeeded',
      'low_confidence',
      'failed_retryable',
      'failed_terminal',
      'deleting'
    )
  ),
  object_path text null,
  mime_type text null check (mime_type is null or char_length(mime_type) between 1 and 120),
  size_bytes bigint null check (size_bytes is null or size_bytes >= 0),
  duration_ms integer null check (duration_ms is null or duration_ms > 0),
  practice_mirrored boolean not null default false,
  camera_facing text not null check (camera_facing in ('front', 'back')),
  attempt_number integer not null check (attempt_number >= 1),
  failure_code text null check (failure_code is null or char_length(failure_code) <= 80),
  submitted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint attempts_section_attempt_number_key unique (section_id, attempt_number)
);

create table public.section_progress (
  section_id uuid primary key references public.sections(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  best_attempt_id uuid null references public.attempts(id) on delete set null,
  best_score numeric(5,2) null check (best_score is null or best_score between 0 and 100),
  valid_attempt_count integer not null default 0 check (valid_attempt_count >= 0),
  completed_at timestamptz null,
  completion_mode text null check (completion_mode is null or completion_mode in ('threshold', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attempt_analyses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  section_id uuid not null references public.sections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reference_analysis_id uuid not null references public.reference_analyses(id) on delete cascade,
  status text not null check (status in ('processing', 'succeeded', 'low_confidence', 'failed')),
  pipeline_version text not null check (char_length(pipeline_version) between 1 and 80),
  pose_model_version text not null check (char_length(pose_model_version) between 1 and 120),
  alignment_version text not null check (char_length(alignment_version) between 1 and 80),
  scoring_version text not null check (char_length(scoring_version) between 1 and 80),
  feedback_rule_version text not null check (char_length(feedback_rule_version) between 1 and 80),
  tracking_confidence numeric(5,4) null check (
    tracking_confidence is null or tracking_confidence between 0 and 1
  ),
  alignment_confidence numeric(5,4) null check (
    alignment_confidence is null or alignment_confidence between 0 and 1
  ),
  overall_score numeric(5,2) null check (overall_score is null or overall_score between 0 and 100),
  movement_score numeric(5,2) null check (movement_score is null or movement_score between 0 and 100),
  timing_score numeric(5,2) null check (timing_score is null or timing_score between 0 and 100),
  component_metrics jsonb null,
  artifact_object_path text null,
  low_confidence_reason text null check (
    low_confidence_reason is null or char_length(low_confidence_reason) <= 120
  ),
  created_at timestamptz not null default now(),
  completed_at timestamptz null,
  constraint attempt_analyses_idempotency_key unique (
    attempt_id,
    pipeline_version,
    reference_analysis_id
  )
);

create table public.attempt_results (
  attempt_id uuid primary key references public.attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  section_id uuid not null references public.sections(id) on delete cascade,
  reference_analysis_id uuid not null references public.reference_analyses(id) on delete cascade,
  scoring_version text not null check (char_length(scoring_version) between 1 and 80),
  result_state text not null check (result_state in ('valid', 'low_confidence')),
  overall_score numeric(5,2) null check (overall_score is null or overall_score between 0 and 100),
  movement_score numeric(5,2) null check (movement_score is null or movement_score between 0 and 100),
  timing_score numeric(5,2) null check (timing_score is null or timing_score between 0 and 100),
  confidence numeric(5,4) not null check (confidence between 0 and 1),
  is_personal_best boolean not null default false,
  meets_completion_threshold boolean not null default false,
  low_confidence_reason text null check (
    low_confidence_reason is null or char_length(low_confidence_reason) <= 120
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attempt_results_score_state_check check (
    (result_state = 'valid' and overall_score is not null)
    or (result_state = 'low_confidence' and overall_score is null)
  )
);

create table public.feedback_items (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rank smallint not null check (rank between 1 and 3),
  message text not null check (char_length(message) between 1 and 500),
  metric_key text not null check (char_length(metric_key) between 1 and 120),
  phase_start_ms integer null check (phase_start_ms is null or phase_start_ms >= 0),
  phase_end_ms integer null,
  confidence numeric(5,4) not null check (confidence between 0 and 1),
  rule_version text not null check (char_length(rule_version) between 1 and 80),
  created_at timestamptz not null default now(),
  constraint feedback_items_attempt_rank_key unique (attempt_id, rank),
  constraint feedback_items_phase_range_check check (
    phase_end_ms is null
    or (phase_start_ms is not null and phase_end_ms > phase_start_ms)
  )
);

create table public.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null check (
    job_type in ('reference_analysis', 'attempt_analysis', 'storage_cleanup', 'url_import')
  ),
  user_id uuid null references auth.users(id) on delete set null,
  project_id uuid null references public.projects(id) on delete set null,
  attempt_id uuid null references public.attempts(id) on delete set null,
  idempotency_key text not null unique check (char_length(idempotency_key) between 1 and 240),
  status text not null check (
    status in ('queued', 'claimed', 'processing', 'succeeded', 'failed_retryable', 'failed_terminal')
  ),
  priority smallint not null default 100,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 20),
  available_at timestamptz not null default now(),
  claimed_by text null check (claimed_by is null or char_length(claimed_by) <= 160),
  lease_expires_at timestamptz null,
  started_at timestamptz null,
  completed_at timestamptz null,
  error_code text null check (error_code is null or char_length(error_code) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.job_events (
  id bigint generated by default as identity primary key,
  job_id uuid not null references public.analysis_jobs(id) on delete cascade,
  event_type text not null check (char_length(event_type) between 1 and 120),
  worker_id text null check (worker_id is null or char_length(worker_id) <= 160),
  metadata jsonb null,
  created_at timestamptz not null default now()
);

create table public.product_events (
  id bigint generated by default as identity primary key,
  user_id uuid null references auth.users(id) on delete set null,
  project_id uuid null references public.projects(id) on delete set null,
  attempt_id uuid null references public.attempts(id) on delete set null,
  event_name text not null check (char_length(event_name) between 1 and 120),
  event_version smallint not null default 1 check (event_version >= 1),
  platform text null check (platform is null or platform in ('ios', 'android')),
  app_version text null check (app_version is null or char_length(app_version) <= 40),
  properties jsonb null,
  created_at timestamptz not null default now()
);

create table public.storage_cleanup_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  project_id_snapshot uuid null,
  bucket_id text not null check (bucket_id in ('dance-sources', 'dance-attempts', 'analysis-artifacts')),
  object_path text not null check (char_length(object_path) between 1 and 1024),
  status text not null check (
    status in ('queued', 'processing', 'succeeded', 'failed_retryable', 'failed_terminal')
  ),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  available_at timestamptz not null default now(),
  last_error_code text null check (last_error_code is null or char_length(last_error_code) <= 80),
  created_at timestamptz not null default now(),
  completed_at timestamptz null,
  constraint storage_cleanup_bucket_path_key unique (bucket_id, object_path)
);

create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  status text not null check (
    status in (
      'requested',
      'cleaning',
      'auth_delete_pending',
      'completed',
      'failed_retryable',
      'failed_terminal'
    )
  ),
  requested_at timestamptz not null default now(),
  completed_at timestamptz null,
  error_code text null check (error_code is null or char_length(error_code) <= 80)
);

-- URL import request persistence is intentionally deferred until a lawful,
-- allowlisted adapter is approved. Generic arbitrary URL fetch is not an MVP dependency.

create unique index projects_source_object_path_key
  on public.projects (source_object_path)
  where source_object_path is not null;

create index projects_user_deleted_updated_idx
  on public.projects (user_id, deleted_at, updated_at desc);
create index projects_user_status_idx
  on public.projects (user_id, status);
create index projects_active_reference_analysis_idx
  on public.projects (active_reference_analysis_id)
  where active_reference_analysis_id is not null;

create index reference_analyses_project_created_idx
  on public.reference_analyses (project_id, created_at desc);
create index reference_analyses_user_idx
  on public.reference_analyses (user_id);
create index reference_analyses_status_created_idx
  on public.reference_analyses (status, created_at);

create index sections_project_position_idx
  on public.sections (project_id, position);
create index sections_user_project_idx
  on public.sections (user_id, project_id);
create index sections_reference_analysis_idx
  on public.sections (reference_analysis_id);

create unique index attempts_object_path_key
  on public.attempts (object_path)
  where object_path is not null;
create index attempts_user_section_created_idx
  on public.attempts (user_id, section_id, created_at desc);
create index attempts_project_status_idx
  on public.attempts (project_id, status);
create index attempts_section_status_idx
  on public.attempts (section_id, status);

create index section_progress_user_project_idx
  on public.section_progress (user_id, project_id);
create index section_progress_project_completed_idx
  on public.section_progress (project_id, completed_at);
create index section_progress_best_attempt_idx
  on public.section_progress (best_attempt_id)
  where best_attempt_id is not null;

create index attempt_analyses_attempt_created_idx
  on public.attempt_analyses (attempt_id, created_at desc);
create index attempt_analyses_user_created_idx
  on public.attempt_analyses (user_id, created_at desc);
create index attempt_analyses_status_created_idx
  on public.attempt_analyses (status, created_at);
create index attempt_analyses_project_idx
  on public.attempt_analyses (project_id);
create index attempt_analyses_section_idx
  on public.attempt_analyses (section_id);
create index attempt_analyses_reference_idx
  on public.attempt_analyses (reference_analysis_id);

create index attempt_results_user_section_created_idx
  on public.attempt_results (user_id, section_id, created_at desc);
create index attempt_results_project_idx
  on public.attempt_results (project_id);
create index attempt_results_reference_idx
  on public.attempt_results (reference_analysis_id);

create index feedback_items_attempt_rank_idx
  on public.feedback_items (attempt_id, rank);
create index feedback_items_user_attempt_idx
  on public.feedback_items (user_id, attempt_id);

create index analysis_jobs_claim_idx
  on public.analysis_jobs (status, available_at, priority, created_at);
create index analysis_jobs_project_type_created_idx
  on public.analysis_jobs (project_id, job_type, created_at desc);
create index analysis_jobs_attempt_type_created_idx
  on public.analysis_jobs (attempt_id, job_type, created_at desc);
create index analysis_jobs_user_idx
  on public.analysis_jobs (user_id);
create index analysis_jobs_lease_expiry_idx
  on public.analysis_jobs (lease_expires_at)
  where status in ('claimed', 'processing');

create index job_events_job_created_idx
  on public.job_events (job_id, created_at);

create index product_events_name_created_idx
  on public.product_events (event_name, created_at);
create index product_events_user_created_idx
  on public.product_events (user_id, created_at);
create index product_events_project_idx
  on public.product_events (project_id)
  where project_id is not null;
create index product_events_attempt_idx
  on public.product_events (attempt_id)
  where attempt_id is not null;

create unique index account_deletion_requests_one_active_per_user_idx
  on public.account_deletion_requests (user_id)
  where status in ('requested', 'cleaning', 'auth_delete_pending', 'failed_retryable');

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger reference_analyses_set_updated_at
before update on public.reference_analyses
for each row execute function public.set_updated_at();

create trigger attempts_set_updated_at
before update on public.attempts
for each row execute function public.set_updated_at();

create trigger section_progress_set_updated_at
before update on public.section_progress
for each row execute function public.set_updated_at();

create trigger attempt_results_set_updated_at
before update on public.attempt_results
for each row execute function public.set_updated_at();

create trigger analysis_jobs_set_updated_at
before update on public.analysis_jobs
for each row execute function public.set_updated_at();

comment on table public.projects is 'Private user-owned dance choreography projects.';
comment on table public.reference_analyses is 'Service-written versioned reference pose analyses; no direct client access.';
comment on table public.sections is 'Ordered active/inactive practice segments derived from a reference analysis.';
comment on table public.section_progress is 'Trusted per-section progress and personal-best pointer.';
comment on table public.attempts is 'Private user dance-attempt metadata; media stays in private Storage.';
comment on table public.attempt_analyses is 'Service-only internal attempt comparison output.';
comment on table public.attempt_results is 'Sanitized owner-readable attempt result.';
comment on table public.feedback_items is 'Deterministic ranked coaching feedback tied to measured metrics.';
comment on table public.analysis_jobs is 'Service-only durable analysis and cleanup job queue.';
comment on table public.job_events is 'Short-retention operational events without raw media/body data.';
comment on table public.product_events is 'Privacy-safe beta funnel events written by trusted services.';
comment on table public.storage_cleanup_tasks is 'Durable idempotent Storage cleanup queue.';
comment on table public.account_deletion_requests is 'Deletion orchestration state that can outlive auth identity cleanup.';

commit;
