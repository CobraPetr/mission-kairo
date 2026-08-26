begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pgtap;

select extensions.plan(18);

select has_function(
  'public',
  'activate_protocol',
  array['uuid', 'text', 'integer', 'jsonb', 'jsonb', 'text', 'timestamp with time zone', 'text', 'timestamp with time zone'],
  'atomic protocol activation RPC exists'
);

insert into auth.users (
  id,
  email,
  phone,
  email_confirmed_at,
  phone_confirmed_at,
  raw_user_meta_data
)
values
  (
    '81000000-0000-0000-0000-000000000101',
    'activation-alpha@example.test',
    '+41790000101',
    timezone('utc', now()),
    timezone('utc', now()),
    '{}'
  ),
  (
    '82000000-0000-0000-0000-000000000202',
    'activation-bravo@example.test',
    '+41790000202',
    timezone('utc', now()),
    timezone('utc', now()),
    '{}'
  ),
  (
    '86000000-0000-0000-0000-000000000303',
    'activation-email-only@example.test',
    null,
    timezone('utc', now()),
    null,
    '{}'
  ),
  (
    '87000000-0000-0000-0000-000000000404',
    'activation-unverified@example.test',
    '+41790000404',
    null,
    timezone('utc', now()),
    '{}'
  );

set local role authenticated;
set local request.jwt.claim.sub = '81000000-0000-0000-0000-000000000101';
set local request.jwt.claim.role = 'authenticated';

select lives_ok(
  $$
    select * from public.activate_protocol(
      '83000000-0000-0000-0000-000000000101',
      'alpha_arc',
      2,
      '{"identity":{"fullName":"Alpha Arc","heightCm":181,"weightKg":82,"unitSystem":"metric"},"relationship":{"status":"single"},"consent":{"guardianConfirmed":false}}',
      '{"age":19,"gymAccess":"member","currentBuild":"average","targetBuild":"defined","relationshipGoal":"approach"}',
      '2026-08-21',
      '2026-08-21T10:00:00Z'
    )
  $$,
  'an authenticated adult can atomically activate a protocol'
);

select results_eq(
  $$ select count(*)::bigint from public.onboarding_submissions where user_id = '81000000-0000-0000-0000-000000000101' $$,
  array[1::bigint],
  'activation creates one immutable onboarding submission'
);

select results_eq(
  $$ select count(*)::bigint from public.plan_days where user_id = '81000000-0000-0000-0000-000000000101' $$,
  array[90::bigint],
  'activation creates all 90 canonical plan days'
);

select results_eq(
  $$ select count(*)::bigint from public.plan_missions where user_id = '81000000-0000-0000-0000-000000000101' $$,
  array[225::bigint],
  'activation creates the canonical 180 core plus 45 personalized missions'
);

select results_eq(
  $$ select count(*)::bigint from public.day_progress where user_id = '81000000-0000-0000-0000-000000000101' and status = 'available' $$,
  array[1::bigint],
  'only day one is initially available'
);

select results_eq(
  $$ select count(*)::bigint from public.mission_progress where user_id = '81000000-0000-0000-0000-000000000101' and status = 'available' $$,
  array[2::bigint],
  'only day-one missions are initially available'
);

select results_eq(
  $$ select username from public.profiles_public where id = '81000000-0000-0000-0000-000000000101' $$,
  array['alpha_arc'::text],
  'activation reserves and applies the normalized public username'
);

select results_eq(
  $$ select onboarding_status from public.profiles_private where id = '81000000-0000-0000-0000-000000000101' $$,
  array['complete'::text],
  'activation marks the private onboarding profile complete'
);

select lives_ok(
  $$
    select * from public.activate_protocol(
      '83000000-0000-0000-0000-000000000101',
      'alpha_arc',
      2,
      '{"identity":{"fullName":"Alpha Arc","heightCm":181,"weightKg":82,"unitSystem":"metric"},"relationship":{"status":"single"},"consent":{"guardianConfirmed":false}}',
      '{"age":19,"gymAccess":"member","currentBuild":"average","targetBuild":"defined","relationshipGoal":"approach"}',
      '2026-08-21',
      '2026-08-21T10:00:00Z'
    )
  $$,
  'repeating the same activation key is idempotent'
);

select results_eq(
  $$ select count(*)::bigint from public.plans where user_id = '81000000-0000-0000-0000-000000000101' $$,
  array[1::bigint],
  'an idempotent retry cannot duplicate the plan'
);

set local request.jwt.claim.sub = '82000000-0000-0000-0000-000000000202';

select throws_ok(
  $$
    select * from public.activate_protocol(
      '84000000-0000-0000-0000-000000000202',
      'alpha_arc',
      2,
      '{"identity":{"fullName":"Bravo Arc","heightCm":175,"weightKg":70,"unitSystem":"metric"},"relationship":{"status":"single"},"consent":{"guardianConfirmed":false}}',
      '{"age":19,"gymAccess":"home","currentBuild":"average","targetBuild":"athletic","relationshipGoal":"selfFocus"}',
      '2026-08-21',
      '2026-08-21T10:00:00Z'
    )
  $$,
  '23505',
  null,
  'a username already owned by another account cannot be claimed'
);

select throws_ok(
  $$
    select * from public.activate_protocol(
      '85000000-0000-0000-0000-000000000202',
      'bravo_arc',
      2,
      '{"identity":{"fullName":"Bravo Arc","heightCm":175,"weightKg":70,"unitSystem":"metric"},"relationship":{"status":"single"},"consent":{"guardianConfirmed":true}}',
      '{"age":16,"gymAccess":"home","currentBuild":"average","targetBuild":"athletic","relationshipGoal":"selfFocus"}',
      '2026-08-21',
      '2026-08-21T10:00:00Z',
      'self-attested-v1',
      '2026-08-21T10:00:00Z'
    )
  $$,
  '42501',
  'Verified guardian approval required',
  'a minor cannot activate with a self-attested guardian payload'
);

set local request.jwt.claim.sub = '86000000-0000-0000-0000-000000000303';

select lives_ok(
  $$
    select * from public.activate_protocol(
      '88000000-0000-0000-0000-000000000303',
      'email_only_arc',
      2,
      '{"identity":{"fullName":"Email Only Arc","heightCm":175,"weightKg":70,"unitSystem":"metric"},"relationship":{"status":"single"},"consent":{"generalConfirmed":true}}',
      '{"age":19,"gymAccess":"home","currentBuild":"average","targetBuild":"athletic","relationshipGoal":"selfFocus"}',
      '2026-08-21',
      '2026-08-21T10:00:00Z'
    )
  $$,
  'an adult with verified email can activate without a phone identity'
);

set local request.jwt.claim.sub = '87000000-0000-0000-0000-000000000404';

select throws_ok(
  $$
    select * from public.activate_protocol(
      '89000000-0000-0000-0000-000000000404',
      'unverified_arc',
      2,
      '{"identity":{"fullName":"Unverified Arc","heightCm":175,"weightKg":70,"unitSystem":"metric"},"relationship":{"status":"single"},"consent":{"generalConfirmed":true}}',
      '{"age":19,"gymAccess":"home","currentBuild":"average","targetBuild":"athletic","relationshipGoal":"selfFocus"}',
      '2026-08-21',
      '2026-08-21T10:00:00Z'
    )
  $$,
  '42501',
  'Verified email required',
  'protocol activation requires a verified email'
);

set local request.jwt.claim.sub = '82000000-0000-0000-0000-000000000202';

select throws_ok(
  $$
    select * from public.activate_protocol(
      '8a000000-0000-0000-0000-000000000202',
      'underage_arc',
      2,
      '{"identity":{"fullName":"Underage Arc","heightCm":160,"weightKg":50,"unitSystem":"metric"},"relationship":{"status":"single"},"consent":{"generalConfirmed":true}}',
      '{"age":13,"gymAccess":"home","currentBuild":"average","targetBuild":"athletic","relationshipGoal":"selfFocus"}',
      '2026-08-21',
      '2026-08-21T10:00:00Z'
    )
  $$,
  '22023',
  'Minimum activation age is 14',
  'an account under age 14 cannot activate'
);

reset role;

select results_eq(
  $$ select xp_reward from public.plan_missions where user_id = '81000000-0000-0000-0000-000000000101' and template_id = 'physical.gym-foundation' limit 1 $$,
  array[110],
  'mission XP comes from the private canonical server catalog'
);

select results_eq(
  $$ select count(*)::bigint from private.mission_templates $$,
  array[10::bigint],
  'the private canonical mission catalog contains the reviewed templates'
);

select * from extensions.finish();
rollback;
