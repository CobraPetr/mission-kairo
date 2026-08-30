alter table public.plans
add column seed_version text;

alter table public.plans
add constraint plans_generator_seed_version check (
  (generator_version = 1 and seed_version is null)
  or (
    generator_version >= 2
    and char_length(seed_version) between 1 and 80
  )
);

create or replace function public.activate_generated_protocol(
  p_user_id uuid,
  p_activation_key uuid,
  p_username text,
  p_schema_version integer,
  p_answers jsonb,
  p_assessment jsonb,
  p_plan jsonb,
  p_terms_version text,
  p_terms_accepted_at timestamptz
)
returns table (
  activated_plan_id uuid,
  activated_plan_key text,
  execution_revision bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission_id uuid;
  v_plan_id uuid;
  v_plan_key text;
  v_username text := lower(trim(p_username));
  v_age integer;
  v_plan_version integer;
  v_seed_version text;
  v_base_track text;
  v_duration_days integer;
  v_full_name text;
  v_height_cm numeric;
  v_weight_kg numeric;
  v_units text;
  v_relationship_status text;
begin
  if p_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_activation_key is null then
    raise exception using errcode = '22023', message = 'Activation key required';
  end if;

  if not exists (
    select 1
    from auth.users as app_user
    where app_user.id = p_user_id
      and app_user.email_confirmed_at is not null
  ) then
    raise exception using errcode = '42501', message = 'Verified email required';
  end if;

  select plan.id, plan.plan_key, execution.revision
  into v_plan_id, v_plan_key, execution_revision
  from public.onboarding_submissions as submission
  join public.plans as plan
    on plan.onboarding_submission_id = submission.id
    and plan.user_id = submission.user_id
  join public.arc_executions as execution
    on execution.plan_id = plan.id
    and execution.user_id = plan.user_id
  where submission.user_id = p_user_id
    and submission.activation_key = p_activation_key;

  if found then
    activated_plan_id := v_plan_id;
    activated_plan_key := v_plan_key;
    return next;
    return;
  end if;

  if p_schema_version is distinct from 2 then
    raise exception using errcode = '22023', message = 'Unsupported onboarding schema version';
  end if;

  if p_answers is null
    or jsonb_typeof(p_answers) <> 'object'
    or octet_length(p_answers::text) > 131072 then
    raise exception using errcode = '22023', message = 'Invalid onboarding answers';
  end if;

  if p_assessment is null
    or jsonb_typeof(p_assessment) <> 'object'
    or octet_length(p_assessment::text) > 65536 then
    raise exception using errcode = '22023', message = 'Invalid plan assessment';
  end if;

  if p_plan is null
    or jsonb_typeof(p_plan) <> 'object'
    or octet_length(p_plan::text) > 1048576 then
    raise exception using errcode = '22023', message = 'Invalid plan manifest';
  end if;

  if v_username is null or v_username !~ '^[a-z0-9_]{3,24}$' then
    raise exception using errcode = '22023', message = 'Invalid username';
  end if;

  if p_terms_version is null
    or char_length(p_terms_version) not between 1 and 64
    or p_terms_accepted_at is null then
    raise exception using errcode = '22023', message = 'Terms acceptance required';
  end if;

  begin
    v_age := (p_assessment ->> 'age')::integer;
    v_height_cm := (p_answers #>> '{identity,heightCm}')::numeric;
    v_weight_kg := (p_answers #>> '{identity,weightKg}')::numeric;
    v_plan_version := (p_plan ->> 'version')::integer;
    v_duration_days := (p_plan ->> 'durationDays')::integer;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception using errcode = '22023', message = 'Invalid numeric activation values';
  end;

  if v_age is null or v_age < 14 then
    raise exception using errcode = '22023', message = 'Minimum activation age is 14';
  end if;
  if v_age < 18 then
    raise exception using errcode = '42501', message = 'Verified guardian approval required';
  end if;

  v_plan_key := p_plan ->> 'planId';
  v_seed_version := p_plan ->> 'seedVersion';
  v_base_track := p_plan ->> 'baseTrack';
  v_full_name := nullif(trim(p_answers #>> '{identity,fullName}'), '');
  v_units := p_answers #>> '{identity,unitSystem}';
  v_relationship_status := p_answers #>> '{relationship,status}';

  if v_age > 100
    or v_full_name is null
    or char_length(v_full_name) > 120
    or v_height_cm is null
    or v_height_cm not between 120 and 230
    or v_weight_kg is null
    or v_weight_kg not between 35 and 250
    or v_units not in ('metric', 'imperial') then
    raise exception using errcode = '22023', message = 'Invalid plan assessment values';
  end if;

  if v_plan_version is distinct from 2
    or v_seed_version is distinct from 'mission-kairo.core.2026-08-26'
    or v_plan_key is null
    or v_plan_key !~ '^wa_[a-z0-9]{8}$'
    or v_base_track not in ('foundation', 'bodyRecomp', 'athletic', 'definition')
    or v_duration_days is distinct from 90
    or jsonb_typeof(p_plan -> 'days') <> 'array'
    or jsonb_array_length(p_plan -> 'days') <> 90 then
    raise exception using errcode = '22023', message = 'Invalid plan manifest';
  end if;

  begin
    if exists (
      select 1
      from jsonb_array_elements(p_plan -> 'days') with ordinality as day(value, ordinal)
      where jsonb_typeof(day.value) <> 'object'
        or (day.value ->> 'day')::integer <> day.ordinal
        or day.value ->> 'kind' not in ('training', 'recovery', 'checkpoint')
        or jsonb_typeof(day.value -> 'missions') <> 'array'
        or jsonb_array_length(day.value -> 'missions') not between 2 and 3
    ) then
      raise exception using errcode = '22023', message = 'Invalid plan manifest';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(p_plan -> 'days') with ordinality as day(value, day_ordinal)
      cross join lateral jsonb_array_elements(day.value -> 'missions')
        with ordinality as mission(value, mission_ordinal)
      where jsonb_typeof(mission.value) <> 'object'
        or mission.value ->> 'scheduledId' is distinct from (
          v_plan_key || '.' || lpad(day_ordinal::text, 2, '0') || '.'
          || (mission.value ->> 'id') || '.' || (mission.value ->> 'source')
        )
        or mission.value ->> 'source' not in ('core', 'personalized')
        or mission.value ->> 'category' not in (
          'physical', 'mindset', 'presence', 'career', 'relationship', 'recovery', 'checkpoint'
        )
        or mission.value ->> 'intensity' not in ('low', 'moderate', 'high')
        or (mission.value ->> 'durationMinutes')::integer not between 2 and 45
        or (mission.value ->> 'minAge')::integer not between 14 and 18
        or (mission.value ->> 'minAge')::integer > v_age
        or (mission.value ->> 'xp')::integer not between 10 and 250
        or char_length(mission.value ->> 'id') not between 2 and 80
        or char_length(mission.value ->> 'title') not between 3 and 80
        or jsonb_typeof(mission.value -> 'steps') <> 'array'
        or jsonb_array_length(mission.value -> 'steps') not between 1 and 12
    ) then
      raise exception using errcode = '22023', message = 'Invalid plan manifest';
    end if;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception using errcode = '22023', message = 'Invalid plan manifest';
  end;

  if (
    select count(*)
    from jsonb_array_elements(p_plan -> 'days') as day(value)
    cross join lateral jsonb_array_elements(day.value -> 'missions') as mission(value)
  ) <> 225
    or (
      select count(*)
      from jsonb_array_elements(p_plan -> 'days') as day(value)
      cross join lateral jsonb_array_elements(day.value -> 'missions') as mission(value)
      where mission.value ->> 'source' = 'core'
    ) <> 180
    or (
      select count(*)
      from jsonb_array_elements(p_plan -> 'days') as day(value)
      cross join lateral jsonb_array_elements(day.value -> 'missions') as mission(value)
      where mission.value ->> 'source' = 'personalized'
    ) <> 45 then
    raise exception using errcode = '22023', message = 'Invalid plan manifest';
  end if;

  update public.profiles_public as profile
  set username = v_username
  where profile.id = p_user_id;

  update public.profiles_private as profile
  set
    full_name = v_full_name,
    height_cm = v_height_cm,
    weight_kg = v_weight_kg,
    preferred_units = v_units,
    relationship_status = v_relationship_status,
    onboarding_status = 'complete',
    onboarding_version = p_schema_version
  where profile.id = p_user_id;

  insert into public.onboarding_submissions (
    user_id,
    activation_key,
    schema_version,
    answers,
    assessment,
    terms_version,
    terms_accepted_at,
    guardian_consent_version,
    guardian_consent_recorded_at
  ) values (
    p_user_id,
    p_activation_key,
    p_schema_version,
    p_answers,
    p_assessment,
    p_terms_version,
    p_terms_accepted_at,
    null,
    null
  )
  returning id into v_submission_id;

  update public.plans as plan
  set status = 'superseded'
  where plan.user_id = p_user_id
    and plan.status = 'active';

  insert into public.plans (
    user_id,
    onboarding_submission_id,
    plan_key,
    generator_version,
    seed_version,
    base_track,
    duration_days
  ) values (
    p_user_id,
    v_submission_id,
    v_plan_key,
    v_plan_version,
    v_seed_version,
    v_base_track,
    v_duration_days
  )
  returning id into v_plan_id;

  insert into public.plan_days (plan_id, user_id, day_number, kind)
  select
    v_plan_id,
    p_user_id,
    (day.value ->> 'day')::integer,
    day.value ->> 'kind'
  from jsonb_array_elements(p_plan -> 'days') as day(value);

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
    v_plan_id,
    plan_day.id,
    p_user_id,
    mission.value ->> 'scheduledId',
    mission.value ->> 'id',
    mission.ordinal::integer,
    mission.value ->> 'title',
    mission.value ->> 'category',
    mission.value ->> 'source',
    (mission.value ->> 'durationMinutes')::integer,
    mission.value ->> 'intensity',
    (mission.value ->> 'minAge')::integer,
    (mission.value ->> 'xp')::integer,
    mission.value -> 'steps'
  from jsonb_array_elements(p_plan -> 'days') as day(value)
  join public.plan_days as plan_day
    on plan_day.plan_id = v_plan_id
    and plan_day.user_id = p_user_id
    and plan_day.day_number = (day.value ->> 'day')::integer
  cross join lateral jsonb_array_elements(day.value -> 'missions')
    with ordinality as mission(value, ordinal);

  insert into public.arc_executions (plan_id, user_id)
  values (v_plan_id, p_user_id)
  returning revision into execution_revision;

  insert into public.day_progress (plan_day_id, plan_id, user_id, status)
  select
    day.id,
    v_plan_id,
    p_user_id,
    case when day.day_number = 1 then 'available' else 'locked' end
  from public.plan_days as day
  where day.plan_id = v_plan_id
    and day.user_id = p_user_id;

  insert into public.mission_progress (plan_mission_id, plan_id, user_id, status)
  select
    mission.id,
    v_plan_id,
    p_user_id,
    case when day.day_number = 1 then 'available' else 'locked' end
  from public.plan_missions as mission
  join public.plan_days as day
    on day.id = mission.plan_day_id
    and day.plan_id = mission.plan_id
    and day.user_id = mission.user_id
  where mission.plan_id = v_plan_id
    and mission.user_id = p_user_id;

  activated_plan_id := v_plan_id;
  activated_plan_key := v_plan_key;
  return next;
end;
$$;

revoke execute on function public.activate_protocol(
  uuid,
  text,
  integer,
  jsonb,
  jsonb,
  text,
  timestamptz,
  text,
  timestamptz
) from authenticated;

revoke all on function public.activate_generated_protocol(
  uuid,
  uuid,
  text,
  integer,
  jsonb,
  jsonb,
  jsonb,
  text,
  timestamptz
) from public, anon, authenticated;

grant execute on function public.activate_generated_protocol(
  uuid,
  uuid,
  text,
  integer,
  jsonb,
  jsonb,
  jsonb,
  text,
  timestamptz
) to service_role;
