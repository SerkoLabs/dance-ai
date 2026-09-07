-- Dance AI authorization boundary
-- Phase 2 / P2-02
-- Sources reviewed 2026-09-07:
-- https://supabase.com/docs/guides/database/postgres/row-level-security
-- https://supabase.com/docs/guides/storage/buckets/creating-buckets
-- https://supabase.com/docs/guides/storage/schema/helper-functions
-- https://supabase.com/docs/guides/storage/schema/design

begin;

-- ---------------------------------------------------------------------------
-- Application-table RLS and grants
-- ---------------------------------------------------------------------------

alter table public.projects enable row level security;
alter table public.reference_analyses enable row level security;
alter table public.sections enable row level security;
alter table public.attempts enable row level security;
alter table public.section_progress enable row level security;
alter table public.attempt_analyses enable row level security;
alter table public.attempt_results enable row level security;
alter table public.feedback_items enable row level security;
alter table public.analysis_jobs enable row level security;
alter table public.job_events enable row level security;
alter table public.product_events enable row level security;
alter table public.storage_cleanup_tasks enable row level security;
alter table public.account_deletion_requests enable row level security;

revoke all privileges on table public.projects from anon, authenticated;
revoke all privileges on table public.reference_analyses from anon, authenticated;
revoke all privileges on table public.sections from anon, authenticated;
revoke all privileges on table public.attempts from anon, authenticated;
revoke all privileges on table public.section_progress from anon, authenticated;
revoke all privileges on table public.attempt_analyses from anon, authenticated;
revoke all privileges on table public.attempt_results from anon, authenticated;
revoke all privileges on table public.feedback_items from anon, authenticated;
revoke all privileges on table public.analysis_jobs from anon, authenticated;
revoke all privileges on table public.job_events from anon, authenticated;
revoke all privileges on table public.product_events from anon, authenticated;
revoke all privileges on table public.storage_cleanup_tasks from anon, authenticated;
revoke all privileges on table public.account_deletion_requests from anon, authenticated;

-- Owner-readable tables are intentionally SELECT-only from the Data API.
grant select on table public.projects to authenticated;
grant select on table public.sections to authenticated;
grant select on table public.section_progress to authenticated;
grant select on table public.attempts to authenticated;
grant select on table public.attempt_results to authenticated;
grant select on table public.feedback_items to authenticated;

create policy projects_select_own_active
on public.projects
for select
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and deleted_at is null
);

create policy sections_select_own_active_reference
on public.sections
for select
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and exists (
    select 1
    from public.projects p
    where p.id = sections.project_id
      and p.user_id = (select auth.uid())
      and p.deleted_at is null
      and p.active_reference_analysis_id = sections.reference_analysis_id
  )
);

create policy section_progress_select_own_visible_project
on public.section_progress
for select
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and exists (
    select 1
    from public.projects p
    where p.id = section_progress.project_id
      and p.user_id = (select auth.uid())
      and p.deleted_at is null
  )
);

create policy attempts_select_own_visible_project
on public.attempts
for select
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and deleted_at is null
  and exists (
    select 1
    from public.projects p
    where p.id = attempts.project_id
      and p.user_id = (select auth.uid())
      and p.deleted_at is null
  )
);

create policy attempt_results_select_own_visible_attempt
on public.attempt_results
for select
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and exists (
    select 1
    from public.attempts a
    join public.projects p on p.id = a.project_id
    where a.id = attempt_results.attempt_id
      and a.user_id = (select auth.uid())
      and a.deleted_at is null
      and p.user_id = (select auth.uid())
      and p.deleted_at is null
  )
);

create policy feedback_items_select_own_visible_attempt
on public.feedback_items
for select
to authenticated
using (
  (select auth.uid()) is not null
  and user_id = (select auth.uid())
  and exists (
    select 1
    from public.attempts a
    join public.projects p on p.id = a.project_id
    where a.id = feedback_items.attempt_id
      and a.user_id = (select auth.uid())
      and a.deleted_at is null
      and p.user_id = (select auth.uid())
      and p.deleted_at is null
  )
);

-- No client policies are created for internal/service tables. With RLS enabled
-- and no anon/authenticated grants they remain inaccessible through the Data API.

-- ---------------------------------------------------------------------------
-- Private Storage buckets
-- ---------------------------------------------------------------------------
-- Supabase officially supports creating buckets via SQL. Object mutations still
-- happen only through the Storage API; storage.objects is treated as metadata.
-- MIME allowlists are deliberately left null until Phase 3 real-device media
-- compatibility tests finalize the exact supported set. Edge Functions and the
-- worker must validate MIME/container before trusting an uploaded object.

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('dance-sources', 'dance-sources', false, 52428800),
  ('dance-attempts', 'dance-attempts', false, 26214400),
  ('analysis-artifacts', 'analysis-artifacts', false, 52428800)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

-- Canonical source object path:
-- <user_uuid>/<project_uuid>/<immutable_object_uuid>.<ext>
create policy dance_sources_insert_own_prefix
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'dance-sources'
  and (select auth.uid()) is not null
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and array_length(storage.foldername(name), 1) = 2
);

create policy dance_sources_select_own_prefix
on storage.objects
for select
to authenticated
using (
  bucket_id = 'dance-sources'
  and (select auth.uid()) is not null
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and array_length(storage.foldername(name), 1) = 2
);

-- Canonical attempt object path:
-- <user_uuid>/<project_uuid>/<section_uuid>/<attempt_uuid>.<ext>
create policy dance_attempts_insert_own_prefix
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'dance-attempts'
  and (select auth.uid()) is not null
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and array_length(storage.foldername(name), 1) = 3
);

create policy dance_attempts_select_own_prefix
on storage.objects
for select
to authenticated
using (
  bucket_id = 'dance-attempts'
  and (select auth.uid()) is not null
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and array_length(storage.foldername(name), 1) = 3
);

-- Intentionally no authenticated UPDATE or DELETE policies for either user
-- media bucket. analysis-artifacts has no anon/authenticated policies at all.
-- Physical deletion is performed by trusted Storage API calls after durable
-- cleanup work is recorded.

commit;
