-- Replace competing mission mutation paths with one authenticated, retry-safe command boundary.

create table public.mission_command_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  plan_id uuid not null,
  command text not null check (
    command in ('begin', 'pause', 'resume', 'advance', 'skip', 'close_day')
  ),
  target_scheduled_key text,
  expected_revision bigint not null check (expected_revision > 0),
  client_occurred_at timestamptz not null,
  execution_revision bigint not null check (execution_revision > 0),
  command_result text not null check (
    command_result in ('active', 'paused', 'advanced', 'completed', 'skipped', 'day_closed')
  ),
  awarded_xp integer not null check (awarded_xp between 0 and 250),
  total_xp bigint not null check (total_xp >= 0),
  received_at timestamptz not null default timezone('utc', now()),
  constraint mission_command_receipts_pk primary key (user_id, idempotency_key),
  constraint mission_command_receipts_plan_owner_fk
    foreign key (plan_id, user_id)
    references public.plans(id, user_id)
    on delete cascade,
  constraint mission_command_receipts_target_shape check (
    (command = 'close_day' and target_scheduled_key is null)
    or (
      command <> 'close_day'
      and char_length(target_scheduled_key) between 3 and 120
    )
  )
);

create index mission_command_receipts_user_received_idx
on public.mission_command_receipts (user_id, received_at desc);

create trigger mission_command_receipts_prevent_update
before update on public.mission_command_receipts
for each row execute function public.prevent_row_update();

alter table public.mission_command_receipts enable row level security;

revoke all on public.mission_command_receipts from anon, authenticated;
grant select on public.mission_command_receipts to authenticated;
grant all on public.mission_command_receipts to service_role;

create policy "Users can view their own mission command receipts"
on public.mission_command_receipts for select to authenticated
using ((select auth.uid()) = user_id);

drop function if exists public.execute_mission_command(text, text, bigint);
drop function if exists public.complete_mission(uuid, uuid, bigint);

create function public.execute_mission_command(
  p_command text,
  p_target_id text,
  p_expected_revision bigint,
  p_idempotency_key uuid,
  p_client_occurred_at timestamptz
)
returns table (
  execution_revision bigint,
  command_result text,
  awarded_xp integer,
  total_xp bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := timezone('utc', now());
  v_target_id text := nullif(p_target_id, '');
  v_plan_id uuid;
  v_active_day integer;
  v_current_mission_id uuid;
  v_execution_status text;
  v_execution_revision bigint;
  v_mission_id uuid;
  v_plan_day_id uuid;
  v_mission_day integer;
  v_mission_ordinal integer;
  v_xp_reward integer;
  v_step_count integer;
  v_progress_status text;
  v_progress_step integer;
  v_event_type text;
  v_event_id uuid;
  v_total_xp bigint;
  v_awarded_xp integer := 0;
  v_command_result text;
  v_receipt public.mission_command_receipts;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_command not in ('begin', 'pause', 'resume', 'advance', 'skip', 'close_day') then
    raise exception using errcode = '22023', message = 'Unsupported mission command';
  end if;

  if p_expected_revision is null or p_expected_revision < 1 then
    raise exception using errcode = '22023', message = 'Valid execution revision required';
  end if;

  if p_idempotency_key is null then
    raise exception using errcode = '22023', message = 'Idempotency key required';
  end if;

  if (p_command = 'close_day' and v_target_id is not null)
    or (
      p_command <> 'close_day'
      and (v_target_id is null or char_length(v_target_id) not between 3 and 120)
    ) then
    raise exception using errcode = '22023', message = 'Canonical target is invalid';
  end if;

  -- A receipt remains replayable even after day 90 completes the plan. This first lookup handles
  -- completed/superseded plans; the second lookup after the execution lock closes the race between
  -- two simultaneous first attempts.
  select *
  into v_receipt
  from public.mission_command_receipts as receipt
  where receipt.user_id = v_user_id
    and receipt.idempotency_key = p_idempotency_key;

  if found then
    if v_receipt.command is distinct from p_command
      or v_receipt.target_scheduled_key is distinct from v_target_id
      or v_receipt.expected_revision is distinct from p_expected_revision
      or v_receipt.client_occurred_at is distinct from p_client_occurred_at then
      raise exception using errcode = '22023', message = 'Idempotency key reused with different input';
    end if;

    return query select
      v_receipt.execution_revision,
      v_receipt.command_result,
      v_receipt.awarded_xp,
      v_receipt.total_xp;
    return;
  end if;

  perform public.sync_execution_calendar();

  select
    plan.id,
    execution.active_day,
    execution.current_mission_id,
    execution.mission_status,
    execution.revision
  into
    v_plan_id,
    v_active_day,
    v_current_mission_id,
    v_execution_status,
    v_execution_revision
  from public.plans as plan
  join public.arc_executions as execution
    on execution.plan_id = plan.id
    and execution.user_id = plan.user_id
  where plan.user_id = v_user_id
    and plan.status = 'active'
  for update of execution;

  if not found then
    raise exception using errcode = '22023', message = 'Active execution not found';
  end if;

  select *
  into v_receipt
  from public.mission_command_receipts as receipt
  where receipt.user_id = v_user_id
    and receipt.idempotency_key = p_idempotency_key;

  if found then
    if v_receipt.plan_id is distinct from v_plan_id
      or v_receipt.command is distinct from p_command
      or v_receipt.target_scheduled_key is distinct from v_target_id
      or v_receipt.expected_revision is distinct from p_expected_revision
      or v_receipt.client_occurred_at is distinct from p_client_occurred_at then
      raise exception using errcode = '22023', message = 'Idempotency key reused with different input';
    end if;

    return query select
      v_receipt.execution_revision,
      v_receipt.command_result,
      v_receipt.awarded_xp,
      v_receipt.total_xp;
    return;
  end if;

  if p_client_occurred_at is null
    or p_client_occurred_at < v_now - interval '30 days'
    or p_client_occurred_at > v_now + interval '5 minutes' then
    raise exception using errcode = '22023', message = 'Client timestamp is outside the accepted window';
  end if;

  if p_expected_revision <> v_execution_revision then
    -- PT409 is a PostgREST-safe conflict signal. SQLSTATE 40001 is reserved for transient
    -- serialization failures and PostgREST 14 retries it, which turns a deliberate stale-write
    -- rejection into a gateway timeout under real two-client races.
    raise exception using errcode = 'PT409', message = 'Execution revision conflict';
  end if;

  if p_command = 'close_day' then
    if not exists (
      select 1
      from public.day_progress as progress
      join public.plan_days as day on day.id = progress.plan_day_id
      where day.plan_id = v_plan_id
        and day.user_id = v_user_id
        and day.day_number = v_active_day
        and progress.status in ('available', 'in_progress')
    ) then
      raise exception using errcode = '22023', message = 'The active day cannot be sealed';
    end if;

    if exists (
      select 1
      from public.plan_days as day
      join public.plan_missions as mission
        on mission.plan_day_id = day.id
        and mission.plan_id = day.plan_id
        and mission.user_id = day.user_id
      join public.mission_progress as progress
        on progress.plan_mission_id = mission.id
        and progress.plan_id = mission.plan_id
        and progress.user_id = mission.user_id
      where day.plan_id = v_plan_id
        and day.user_id = v_user_id
        and day.day_number = v_active_day
        and progress.status not in ('completed', 'skipped')
    ) then
      raise exception using errcode = '22023', message = 'Resolve every mission before closing the day';
    end if;

    update public.day_progress as progress
    set status = 'sealed', sealed_at = v_now
    from public.plan_days as day
    where day.id = progress.plan_day_id
      and day.plan_id = v_plan_id
      and day.user_id = v_user_id
      and day.day_number = v_active_day;

    if v_active_day = 90 then
      update public.plans
      set status = 'completed', completed_at = v_now
      where id = v_plan_id and user_id = v_user_id;
    end if;

    update public.arc_executions
    set
      active_day = v_active_day,
      completed_at = case when v_active_day = 90 then v_now else null end,
      revision = revision + 1
    where plan_id = v_plan_id
      and user_id = v_user_id
    returning revision into v_execution_revision;

    update public.profiles_public
    set current_streak = least(current_streak + 1, 90)
    where id = v_user_id;

    v_command_result := 'day_closed';
  else
    select
      mission.id,
      mission.plan_day_id,
      day.day_number,
      mission.ordinal,
      mission.xp_reward,
      jsonb_array_length(mission.steps),
      progress.status,
      progress.current_step
    into
      v_mission_id,
      v_plan_day_id,
      v_mission_day,
      v_mission_ordinal,
      v_xp_reward,
      v_step_count,
      v_progress_status,
      v_progress_step
    from public.plan_missions as mission
    join public.plan_days as day
      on day.id = mission.plan_day_id
      and day.plan_id = mission.plan_id
      and day.user_id = mission.user_id
    join public.mission_progress as progress
      on progress.plan_mission_id = mission.id
      and progress.plan_id = mission.plan_id
      and progress.user_id = mission.user_id
    where mission.plan_id = v_plan_id
      and mission.user_id = v_user_id
      and mission.scheduled_key = v_target_id
    for update of progress;

    if not found or v_mission_day <> v_active_day then
      raise exception using errcode = '22023', message = 'Mission is not available today';
    end if;

    if p_command in ('begin', 'skip') and exists (
      select 1
      from public.plan_missions as earlier
      join public.mission_progress as earlier_progress
        on earlier_progress.plan_mission_id = earlier.id
        and earlier_progress.plan_id = earlier.plan_id
        and earlier_progress.user_id = earlier.user_id
      where earlier.plan_day_id = v_plan_day_id
        and earlier.user_id = v_user_id
        and earlier.ordinal < v_mission_ordinal
        and earlier_progress.status not in ('completed', 'skipped')
    ) then
      raise exception using errcode = '22023', message = 'Complete earlier mission orders first';
    end if;

    if p_command = 'begin' then
      if v_progress_status in ('completed', 'skipped') then
        raise exception using errcode = '22023', message = 'Mission is already resolved';
      end if;

      if v_current_mission_id = v_mission_id and v_execution_status in ('active', 'paused') then
        v_command_result := v_execution_status;
      else
        if v_current_mission_id is not null or v_execution_status <> 'idle' then
          raise exception using errcode = '22023', message = 'Another mission is already active';
        end if;

        update public.mission_progress
        set status = 'active', started_at = coalesce(started_at, v_now), revision = revision + 1
        where plan_mission_id = v_mission_id;

        update public.day_progress
        set status = 'in_progress'
        where plan_day_id = v_plan_day_id;

        update public.arc_executions
        set
          current_mission_id = v_mission_id,
          current_step_index = v_progress_step,
          mission_status = 'active',
          revision = revision + 1
        where plan_id = v_plan_id
        returning revision into v_execution_revision;
        v_event_type := 'mission_started';
        v_command_result := 'active';
      end if;
    elsif p_command = 'pause' then
      if v_current_mission_id <> v_mission_id
        or v_execution_status <> 'active'
        or v_progress_status <> 'active' then
        raise exception using errcode = '22023', message = 'Only the active mission can be paused';
      end if;

      update public.mission_progress
      set status = 'paused', revision = revision + 1
      where plan_mission_id = v_mission_id;
      update public.arc_executions
      set mission_status = 'paused', revision = revision + 1
      where plan_id = v_plan_id
      returning revision into v_execution_revision;
      v_event_type := 'mission_paused';
      v_command_result := 'paused';
    elsif p_command = 'resume' then
      if v_current_mission_id <> v_mission_id
        or v_execution_status <> 'paused'
        or v_progress_status <> 'paused' then
        raise exception using errcode = '22023', message = 'Only the paused mission can be resumed';
      end if;

      update public.mission_progress
      set status = 'active', revision = revision + 1
      where plan_mission_id = v_mission_id;
      update public.arc_executions
      set mission_status = 'active', revision = revision + 1
      where plan_id = v_plan_id
      returning revision into v_execution_revision;
      v_event_type := 'mission_resumed';
      v_command_result := 'active';
    elsif p_command = 'skip' then
      if v_progress_status = 'completed' then
        raise exception using errcode = '22023', message = 'A completed mission cannot be skipped';
      end if;

      if v_progress_status = 'skipped' then
        v_command_result := 'skipped';
      else
        update public.mission_progress
        set
          status = 'skipped',
          skipped_at = v_now,
          completed_at = null,
          revision = revision + 1
        where plan_mission_id = v_mission_id;

        update public.day_progress
        set status = 'in_progress'
        where plan_day_id = v_plan_day_id;

        update public.arc_executions
        set
          current_mission_id = case
            when current_mission_id = v_mission_id then null else current_mission_id
          end,
          current_step_index = case
            when current_mission_id = v_mission_id then 0 else current_step_index
          end,
          mission_status = case
            when current_mission_id = v_mission_id then 'idle' else mission_status
          end,
          revision = revision + 1
        where plan_id = v_plan_id
        returning revision into v_execution_revision;
        v_event_type := 'mission_skipped';
        v_command_result := 'skipped';
      end if;
    elsif p_command = 'advance' then
      if v_current_mission_id <> v_mission_id
        or v_execution_status <> 'active'
        or v_progress_status <> 'active' then
        raise exception using errcode = '22023', message = 'Only the active mission can advance';
      end if;

      if v_progress_step < v_step_count - 1 then
        update public.mission_progress
        set current_step = current_step + 1, revision = revision + 1
        where plan_mission_id = v_mission_id;
        update public.arc_executions
        set current_step_index = current_step_index + 1, revision = revision + 1
        where plan_id = v_plan_id
        returning revision into v_execution_revision;
        v_event_type := 'step_advanced';
        v_command_result := 'advanced';
      else
        update public.mission_progress
        set
          status = 'completed',
          completed_at = v_now,
          skipped_at = null,
          revision = revision + 1
        where plan_mission_id = v_mission_id;

        update public.arc_executions
        set
          current_mission_id = null,
          current_step_index = 0,
          mission_status = 'idle',
          revision = revision + 1
        where plan_id = v_plan_id
        returning revision into v_execution_revision;

        v_event_type := 'mission_completed';
        v_command_result := 'completed';
        v_awarded_xp := v_xp_reward;
      end if;
    end if;

    if v_event_type is not null then
      insert into public.mission_events (
        user_id,
        plan_id,
        plan_mission_id,
        idempotency_key,
        event_type,
        client_occurred_at
      ) values (
        v_user_id,
        v_plan_id,
        v_mission_id,
        p_idempotency_key,
        v_event_type,
        p_client_occurred_at
      )
      returning id into v_event_id;

      if v_event_type = 'mission_completed' then
        insert into public.xp_ledger (
          user_id,
          plan_id,
          mission_event_id,
          delta,
          reason
        ) values (
          v_user_id,
          v_plan_id,
          v_event_id,
          v_xp_reward,
          'mission_completion'
        );
      end if;
    end if;
  end if;

  select profile.total_xp
  into v_total_xp
  from public.profiles_public as profile
  where profile.id = v_user_id;

  if v_total_xp is null then
    raise exception using errcode = '23503', message = 'XP owner profile is missing';
  end if;

  insert into public.mission_command_receipts (
    user_id,
    idempotency_key,
    plan_id,
    command,
    target_scheduled_key,
    expected_revision,
    client_occurred_at,
    execution_revision,
    command_result,
    awarded_xp,
    total_xp
  ) values (
    v_user_id,
    p_idempotency_key,
    v_plan_id,
    p_command,
    v_target_id,
    p_expected_revision,
    p_client_occurred_at,
    v_execution_revision,
    v_command_result,
    v_awarded_xp,
    v_total_xp
  );

  return query select v_execution_revision, v_command_result, v_awarded_xp, v_total_xp;
end;
$$;

revoke all on function public.execute_mission_command(
  text, text, bigint, uuid, timestamptz
) from public, anon;
grant execute on function public.execute_mission_command(
  text, text, bigint, uuid, timestamptz
) to authenticated;
