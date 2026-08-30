begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pgtap;

select extensions.plan(29);

select has_table(
  'public',
  'mission_command_receipts',
  'immutable mission command receipt table exists'
);

select has_function(
  'public',
  'execute_mission_command',
  array['text', 'text', 'bigint', 'uuid', 'timestamp with time zone'],
  'the command boundary requires an idempotency key and client timestamp'
);

select hasnt_function(
  'public',
  'complete_mission',
  array['uuid', 'uuid', 'bigint'],
  'the competing completion RPC is retired'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.execute_mission_command(text,text,bigint,uuid,timestamp with time zone)',
    'EXECUTE'
  ),
  true,
  'authenticated users can call the single command boundary'
);

select is(
  has_table_privilege('authenticated', 'public.mission_command_receipts', 'INSERT'),
  false,
  'clients cannot forge command receipts'
);

grant execute on function public.activate_protocol(
  uuid, text, integer, jsonb, jsonb, text, timestamptz, text, timestamptz
) to authenticated;

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
values (
  'a1000000-0000-0000-0000-000000000001',
  'idempotency@example.test',
  timezone('utc', now()),
  '{}'
);

set local role authenticated;
set local request.jwt.claim.sub = 'a1000000-0000-0000-0000-000000000001';
set local request.jwt.claim.role = 'authenticated';

select lives_ok(
  $$
    select * from public.activate_protocol(
      'a2000000-0000-0000-0000-000000000002',
      'retry_arc',
      2,
      '{"identity":{"fullName":"Retry Arc","heightCm":181,"weightKg":82,"unitSystem":"metric"},"relationship":{"status":"single"}}',
      '{"age":24,"gymAccess":"member","currentBuild":"average","targetBuild":"defined","relationshipGoal":"approach"}',
      '2026-08-27',
      timezone('utc', now())
    )
  $$,
  'the command fixture activates'
);

select results_eq(
  $$
    select command_result || ':' || execution_revision
    from public.execute_mission_command(
      'begin',
      (
        select mission.scheduled_key
        from public.plan_missions as mission
        join public.plan_days as day on day.id = mission.plan_day_id
        where mission.user_id = 'a1000000-0000-0000-0000-000000000001'
          and day.day_number = 1 and mission.ordinal = 1
      ),
      1,
      'a3000000-0000-4000-8000-000000000003',
      timezone('utc', now())
    )
  $$,
  array['active:2'::text],
  'a fresh command mutates once and stores revision two'
);

select results_eq(
  $$
    select command_result || ':' || execution_revision
    from public.execute_mission_command(
      'begin',
      (
        select mission.scheduled_key
        from public.plan_missions as mission
        join public.plan_days as day on day.id = mission.plan_day_id
        where mission.user_id = 'a1000000-0000-0000-0000-000000000001'
          and day.day_number = 1 and mission.ordinal = 1
      ),
      1,
      'a3000000-0000-4000-8000-000000000003',
      timezone('utc', now())
    )
  $$,
  array['active:2'::text],
  'a lost-response retry returns the original response despite the newer revision'
);

select results_eq(
  $$ select revision from public.arc_executions where user_id = 'a1000000-0000-0000-0000-000000000001' $$,
  array[2::bigint],
  'replaying a receipt does not mutate the execution again'
);

select results_eq(
  $$ select count(*)::bigint from public.mission_command_receipts $$,
  array[1::bigint],
  'a retry has exactly one receipt'
);

select throws_ok(
  $$
    select * from public.execute_mission_command(
      'pause',
      (
        select mission.scheduled_key
        from public.plan_missions as mission
        join public.plan_days as day on day.id = mission.plan_day_id
        where mission.user_id = 'a1000000-0000-0000-0000-000000000001'
          and day.day_number = 1 and mission.ordinal = 1
      ),
      1,
      'a3000000-0000-4000-8000-000000000003',
      timezone('utc', now())
    )
  $$,
  '22023',
  'Idempotency key reused with different input',
  'the same key cannot authorize different input'
);

select throws_ok(
  $$
    select * from public.execute_mission_command(
      'advance',
      (select scheduled_key from public.plan_missions where user_id = 'a1000000-0000-0000-0000-000000000001' and ordinal = 1 order by scheduled_key limit 1),
      2,
      'a4000000-0000-4000-8000-000000000004',
      timezone('utc', now()) + interval '6 minutes'
    )
  $$,
  '22023',
  'Client timestamp is outside the accepted window',
  'future-dated first attempts are rejected'
);

select throws_ok(
  $$
    select * from public.execute_mission_command(
      'advance',
      (select scheduled_key from public.plan_missions where user_id = 'a1000000-0000-0000-0000-000000000001' and ordinal = 1 order by scheduled_key limit 1),
      2,
      'a5000000-0000-4000-8000-000000000005',
      timezone('utc', now()) - interval '31 days'
    )
  $$,
  '22023',
  'Client timestamp is outside the accepted window',
  'unseen commands outside the offline window are rejected'
);

select lives_ok(
  $$
    select * from public.execute_mission_command(
      'advance',
      (select scheduled_key from public.plan_missions where user_id = 'a1000000-0000-0000-0000-000000000001' and ordinal = 1 order by scheduled_key limit 1),
      2,
      'a6000000-0000-4000-8000-000000000006',
      timezone('utc', now())
    )
  $$,
  'the first step advances with its own command identity'
);

select lives_ok(
  $$
    select * from public.execute_mission_command(
      'advance',
      (select scheduled_key from public.plan_missions where user_id = 'a1000000-0000-0000-0000-000000000001' and ordinal = 1 order by scheduled_key limit 1),
      3,
      'a7000000-0000-4000-8000-000000000007',
      timezone('utc', now())
    )
  $$,
  'the second step advances with its own command identity'
);

select results_eq(
  $$
    select command_result || ':' || execution_revision || ':' || awarded_xp
    from public.execute_mission_command(
      'advance',
      (select scheduled_key from public.plan_missions where user_id = 'a1000000-0000-0000-0000-000000000001' and ordinal = 1 order by scheduled_key limit 1),
      4,
      'a8000000-0000-4000-8000-000000000008',
      timezone('utc', now())
    )
  $$,
  array['completed:5:60'::text],
  'the terminal command awards only canonical XP'
);

select results_eq(
  $$
    select command_result || ':' || execution_revision || ':' || awarded_xp
    from public.execute_mission_command(
      'advance',
      (select scheduled_key from public.plan_missions where user_id = 'a1000000-0000-0000-0000-000000000001' and ordinal = 1 order by scheduled_key limit 1),
      4,
      'a8000000-0000-4000-8000-000000000008',
      timezone('utc', now())
    )
  $$,
  array['completed:5:60'::text],
  'a delayed completion replay returns the stored award'
);

select results_eq(
  $$ select count(*)::bigint from public.xp_ledger where user_id = 'a1000000-0000-0000-0000-000000000001' $$,
  array[1::bigint],
  'completion and replay create one ledger entry'
);

select results_eq(
  $$ select count(*)::bigint from public.mission_events where user_id = 'a1000000-0000-0000-0000-000000000001' and event_type = 'mission_completed' $$,
  array[1::bigint],
  'completion and replay create one terminal event'
);

select throws_ok(
  $$
    select * from public.execute_mission_command(
      'advance',
      (select scheduled_key from public.plan_missions where user_id = 'a1000000-0000-0000-0000-000000000001' and ordinal = 1 order by scheduled_key limit 1),
      4,
      'a9000000-0000-4000-8000-000000000009',
      timezone('utc', now())
    )
  $$,
  'PT409',
  'Execution revision conflict',
  'a rapid second identity at the stale revision loses the race'
);

select throws_ok(
  $$
    select * from public.execute_mission_command(
      'begin',
      'another-user.01.private-mission.core',
      5,
      'aa000000-0000-4000-8000-000000000010',
      timezone('utc', now())
    )
  $$,
  '22023',
  'Mission is not available today',
  'cross-user canonical targets are rejected'
);

select results_eq(
  $$ select total_xp from public.profiles_public where id = 'a1000000-0000-0000-0000-000000000001' $$,
  $$ select coalesce(sum(delta), 0)::bigint from public.xp_ledger where user_id = 'a1000000-0000-0000-0000-000000000001' $$,
  'the profile total equals the trusted ledger after retries'
);

select results_eq(
  $$ select count(*)::bigint from public.mission_command_receipts $$,
  array[4::bigint],
  'only the four accepted command identities have receipts'
);

select throws_ok(
  $$ update public.mission_command_receipts set total_xp = 9999 $$,
  '42501',
  null,
  'clients cannot alter stored command responses'
);

select results_eq(
  $$ select count(*)::bigint from public.mission_events where user_id = 'a1000000-0000-0000-0000-000000000001' $$,
  array[4::bigint],
  'each accepted state-changing command creates one audit event'
);

select results_eq(
  $$ select count(*)::bigint from public.mission_command_receipts where client_occurred_at = timezone('utc', now()) $$,
  array[4::bigint],
  'receipts preserve the bounded client timestamp'
);

select results_eq(
  $$ select count(*)::bigint from public.mission_events where client_occurred_at = timezone('utc', now()) $$,
  array[4::bigint],
  'audit events preserve the same client timestamp'
);

select results_eq(
  $$ select count(*)::bigint from public.mission_command_receipts where awarded_xp > 0 $$,
  array[1::bigint],
  'only the terminal receipt contains an XP award'
);

reset role;
update public.plans
set status = 'completed', completed_at = timezone('utc', now())
where user_id = 'a1000000-0000-0000-0000-000000000001';
set local role authenticated;
set local request.jwt.claim.sub = 'a1000000-0000-0000-0000-000000000001';
set local request.jwt.claim.role = 'authenticated';

select results_eq(
  $$
    select command_result || ':' || execution_revision || ':' || awarded_xp
    from public.execute_mission_command(
      'advance',
      (select scheduled_key from public.plan_missions where user_id = 'a1000000-0000-0000-0000-000000000001' and ordinal = 1 order by scheduled_key limit 1),
      4,
      'a8000000-0000-4000-8000-000000000008',
      timezone('utc', now())
    )
  $$,
  array['completed:5:60'::text],
  'an accepted receipt remains replayable after its plan becomes terminal'
);

select * from extensions.finish();
rollback;
