begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pgtap;

select extensions.plan(37);

select has_table('public', 'onboarding_drafts', 'onboarding draft table exists');
select has_table('public', 'onboarding_submissions', 'immutable onboarding submission table exists');
select has_table('public', 'plans', 'user plan table exists');
select has_table('public', 'plan_days', 'plan day table exists');
select has_table('public', 'plan_missions', 'canonical scheduled mission table exists');
select has_table('public', 'arc_executions', 'execution aggregate table exists');
select has_table('public', 'day_progress', 'day progress table exists');
select has_table('public', 'mission_progress', 'mission progress table exists');
select has_table('public', 'mission_events', 'append-only mission event table exists');
select has_table('public', 'xp_ledger', 'trusted XP ledger table exists');

insert into auth.users (id, email, raw_user_meta_data)
values
  ('10000000-0000-0000-0000-000000000101', 'persistence-alpha@example.test', '{}'),
  ('20000000-0000-0000-0000-000000000202', 'persistence-bravo@example.test', '{}');

insert into public.onboarding_submissions (
  id,
  user_id,
  schema_version,
  answers,
  assessment,
  terms_version,
  terms_accepted_at
) values
  (
    '31000000-0000-0000-0000-000000000101',
    '10000000-0000-0000-0000-000000000101',
    2,
    '{"identity":{"username":"alpha_arc"}}',
    '{"age":18,"gymAccess":"member"}',
    '2026-08-21',
    timezone('utc', now())
  ),
  (
    '32000000-0000-0000-0000-000000000202',
    '20000000-0000-0000-0000-000000000202',
    2,
    '{"identity":{"username":"bravo_arc"}}',
    '{"age":18,"gymAccess":"home"}',
    '2026-08-21',
    timezone('utc', now())
  );

insert into public.plans (
  id,
  user_id,
  onboarding_submission_id,
  plan_key,
  generator_version,
  base_track,
  duration_days
) values
  (
    '41000000-0000-0000-0000-000000000101',
    '10000000-0000-0000-0000-000000000101',
    '31000000-0000-0000-0000-000000000101',
    'wa_alpha001',
    1,
    'athletic',
    90
  ),
  (
    '42000000-0000-0000-0000-000000000202',
    '20000000-0000-0000-0000-000000000202',
    '32000000-0000-0000-0000-000000000202',
    'wa_bravo001',
    1,
    'foundation',
    90
  );

insert into public.plan_days (id, plan_id, user_id, day_number, kind)
values
  (
    '51000000-0000-0000-0000-000000000101',
    '41000000-0000-0000-0000-000000000101',
    '10000000-0000-0000-0000-000000000101',
    1,
    'training'
  ),
  (
    '52000000-0000-0000-0000-000000000202',
    '42000000-0000-0000-0000-000000000202',
    '20000000-0000-0000-0000-000000000202',
    1,
    'training'
  );

insert into public.plan_days (plan_id, user_id, day_number, kind)
select fixture.plan_id, fixture.user_id, day_number, 'training'
from (
  values
    (
      '41000000-0000-0000-0000-000000000101'::uuid,
      '10000000-0000-0000-0000-000000000101'::uuid
    ),
    (
      '42000000-0000-0000-0000-000000000202'::uuid,
      '20000000-0000-0000-0000-000000000202'::uuid
    )
) as fixture(plan_id, user_id)
cross join generate_series(2, 90) as day_number;

insert into public.plan_missions (
  id,
  plan_id,
  plan_day_id,
  user_id,
  scheduled_key,
  template_id,
  ordinal,
  title,
  category,
  source,
  duration_minutes,
  intensity,
  minimum_age,
  xp_reward,
  steps
) values
  (
    '61000000-0000-0000-0000-000000000101',
    '41000000-0000-0000-0000-000000000101',
    '51000000-0000-0000-0000-000000000101',
    '10000000-0000-0000-0000-000000000101',
    'wa_alpha001.01.physical.baseline-walk.core',
    'physical.baseline-walk',
    1,
    'Baseline movement',
    'physical',
    'core',
    20,
    'low',
    14,
    60,
    '[{"id":"timer","instruction":"Set a timer.","order":1},{"id":"walk","instruction":"Walk deliberately.","order":2}]'
  ),
  (
    '62000000-0000-0000-0000-000000000202',
    '42000000-0000-0000-0000-000000000202',
    '52000000-0000-0000-0000-000000000202',
    '20000000-0000-0000-0000-000000000202',
    'wa_bravo001.01.physical.baseline-walk.core',
    'physical.baseline-walk',
    1,
    'Baseline movement',
    'physical',
    'core',
    20,
    'low',
    14,
    60,
    '[{"id":"timer","instruction":"Set a timer.","order":1},{"id":"walk","instruction":"Walk deliberately.","order":2}]'
  );

insert into public.plan_missions (
  plan_id,
  plan_day_id,
  user_id,
  scheduled_key,
  template_id,
  ordinal,
  title,
  category,
  source,
  duration_minutes,
  intensity,
  minimum_age,
  xp_reward,
  steps
)
select
  day.plan_id,
  day.id,
  day.user_id,
  plan.plan_key || '.' || lpad(day.day_number::text, 2, '0') || '.fixture.' || ordinal || '.core',
  'mindset.fixture-' || ordinal,
  ordinal,
  'Fixture mission ' || ordinal,
  'mindset',
  'core',
  10,
  'low',
  14,
  20,
  '[{"id":"fixture","instruction":"Complete the fixture mission.","order":1}]'::jsonb
from public.plan_days as day
join public.plans as plan on plan.id = day.plan_id and plan.user_id = day.user_id
cross join generate_series(1, 2) as ordinal
where not (day.day_number = 1 and ordinal = 1);

insert into public.arc_executions (
  plan_id,
  user_id,
  current_mission_id,
  current_step_index,
  mission_status
) values
  (
    '41000000-0000-0000-0000-000000000101',
    '10000000-0000-0000-0000-000000000101',
    '61000000-0000-0000-0000-000000000101',
    1,
    'active'
  ),
  (
    '42000000-0000-0000-0000-000000000202',
    '20000000-0000-0000-0000-000000000202',
    '62000000-0000-0000-0000-000000000202',
    1,
    'active'
  );

insert into public.day_progress (plan_day_id, plan_id, user_id, status)
values
  (
    '51000000-0000-0000-0000-000000000101',
    '41000000-0000-0000-0000-000000000101',
    '10000000-0000-0000-0000-000000000101',
    'in_progress'
  ),
  (
    '52000000-0000-0000-0000-000000000202',
    '42000000-0000-0000-0000-000000000202',
    '20000000-0000-0000-0000-000000000202',
    'in_progress'
  );

insert into public.mission_progress (
  plan_mission_id,
  plan_id,
  user_id,
  status,
  current_step,
  started_at
) values
  (
    '61000000-0000-0000-0000-000000000101',
    '41000000-0000-0000-0000-000000000101',
    '10000000-0000-0000-0000-000000000101',
    'active',
    1,
    timezone('utc', now())
  ),
  (
    '62000000-0000-0000-0000-000000000202',
    '42000000-0000-0000-0000-000000000202',
    '20000000-0000-0000-0000-000000000202',
    'active',
    1,
    timezone('utc', now())
  );

select throws_ok(
  $$
    insert into public.plan_missions (
      plan_id,
      plan_day_id,
      user_id,
      scheduled_key,
      template_id,
      ordinal,
      title,
      category,
      source,
      duration_minutes,
      intensity,
      minimum_age,
      xp_reward,
      steps
    ) values (
      '42000000-0000-0000-0000-000000000202',
      '52000000-0000-0000-0000-000000000202',
      '10000000-0000-0000-0000-000000000101',
      'wa_bravo001.01.fixture.cross-owner.core',
      'mindset.cross-owner',
      3,
      'Cross owner fixture',
      'mindset',
      'core',
      10,
      'low',
      14,
      20,
      '[{"id":"fixture","instruction":"Complete the fixture mission.","order":1}]'
    )
  $$,
  '23503',
  null,
  'composite ownership constraints reject a scheduled mission assigned to the wrong user'
);

select throws_ok(
  $$
    insert into public.mission_events (
      user_id,
      plan_id,
      plan_mission_id,
      idempotency_key,
      event_type
    ) values (
      '10000000-0000-0000-0000-000000000101',
      '42000000-0000-0000-0000-000000000202',
      '62000000-0000-0000-0000-000000000202',
      '73000000-0000-0000-0000-000000000303',
      'mission_started'
    )
  $$,
  '23503',
  null,
  'composite ownership constraints reject an event assigned to the wrong user'
);

set local role anon;

select throws_ok(
  $$ select * from public.onboarding_drafts $$,
  '42501',
  null,
  'anonymous clients cannot read private persistence tables'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000101';
set local request.jwt.claim.role = 'authenticated';

select results_eq(
  $$ select count(*)::bigint from public.onboarding_submissions $$,
  array[1::bigint],
  'users can read only their own onboarding submissions'
);

select results_eq(
  $$ select count(*)::bigint from public.plans $$,
  array[1::bigint],
  'users can read only their own plans'
);

select results_eq(
  $$ select count(*)::bigint from public.plan_days $$,
  array[90::bigint],
  'users can read only their own plan days'
);

select results_eq(
  $$ select count(*)::bigint from public.plan_missions $$,
  array[180::bigint],
  'users can read only their own scheduled missions'
);

select results_eq(
  $$ select count(*)::bigint from public.arc_executions $$,
  array[1::bigint],
  'users can read only their own execution aggregate'
);

select results_eq(
  $$ select count(*)::bigint from public.mission_progress $$,
  array[1::bigint],
  'users can read only their own mission progress'
);

select results_eq(
  $$ select count(*)::bigint from public.xp_ledger $$,
  array[0::bigint],
  'the XP ledger begins empty'
);

select throws_ok(
  $$ insert into public.plans (user_id) values ('10000000-0000-0000-0000-000000000101') $$,
  '42501',
  null,
  'clients cannot insert their own canonical plans'
);

select throws_ok(
  $$ update public.mission_progress set current_step = 0 where user_id = '10000000-0000-0000-0000-000000000101' $$,
  '42501',
  null,
  'clients cannot mutate mission progress directly'
);

select results_eq(
  $$
    select revision
    from public.save_onboarding_draft(
      2,
      'identity',
      '{"identity":{"username":"alpha_arc"}}',
      0,
      '2026-08-21T08:00:00Z'
    )
  $$,
  array[1::bigint],
  'the draft RPC creates a user-owned revision'
);

select results_eq(
  $$
    select revision
    from public.save_onboarding_draft(
      2,
      'activity',
      '{"activity":{"gymAccess":"member"}}',
      1,
      '2026-08-21T08:05:00Z'
    )
  $$,
  array[2::bigint],
  'the draft RPC advances the expected revision'
);

select throws_ok(
  $$
    select *
    from public.save_onboarding_draft(2, 'physical', '{}', 1, null)
  $$,
  'PT409',
  'Onboarding draft revision conflict',
  'stale draft saves are rejected'
);

select results_eq(
  $$ select count(*)::bigint from public.onboarding_drafts $$,
  array[1::bigint],
  'another user cannot observe the saved draft'
);

select results_eq(
  $$
    select awarded_xp::bigint
    from public.execute_mission_command(
      'advance',
      'wa_alpha001.01.physical.baseline-walk.core',
      1,
      '71000000-0000-0000-0000-000000000101',
      timezone('utc', now())
    )
  $$,
  array[60::bigint],
  'trusted completion awards the canonical mission XP'
);

select results_eq(
  $$ select total_xp from public.profiles_public where id = '10000000-0000-0000-0000-000000000101' $$,
  array[60::bigint],
  'trusted completion updates the public XP total'
);

select results_eq(
  $$ select count(*)::bigint from public.xp_ledger $$,
  array[1::bigint],
  'trusted completion creates one XP ledger row'
);

select results_eq(
  $$
    select awarded_xp::bigint
    from public.execute_mission_command(
      'advance',
      'wa_alpha001.01.physical.baseline-walk.core',
      1,
      '71000000-0000-0000-0000-000000000101',
      timezone('utc', now())
    )
  $$,
  array[60::bigint],
  'repeating an idempotency key returns the original award'
);

select throws_ok(
  $$
    select *
    from public.execute_mission_command(
      'advance',
      'wa_alpha001.01.physical.baseline-walk.core',
      2,
      '71000000-0000-0000-0000-000000000102',
      timezone('utc', now())
    )
  $$,
  '22023',
  'Only the active mission can advance',
  'a completed mission rejects a different command identity'
);

select results_eq(
  $$ select count(*)::bigint from public.xp_ledger $$,
  array[1::bigint],
  'idempotent retries cannot duplicate XP ledger entries'
);

select throws_ok(
  $$
    select *
    from public.execute_mission_command(
      'advance',
      'wa_bravo001.01.physical.baseline-walk.core',
      2,
      '71000000-0000-0000-0000-000000000202',
      timezone('utc', now())
    )
  $$,
  '22023',
  'Mission is not available today',
  'users cannot complete another user mission'
);

select throws_ok(
  $$
    insert into public.xp_ledger (
      user_id,
      plan_id,
      mission_event_id,
      delta,
      reason
    ) values (
      '10000000-0000-0000-0000-000000000101',
      '41000000-0000-0000-0000-000000000101',
      '71000000-0000-0000-0000-000000000101',
      9000,
      'mission_completion'
    )
  $$,
  '42501',
  null,
  'clients cannot insert XP ledger rows'
);

reset role;

select throws_ok(
  $$
    update public.onboarding_submissions
    set answers = '{"tampered":true}'
    where id = '31000000-0000-0000-0000-000000000101'
  $$,
  '55000',
  'onboarding_submissions is immutable',
  'submitted onboarding answers cannot be rewritten'
);

select lives_ok(
  $$ delete from auth.users where id = '10000000-0000-0000-0000-000000000101' $$,
  'account deletion cascades through persistence tables'
);

set constraints all immediate;

select results_eq(
  $$
    select (
      (select count(*) from public.onboarding_drafts where user_id = '10000000-0000-0000-0000-000000000101')
      + (select count(*) from public.onboarding_submissions where user_id = '10000000-0000-0000-0000-000000000101')
      + (select count(*) from public.plans where user_id = '10000000-0000-0000-0000-000000000101')
      + (select count(*) from public.plan_days where user_id = '10000000-0000-0000-0000-000000000101')
      + (select count(*) from public.plan_missions where user_id = '10000000-0000-0000-0000-000000000101')
      + (select count(*) from public.arc_executions where user_id = '10000000-0000-0000-0000-000000000101')
      + (select count(*) from public.day_progress where user_id = '10000000-0000-0000-0000-000000000101')
      + (select count(*) from public.mission_progress where user_id = '10000000-0000-0000-0000-000000000101')
      + (select count(*) from public.mission_events where user_id = '10000000-0000-0000-0000-000000000101')
      + (select count(*) from public.xp_ledger where user_id = '10000000-0000-0000-0000-000000000101')
    )::bigint
  $$,
  array[0::bigint],
  'account deletion leaves no user-scoped persistence rows'
);

select * from finish();
rollback;
