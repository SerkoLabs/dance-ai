-- Dance AI durable analysis-job helpers
-- Phase 2 / P2-03
-- Security-definer functions live outside exposed public schema, pin search_path,
-- and are executable only by service_role.

begin;

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;
grant usage on schema private to service_role;

create or replace function private.claim_analysis_job(
  p_worker_id text,
  p_lease_seconds integer default 300
)
returns setof public.analysis_jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_worker_id is null or btrim(p_worker_id) = '' or char_length(p_worker_id) > 160 then
    raise exception 'invalid worker id' using errcode = '22023';
  end if;

  if p_lease_seconds < 30 or p_lease_seconds > 3600 then
    raise exception 'lease seconds out of range' using errcode = '22023';
  end if;

  -- Exhausted leases become terminal before recovery.
  update public.analysis_jobs
  set
    status = 'failed_terminal',
    claimed_by = null,
    lease_expires_at = null,
    completed_at = coalesce(completed_at, now()),
    error_code = coalesce(error_code, 'retry_exhausted'),
    updated_at = now()
  where status in ('claimed', 'processing')
    and lease_expires_at is not null
    and lease_expires_at <= now()
    and attempt_count >= max_attempts;

  -- Recover abandoned leases that still have retry budget.
  update public.analysis_jobs
  set
    status = 'queued',
    claimed_by = null,
    lease_expires_at = null,
    available_at = now(),
    error_code = coalesce(error_code, 'lease_expired'),
    updated_at = now()
  where status in ('claimed', 'processing')
    and lease_expires_at is not null
    and lease_expires_at <= now()
    and attempt_count < max_attempts;

  -- Retryable jobs become queue-eligible only after their backoff expires.
  update public.analysis_jobs
  set
    status = 'queued',
    claimed_by = null,
    lease_expires_at = null,
    updated_at = now()
  where status = 'failed_retryable'
    and available_at <= now()
    and attempt_count < max_attempts;

  return query
  with candidate as (
    select j.id
    from public.analysis_jobs j
    where j.status = 'queued'
      and j.available_at <= now()
      and j.attempt_count < j.max_attempts
    order by j.priority asc, j.available_at asc, j.created_at asc
    for update skip locked
    limit 1
  )
  update public.analysis_jobs j
  set
    status = 'claimed',
    claimed_by = p_worker_id,
    attempt_count = j.attempt_count + 1,
    lease_expires_at = now() + make_interval(secs => p_lease_seconds),
    started_at = coalesce(j.started_at, now()),
    completed_at = null,
    error_code = null,
    updated_at = now()
  from candidate c
  where j.id = c.id
  returning j.*;
end;
$$;

create or replace function private.mark_analysis_job_processing(
  p_job_id uuid,
  p_worker_id text
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with changed as (
    update public.analysis_jobs j
    set
      status = 'processing',
      updated_at = now()
    where j.id = p_job_id
      and j.status = 'claimed'
      and j.claimed_by = p_worker_id
      and j.lease_expires_at is not null
      and j.lease_expires_at > now()
    returning 1
  )
  select exists(select 1 from changed);
$$;

create or replace function private.renew_analysis_job_lease(
  p_job_id uuid,
  p_worker_id text,
  p_lease_seconds integer default 300
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_changed boolean;
begin
  if p_worker_id is null or btrim(p_worker_id) = '' or char_length(p_worker_id) > 160 then
    raise exception 'invalid worker id' using errcode = '22023';
  end if;

  if p_lease_seconds < 30 or p_lease_seconds > 3600 then
    raise exception 'lease seconds out of range' using errcode = '22023';
  end if;

  with changed as (
    update public.analysis_jobs j
    set
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      updated_at = now()
    where j.id = p_job_id
      and j.status in ('claimed', 'processing')
      and j.claimed_by = p_worker_id
      and j.lease_expires_at is not null
      and j.lease_expires_at > now()
    returning 1
  )
  select exists(select 1 from changed) into v_changed;

  return v_changed;
end;
$$;

create or replace function private.complete_analysis_job(
  p_job_id uuid,
  p_worker_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_claimed_by text;
begin
  select j.status, j.claimed_by
  into v_status, v_claimed_by
  from public.analysis_jobs j
  where j.id = p_job_id
  for update;

  if not found then
    return false;
  end if;

  -- Idempotent repeat completion is successful without rewriting timestamps.
  if v_status = 'succeeded' then
    return true;
  end if;

  if v_status not in ('claimed', 'processing') or v_claimed_by is distinct from p_worker_id then
    return false;
  end if;

  update public.analysis_jobs
  set
    status = 'succeeded',
    claimed_by = null,
    lease_expires_at = null,
    completed_at = now(),
    error_code = null,
    updated_at = now()
  where id = p_job_id;

  return true;
end;
$$;

create or replace function private.fail_analysis_job(
  p_job_id uuid,
  p_worker_id text,
  p_error_code text,
  p_retryable boolean,
  p_retry_after_seconds integer default 30
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.analysis_jobs%rowtype;
  v_next_status text;
begin
  if p_error_code is null or btrim(p_error_code) = '' or char_length(p_error_code) > 80 then
    raise exception 'invalid error code' using errcode = '22023';
  end if;

  if p_retry_after_seconds < 0 or p_retry_after_seconds > 86400 then
    raise exception 'retry delay out of range' using errcode = '22023';
  end if;

  select *
  into v_job
  from public.analysis_jobs j
  where j.id = p_job_id
  for update;

  if not found then
    return null;
  end if;

  if v_job.status in ('failed_terminal', 'succeeded') then
    return v_job.status;
  end if;

  if v_job.status not in ('claimed', 'processing') or v_job.claimed_by is distinct from p_worker_id then
    return null;
  end if;

  if p_retryable and v_job.attempt_count < v_job.max_attempts then
    v_next_status := 'failed_retryable';
  else
    v_next_status := 'failed_terminal';
  end if;

  update public.analysis_jobs
  set
    status = v_next_status,
    claimed_by = null,
    lease_expires_at = null,
    available_at = case
      when v_next_status = 'failed_retryable'
        then now() + make_interval(secs => p_retry_after_seconds)
      else available_at
    end,
    completed_at = case when v_next_status = 'failed_terminal' then now() else null end,
    error_code = p_error_code,
    updated_at = now()
  where id = p_job_id;

  return v_next_status;
end;
$$;

revoke all on function private.claim_analysis_job(text, integer) from public, anon, authenticated;
revoke all on function private.mark_analysis_job_processing(uuid, text) from public, anon, authenticated;
revoke all on function private.renew_analysis_job_lease(uuid, text, integer) from public, anon, authenticated;
revoke all on function private.complete_analysis_job(uuid, text) from public, anon, authenticated;
revoke all on function private.fail_analysis_job(uuid, text, text, boolean, integer) from public, anon, authenticated;

grant execute on function private.claim_analysis_job(text, integer) to service_role;
grant execute on function private.mark_analysis_job_processing(uuid, text) to service_role;
grant execute on function private.renew_analysis_job_lease(uuid, text, integer) to service_role;
grant execute on function private.complete_analysis_job(uuid, text) to service_role;
grant execute on function private.fail_analysis_job(uuid, text, text, boolean, integer) to service_role;

commit;
