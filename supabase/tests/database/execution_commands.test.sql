begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pgtap;

select extensions.plan(20);

select has_function(
  'public',
  'execute_mission_command',
  array['text', 'text', 'bigint'],
  'revision-checked mission command RPC exists'
);

insert into auth.users (
  id,
  email,
  phone,
  email_confirmed_at,
  phone_confirmed_at,
  raw_user_meta_data
) values (
  '91000000-0000-0000-0000-000000000101',
  'execution-alpha@example.test',
  '+41790000303',
  timezone('utc', now()),
  timezone('utc', now()),
  '{}'
);

set local role authenticated;
set local request.jwt.claim.sub = '91000000-0000-0000-0000-000000000101';
set local request.jwt.claim.role = 'authenticated';

select lives_ok(
  $$
    select * from public.activate_protocol(
      '92000000-0000-0000-0000-000000000101',
      'execution_arc',
      2,
      '{"identity":{"fullName":"Execution Arc","heightCm":181,"weightKg":82,"unitSystem":"metric"},"relationship":{"status":"single"},"consent":{"guardianConfirmed":false}}',
      '{"age":19,"gymAccess":"member","currentBuild":"average","targetBuild":"defined","relationshipGoal":"approach"}',
      '2026-08-21',
      '2026-08-21T10:00:00Z'
    )
  $$,
  'a canonical plan is active for execution testing'
);

select lives_ok(
  $$
    select * from public.execute_mission_command(
      'begin',
      (
        select mission.scheduled_key
        from public.plan_missions as mission
        join public.plan_days as day on day.id = mission.plan_day_id
        where mission.user_id = '91000000-0000-0000-0000-000000000101'
          and day.day_number = 1
          and mission.ordinal = 1
      ),
      1
    )
  $$,
  'the first mission can begin at execution revision one'
);

select results_eq(
  $$ select mission_status || ':' || revision from public.arc_executions where user_id = '91000000-0000-0000-0000-000000000101' $$,
  array['active:2'::text],
  'begin atomically marks the execution active and increments its revision'
);

select lives_ok(
  $$
    select * from public.execute_mission_command(
      'begin',
      (
        select mission.scheduled_key
        from public.plan_missions as mission
        join public.plan_days as day on day.id = mission.plan_day_id
        where mission.user_id = '91000000-0000-0000-0000-000000000101'
          and day.day_number = 1
          and mission.ordinal = 1
      ),
      2
    )
  $$,
  'opening an already-active mission is an idempotent no-op'
);

select results_eq(
  $$ select revision from public.arc_executions where user_id = '91000000-0000-0000-0000-000000000101' $$,
  array[2::bigint],
  'the idempotent begin does not consume another revision'
);

select lives_ok(
  $$
    select * from public.execute_mission_command(
      'advance',
      (select scheduled_key from public.plan_missions where user_id = '91000000-0000-0000-0000-000000000101' and ordinal = 1 order by scheduled_key limit 1),
      2
    )
  $$,
  'the first mission step advances'
);

select results_eq(
  $$ select current_step_index || ':' || revision from public.arc_executions where user_id = '91000000-0000-0000-0000-000000000101' $$,
  array['1:3'::text],
  'step advancement is reflected in the execution aggregate'
);

select lives_ok(
  $$
    select * from public.execute_mission_command(
      'advance',
      (select scheduled_key from public.plan_missions where user_id = '91000000-0000-0000-0000-000000000101' and ordinal = 1 order by scheduled_key limit 1),
      3
    )
  $$,
  'the final mission step becomes active'
);

select results_eq(
  $$ select current_step_index || ':' || revision from public.arc_executions where user_id = '91000000-0000-0000-0000-000000000101' $$,
  array['2:4'::text],
  'the server reaches the canonical last-step index once'
);

select lives_ok(
  $$
    select * from public.execute_mission_command(
      'advance',
      (select scheduled_key from public.plan_missions where user_id = '91000000-0000-0000-0000-000000000101' and ordinal = 1 order by scheduled_key limit 1),
      4
    )
  $$,
  'advancing the last step completes the mission'
);

select results_eq(
  $$ select total_xp from public.profiles_public where id = '91000000-0000-0000-0000-000000000101' $$,
  array[60::bigint],
  'completion awards only the canonical server XP'
);

select results_eq(
  $$ select count(*)::bigint from public.xp_ledger where user_id = '91000000-0000-0000-0000-000000000101' $$,
  array[1::bigint],
  'completion creates exactly one trusted XP ledger entry'
);

select throws_ok(
  $$
    select * from public.execute_mission_command(
      'advance',
      (select scheduled_key from public.plan_missions where user_id = '91000000-0000-0000-0000-000000000101' and ordinal = 1 order by scheduled_key limit 1),
      4
    )
  $$,
  '40001',
  'Execution revision conflict',
  'a stale retry cannot complete or award XP twice'
);

select lives_ok(
  $$
    select * from public.execute_mission_command(
      'begin',
      (
        select mission.scheduled_key
        from public.plan_missions as mission
        join public.plan_days as day on day.id = mission.plan_day_id
        where mission.user_id = '91000000-0000-0000-0000-000000000101'
          and day.day_number = 1
          and mission.ordinal = 2
      ),
      5
    )
  $$,
  'the next mission unlocks after the first is complete'
);

select lives_ok(
  $$
    select * from public.execute_mission_command(
      'skip',
      (
        select mission.scheduled_key
        from public.plan_missions as mission
        join public.plan_days as day on day.id = mission.plan_day_id
        where mission.user_id = '91000000-0000-0000-0000-000000000101'
          and day.day_number = 1
          and mission.ordinal = 2
      ),
      6
    )
  $$,
  'the active mission can be honestly recorded as skipped'
);

select lives_ok(
  $$ select * from public.execute_mission_command('close_day', null, 7) $$,
  'a fully resolved day can be sealed'
);

select results_eq(
  $$ select active_day || ':' || revision from public.arc_executions where user_id = '91000000-0000-0000-0000-000000000101' $$,
  array['2:8'::text],
  'closing day one advances the canonical execution to day two'
);

select results_eq(
  $$
    select string_agg(day.day_number || ':' || progress.status, ',' order by day.day_number)
    from public.day_progress as progress
    join public.plan_days as day on day.id = progress.plan_day_id
    where progress.user_id = '91000000-0000-0000-0000-000000000101'
      and day.day_number in (1, 2)
  $$,
  array['1:sealed,2:available'::text],
  'day closure seals the old day and unlocks only the next day'
);

select results_eq(
  $$ select count(*)::bigint from public.mission_events where user_id = '91000000-0000-0000-0000-000000000101' $$,
  array[6::bigint],
  'the append-only audit trail records each real mission mutation once'
);

select * from extensions.finish();
rollback;
