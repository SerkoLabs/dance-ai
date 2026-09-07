begin;

select plan(10);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'authenticated', 'authenticated',
  'queue-user@test.local', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
);

insert into public.projects (id, user_id, source_kind, status)
values ('00000000-0000-4000-8000-000000010101', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'device', 'queued');

insert into public.analysis_jobs (
  id, job_type, user_id, project_id, idempotency_key, status, max_attempts, priority
) values
  ('00000000-0000-4000-8000-000000011101', 'reference_analysis', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', '00000000-0000-4000-8000-000000010101', 'queue-test-1', 'queued', 3, 1),
  ('00000000-0000-4000-8000-000000011102', 'storage_cleanup', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', '00000000-0000-4000-8000-000000010101', 'queue-test-2', 'queued', 3, 50);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}', true);
select throws_ok($$select * from private.claim_analysis_job('attacker', 300)$$, 'Authenticated caller cannot execute service-only claim function');

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

select results_eq(
  $$select id from private.claim_analysis_job('worker-a', 300)$$,
  $$values ('00000000-0000-4000-8000-000000011101'::uuid)$$,
  'Highest-priority eligible job is claimed first'
);
select is(private.mark_analysis_job_processing('00000000-0000-4000-8000-000000011101', 'worker-a'), true, 'Current claimant can mark job processing');
select is(private.renew_analysis_job_lease('00000000-0000-4000-8000-000000011101', 'worker-a', 300), true, 'Current claimant can renew lease');
select is(private.complete_analysis_job('00000000-0000-4000-8000-000000011101', 'worker-a'), true, 'Claimant can complete job');
select is(private.complete_analysis_job('00000000-0000-4000-8000-000000011101', 'worker-a'), true, 'Duplicate completion is idempotent');
select results_eq(
  $$select id from private.claim_analysis_job('worker-a', 300)$$,
  $$values ('00000000-0000-4000-8000-000000011102'::uuid)$$,
  'Second claim does not return succeeded job'
);

update public.analysis_jobs set lease_expires_at = now() - interval '1 second'
where id = '00000000-0000-4000-8000-000000011102';

select results_eq(
  $$select id from private.claim_analysis_job('worker-b', 300)$$,
  $$values ('00000000-0000-4000-8000-000000011102'::uuid)$$,
  'Expired lease is recoverable by another worker'
);
select is((select attempt_count from public.analysis_jobs where id = '00000000-0000-4000-8000-000000011102'), 2, 'Recovery increments attempt count once');
select is(
  private.fail_analysis_job('00000000-0000-4000-8000-000000011102', 'worker-b', 'temporary_test_error', true, 30),
  'failed_retryable',
  'Retryable failure enters backoff while budget remains'
);

reset role;
select * from finish();
rollback;
