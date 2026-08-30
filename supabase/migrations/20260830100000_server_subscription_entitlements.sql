-- Mirror store entitlement events into a private, server-owned access ledger.
-- Enforcement ships disabled and must only be enabled after RevenueCat webhooks are verified.

create table private.release_settings (
  key text primary key,
  enabled boolean not null,
  updated_at timestamptz not null default timezone('utc', now())
);

insert into private.release_settings (key, enabled)
values ('subscription_enforcement_enabled', false);

create table private.subscription_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  entitlement_id text not null check (entitlement_id = 'mission_kairo_pro'),
  product_id text,
  status text not null check (
    status in ('trial', 'active', 'grace', 'billing_issue', 'expired')
  ),
  expires_at timestamptz,
  will_renew boolean not null default false,
  environment text not null check (environment in ('SANDBOX', 'PRODUCTION')),
  source_event_id text not null,
  source_event_at timestamptz not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create table private.revenuecat_webhook_events (
  event_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  environment text not null check (environment in ('SANDBOX', 'PRODUCTION')),
  event_at timestamptz not null,
  received_at timestamptz not null default timezone('utc', now())
);

create index subscription_entitlements_status_expiry_idx
on private.subscription_entitlements (status, expires_at);

create index revenuecat_webhook_events_user_received_idx
on private.revenuecat_webhook_events (user_id, received_at desc);

alter table private.release_settings enable row level security;
alter table private.subscription_entitlements enable row level security;
alter table private.revenuecat_webhook_events enable row level security;

revoke all on private.release_settings from anon, authenticated;
revoke all on private.subscription_entitlements from anon, authenticated;
revoke all on private.revenuecat_webhook_events from anon, authenticated;
grant all on private.release_settings to service_role;
grant all on private.subscription_entitlements to service_role;
grant all on private.revenuecat_webhook_events to service_role;

create function public.apply_revenuecat_entitlement_event(
  p_event_id text,
  p_event_type text,
  p_event_at timestamptz,
  p_user_id uuid,
  p_entitlement_id text,
  p_product_id text,
  p_status text,
  p_expires_at timestamptz,
  p_will_renew boolean,
  p_environment text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted integer;
begin
  if p_event_id is null or char_length(p_event_id) not between 3 and 200 then
    raise exception using errcode = '22023', message = 'Invalid RevenueCat event id';
  end if;
  if p_event_type is null or char_length(p_event_type) not between 3 and 80 then
    raise exception using errcode = '22023', message = 'Invalid RevenueCat event type';
  end if;
  if p_event_at is null then
    raise exception using errcode = '22023', message = 'Invalid RevenueCat event timestamp';
  end if;
  if p_entitlement_id <> 'mission_kairo_pro' then
    raise exception using errcode = '22023', message = 'Unsupported entitlement';
  end if;
  if p_status not in ('trial', 'active', 'grace', 'billing_issue', 'expired') then
    raise exception using errcode = '22023', message = 'Unsupported entitlement state';
  end if;
  if p_environment not in ('SANDBOX', 'PRODUCTION') then
    raise exception using errcode = '22023', message = 'Unsupported store environment';
  end if;
  if not exists (select 1 from auth.users as account where account.id = p_user_id) then
    raise exception using errcode = '23503', message = 'Subscription account not found';
  end if;

  insert into private.revenuecat_webhook_events (
    event_id,
    user_id,
    event_type,
    environment,
    event_at
  ) values (
    p_event_id,
    p_user_id,
    p_event_type,
    p_environment,
    p_event_at
  )
  on conflict (event_id) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    return false;
  end if;

  insert into private.subscription_entitlements (
    user_id,
    entitlement_id,
    product_id,
    status,
    expires_at,
    will_renew,
    environment,
    source_event_id,
    source_event_at
  ) values (
    p_user_id,
    p_entitlement_id,
    p_product_id,
    p_status,
    p_expires_at,
    p_will_renew,
    p_environment,
    p_event_id,
    p_event_at
  )
  on conflict (user_id) do update
  set
    entitlement_id = excluded.entitlement_id,
    product_id = excluded.product_id,
    status = excluded.status,
    expires_at = excluded.expires_at,
    will_renew = excluded.will_renew,
    environment = excluded.environment,
    source_event_id = excluded.source_event_id,
    source_event_at = excluded.source_event_at,
    updated_at = timezone('utc', now())
  where excluded.source_event_at >= private.subscription_entitlements.source_event_at;

  return true;
end;
$$;

create function private.has_mission_subscription(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    not coalesce((
      select setting.enabled
      from private.release_settings as setting
      where setting.key = 'subscription_enforcement_enabled'
    ), false)
    or exists (
      select 1
      from private.subscription_entitlements as entitlement
      where entitlement.user_id = p_user_id
        and entitlement.entitlement_id = 'mission_kairo_pro'
        and entitlement.status in ('trial', 'active', 'grace')
        and entitlement.expires_at > timezone('utc', now())
    );
$$;

create function private.enforce_mission_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_mission_subscription(new.user_id) then
    raise exception using errcode = '42501', message = 'Active subscription required';
  end if;
  return new;
end;
$$;

create trigger mission_command_receipts_require_subscription
before insert on public.mission_command_receipts
for each row execute function private.enforce_mission_subscription();

revoke all on function public.apply_revenuecat_entitlement_event(
  text,
  text,
  timestamptz,
  uuid,
  text,
  text,
  text,
  timestamptz,
  boolean,
  text
) from public, anon, authenticated;
grant execute on function public.apply_revenuecat_entitlement_event(
  text,
  text,
  timestamptz,
  uuid,
  text,
  text,
  text,
  timestamptz,
  boolean,
  text
) to service_role;

revoke all on function private.has_mission_subscription(uuid) from public, anon, authenticated;
revoke all on function private.enforce_mission_subscription() from public, anon, authenticated;
