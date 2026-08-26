-- Align persisted values with packages/domain and make aggregate/state drift fail closed.

create or replace function private.mission_steps_match_domain(p_steps jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_step record;
  v_order integer;
begin
  if p_steps is null
    or jsonb_typeof(p_steps) <> 'array'
    or jsonb_array_length(p_steps) not between 1 and 12 then
    return false;
  end if;

  for v_step in
    select value, ordinality as ordinal
    from jsonb_array_elements(p_steps) with ordinality
  loop
    if jsonb_typeof(v_step.value) <> 'object' then
      return false;
    end if;

    begin
      v_order := (v_step.value ->> 'order')::integer;
    exception when invalid_text_representation or numeric_value_out_of_range then
      return false;
    end;

    if char_length(v_step.value ->> 'id') not between 1 and 80
      or char_length(v_step.value ->> 'instruction') not between 3 and 240
      or v_order <> v_step.ordinal then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

revoke all on function private.mission_steps_match_domain(jsonb) from public, anon, authenticated;
grant execute on function private.mission_steps_match_domain(jsonb) to service_role;

alter table public.profiles_private
drop constraint profiles_private_height_cm_check,
drop constraint profiles_private_weight_kg_check;

alter table public.profiles_private
add constraint profiles_private_height_cm_check
  check (height_cm is null or height_cm between 120 and 230) not valid,
add constraint profiles_private_weight_kg_check
  check (weight_kg is null or weight_kg between 35 and 250) not valid;

alter table private.mission_templates
drop constraint mission_templates_duration_minutes_check,
drop constraint mission_templates_xp_reward_check,
drop constraint mission_templates_steps_check;

alter table private.mission_templates
add constraint mission_templates_duration_minutes_check
  check (duration_minutes between 2 and 45) not valid,
add constraint mission_templates_xp_reward_check
  check (xp_reward between 10 and 250) not valid,
add constraint mission_templates_steps_check
  check (private.mission_steps_match_domain(steps)) not valid;

alter table public.plans
drop constraint plans_generator_version_check,
drop constraint plans_duration_days_check,
drop constraint plans_generator_seed_version;

alter table public.plans
add constraint plans_generator_version_check
  check (generator_version in (1, 2)) not valid,
add constraint plans_duration_days_check
  check (duration_days = 90) not valid,
add constraint plans_generator_seed_version check (
  (generator_version = 1 and seed_version is null)
  or (
    generator_version = 2
    and seed_version = 'mission-kairo.core.2026-08-26'
  )
) not valid,
add constraint plans_timestamp_order check (
  completed_at is null or completed_at >= activated_at
) not valid;

alter table public.plan_days
drop constraint plan_days_day_number_check;

alter table public.plan_days
add constraint plan_days_day_number_check
  check (day_number between 1 and 90) not valid;

alter table public.plan_missions
drop constraint plan_missions_scheduled_key_check,
drop constraint plan_missions_ordinal_check,
drop constraint plan_missions_duration_minutes_check,
drop constraint plan_missions_xp_reward_check,
drop constraint plan_missions_steps_check;

alter table public.plan_missions
add constraint plan_missions_scheduled_key_check
  check (char_length(scheduled_key) between 3 and 120) not valid,
add constraint plan_missions_ordinal_check
  check (ordinal between 1 and 3) not valid,
add constraint plan_missions_duration_minutes_check
  check (duration_minutes between 2 and 45) not valid,
add constraint plan_missions_xp_reward_check
  check (xp_reward between 10 and 250) not valid,
add constraint plan_missions_steps_check
  check (private.mission_steps_match_domain(steps)) not valid;

alter table public.arc_executions
drop constraint arc_executions_active_day_check;

alter table public.arc_executions
add constraint arc_executions_active_day_check
  check (active_day between 1 and 90) not valid,
add constraint arc_executions_timestamp_order check (
  completed_at is null or completed_at >= started_at
) not valid;

alter table public.mission_progress
add constraint mission_progress_timestamp_order check (
  (completed_at is null or started_at is null or completed_at >= started_at)
  and (skipped_at is null or started_at is null or skipped_at >= started_at)
) not valid;

alter table public.onboarding_submissions
add constraint onboarding_submissions_terms_timestamp check (
  terms_accepted_at <= submitted_at + interval '5 minutes'
) not valid;

alter table public.xp_ledger
drop constraint xp_ledger_delta_check;

alter table public.xp_ledger
add constraint xp_ledger_delta_check
  check (delta between 10 and 250) not valid;

alter table public.profiles_private validate constraint profiles_private_height_cm_check;
alter table public.profiles_private validate constraint profiles_private_weight_kg_check;
alter table private.mission_templates validate constraint mission_templates_duration_minutes_check;
alter table private.mission_templates validate constraint mission_templates_xp_reward_check;
alter table private.mission_templates validate constraint mission_templates_steps_check;
alter table public.plans validate constraint plans_generator_version_check;
alter table public.plans validate constraint plans_duration_days_check;
alter table public.plans validate constraint plans_generator_seed_version;
alter table public.plans validate constraint plans_timestamp_order;
alter table public.plan_days validate constraint plan_days_day_number_check;
alter table public.plan_missions validate constraint plan_missions_scheduled_key_check;
alter table public.plan_missions validate constraint plan_missions_ordinal_check;
alter table public.plan_missions validate constraint plan_missions_duration_minutes_check;
alter table public.plan_missions validate constraint plan_missions_xp_reward_check;
alter table public.plan_missions validate constraint plan_missions_steps_check;
alter table public.arc_executions validate constraint arc_executions_active_day_check;
alter table public.arc_executions validate constraint arc_executions_timestamp_order;
alter table public.mission_progress validate constraint mission_progress_timestamp_order;
alter table public.onboarding_submissions validate constraint onboarding_submissions_terms_timestamp;
alter table public.xp_ledger validate constraint xp_ledger_delta_check;

create or replace function private.assert_plan_calendar(p_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day_count integer;
  v_scheduled_count integer;
  v_first_date date;
  v_invalid_dates integer;
begin
  if not exists (select 1 from public.plans where id = p_plan_id) then
    return;
  end if;

  select
    count(*)::integer,
    count(scheduled_for)::integer,
    min(scheduled_for)
  into v_day_count, v_scheduled_count, v_first_date
  from public.plan_days
  where plan_id = p_plan_id;

  if v_day_count <> 90 then
    raise exception using errcode = '23514', message = 'A canonical plan must contain 90 days';
  end if;

  if v_scheduled_count not in (0, 90) then
    raise exception using errcode = '23514', message = 'Plan dates must be absent or complete';
  end if;

  if v_scheduled_count = 90 then
    select count(*)::integer
    into v_invalid_dates
    from public.plan_days
    where plan_id = p_plan_id
      and scheduled_for <> v_first_date + (day_number - 1);

    if v_invalid_dates <> 0 then
      raise exception using errcode = '23514', message = 'Plan dates must be consecutive';
    end if;
  end if;
end;
$$;

create or replace function private.assert_plan_day_invariants(p_plan_day_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_duration integer;
  v_high_count integer;
  v_min_ordinal integer;
  v_max_ordinal integer;
begin
  if not exists (select 1 from public.plan_days where id = p_plan_day_id) then
    return;
  end if;

  select
    count(*)::integer,
    coalesce(sum(duration_minutes), 0)::integer,
    count(*) filter (where intensity = 'high')::integer,
    min(ordinal),
    max(ordinal)
  into v_count, v_duration, v_high_count, v_min_ordinal, v_max_ordinal
  from public.plan_missions
  where plan_day_id = p_plan_day_id;

  if v_count not between 2 and 3
    or v_duration > 90
    or v_high_count > 1
    or v_min_ordinal <> 1
    or v_max_ordinal <> v_count then
    raise exception using errcode = '23514', message = 'Invalid daily mission schedule';
  end if;
end;
$$;

create or replace function private.enforce_plan_row_calendar_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_plan_calendar(coalesce(new.id, old.id));
  return coalesce(new, old);
end;
$$;

create or replace function private.enforce_plan_day_calendar_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_plan_calendar(coalesce(new.plan_id, old.plan_id));
  return coalesce(new, old);
end;
$$;

create or replace function private.enforce_plan_day_row_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_plan_day_invariants(coalesce(new.id, old.id));
  return coalesce(new, old);
end;
$$;

create or replace function private.enforce_mission_day_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_plan_day_invariants(coalesce(new.plan_day_id, old.plan_day_id));
  return coalesce(new, old);
end;
$$;

do $$
declare
  v_plan record;
  v_day record;
begin
  for v_plan in select id from public.plans loop
    perform private.assert_plan_calendar(v_plan.id);
  end loop;
  for v_day in select id from public.plan_days loop
    perform private.assert_plan_day_invariants(v_day.id);
  end loop;
end;
$$;

create constraint trigger plans_enforce_calendar
after insert on public.plans
deferrable initially deferred
for each row execute function private.enforce_plan_row_calendar_trigger();

create constraint trigger plan_days_enforce_calendar
after insert or update or delete on public.plan_days
deferrable initially deferred
for each row execute function private.enforce_plan_day_calendar_trigger();

create constraint trigger plan_days_enforce_mission_schedule
after insert or update on public.plan_days
deferrable initially deferred
for each row execute function private.enforce_plan_day_row_trigger();

create constraint trigger plan_missions_enforce_day_schedule
after insert or update or delete on public.plan_missions
deferrable initially deferred
for each row execute function private.enforce_mission_day_trigger();

create or replace function private.enforce_plan_status_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if old.status = 'active' and new.status in ('completed', 'superseded') then
    return new;
  end if;
  raise exception using errcode = '23514', message = 'Invalid plan status transition';
end;
$$;

create or replace function private.enforce_day_progress_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = old.status
    or (old.status = 'locked' and new.status = 'available')
    or (old.status = 'available' and new.status in ('in_progress', 'sealed', 'missed'))
    or (old.status = 'in_progress' and new.status in ('sealed', 'missed')) then
    return new;
  end if;
  raise exception using errcode = '23514', message = 'Invalid day status transition';
end;
$$;

create or replace function private.enforce_mission_progress_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_step_count integer;
begin
  if not (
    new.status = old.status
    or (old.status = 'locked' and new.status = 'available')
    or (old.status = 'available' and new.status in ('active', 'skipped'))
    or (old.status = 'active' and new.status in ('paused', 'completed', 'skipped'))
    or (old.status = 'paused' and new.status in ('active', 'completed', 'skipped'))
  ) then
    raise exception using errcode = '23514', message = 'Invalid mission status transition';
  end if;

  select jsonb_array_length(steps)
  into v_step_count
  from public.plan_missions
  where id = new.plan_mission_id
    and plan_id = new.plan_id
    and user_id = new.user_id;

  if v_step_count is null or new.current_step >= v_step_count then
    raise exception using errcode = '23514', message = 'Mission step is outside its template';
  end if;
  return new;
end;
$$;

create or replace function private.enforce_execution_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_step_count integer;
begin
  if new.active_day < old.active_day or new.active_day > old.active_day + 1 then
    raise exception using errcode = '23514', message = 'Invalid active day transition';
  end if;

  if not (
    new.mission_status = old.mission_status
    or (old.mission_status = 'idle' and new.mission_status = 'active')
    or (old.mission_status = 'active' and new.mission_status in ('idle', 'paused'))
    or (old.mission_status = 'paused' and new.mission_status in ('idle', 'active'))
  ) then
    raise exception using errcode = '23514', message = 'Invalid execution status transition';
  end if;

  if new.current_mission_id is not null then
    select jsonb_array_length(steps)
    into v_step_count
    from public.plan_missions
    where id = new.current_mission_id
      and plan_id = new.plan_id
      and user_id = new.user_id;

    if v_step_count is null or new.current_step_index >= v_step_count then
      raise exception using errcode = '23514', message = 'Execution step is outside its template';
    end if;
  end if;
  return new;
end;
$$;

create trigger plans_enforce_status_transition
before update on public.plans
for each row execute function private.enforce_plan_status_transition();

create trigger day_progress_enforce_status_transition
before update on public.day_progress
for each row execute function private.enforce_day_progress_transition();

create trigger mission_progress_enforce_status_transition
before update on public.mission_progress
for each row execute function private.enforce_mission_progress_transition();

create trigger arc_executions_enforce_transition
before update on public.arc_executions
for each row execute function private.enforce_execution_transition();

create or replace function private.validate_xp_ledger_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expected_xp integer;
  v_event_type text;
begin
  perform 1
  from public.profiles_public
  where id = new.user_id
  for update;

  if not found then
    raise exception using errcode = '23503', message = 'XP owner profile is missing';
  end if;

  select mission.xp_reward, event.event_type
  into v_expected_xp, v_event_type
  from public.mission_events as event
  join public.plan_missions as mission
    on mission.id = event.plan_mission_id
    and mission.plan_id = event.plan_id
    and mission.user_id = event.user_id
  where event.id = new.mission_event_id
    and event.plan_id = new.plan_id
    and event.user_id = new.user_id;

  if v_event_type is distinct from 'mission_completed'
    or new.reason is distinct from 'mission_completion'
    or new.delta is distinct from v_expected_xp then
    raise exception using errcode = '23514', message = 'XP ledger entry is not canonical';
  end if;
  return new;
end;
$$;

create or replace function private.reconcile_profile_total_xp(p_user_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total bigint;
begin
  perform 1
  from public.profiles_public
  where id = p_user_id
  for update;

  select coalesce(sum(delta), 0)::bigint
  into v_total
  from public.xp_ledger
  where user_id = p_user_id;

  perform set_config('mission_kairo.reconciling_xp', 'on', true);
  update public.profiles_public
  set total_xp = v_total
  where id = p_user_id;
  perform set_config('mission_kairo.reconciling_xp', 'off', true);

  return v_total;
end;
$$;

create or replace function private.detect_xp_drift()
returns table (
  user_id uuid,
  stored_total bigint,
  ledger_total bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profile.id,
    profile.total_xp,
    coalesce(sum(ledger.delta), 0)::bigint
  from public.profiles_public as profile
  left join public.xp_ledger as ledger on ledger.user_id = profile.id
  group by profile.id, profile.total_xp
  having profile.total_xp <> coalesce(sum(ledger.delta), 0)::bigint
$$;

create or replace function private.enforce_profile_total_xp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.total_xp := 0;
    return new;
  end if;

  if current_setting('mission_kairo.reconciling_xp', true) = 'on' then
    return new;
  end if;

  new.total_xp := old.total_xp;
  return new;
end;
$$;

create or replace function private.lock_xp_owner_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1
  from public.profiles_public
  where id = old.user_id
  for update;
  return old;
end;
$$;

create or replace function private.reconcile_xp_ledger_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('mission_kairo.reconciling_xp', 'on', true);
  if tg_op = 'INSERT' then
    update public.profiles_public
    set total_xp = total_xp + new.delta
    where id = new.user_id;
  else
    update public.profiles_public
    set total_xp = greatest(0, total_xp - old.delta)
    where id = old.user_id;
  end if;
  perform set_config('mission_kairo.reconciling_xp', 'off', true);
  return coalesce(new, old);
end;
$$;

do $$
declare
  v_profile record;
begin
  for v_profile in select id from public.profiles_public loop
    perform private.reconcile_profile_total_xp(v_profile.id);
  end loop;
end;
$$;

create trigger profiles_public_derive_total_xp_on_insert
before insert on public.profiles_public
for each row execute function private.enforce_profile_total_xp();

create trigger profiles_public_derive_total_xp_on_update
before update of total_xp on public.profiles_public
for each row execute function private.enforce_profile_total_xp();

create trigger xp_ledger_validate_canonical
before insert on public.xp_ledger
for each row execute function private.validate_xp_ledger_entry();

create trigger xp_ledger_lock_owner_on_delete
before delete on public.xp_ledger
for each row execute function private.lock_xp_owner_trigger();

create trigger xp_ledger_reconcile_total
after insert or delete on public.xp_ledger
for each row execute function private.reconcile_xp_ledger_trigger();

revoke all on function private.assert_plan_calendar(uuid) from public, anon, authenticated;
revoke all on function private.assert_plan_day_invariants(uuid) from public, anon, authenticated;
revoke all on function private.reconcile_profile_total_xp(uuid) from public, anon, authenticated;
revoke all on function private.detect_xp_drift() from public, anon, authenticated;
grant execute on function private.reconcile_profile_total_xp(uuid) to service_role;
grant execute on function private.detect_xp_drift() to service_role;
