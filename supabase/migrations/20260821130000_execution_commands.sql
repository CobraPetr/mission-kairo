create or replace function public.execute_mission_command(
  p_command text,
  p_scheduled_key text,
  p_expected_revision bigint
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
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_command not in ('begin', 'pause', 'resume', 'advance', 'skip', 'close_day') then
    raise exception using errcode = '22023', message = 'Unsupported mission command';
  end if;

  if p_expected_revision is null then
    raise exception using errcode = '22023', message = 'Execution revision required';
  end if;

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

  if p_expected_revision <> v_execution_revision then
    raise exception using errcode = '40001', message = 'Execution revision conflict';
  end if;

  if p_command = 'close_day' then
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
    set status = 'sealed', sealed_at = timezone('utc', now())
    from public.plan_days as day
    where day.id = progress.plan_day_id
      and day.plan_id = v_plan_id
      and day.user_id = v_user_id
      and day.day_number = v_active_day;

    if v_active_day < 90 then
      update public.day_progress as progress
      set status = 'available'
      from public.plan_days as day
      where day.id = progress.plan_day_id
        and day.plan_id = v_plan_id
        and day.user_id = v_user_id
        and day.day_number = v_active_day + 1;

      update public.mission_progress as progress
      set status = 'available'
      from public.plan_missions as mission
      join public.plan_days as day
        on day.id = mission.plan_day_id
        and day.plan_id = mission.plan_id
        and day.user_id = mission.user_id
      where progress.plan_mission_id = mission.id
        and day.plan_id = v_plan_id
        and day.user_id = v_user_id
        and day.day_number = v_active_day + 1;
    else
      update public.plans
      set status = 'completed', completed_at = timezone('utc', now())
      where id = v_plan_id and user_id = v_user_id;
    end if;

    update public.arc_executions
    set
      active_day = least(v_active_day + 1, 90),
      completed_at = case when v_active_day = 90 then timezone('utc', now()) else null end,
      revision = revision + 1
    where plan_id = v_plan_id
      and user_id = v_user_id
    returning revision into v_execution_revision;

    update public.profiles_public
    set current_streak = least(current_streak + 1, 90)
    where id = v_user_id
    returning profiles_public.total_xp into v_total_xp;

    return query select v_execution_revision, 'day_closed'::text, 0, v_total_xp;
    return;
  end if;

  if p_scheduled_key is null then
    raise exception using errcode = '22023', message = 'Scheduled mission required';
  end if;

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
    and mission.scheduled_key = p_scheduled_key
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
      select profile.total_xp into v_total_xp
      from public.profiles_public as profile where profile.id = v_user_id;
      return query select v_execution_revision, v_execution_status, 0, v_total_xp;
      return;
    end if;

    if v_current_mission_id is not null or v_execution_status <> 'idle' then
      raise exception using errcode = '22023', message = 'Another mission is already active';
    end if;

    update public.mission_progress
    set
      status = 'active',
      started_at = coalesce(started_at, timezone('utc', now())),
      revision = revision + 1
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
    command_result := 'active';
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
    command_result := 'paused';
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
    command_result := 'active';
  elsif p_command = 'skip' then
    if v_progress_status = 'completed' then
      raise exception using errcode = '22023', message = 'A completed mission cannot be skipped';
    end if;
    if v_progress_status = 'skipped' then
      select profile.total_xp into v_total_xp
      from public.profiles_public as profile where profile.id = v_user_id;
      return query select v_execution_revision, 'skipped'::text, 0, v_total_xp;
      return;
    end if;

    update public.mission_progress
    set
      status = 'skipped',
      skipped_at = timezone('utc', now()),
      completed_at = null,
      revision = revision + 1
    where plan_mission_id = v_mission_id;

    update public.day_progress
    set status = 'in_progress'
    where plan_day_id = v_plan_day_id;

    update public.arc_executions
    set
      current_mission_id = case when current_mission_id = v_mission_id then null else current_mission_id end,
      current_step_index = case when current_mission_id = v_mission_id then 0 else current_step_index end,
      mission_status = case when current_mission_id = v_mission_id then 'idle' else mission_status end,
      revision = revision + 1
    where plan_id = v_plan_id
    returning revision into v_execution_revision;
    v_event_type := 'mission_skipped';
    command_result := 'skipped';
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
      command_result := 'advanced';
    else
      insert into public.mission_events (
        user_id,
        plan_id,
        plan_mission_id,
        idempotency_key,
        event_type
      ) values (
        v_user_id,
        v_plan_id,
        v_mission_id,
        gen_random_uuid(),
        'mission_completed'
      )
      returning id into v_event_id;

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

      update public.mission_progress
      set
        status = 'completed',
        completed_at = timezone('utc', now()),
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

      update public.profiles_public as profile
      set total_xp = profile.total_xp + v_xp_reward
      where profile.id = v_user_id
      returning profile.total_xp into v_total_xp;

      v_awarded_xp := v_xp_reward;
      command_result := 'completed';
    end if;
  end if;

  if v_event_type is not null then
    insert into public.mission_events (
      user_id,
      plan_id,
      plan_mission_id,
      idempotency_key,
      event_type
    ) values (
      v_user_id,
      v_plan_id,
      v_mission_id,
      gen_random_uuid(),
      v_event_type
    );
  end if;

  if v_total_xp is null then
    select profile.total_xp into v_total_xp
    from public.profiles_public as profile where profile.id = v_user_id;
  end if;

  execution_revision := v_execution_revision;
  awarded_xp := v_awarded_xp;
  total_xp := v_total_xp;
  return next;
end;
$$;

revoke all on function public.execute_mission_command(text, text, bigint) from public, anon;
grant execute on function public.execute_mission_command(text, text, bigint) to authenticated;
