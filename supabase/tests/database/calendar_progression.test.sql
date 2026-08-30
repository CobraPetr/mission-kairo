begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pgtap;

select extensions.plan(23);

select has_column('public', 'plans', 'time_zone', 'plans persist their activation time zone');
select has_column('public', 'plan_days', 'scheduled_for', 'plan days persist a real calendar date');
select col_not_null('public', 'plan_days', 'scheduled_for', 'every generated plan day must be dated');
select has_function('public', 'sync_execution_calendar', array[]::text[], 'calendar sync RPC exists');

select is(
  has_function_privilege('authenticated', 'public.sync_execution_calendar()', 'EXECUTE'),
  true,
  'authenticated users can synchronize their own calendar'
);

select is(
  has_function_privilege('anon', 'public.sync_execution_calendar()', 'EXECUTE'),
  false,
  'anonymous clients cannot synchronize a calendar'
);

select is(
  has_function_privilege('service_role', 'public.set_plan_time_zone(uuid,uuid,text)', 'EXECUTE'),
  true,
  'the trusted activation service can anchor a plan time zone'
);

select is(
  has_function_privilege('authenticated', 'public.set_plan_time_zone(uuid,uuid,text)', 'EXECUTE'),
  false,
  'clients cannot rewrite a plan time zone'
);

grant execute on function public.activate_protocol(
  uuid, text, integer, jsonb, jsonb, text, timestamptz, text, timestamptz
) to authenticated;

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
values (
  'b1000000-0000-0000-0000-000000000001',
  'calendar@example.test',
  timezone('utc', now()),
  '{}'
);

set local role authenticated;
set local request.jwt.claim.sub = 'b1000000-0000-0000-0000-000000000001';
set local request.jwt.claim.role = 'authenticated';

select lives_ok(
  $$
    select * from public.activate_protocol(
      'b2000000-0000-0000-0000-000000000002',
      'calendar_arc',
      2,
      '{"identity":{"fullName":"Calendar Arc","heightCm":181,"weightKg":82,"unitSystem":"metric"},"relationship":{"status":"single"}}',
      '{"age":24,"gymAccess":"member","currentBuild":"average","targetBuild":"defined","relationshipGoal":"approach"}',
      '2026-08-27',
      timezone('utc', now())
    )
  $$,
  'the calendar fixture activates'
);

reset role;

select results_eq(
  $$
    select count(*) || ':' || count(distinct scheduled_for) || ':' || (max(scheduled_for) - min(scheduled_for))
    from public.plan_days
    where user_id = 'b1000000-0000-0000-0000-000000000001'
  $$,
  array['90:90:89'::text],
  'the protocol owns 90 unique consecutive calendar dates'
);

select lives_ok(
  $$
    select public.set_plan_time_zone(
      'b1000000-0000-0000-0000-000000000001',
      (select id from public.plans where user_id = 'b1000000-0000-0000-0000-000000000001'),
      'Europe/Zurich'
    )
  $$,
  'a canonical IANA time zone can anchor the calendar'
);

select results_eq(
  $$ select time_zone from public.plans where user_id = 'b1000000-0000-0000-0000-000000000001' $$,
  array['Europe/Zurich'::text],
  'the selected activation time zone is persisted'
);

select lives_ok(
  $$
    select public.set_plan_time_zone(
      'b1000000-0000-0000-0000-000000000001',
      (select id from public.plans where user_id = 'b1000000-0000-0000-0000-000000000001'),
      'Europe/Zurich'
    )
  $$,
  'an activation retry with the same time zone is idempotent'
);

select throws_ok(
  $$
    select public.set_plan_time_zone(
      'b1000000-0000-0000-0000-000000000001',
      (select id from public.plans where user_id = 'b1000000-0000-0000-0000-000000000001'),
      'America/New_York'
    )
  $$,
  '22023',
  'Plan time zone is already anchored',
  'an activation retry cannot move an established 90-day calendar'
);

select throws_ok(
  $$
    select public.set_plan_time_zone(
      'b1000000-0000-0000-0000-000000000001',
      (select id from public.plans where user_id = 'b1000000-0000-0000-0000-000000000001'),
      'Not/A_TimeZone'
    )
  $$,
  '22023',
  'Invalid activation time zone',
  'an invalid time zone cannot corrupt the calendar'
);

update public.profiles_public
set current_streak = 5
where id = 'b1000000-0000-0000-0000-000000000001';

select results_eq(
  $$
    select active_day || ':' || calendar_changed || ':' || execution_revision
    from private.sync_execution_calendar_for(
      'b1000000-0000-0000-0000-000000000001',
      (
        select min(scheduled_for) + 2
        from public.plan_days
        where user_id = 'b1000000-0000-0000-0000-000000000001'
      )
    )
  $$,
  array['3:true:2'::text],
  'calendar sync advances to the real date exactly once'
);

select results_eq(
  $$
    select string_agg(day.day_number || ':' || progress.status, ',' order by day.day_number)
    from public.day_progress as progress
    join public.plan_days as day on day.id = progress.plan_day_id
    where progress.user_id = 'b1000000-0000-0000-0000-000000000001'
      and day.day_number <= 3
  $$,
  array['1:missed,2:missed,3:available'::text],
  'elapsed unresolved days become missed while only today unlocks'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.mission_progress as progress
    join public.plan_missions as mission on mission.id = progress.plan_mission_id
    join public.plan_days as day on day.id = mission.plan_day_id
    where progress.user_id = 'b1000000-0000-0000-0000-000000000001'
      and day.day_number < 3
      and progress.status = 'skipped'
  $$,
  $$
    select count(*)::bigint
    from public.plan_missions as mission
    join public.plan_days as day on day.id = mission.plan_day_id
    where mission.user_id = 'b1000000-0000-0000-0000-000000000001'
      and day.day_number < 3
  $$,
  'every unresolved mission on a missed day is closed without XP'
);

select results_eq(
  $$
    select count(*)::bigint
    from public.mission_progress as progress
    join public.plan_missions as mission on mission.id = progress.plan_mission_id
    join public.plan_days as day on day.id = mission.plan_day_id
    where progress.user_id = 'b1000000-0000-0000-0000-000000000001'
      and day.day_number = 3
      and progress.status <> 'available'
  $$,
  array[0::bigint],
  'all missions for the current calendar day become available'
);

select results_eq(
  $$ select current_streak from public.profiles_public where id = 'b1000000-0000-0000-0000-000000000001' $$,
  array[0::integer],
  'missing a day resets the current streak'
);

select results_eq(
  $$ select count(*)::bigint from public.xp_ledger where user_id = 'b1000000-0000-0000-0000-000000000001' $$,
  array[0::bigint],
  'calendar expiry never awards XP'
);

select results_eq(
  $$
    select active_day || ':' || calendar_changed || ':' || execution_revision
    from private.sync_execution_calendar_for(
      'b1000000-0000-0000-0000-000000000001',
      (
        select min(scheduled_for) + 2
        from public.plan_days
        where user_id = 'b1000000-0000-0000-0000-000000000001'
      )
    )
  $$,
  array['3:false:2'::text],
  'repeating calendar sync is an idempotent no-op'
);

select throws_ok(
  $$
    update public.arc_executions
    set active_day = active_day + 2
    where user_id = 'b1000000-0000-0000-0000-000000000001'
  $$,
  '23514',
  'Invalid active day transition',
  'clients and internal callers cannot manually speed-run the protocol'
);

select * from extensions.finish();
rollback;
