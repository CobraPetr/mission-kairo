begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, private, extensions, pgtap;

select extensions.plan(18);

select has_table('private', 'subscription_entitlements', 'private entitlement ledger exists');
select has_table('private', 'revenuecat_webhook_events', 'private webhook receipt table exists');
select has_table('private', 'release_settings', 'private release switch exists');
select has_function(
  'public',
  'apply_revenuecat_entitlement_event',
  array['text', 'text', 'timestamp with time zone', 'uuid', 'text', 'text', 'text', 'timestamp with time zone', 'boolean', 'text'],
  'trusted entitlement event function exists'
);
select has_trigger(
  'public',
  'mission_command_receipts',
  'mission_command_receipts_require_subscription',
  'mission receipts enforce the server access switch'
);
select is(
  has_table_privilege('authenticated', 'private.subscription_entitlements', 'SELECT'),
  false,
  'clients cannot read the private entitlement ledger directly'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.apply_revenuecat_entitlement_event(text,text,timestamp with time zone,uuid,text,text,text,timestamp with time zone,boolean,text)',
    'EXECUTE'
  ),
  false,
  'clients cannot forge RevenueCat events'
);

insert into auth.users (id, email)
values ('91000000-0000-0000-0000-000000000001', 'subscriber@example.test');

select ok(
  private.has_mission_subscription('91000000-0000-0000-0000-000000000001'),
  'mission commands remain available while enforcement is deliberately disabled'
);

select ok(
  public.apply_revenuecat_entitlement_event(
    'rc-event-001',
    'INITIAL_PURCHASE',
    '2026-08-30T10:00:00Z',
    '91000000-0000-0000-0000-000000000001',
    'mission_kairo_pro',
    'mission_kairo_monthly',
    'trial',
    '2099-09-02T10:00:00Z',
    true,
    'SANDBOX'
  ),
  'a trusted initial purchase creates access'
);

select is(
  public.apply_revenuecat_entitlement_event(
    'rc-event-001',
    'INITIAL_PURCHASE',
    '2026-08-30T10:00:00Z',
    '91000000-0000-0000-0000-000000000001',
    'mission_kairo_pro',
    'mission_kairo_monthly',
    'trial',
    '2099-09-02T10:00:00Z',
    true,
    'SANDBOX'
  ),
  false,
  'a repeated webhook event is idempotent'
);

select results_eq(
  $$ select status from private.subscription_entitlements where user_id = '91000000-0000-0000-0000-000000000001' $$,
  array['trial'::text],
  'the canonical entitlement state is stored'
);

select ok(
  public.apply_revenuecat_entitlement_event(
    'rc-event-stale',
    'EXPIRATION',
    '2026-08-29T10:00:00Z',
    '91000000-0000-0000-0000-000000000001',
    'mission_kairo_pro',
    'mission_kairo_monthly',
    'expired',
    '2026-08-29T10:00:00Z',
    false,
    'SANDBOX'
  ),
  'an older valid event is recorded'
);

select results_eq(
  $$ select status from private.subscription_entitlements where user_id = '91000000-0000-0000-0000-000000000001' $$,
  array['trial'::text],
  'an out-of-order event cannot overwrite newer access state'
);

update private.release_settings
set enabled = true
where key = 'subscription_enforcement_enabled';

create temporary table subscription_guard_probe (user_id uuid not null);
create trigger subscription_guard_probe_trigger
before insert on subscription_guard_probe
for each row execute function private.enforce_mission_subscription();

select ok(
  private.has_mission_subscription('91000000-0000-0000-0000-000000000001'),
  'a current trial remains authorized when enforcement is enabled'
);

select lives_ok(
  $$ insert into subscription_guard_probe values ('91000000-0000-0000-0000-000000000001') $$,
  'the command guard allows a current trial'
);

select ok(
  public.apply_revenuecat_entitlement_event(
    'rc-event-002',
    'EXPIRATION',
    '2099-09-03T10:00:00Z',
    '91000000-0000-0000-0000-000000000001',
    'mission_kairo_pro',
    'mission_kairo_monthly',
    'expired',
    '2099-09-03T10:00:00Z',
    false,
    'SANDBOX'
  ),
  'a newer expiration event is accepted'
);

select is(
  private.has_mission_subscription('91000000-0000-0000-0000-000000000001'),
  false,
  'an expired account is rejected when enforcement is enabled'
);

select throws_ok(
  $$ insert into subscription_guard_probe values ('91000000-0000-0000-0000-000000000001') $$,
  '42501',
  'Active subscription required',
  'the command guard rejects an expired account'
);

select * from finish();
rollback;
