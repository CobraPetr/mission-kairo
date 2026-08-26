begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pgtap;

select extensions.plan(16);

create function pg_temp.build_test_plan(
  p_plan_key text,
  p_base_track text,
  p_current_build text,
  p_gym_access text,
  p_relationship_goal text
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with day_definitions as (
    select
      day_number,
      case
        when day_number in (30, 60, 90) then 'checkpoint'
        when day_number % 7 = 0 then 'recovery'
        else 'training'
      end as kind
    from generate_series(1, 90) as day_number
  ),
  scheduled as (
    select
      day_number,
      1 as ordinal,
      case
        when day_number % 7 = 0 then 'recovery.walk'
        when day_number = 1 or p_current_build = 'starting' then 'physical.baseline-walk'
        when p_gym_access = 'member' then 'physical.gym-foundation'
        else 'physical.bodyweight-circuit'
      end as template_id,
      'core' as source
    from generate_series(1, 90) as day_number

    union all

    select
      day_number,
      2,
      case
        when day_number % 7 = 0 then 'mindset.weekly-review'
        when day_number in (30, 60, 90) then 'checkpoint.review'
        when day_number % 2 = 0 then 'presence.posture-reset'
        else 'mindset.standard-journal'
      end,
      'core'
    from generate_series(1, 90) as day_number

    union all

    select
      day_number,
      3,
      case
        when day_number % 4 = 0 or p_relationship_goal = 'selfFocus'
          then 'career.focus-block'
        else 'relationship.social-repetition'
      end,
      'personalized'
    from generate_series(1, 90) as day_number
    where day_number % 2 = 0
  ),
  mission_values as (
    select
      scheduled.day_number,
      scheduled.ordinal,
      jsonb_build_object(
        'category', template.category,
        'durationMinutes', template.duration_minutes,
        'id', template.template_id,
        'intensity', template.intensity,
        'minAge', template.minimum_age,
        'scheduledId', p_plan_key || '.' || lpad(scheduled.day_number::text, 2, '0') || '.'
          || template.template_id || '.' || scheduled.source,
        'source', scheduled.source,
        'steps', template.steps,
        'title', template.title,
        'xp', template.xp_reward
      ) as value
    from scheduled
    join private.mission_templates as template
      on template.template_id = scheduled.template_id
  ),
  missions_by_day as (
    select day_number, jsonb_agg(value order by ordinal) as missions
    from mission_values
    group by day_number
  ),
  plan_days as (
    select jsonb_agg(
      jsonb_build_object(
        'day', day.day_number,
        'kind', day.kind,
        'missions', missions.missions
      ) order by day.day_number
    ) as value
    from day_definitions as day
    join missions_by_day as missions using (day_number)
  )
  select jsonb_build_object(
    'baseTrack', p_base_track,
    'days', plan_days.value,
    'durationDays', 90,
    'planId', p_plan_key,
    'seedVersion', 'mission-kairo.core.2026-08-26',
    'version', 2
  )
  from plan_days;
$$;

select has_function(
  'public',
  'activate_generated_protocol',
  array[
    'uuid', 'uuid', 'text', 'integer', 'jsonb', 'jsonb', 'jsonb', 'text',
    'timestamp with time zone'
  ],
  'service-owned canonical activation RPC exists'
);

select has_column('public', 'plans', 'seed_version', 'plans preserve their generator seed version');

select is(
  has_function_privilege(
    'authenticated',
    'public.activate_protocol(uuid,text,integer,jsonb,jsonb,text,timestamp with time zone,text,timestamp with time zone)',
    'EXECUTE'
  ),
  false,
  'authenticated clients cannot execute the legacy SQL generator'
);

select is(
  has_function_privilege(
    'authenticated',
    'public.activate_generated_protocol(uuid,uuid,text,integer,jsonb,jsonb,jsonb,text,timestamp with time zone)',
    'EXECUTE'
  ),
  false,
  'authenticated clients cannot submit a plan manifest directly'
);

select is(
  has_function_privilege(
    'service_role',
    'public.activate_generated_protocol(uuid,uuid,text,integer,jsonb,jsonb,jsonb,text,timestamp with time zone)',
    'EXECUTE'
  ),
  true,
  'only the trusted server role can persist a generated manifest'
);

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
values
  ('a1000000-0000-0000-0000-000000000001', 'canonical@example.test', now(), '{}'),
  ('a2000000-0000-0000-0000-000000000002', 'minor@example.test', now(), '{}'),
  ('a3000000-0000-0000-0000-000000000003', 'invalid@example.test', now(), '{}'),
  ('a4000000-0000-0000-0000-000000000004', 'unverified@example.test', null, '{}');

set local role service_role;

select lives_ok(
  $$
    select * from public.activate_generated_protocol(
      'a1000000-0000-0000-0000-000000000001',
      'a1000000-0000-0000-0000-000000000001',
      'canonical_arc',
      2,
      '{"identity":{"fullName":"Canonical Arc","heightCm":181,"weightKg":82,"unitSystem":"metric"},"relationship":{"status":"single"},"consent":{"generalConfirmed":true}}',
      '{"age":19,"gymAccess":"member","currentBuild":"average","targetBuild":"defined","relationshipGoal":"approach"}',
      pg_temp.build_test_plan('wa_00000001', 'definition', 'average', 'member', 'approach'),
      '2026-08-21',
      '2026-08-21T10:00:00Z'
    )
  $$,
  'a trusted server manifest activates atomically'
);

select results_eq(
  $$ select generator_version || ':' || seed_version || ':' || plan_key from public.plans where user_id = 'a1000000-0000-0000-0000-000000000001' $$,
  array['2:mission-kairo.core.2026-08-26:wa_00000001'::text],
  'generator version, seed version, and plan key are immutable plan metadata'
);

select results_eq(
  $$ select count(*)::bigint from public.plan_days where user_id = 'a1000000-0000-0000-0000-000000000001' $$,
  array[90::bigint],
  'the normalized canonical manifest contains 90 ordered days'
);

select results_eq(
  $$ select count(*)::bigint from public.plan_missions where user_id = 'a1000000-0000-0000-0000-000000000001' $$,
  array[225::bigint],
  'the normalized canonical manifest contains the reviewed 225 missions'
);

select lives_ok(
  $$
    select * from public.activate_generated_protocol(
      'a1000000-0000-0000-0000-000000000001',
      'a1000000-0000-0000-0000-000000000001',
      'canonical_arc',
      2,
      '{"identity":{"fullName":"Canonical Arc","heightCm":181,"weightKg":82,"unitSystem":"metric"},"relationship":{"status":"single"},"consent":{"generalConfirmed":true}}',
      '{"age":19,"gymAccess":"member","currentBuild":"average","targetBuild":"defined","relationshipGoal":"approach"}',
      pg_temp.build_test_plan('wa_00000001', 'definition', 'average', 'member', 'approach'),
      '2026-08-21',
      '2026-08-21T10:00:00Z'
    )
  $$,
  'replaying one activation key is idempotent'
);

select results_eq(
  $$ select count(*)::bigint from public.plans where user_id = 'a1000000-0000-0000-0000-000000000001' $$,
  array[1::bigint],
  'an activation replay cannot duplicate the canonical plan'
);

select throws_ok(
  $$
    select * from public.activate_generated_protocol(
      'a2000000-0000-0000-0000-000000000002',
      'a2000000-0000-0000-0000-000000000002',
      'minor_arc', 2,
      '{"identity":{"fullName":"Minor Arc","heightCm":170,"weightKg":65,"unitSystem":"metric"},"relationship":{"status":"single"}}',
      '{"age":16}', '{}', '2026-08-21', '2026-08-21T10:00:00Z'
    )
  $$,
  '42501',
  'Verified guardian approval required',
  'the canonical server path also fails closed for minors'
);

select throws_ok(
  $$
    select * from public.activate_generated_protocol(
      'a3000000-0000-0000-0000-000000000003',
      'a3000000-0000-0000-0000-000000000003',
      'invalid_arc', 2,
      '{"identity":{"fullName":"Invalid Arc","heightCm":181,"weightKg":82,"unitSystem":"metric"},"relationship":{"status":"single"}}',
      '{"age":19}', '{"version":2,"days":[]}', '2026-08-21', '2026-08-21T10:00:00Z'
    )
  $$,
  '22023',
  'Invalid plan manifest',
  'an incomplete or hostile plan manifest is rejected'
);

select throws_ok(
  $$
    select * from public.activate_generated_protocol(
      'a4000000-0000-0000-0000-000000000004',
      'a4000000-0000-0000-0000-000000000004',
      'unverified_arc', 2, '{}', '{"age":19}', '{}', '2026-08-21', '2026-08-21T10:00:00Z'
    )
  $$,
  '42501',
  'Verified email required',
  'the canonical server path requires verified email'
);

select results_eq(
  $$ select count(*)::bigint from public.onboarding_submissions where user_id = 'a1000000-0000-0000-0000-000000000001' and assessment ->> 'age' = '19' $$,
  array[1::bigint],
  'the immutable normalized input snapshot remains restorable from the plan'
);

select results_eq(
  $$ select count(*)::bigint from public.plan_missions where user_id = 'a1000000-0000-0000-0000-000000000001' and source = 'core' $$,
  array[180::bigint],
  'the canonical manifest preserves the reviewed core mission count'
);

select * from extensions.finish();
rollback;
