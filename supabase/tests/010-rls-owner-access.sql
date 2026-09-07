begin;

select plan(21);

-- Fixed test identities avoid reliance on network-installed helper packages.
insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated',
    'dance-a@test.local', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated',
    'dance-b@test.local', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  );

insert into public.projects (id, user_id, source_kind, status, display_name) values
  ('00000000-0000-4000-8000-000000000101', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'device', 'ready', 'A active'),
  ('00000000-0000-4000-8000-000000000102', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'device', 'deleting', 'A deleted'),
  ('00000000-0000-4000-8000-000000000201', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'device', 'ready', 'B active');

update public.projects set deleted_at = now()
where id = '00000000-0000-4000-8000-000000000102';

insert into public.reference_analyses (
  id, project_id, user_id, status, pipeline_version, pose_model_version,
  segmentation_version, sampling_fps, segmentation_confidence
) values
  ('00000000-0000-4000-8000-000000001101', '00000000-0000-4000-8000-000000000101', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'succeeded', 'test-pipeline', 'test-pose', 'test-segment', 12, 'high'),
  ('00000000-0000-4000-8000-000000001102', '00000000-0000-4000-8000-000000000101', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'succeeded', 'old-pipeline', 'test-pose', 'test-segment', 12, 'high');

update public.projects
set active_reference_analysis_id = '00000000-0000-4000-8000-000000001101'
where id = '00000000-0000-4000-8000-000000000101';

insert into public.sections (
  id, project_id, reference_analysis_id, user_id, position, start_ms, end_ms, segmentation_confidence
) values
  ('00000000-0000-4000-8000-000000002101', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000001101', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1, 0, 5000, 'high'),
  ('00000000-0000-4000-8000-000000002102', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000001102', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1, 0, 4000, 'medium');

insert into public.attempts (
  id, user_id, project_id, section_id, status, practice_mirrored, camera_facing, attempt_number
) values (
  '00000000-0000-4000-8000-000000003101', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000002101',
  'succeeded', false, 'front', 1
);

insert into public.section_progress (
  section_id, project_id, user_id, best_attempt_id, best_score, valid_attempt_count, completed_at, completion_mode
) values (
  '00000000-0000-4000-8000-000000002101', '00000000-0000-4000-8000-000000000101',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '00000000-0000-4000-8000-000000003101',
  84.25, 1, now(), 'threshold'
);

insert into public.attempt_results (
  attempt_id, user_id, project_id, section_id, reference_analysis_id, scoring_version,
  result_state, overall_score, movement_score, timing_score, confidence,
  is_personal_best, meets_completion_threshold
) values (
  '00000000-0000-4000-8000-000000003101', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000002101',
  '00000000-0000-4000-8000-000000001101', 'score-v1', 'valid', 84.25, 88.00, 80.50,
  0.95, true, true
);

insert into public.feedback_items (
  id, attempt_id, user_id, rank, message, metric_key, confidence, rule_version
) values (
  '00000000-0000-4000-8000-000000004101', '00000000-0000-4000-8000-000000003101',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1, 'Sağ dirseğini biraz daha yukarı kaldır.',
  'right_elbow_height', 0.92, 'rules-v1'
);

insert into public.analysis_jobs (
  id, job_type, user_id, project_id, idempotency_key, status, max_attempts
) values (
  '00000000-0000-4000-8000-000000005101', 'reference_analysis',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '00000000-0000-4000-8000-000000000101',
  'rls-test-internal-job', 'queued', 3
);

insert into storage.objects (bucket_id, name, owner_id) values
  ('dance-sources', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/00000000-0000-4000-8000-000000000101/source-a.mp4', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('dance-sources', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/00000000-0000-4000-8000-000000000201/source-b.mp4', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  ('dance-attempts', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/00000000-0000-4000-8000-000000000101/00000000-0000-4000-8000-000000002101/attempt-a.mp4', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}', true);

select is((select count(*)::integer from public.projects), 1, 'A sees only own active project');
select is((select count(*)::integer from public.sections), 1, 'A sees only active-reference section');
select is((select count(*)::integer from public.section_progress), 1, 'A sees own progress');
select is((select count(*)::integer from public.attempts), 1, 'A sees own active attempt');
select is((select count(*)::integer from public.attempt_results), 1, 'A sees own result');
select is((select count(*)::integer from public.feedback_items), 1, 'A sees own feedback');
select throws_ok($$insert into public.projects (user_id, source_kind, status) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'device', 'uploading')$$, 'Authenticated client cannot insert projects directly');
select throws_ok($$update public.projects set status = 'ready' where id = '00000000-0000-4000-8000-000000000101'$$, 'Authenticated client cannot forge project status');
select throws_ok($$delete from public.projects where id = '00000000-0000-4000-8000-000000000101'$$, 'Authenticated client cannot delete project rows directly');
select throws_ok($$select count(*) from public.reference_analyses$$, 'Authenticated client cannot read reference analyses');
select throws_ok($$select count(*) from public.analysis_jobs$$, 'Authenticated client cannot read analysis jobs');
select is((select count(*)::integer from storage.objects where bucket_id = 'dance-sources'), 1, 'A sees only own source metadata');
select is((select count(*)::integer from storage.objects where bucket_id = 'dance-attempts'), 1, 'A sees own attempt metadata');
select lives_ok($$insert into storage.objects (bucket_id, name) values ('dance-sources', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/00000000-0000-4000-8000-000000000101/new-a.mp4')$$, 'A can insert under own canonical source prefix');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('dance-sources', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/00000000-0000-4000-8000-000000000201/forged.mp4')$$, 'A cannot insert under B source prefix');
select throws_ok($$delete from storage.objects where bucket_id = 'dance-sources'$$, 'A cannot directly delete source objects');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}', true);
select is((select count(*)::integer from public.projects where id = '00000000-0000-4000-8000-000000000101'), 0, 'B cannot see A project');
select is((select count(*)::integer from public.sections), 0, 'B cannot see A sections');
select is((select count(*)::integer from public.attempts), 0, 'B cannot see A attempts');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$select count(*) from public.projects$$, 'Anon has no projects table privilege');
select is((select count(*)::integer from storage.objects where bucket_id in ('dance-sources', 'dance-attempts')), 0, 'Anon reads no private Storage metadata');

reset role;
select * from finish();
rollback;
