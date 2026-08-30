-- Anchor every protocol to real calendar dates in the user's activation timezone.

alter table public.plans
add column time_zone text not null default 'UTC'
check (char_length(time_zone) between 1 and 64);

alter table public.plans
add column time_zone_anchored_at timestamptz;

create or replace function private.prevent_plan_day_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_calendar_reanchor boolean := coalesce(
    current_setting('mission_kairo.calendar_reanchor', true) = 'on',
    false
  );
begin
  if v_calendar_reanchor
    and row(new.id, new.plan_id, new.user_id, new.day_number, new.kind, new.created_at)
      is not distinct from
      row(old.id, old.plan_id, old.user_id, old.day_number, old.kind, old.created_at) then
    return new;
  end if;

  raise exception using errcode = '55000', message = 'plan_days is immutable';
end;
$$;

drop trigger plan_days_prevent_update on public.plan_days;
create trigger plan_days_prevent_update
before update on public.plan_days
for each row execute function private.prevent_plan_day_update();

select set_config('mission_kairo.calendar_reanchor', 'on', true);
update public.plan_days as day
set scheduled_for = (timezone(plan.time_zone, plan.activated_at))::date + (day.day_number - 1)
from public.plans as plan
where plan.id = day.plan_id
  and plan.user_id = day.user_id
  and day.scheduled_for is null;
select set_config('mission_kairo.calendar_reanchor', 'off', true);

create or replace function private.assign_plan_day_schedule()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activated_at timestamptz;
  v_time_zone text;
begin
  if new.scheduled_for is not null then
    return new;
  end if;

  select plan.activated_at, plan.time_zone
  into v_activated_at, v_time_zone
  from public.plans as plan
  where plan.id = new.plan_id
    and plan.user_id = new.user_id;

  if not found then
    raise exception using errcode = '23503', message = 'Plan owner is missing';
  end if;

  new.scheduled_for := (timezone(v_time_zone, v_activated_at))::date + (new.day_number - 1);
  return new;
end;
$$;

create trigger plan_days_assign_schedule
before insert on public.plan_days
for each row execute function private.assign_plan_day_schedule();

create or replace function public.set_plan_time_zone(
  p_user_id uuid,
  p_plan_id uuid,
  p_time_zone text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activated_at timestamptz;
  v_existing_time_zone text;
  v_time_zone_anchored_at timestamptz;
begin
  if p_user_id is null or p_plan_id is null then
    raise exception using errcode = '22023', message = 'Plan identity required';
  end if;

  if p_time_zone is null
    or char_length(p_time_zone) not between 1 and 64
    or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_time_zone) then
    raise exception using errcode = '22023', message = 'Invalid activation time zone';
  end if;

  select plan.activated_at, plan.time_zone, plan.time_zone_anchored_at
  into v_activated_at, v_existing_time_zone, v_time_zone_anchored_at
  from public.plans as plan
  where id = p_plan_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'Plan owner mismatch';
  end if;

  if v_time_zone_anchored_at is not null then
    if v_existing_time_zone is distinct from p_time_zone then
      raise exception using errcode = '22023', message = 'Plan time zone is already anchored';
    end if;
    return;
  end if;

  update public.plans
  set
    time_zone = p_time_zone,
    time_zone_anchored_at = timezone('utc', now())
  where id = p_plan_id
    and user_id = p_user_id;

  perform set_config('mission_kairo.calendar_reanchor', 'on', true);
  update public.plan_days
  set scheduled_for = (timezone(p_time_zone, v_activated_at))::date + (day_number - 1)
  where plan_id = p_plan_id
    and user_id = p_user_id;
  perform set_config('mission_kairo.calendar_reanchor', 'off', true);
end;
$$;

revoke all on function public.set_plan_time_zone(uuid, uuid, text)
from public, anon, authenticated;
grant execute on function public.set_plan_time_zone(uuid, uuid, text) to service_role;

create or replace function private.enforce_execution_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_step_count integer;
  v_calendar_sync boolean := coalesce(
    current_setting('mission_kairo.calendar_sync', true) = 'on',
    false
  );
begin
  if new.active_day < old.active_day
    or (new.active_day > old.active_day + 1 and not v_calendar_sync) then
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

create or replace function private.sync_execution_calendar_for(
  p_user_id uuid,
  p_today date default null
)
returns table (
  execution_revision bigint,
  active_day integer,
  calendar_changed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan_id uuid;
  v_time_zone text;
  v_duration integer;
  v_current_day integer;
  v_today date;
  v_target_day integer;
  v_last_date date;
  v_missed_count integer := 0;
  v_should_complete boolean := false;
begin
  if p_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select plan.id, plan.time_zone, plan.duration_days, execution.active_day
  into v_plan_id, v_time_zone, v_duration, v_current_day
  from public.plans as plan
  join public.arc_executions as execution
    on execution.plan_id = plan.id
    and execution.user_id = plan.user_id
  where plan.user_id = p_user_id
    and plan.status = 'active'
  for update of execution;

  if not found then
    return;
  end if;

  v_today := coalesce(p_today, (timezone(v_time_zone, now()))::date);

  select day_number
  into v_target_day
  from public.plan_days
  where plan_id = v_plan_id
    and user_id = p_user_id
    and scheduled_for = v_today;

  select max(scheduled_for)
  into v_last_date
  from public.plan_days
  where plan_id = v_plan_id
    and user_id = p_user_id;

  if v_target_day is null then
    if v_today > v_last_date then
      v_target_day := v_duration;
      v_should_complete := true;
    else
      v_target_day := 1;
    end if;
  end if;

  update public.day_progress as progress
  set status = 'available'
  from public.plan_days as day
  where day.id = progress.plan_day_id
    and day.plan_id = v_plan_id
    and day.user_id = p_user_id
    and day.scheduled_for < v_today
    and progress.status = 'locked';

  update public.day_progress as progress
  set status = 'missed', sealed_at = null
  from public.plan_days as day
  where day.id = progress.plan_day_id
    and day.plan_id = v_plan_id
    and day.user_id = p_user_id
    and day.scheduled_for < v_today
    and progress.status in ('available', 'in_progress');
  get diagnostics v_missed_count = row_count;

  update public.mission_progress as progress
  set status = 'available'
  from public.plan_missions as mission
  join public.plan_days as day
    on day.id = mission.plan_day_id
    and day.plan_id = mission.plan_id
    and day.user_id = mission.user_id
  where progress.plan_mission_id = mission.id
    and day.plan_id = v_plan_id
    and day.user_id = p_user_id
    and day.scheduled_for < v_today
    and progress.status = 'locked';

  update public.mission_progress as progress
  set
    status = 'skipped',
    completed_at = null,
    skipped_at = timezone('utc', now()),
    revision = revision + 1
  from public.plan_missions as mission
  join public.plan_days as day
    on day.id = mission.plan_day_id
    and day.plan_id = mission.plan_id
    and day.user_id = mission.user_id
  where progress.plan_mission_id = mission.id
    and day.plan_id = v_plan_id
    and day.user_id = p_user_id
    and day.scheduled_for < v_today
    and progress.status in ('available', 'active', 'paused');

  if not v_should_complete then
    update public.day_progress as progress
    set status = 'available'
    from public.plan_days as day
    where day.id = progress.plan_day_id
      and day.plan_id = v_plan_id
      and day.user_id = p_user_id
      and day.day_number = v_target_day
      and progress.status = 'locked';

    update public.mission_progress as progress
    set status = 'available'
    from public.plan_missions as mission
    join public.plan_days as day
      on day.id = mission.plan_day_id
      and day.plan_id = mission.plan_id
      and day.user_id = mission.user_id
    where progress.plan_mission_id = mission.id
      and day.plan_id = v_plan_id
      and day.user_id = p_user_id
      and day.day_number = v_target_day
      and progress.status = 'locked';
  end if;

  calendar_changed := v_current_day is distinct from v_target_day or v_missed_count > 0;
  if calendar_changed then
    perform set_config('mission_kairo.calendar_sync', 'on', true);
    update public.arc_executions
    set
      active_day = v_target_day,
      current_mission_id = null,
      current_step_index = 0,
      mission_status = 'idle',
      revision = revision + 1,
      completed_at = case when v_should_complete then timezone('utc', now()) else null end
    where plan_id = v_plan_id
      and user_id = p_user_id
    returning revision, arc_executions.active_day
    into execution_revision, active_day;
    perform set_config('mission_kairo.calendar_sync', 'off', true);
  else
    select execution.revision, execution.active_day
    into execution_revision, active_day
    from public.arc_executions as execution
    where execution.plan_id = v_plan_id
      and execution.user_id = p_user_id;
  end if;

  if v_missed_count > 0 then
    update public.profiles_public
    set current_streak = 0
    where id = p_user_id;
  end if;

  if v_should_complete then
    update public.plans
    set status = 'completed', completed_at = timezone('utc', now())
    where id = v_plan_id
      and user_id = p_user_id;
  end if;

  return next;
end;
$$;

revoke all on function private.sync_execution_calendar_for(uuid, date)
from public, anon, authenticated;
grant execute on function private.sync_execution_calendar_for(uuid, date) to service_role;

create or replace function public.sync_execution_calendar()
returns table (
  execution_revision bigint,
  active_day integer,
  calendar_changed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  return query
  select * from private.sync_execution_calendar_for(v_user_id, null);
end;
$$;

revoke all on function public.sync_execution_calendar() from public, anon;
grant execute on function public.sync_execution_calendar() to authenticated;
