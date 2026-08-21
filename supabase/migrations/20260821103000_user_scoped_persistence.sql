create or replace function public.prevent_row_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = format('%I is immutable', tg_table_name);
end;
$$;

create table public.onboarding_drafts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null check (schema_version between 1 and 1000),
  section text not null check (char_length(section) between 1 and 64),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and octet_length(payload::text) <= 131072
  ),
  revision bigint not null default 1 check (revision > 0),
  client_updated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.onboarding_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  schema_version integer not null check (schema_version between 1 and 1000),
  answers jsonb not null check (
    jsonb_typeof(answers) = 'object'
    and octet_length(answers::text) <= 131072
  ),
  assessment jsonb not null check (
    jsonb_typeof(assessment) = 'object'
    and octet_length(assessment::text) <= 65536
  ),
  terms_version text not null check (char_length(terms_version) between 1 and 64),
  terms_accepted_at timestamptz not null,
  guardian_consent_version text,
  guardian_consent_recorded_at timestamptz,
  submitted_at timestamptz not null default timezone('utc', now()),
  constraint onboarding_submissions_guardian_consent_complete check (
    (guardian_consent_version is null and guardian_consent_recorded_at is null)
    or (
      char_length(guardian_consent_version) between 1 and 64
      and guardian_consent_recorded_at is not null
    )
  ),
  constraint onboarding_submissions_id_user_unique unique (id, user_id)
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  onboarding_submission_id uuid not null,
  plan_key text not null check (plan_key ~ '^wa_[a-z0-9]{8}$'),
  generator_version integer not null check (generator_version between 1 and 1000),
  base_track text not null check (
    base_track in ('foundation', 'bodyRecomp', 'athletic', 'definition')
  ),
  duration_days integer not null check (duration_days between 1 and 365),
  status text not null default 'active' check (
    status in ('active', 'completed', 'superseded')
  ),
  activated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint plans_submission_owner_fk
    foreign key (onboarding_submission_id, user_id)
    references public.onboarding_submissions(id, user_id)
    on delete cascade,
  constraint plans_id_user_unique unique (id, user_id),
  constraint plans_submission_unique unique (onboarding_submission_id),
  constraint plans_completion_state check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  )
);

create unique index plans_one_active_per_user
on public.plans (user_id)
where status = 'active';

create table public.plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  day_number integer not null check (day_number between 1 and 365),
  kind text not null check (kind in ('training', 'recovery', 'checkpoint')),
  scheduled_for date,
  created_at timestamptz not null default timezone('utc', now()),
  constraint plan_days_plan_owner_fk
    foreign key (plan_id, user_id)
    references public.plans(id, user_id)
    on delete cascade,
  constraint plan_days_plan_day_unique unique (plan_id, day_number),
  constraint plan_days_id_plan_user_unique unique (id, plan_id, user_id)
);

create table public.plan_missions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null,
  plan_day_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  scheduled_key text not null check (char_length(scheduled_key) between 3 and 160),
  template_id text not null check (char_length(template_id) between 2 and 80),
  ordinal integer not null check (ordinal between 1 and 12),
  title text not null check (char_length(title) between 3 and 80),
  category text not null check (
    category in (
      'physical',
      'mindset',
      'presence',
      'career',
      'relationship',
      'recovery',
      'checkpoint'
    )
  ),
  source text not null check (source in ('core', 'personalized')),
  duration_minutes integer not null check (duration_minutes between 2 and 90),
  intensity text not null check (intensity in ('low', 'moderate', 'high')),
  minimum_age integer not null check (minimum_age between 14 and 18),
  xp_reward integer not null check (xp_reward between 1 and 1000),
  steps jsonb not null check (
    case
      when jsonb_typeof(steps) = 'array' then jsonb_array_length(steps) between 1 and 12
      else false
    end
  ),
  created_at timestamptz not null default timezone('utc', now()),
  constraint plan_missions_day_owner_fk
    foreign key (plan_day_id, plan_id, user_id)
    references public.plan_days(id, plan_id, user_id)
    on delete cascade,
  constraint plan_missions_plan_scheduled_unique unique (plan_id, scheduled_key),
  constraint plan_missions_day_ordinal_unique unique (plan_day_id, ordinal),
  constraint plan_missions_id_plan_user_unique unique (id, plan_id, user_id)
);

create table public.arc_executions (
  plan_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  active_day integer not null default 1 check (active_day between 1 and 365),
  current_mission_id uuid,
  current_step_index integer not null default 0 check (current_step_index between 0 and 11),
  mission_status text not null default 'idle' check (
    mission_status in ('idle', 'active', 'paused')
  ),
  revision bigint not null default 1 check (revision > 0),
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint arc_executions_plan_owner_fk
    foreign key (plan_id, user_id)
    references public.plans(id, user_id)
    on delete cascade,
  constraint arc_executions_current_mission_owner_fk
    foreign key (current_mission_id, plan_id, user_id)
    references public.plan_missions(id, plan_id, user_id)
    deferrable initially deferred,
  constraint arc_executions_plan_user_unique unique (plan_id, user_id),
  constraint arc_executions_current_mission_state check (
    (current_mission_id is null and mission_status = 'idle' and current_step_index = 0)
    or (current_mission_id is not null and mission_status in ('active', 'paused'))
  )
);

create table public.day_progress (
  plan_day_id uuid primary key,
  plan_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'locked' check (
    status in ('locked', 'available', 'in_progress', 'sealed', 'missed')
  ),
  sealed_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint day_progress_day_owner_fk
    foreign key (plan_day_id, plan_id, user_id)
    references public.plan_days(id, plan_id, user_id)
    on delete cascade,
  constraint day_progress_plan_day_user_unique unique (plan_day_id, plan_id, user_id),
  constraint day_progress_sealed_state check (
    (status = 'sealed' and sealed_at is not null)
    or (status <> 'sealed' and sealed_at is null)
  )
);

create table public.mission_progress (
  plan_mission_id uuid primary key,
  plan_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'available' check (
    status in ('locked', 'available', 'active', 'paused', 'completed', 'skipped')
  ),
  current_step integer not null default 0 check (current_step between 0 and 11),
  revision bigint not null default 1 check (revision > 0),
  started_at timestamptz,
  completed_at timestamptz,
  skipped_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint mission_progress_mission_owner_fk
    foreign key (plan_mission_id, plan_id, user_id)
    references public.plan_missions(id, plan_id, user_id)
    on delete cascade,
  constraint mission_progress_plan_mission_user_unique unique (
    plan_mission_id,
    plan_id,
    user_id
  ),
  constraint mission_progress_terminal_state check (
    (
      status = 'completed'
      and completed_at is not null
      and skipped_at is null
    )
    or (
      status = 'skipped'
      and skipped_at is not null
      and completed_at is null
    )
    or (
      status not in ('completed', 'skipped')
      and completed_at is null
      and skipped_at is null
    )
  )
);

create table public.mission_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null,
  plan_mission_id uuid not null,
  idempotency_key uuid not null,
  event_type text not null check (
    event_type in (
      'mission_started',
      'mission_paused',
      'mission_resumed',
      'step_advanced',
      'mission_completed',
      'mission_skipped'
    )
  ),
  client_occurred_at timestamptz,
  received_at timestamptz not null default timezone('utc', now()),
  metadata jsonb not null default '{}'::jsonb check (
    jsonb_typeof(metadata) = 'object'
    and octet_length(metadata::text) <= 16384
  ),
  constraint mission_events_mission_owner_fk
    foreign key (plan_mission_id, plan_id, user_id)
    references public.plan_missions(id, plan_id, user_id)
    on delete cascade,
  constraint mission_events_user_idempotency_unique unique (user_id, idempotency_key),
  constraint mission_events_id_plan_user_unique unique (id, plan_id, user_id)
);

create unique index mission_events_one_completion_per_mission
on public.mission_events (plan_mission_id)
where event_type = 'mission_completed';

create table public.xp_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null,
  mission_event_id uuid not null,
  delta integer not null check (delta between -100000 and 100000 and delta <> 0),
  reason text not null check (reason = 'mission_completion'),
  created_at timestamptz not null default timezone('utc', now()),
  constraint xp_ledger_event_owner_fk
    foreign key (mission_event_id, plan_id, user_id)
    references public.mission_events(id, plan_id, user_id)
    on delete cascade,
  constraint xp_ledger_event_unique unique (mission_event_id)
);

create index onboarding_submissions_user_submitted_idx
on public.onboarding_submissions (user_id, submitted_at desc);

create index plan_days_user_plan_day_idx
on public.plan_days (user_id, plan_id, day_number);

create index plan_missions_user_plan_day_idx
on public.plan_missions (user_id, plan_day_id, ordinal);

create index mission_events_user_received_idx
on public.mission_events (user_id, received_at desc);

create index xp_ledger_user_created_idx
on public.xp_ledger (user_id, created_at desc);

create trigger onboarding_drafts_set_updated_at
before update on public.onboarding_drafts
for each row execute function public.set_updated_at();

create trigger plans_set_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

create trigger arc_executions_set_updated_at
before update on public.arc_executions
for each row execute function public.set_updated_at();

create trigger day_progress_set_updated_at
before update on public.day_progress
for each row execute function public.set_updated_at();

create trigger mission_progress_set_updated_at
before update on public.mission_progress
for each row execute function public.set_updated_at();

create trigger onboarding_submissions_prevent_update
before update on public.onboarding_submissions
for each row execute function public.prevent_row_update();

create trigger plan_days_prevent_update
before update on public.plan_days
for each row execute function public.prevent_row_update();

create trigger plan_missions_prevent_update
before update on public.plan_missions
for each row execute function public.prevent_row_update();

create trigger mission_events_prevent_update
before update on public.mission_events
for each row execute function public.prevent_row_update();

create trigger xp_ledger_prevent_update
before update on public.xp_ledger
for each row execute function public.prevent_row_update();

alter table public.onboarding_drafts enable row level security;
alter table public.onboarding_submissions enable row level security;
alter table public.plans enable row level security;
alter table public.plan_days enable row level security;
alter table public.plan_missions enable row level security;
alter table public.arc_executions enable row level security;
alter table public.day_progress enable row level security;
alter table public.mission_progress enable row level security;
alter table public.mission_events enable row level security;
alter table public.xp_ledger enable row level security;

revoke all on public.onboarding_drafts from anon, authenticated;
revoke all on public.onboarding_submissions from anon, authenticated;
revoke all on public.plans from anon, authenticated;
revoke all on public.plan_days from anon, authenticated;
revoke all on public.plan_missions from anon, authenticated;
revoke all on public.arc_executions from anon, authenticated;
revoke all on public.day_progress from anon, authenticated;
revoke all on public.mission_progress from anon, authenticated;
revoke all on public.mission_events from anon, authenticated;
revoke all on public.xp_ledger from anon, authenticated;

grant select on public.onboarding_drafts to authenticated;
grant select on public.onboarding_submissions to authenticated;
grant select on public.plans to authenticated;
grant select on public.plan_days to authenticated;
grant select on public.plan_missions to authenticated;
grant select on public.arc_executions to authenticated;
grant select on public.day_progress to authenticated;
grant select on public.mission_progress to authenticated;
grant select on public.mission_events to authenticated;
grant select on public.xp_ledger to authenticated;

grant all on public.onboarding_drafts to service_role;
grant all on public.onboarding_submissions to service_role;
grant all on public.plans to service_role;
grant all on public.plan_days to service_role;
grant all on public.plan_missions to service_role;
grant all on public.arc_executions to service_role;
grant all on public.day_progress to service_role;
grant all on public.mission_progress to service_role;
grant all on public.mission_events to service_role;
grant all on public.xp_ledger to service_role;
grant usage, select on sequence public.xp_ledger_id_seq to service_role;

create policy "Users can view their own onboarding draft"
on public.onboarding_drafts for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their own onboarding submissions"
on public.onboarding_submissions for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their own plans"
on public.plans for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their own plan days"
on public.plan_days for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their own plan missions"
on public.plan_missions for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their own execution"
on public.arc_executions for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their own day progress"
on public.day_progress for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their own mission progress"
on public.mission_progress for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their own mission events"
on public.mission_events for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view their own XP ledger"
on public.xp_ledger for select to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.save_onboarding_draft(
  p_schema_version integer,
  p_section text,
  p_payload jsonb,
  p_expected_revision bigint default null,
  p_client_updated_at timestamptz default null
)
returns public.onboarding_drafts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_current_revision bigint;
  v_result public.onboarding_drafts;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_schema_version is null or p_schema_version not between 1 and 1000 then
    raise exception using errcode = '22023', message = 'Unsupported onboarding schema version';
  end if;

  if p_section is null or char_length(p_section) not between 1 and 64 then
    raise exception using errcode = '22023', message = 'Invalid onboarding section';
  end if;

  if p_payload is null
    or jsonb_typeof(p_payload) <> 'object'
    or octet_length(p_payload::text) > 131072 then
    raise exception using errcode = '22023', message = 'Invalid onboarding payload';
  end if;

  select revision
  into v_current_revision
  from public.onboarding_drafts
  where user_id = v_user_id
  for update;

  if found then
    if p_expected_revision is null or p_expected_revision <> v_current_revision then
      raise exception using errcode = '40001', message = 'Onboarding draft revision conflict';
    end if;

    update public.onboarding_drafts
    set
      schema_version = p_schema_version,
      section = p_section,
      payload = p_payload,
      revision = revision + 1,
      client_updated_at = p_client_updated_at
    where user_id = v_user_id
    returning * into v_result;
  else
    if p_expected_revision is not null and p_expected_revision <> 0 then
      raise exception using errcode = '40001', message = 'Onboarding draft revision conflict';
    end if;

    insert into public.onboarding_drafts (
      user_id,
      schema_version,
      section,
      payload,
      client_updated_at
    ) values (
      v_user_id,
      p_schema_version,
      p_section,
      p_payload,
      p_client_updated_at
    )
    returning * into v_result;
  end if;

  update public.profiles_private
  set
    onboarding_status = 'in_progress',
    onboarding_version = p_schema_version
  where id = v_user_id
    and onboarding_status <> 'complete';

  return v_result;
end;
$$;

create or replace function public.complete_mission(
  p_plan_mission_id uuid,
  p_idempotency_key uuid,
  p_expected_revision bigint default null
)
returns table (
  execution_revision bigint,
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
  v_xp_reward integer;
  v_step_count integer;
  v_execution_revision bigint;
  v_progress_status text;
  v_progress_step integer;
  v_event_id uuid;
  v_existing_mission_id uuid;
  v_existing_event_type text;
  v_existing_delta integer;
  v_total_xp bigint;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_plan_mission_id is null or p_idempotency_key is null then
    raise exception using errcode = '22023', message = 'Mission and idempotency key are required';
  end if;

  select event.plan_mission_id, event.event_type, ledger.delta
  into v_existing_mission_id, v_existing_event_type, v_existing_delta
  from public.mission_events as event
  left join public.xp_ledger as ledger on ledger.mission_event_id = event.id
  where event.user_id = v_user_id
    and event.idempotency_key = p_idempotency_key;

  if found then
    if v_existing_mission_id <> p_plan_mission_id
      or v_existing_event_type <> 'mission_completed' then
      raise exception using errcode = '23505', message = 'Idempotency key already used';
    end if;

    select execution.revision, profile.total_xp
    into v_execution_revision, v_total_xp
    from public.plan_missions as mission
    join public.arc_executions as execution
      on execution.plan_id = mission.plan_id
      and execution.user_id = mission.user_id
    join public.profiles_public as profile on profile.id = mission.user_id
    where mission.id = p_plan_mission_id
      and mission.user_id = v_user_id;

    return query select v_execution_revision, coalesce(v_existing_delta, 0), v_total_xp;
    return;
  end if;

  select mission.plan_id, mission.xp_reward, jsonb_array_length(mission.steps), execution.revision
  into v_plan_id, v_xp_reward, v_step_count, v_execution_revision
  from public.plan_missions as mission
  join public.plans as plan
    on plan.id = mission.plan_id
    and plan.user_id = mission.user_id
    and plan.status = 'active'
  join public.arc_executions as execution
    on execution.plan_id = mission.plan_id
    and execution.user_id = mission.user_id
  where mission.id = p_plan_mission_id
    and mission.user_id = v_user_id
  for update of execution;

  if not found then
    raise exception using errcode = '42501', message = 'Mission is not available to this user';
  end if;

  if p_expected_revision is not null and p_expected_revision <> v_execution_revision then
    raise exception using errcode = '40001', message = 'Execution revision conflict';
  end if;

  select progress.status, progress.current_step
  into v_progress_status, v_progress_step
  from public.mission_progress as progress
  where progress.plan_mission_id = p_plan_mission_id
    and progress.user_id = v_user_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'Mission progress is missing';
  end if;

  if v_progress_status = 'completed' then
    select profile.total_xp into v_total_xp
    from public.profiles_public as profile
    where profile.id = v_user_id;

    return query select v_execution_revision, 0, v_total_xp;
    return;
  end if;

  if v_progress_status not in ('active', 'paused')
    or v_progress_step < v_step_count - 1 then
    raise exception using errcode = '22023', message = 'Mission is not ready for completion';
  end if;

  if not exists (
    select 1
    from public.arc_executions as execution
    where execution.plan_id = v_plan_id
      and execution.user_id = v_user_id
      and execution.current_mission_id = p_plan_mission_id
      and execution.mission_status in ('active', 'paused')
  ) then
    raise exception using errcode = '22023', message = 'Mission is not the active execution';
  end if;

  insert into public.mission_events (
    user_id,
    plan_id,
    plan_mission_id,
    idempotency_key,
    event_type
  ) values (
    v_user_id,
    v_plan_id,
    p_plan_mission_id,
    p_idempotency_key,
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
  where plan_mission_id = p_plan_mission_id;

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

  return query select v_execution_revision, v_xp_reward, v_total_xp;
end;
$$;

revoke all on function public.save_onboarding_draft(
  integer,
  text,
  jsonb,
  bigint,
  timestamptz
) from public, anon;

revoke all on function public.complete_mission(uuid, uuid, bigint) from public, anon;

grant execute on function public.save_onboarding_draft(
  integer,
  text,
  jsonb,
  bigint,
  timestamptz
) to authenticated;

grant execute on function public.complete_mission(uuid, uuid, bigint) to authenticated;
