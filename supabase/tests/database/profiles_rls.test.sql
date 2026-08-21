begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pgtap;

select extensions.plan(13);

select has_table('public', 'profiles_public', 'public-safe profile table exists');
select has_table('public', 'profiles_private', 'private profile table exists');

insert into auth.users (id, email, raw_user_meta_data)
values
  ('10000000-0000-0000-0000-000000000001', 'alpha@example.test', '{"full_name":"Alpha"}'),
  ('20000000-0000-0000-0000-000000000002', 'bravo@example.test', '{"full_name":"Bravo"}');

select results_eq(
  $$ select count(*)::bigint from public.profiles_public $$,
  array[2::bigint],
  'new auth users receive public profiles'
);

select results_eq(
  $$ select count(*)::bigint from public.profiles_private $$,
  array[2::bigint],
  'new auth users receive private profiles'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
set local request.jwt.claim.role = 'authenticated';

select results_eq(
  $$ select count(*)::bigint from public.profiles_public $$,
  array[2::bigint],
  'authenticated users can view public-safe profiles'
);

select results_eq(
  $$ select count(*)::bigint from public.profiles_private $$,
  array[1::bigint],
  'authenticated users can view only their own private profile'
);

select lives_ok(
  $$ update public.profiles_private set height_cm = 181 where id = '10000000-0000-0000-0000-000000000001' $$,
  'users can update permitted fields on their own private profile'
);

select throws_ok(
  $$ update public.profiles_private set phone_e164 = '+41791234567' where id = '10000000-0000-0000-0000-000000000001' $$,
  '42501',
  null,
  'clients cannot mark a phone number as verified'
);

select throws_ok(
  $$ update public.profiles_private set onboarding_status = 'complete' where id = '10000000-0000-0000-0000-000000000001' $$,
  '42501',
  null,
  'clients cannot mark onboarding as complete'
);

select lives_ok(
  $$ update public.profiles_public set username = 'alpha_arc' where id = '10000000-0000-0000-0000-000000000001' $$,
  'users can update their own public-safe fields'
);

select throws_ok(
  $$ update public.profiles_public set total_xp = 9000 where id = '10000000-0000-0000-0000-000000000001' $$,
  '42501',
  null,
  'clients cannot grant themselves XP'
);

select lives_ok(
  $$ update public.profiles_public set username = 'hijacked' where id = '20000000-0000-0000-0000-000000000002' $$,
  'an RLS-denied update does not expose another profile'
);

reset role;

select results_eq(
  $$ select username from public.profiles_public where id = '20000000-0000-0000-0000-000000000002' $$,
  array['recruit_2000000000000000'::text],
  'another user profile remains unchanged'
);

select * from finish();
rollback;
