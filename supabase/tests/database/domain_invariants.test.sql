begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pgtap;

select extensions.plan(36);

select has_function(
  'private',
  'detect_xp_drift',
  array[]::text[],
  'XP drift detector exists'
);

select has_function(
  'private',
  'reconcile_profile_total_xp',
  array['uuid'],
  'XP reconciliation function exists'
);

select is(
  has_function_privilege('authenticated', 'private.detect_xp_drift()', 'EXECUTE'),
  false,
  'clients cannot execute the private XP drift detector'
);

grant execute on function public.activate_protocol(
  uuid, text, integer, jsonb, jsonb, text, timestamptz, text, timestamptz
) to authenticated;

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
values (
  'd1000000-0000-0000-0000-000000000001',
  'domain-invariants@example.test',
  timezone('utc', now()),
  '{}'
);

set local role authenticated;
set local request.jwt.claim.sub = 'd1000000-0000-0000-0000-000000000001';
set local request.jwt.claim.role = 'authenticated';

select lives_ok(
  $$
    select * from public.activate_protocol(
      'd2000000-0000-0000-0000-000000000002',
      'domain_guard',
      2,
      '{"identity":{"fullName":"Domain Guard","heightCm":181,"weightKg":82,"unitSystem":"metric"},"relationship":{"status":"single"}}',
      '{"age":24,"gymAccess":"member","currentBuild":"average","targetBuild":"defined","relationshipGoal":"approach"}',
      '2026-08-21',
      timezone('utc', now())
    )
  $$,
  'the reviewed fixture activates under the hardened invariants'
);

reset role;

select throws_ok(
  $$ update public.profiles_private set height_cm = 119 where id = 'd1000000-0000-0000-0000-000000000001' $$,
  '23514',
  null,
  'height below the client minimum fails in the database'
);

select throws_ok(
  $$ update public.profiles_private set weight_kg = 251 where id = 'd1000000-0000-0000-0000-000000000001' $$,
  '23514',
  null,
  'weight above the client maximum fails in the database'
);

select throws_ok(
  $$ update private.mission_templates set duration_minutes = 46 where template_id = 'physical.baseline-walk' $$,
  '23514',
  null,
  'mission duration above 45 minutes fails'
);

select throws_ok(
  $$ update private.mission_templates set xp_reward = 251 where template_id = 'physical.baseline-walk' $$,
  '23514',
  null,
  'mission XP above 250 fails'
);

select throws_ok(
  $$ update private.mission_templates set steps = '[{"id":"bad","instruction":"Out of order step.","order":2}]' where template_id = 'physical.baseline-walk' $$,
  '23514',
  null,
  'mission steps must be ordered and structurally valid'
);

select throws_ok(
  $$
    insert into public.plan_days (plan_id, user_id, day_number, kind)
    select id, user_id, 91, 'training'
    from public.plans
    where user_id = 'd1000000-0000-0000-0000-000000000001'
  $$,
  '23514',
  null,
  'a plan day above 90 fails'
);

select throws_ok(
  $$
    insert into public.plan_missions (
      plan_id, plan_day_id, user_id, scheduled_key, template_id, ordinal, title, category,
      source, duration_minutes, intensity, minimum_age, xp_reward, steps
    )
    select
      day.plan_id, day.id, day.user_id, 'wa_invalid.01.duration.core', 'invalid.duration', 3,
      'Invalid duration', 'physical', 'core', 46, 'low', 14, 20,
      '[{"id":"step","instruction":"Complete the invalid mission.","order":1}]'
    from public.plan_days as day
    where day.user_id = 'd1000000-0000-0000-0000-000000000001' and day.day_number = 1
  $$,
  '23514',
  null,
  'a persisted mission cannot exceed the domain duration'
);

select throws_ok(
  $$
    insert into public.plan_missions (
      plan_id, plan_day_id, user_id, scheduled_key, template_id, ordinal, title, category,
      source, duration_minutes, intensity, minimum_age, xp_reward, steps
    )
    select
      day.plan_id, day.id, day.user_id, 'wa_invalid.01.xp.core', 'invalid.xp', 3,
      'Invalid XP', 'mindset', 'core', 10, 'low', 14, 9,
      '[{"id":"step","instruction":"Complete the invalid mission.","order":1}]'
    from public.plan_days as day
    where day.user_id = 'd1000000-0000-0000-0000-000000000001' and day.day_number = 1
  $$,
  '23514',
  null,
  'a persisted mission cannot award XP below the domain minimum'
);

select throws_ok(
  $outer$
    do $inner$
    declare v_plan_id uuid;
    begin
      select id into v_plan_id from public.plans
      where user_id = 'd1000000-0000-0000-0000-000000000001';
      delete from public.plan_days where plan_id = v_plan_id and day_number = 90;
      perform private.assert_plan_calendar(v_plan_id);
    end
    $inner$
  $outer$,
  '23514',
  'A canonical plan must contain 90 days',
  'removing a canonical plan day fails calendar validation'
);

select throws_ok(
  $outer$
    do $inner$
    declare v_day_id uuid;
    begin
      select id into v_day_id from public.plan_days
      where user_id = 'd1000000-0000-0000-0000-000000000001' and day_number = 1;
      delete from public.plan_missions
      where plan_day_id = v_day_id and ordinal = 1;
      perform private.assert_plan_day_invariants(v_day_id);
    end
    $inner$
  $outer$,
  '23514',
  'Invalid daily mission schedule',
  'a day cannot contain fewer than two missions'
);

select lives_ok(
  $$
    update public.day_progress
    set status = 'available'
    where user_id = 'd1000000-0000-0000-0000-000000000001'
      and plan_day_id = (
        select id from public.plan_days
        where user_id = 'd1000000-0000-0000-0000-000000000001' and day_number = 2
      )
  $$,
  'locked day can become available'
);

select throws_ok(
  $$
    update public.day_progress
    set status = 'locked'
    where user_id = 'd1000000-0000-0000-0000-000000000001'
      and plan_day_id = (
        select id from public.plan_days
        where user_id = 'd1000000-0000-0000-0000-000000000001' and day_number = 2
      )
  $$,
  '23514',
  'Invalid day status transition',
  'day status cannot move backwards'
);

select throws_ok(
  $$
    update public.arc_executions
    set active_day = active_day + 2
    where user_id = 'd1000000-0000-0000-0000-000000000001'
  $$,
  '23514',
  'Invalid active day transition',
  'execution cannot jump over a plan day'
);

select lives_ok(
  $$
    update public.mission_progress
    set status = 'skipped', skipped_at = timezone('utc', now()), revision = revision + 1
    where user_id = 'd1000000-0000-0000-0000-000000000001'
      and plan_mission_id = (
        select mission.id
        from public.plan_missions as mission
        join public.plan_days as day on day.id = mission.plan_day_id
        where mission.user_id = 'd1000000-0000-0000-0000-000000000001'
          and day.day_number = 1 and mission.ordinal = 2
      )
  $$,
  'available mission can be skipped'
);

select throws_ok(
  $$
    update public.mission_progress
    set status = 'active', skipped_at = null, revision = revision + 1
    where user_id = 'd1000000-0000-0000-0000-000000000001'
      and status = 'skipped'
  $$,
  '23514',
  'Invalid mission status transition',
  'terminal mission status cannot be reopened'
);

set local role authenticated;
set local request.jwt.claim.sub = 'd1000000-0000-0000-0000-000000000001';
set local request.jwt.claim.role = 'authenticated';

select lives_ok(
  $$
    select * from public.execute_mission_command(
      'begin',
      (
        select mission.scheduled_key
        from public.plan_missions as mission
        join public.plan_days as day on day.id = mission.plan_day_id
        where mission.user_id = 'd1000000-0000-0000-0000-000000000001'
          and day.day_number = 1 and mission.ordinal = 1
      ),
      1
    )
  $$,
  'the first canonical mission begins'
);

select lives_ok(
  $$
    select * from public.execute_mission_command(
      'advance',
      (
        select mission.scheduled_key
        from public.plan_missions as mission
        join public.plan_days as day on day.id = mission.plan_day_id
        where mission.user_id = 'd1000000-0000-0000-0000-000000000001'
          and day.day_number = 1 and mission.ordinal = 1
      ),
      2
    )
  $$,
  'the first mission advances to step two'
);

select lives_ok(
  $$
    select * from public.execute_mission_command(
      'advance',
      (
        select mission.scheduled_key
        from public.plan_missions as mission
        join public.plan_days as day on day.id = mission.plan_day_id
        where mission.user_id = 'd1000000-0000-0000-0000-000000000001'
          and day.day_number = 1 and mission.ordinal = 1
      ),
      3
    )
  $$,
  'the first mission advances to its final step'
);

select lives_ok(
  $$
    select * from public.execute_mission_command(
      'advance',
      (
        select mission.scheduled_key
        from public.plan_missions as mission
        join public.plan_days as day on day.id = mission.plan_day_id
        where mission.user_id = 'd1000000-0000-0000-0000-000000000001'
          and day.day_number = 1 and mission.ordinal = 1
      ),
      4
    )
  $$,
  'the final step creates one canonical XP ledger entry'
);

reset role;

select results_eq(
  $$
    select profile.total_xp
    from public.profiles_public as profile
    where profile.id = 'd1000000-0000-0000-0000-000000000001'
  $$,
  $$
    select coalesce(sum(delta), 0)::bigint
    from public.xp_ledger
    where user_id = 'd1000000-0000-0000-0000-000000000001'
  $$,
  'public XP equals the canonical ledger sum'
);

insert into public.mission_events (
  user_id, plan_id, plan_mission_id, idempotency_key, event_type
)
select
  mission.user_id,
  mission.plan_id,
  mission.id,
  'd3000000-0000-0000-0000-000000000003',
  'mission_completed'
from public.plan_missions as mission
join public.plan_days as day on day.id = mission.plan_day_id
where mission.user_id = 'd1000000-0000-0000-0000-000000000001'
  and day.day_number = 1 and mission.ordinal = 2;

select throws_ok(
  $$
    insert into public.xp_ledger (user_id, plan_id, mission_event_id, delta, reason)
    select event.user_id, event.plan_id, event.id, 10, 'mission_completion'
    from public.mission_events as event
    where event.idempotency_key = 'd3000000-0000-0000-0000-000000000003'
  $$,
  '23514',
  'XP ledger entry is not canonical',
  'ledger XP must equal the mission reward'
);

select lives_ok(
  $$ update public.profiles_public set total_xp = 999999 where id = 'd1000000-0000-0000-0000-000000000001' $$,
  'a direct trusted total write is intercepted'
);

select results_eq(
  $$ select count(*)::bigint from private.detect_xp_drift() $$,
  array[0::bigint],
  'the derived-total trigger prevents ordinary drift'
);

alter table public.profiles_public disable trigger profiles_public_derive_total_xp_on_update;
update public.profiles_public
set total_xp = total_xp + 1
where id = 'd1000000-0000-0000-0000-000000000001';
alter table public.profiles_public enable trigger profiles_public_derive_total_xp_on_update;

select results_eq(
  $$ select count(*)::bigint from private.detect_xp_drift() $$,
  array[1::bigint],
  'out-of-band XP drift is detected'
);

select lives_ok(
  $$ select private.reconcile_profile_total_xp('d1000000-0000-0000-0000-000000000001') $$,
  'ledger reconciliation repairs detected drift'
);

select results_eq(
  $$ select count(*)::bigint from private.detect_xp_drift() $$,
  array[0::bigint],
  'reconciliation clears all XP drift'
);

select throws_ok(
  $$
    insert into public.onboarding_submissions (
      user_id, activation_key, schema_version, answers, assessment, terms_version, terms_accepted_at
    ) values (
      'd1000000-0000-0000-0000-000000000001',
      'd4000000-0000-0000-0000-000000000004',
      2,
      '{}',
      '{}',
      '2026-08-21',
      timezone('utc', now()) + interval '10 minutes'
    )
  $$,
  '23514',
  null,
  'terms acceptance cannot be materially later than submission'
);

set constraints all immediate;
set constraints all deferred;

select throws_ok(
  $outer$
    do $inner$
    declare v_plan_id uuid;
    begin
      select id into v_plan_id from public.plans
      where user_id = 'd1000000-0000-0000-0000-000000000001';
      execute 'alter table public.plan_days disable trigger plan_days_prevent_update';
      update public.plan_days
      set scheduled_for = current_date
      where plan_id = v_plan_id and day_number = 1;
      perform private.assert_plan_calendar(v_plan_id);
    end
    $inner$
  $outer$,
  '23514',
  'Plan dates must be absent or complete',
  'a partially dated plan calendar fails'
);

select throws_ok(
  $$
    update public.plans
    set status = 'completed', completed_at = activated_at - interval '1 minute'
    where user_id = 'd1000000-0000-0000-0000-000000000001'
  $$,
  '23514',
  null,
  'plan completion cannot predate activation'
);

select lives_ok(
  $$ update public.plans set status = 'superseded' where user_id = 'd1000000-0000-0000-0000-000000000001' $$,
  'an active plan can be superseded'
);

select throws_ok(
  $$ update public.plans set status = 'active' where user_id = 'd1000000-0000-0000-0000-000000000001' $$,
  '23514',
  'Invalid plan status transition',
  'a superseded plan cannot be reactivated'
);

set local role authenticated;
set local request.jwt.claim.sub = 'd1000000-0000-0000-0000-000000000001';
set local request.jwt.claim.role = 'authenticated';

select throws_ok(
  $$ update public.plans set status = 'completed' where user_id = 'd1000000-0000-0000-0000-000000000001' $$,
  '42501',
  null,
  'clients cannot write canonical plan state directly'
);

reset role;

select * from extensions.finish();
rollback;
