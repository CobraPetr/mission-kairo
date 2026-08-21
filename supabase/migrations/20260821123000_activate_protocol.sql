alter table public.onboarding_submissions
add column activation_key uuid not null default gen_random_uuid();

alter table public.onboarding_submissions
add constraint onboarding_submissions_user_activation_unique unique (user_id, activation_key);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.mission_templates (
  template_id text primary key check (char_length(template_id) between 2 and 80),
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
  duration_minutes integer not null check (duration_minutes between 2 and 90),
  intensity text not null check (intensity in ('low', 'moderate', 'high')),
  minimum_age integer not null check (minimum_age between 14 and 18),
  xp_reward integer not null check (xp_reward between 1 and 1000),
  steps jsonb not null check (
    jsonb_typeof(steps) = 'array'
    and jsonb_array_length(steps) between 1 and 12
  )
);

revoke all on private.mission_templates from public, anon, authenticated;
grant usage on schema private to service_role;
grant select on private.mission_templates to service_role;

insert into private.mission_templates (
  template_id,
  title,
  category,
  duration_minutes,
  intensity,
  minimum_age,
  xp_reward,
  steps
) values
  (
    'physical.baseline-walk',
    'Baseline movement',
    'physical',
    20,
    'low',
    14,
    60,
    '[{"id":"timer","instruction":"Set a 20-minute timer.","order":1},{"id":"walk","instruction":"Walk at a deliberate, comfortable pace.","order":2},{"id":"record","instruction":"Return and record honest completion.","order":3}]'
  ),
  (
    'physical.bodyweight-circuit',
    'Controlled bodyweight circuit',
    'physical',
    24,
    'moderate',
    14,
    80,
    '[{"id":"warmup","instruction":"Complete five minutes of easy movement.","order":1},{"id":"circuit","instruction":"Complete three controlled full-body rounds.","order":2},{"id":"stop","instruction":"Stop if pain, dizziness, or unsafe symptoms appear.","order":3}]'
  ),
  (
    'physical.gym-foundation',
    'Foundation strength session',
    'physical',
    40,
    'moderate',
    14,
    110,
    '[{"id":"warmup","instruction":"Warm up for five minutes.","order":1},{"id":"sets","instruction":"Complete the assigned full-body movements with controlled form.","order":2},{"id":"record","instruction":"Record effort and leave two safe repetitions in reserve.","order":3}]'
  ),
  (
    'mindset.standard-journal',
    'Write the standard',
    'mindset',
    8,
    'low',
    14,
    45,
    '[{"id":"write","instruction":"Write the one action that proves your standard today.","order":1},{"id":"schedule","instruction":"Assign it a specific time and place.","order":2}]'
  ),
  (
    'presence.posture-reset',
    'Posture reset',
    'presence',
    5,
    'low',
    14,
    35,
    '[{"id":"reset","instruction":"Complete five slow posture and breathing resets.","order":1},{"id":"walk","instruction":"Walk for two minutes with deliberate eye line and pace.","order":2}]'
  ),
  (
    'recovery.walk',
    'Recovery movement',
    'recovery',
    20,
    'low',
    14,
    45,
    '[{"id":"walk","instruction":"Move gently for twenty minutes without performance pressure.","order":1},{"id":"check","instruction":"Record energy and soreness honestly.","order":2}]'
  ),
  (
    'mindset.weekly-review',
    'Weekly debrief',
    'mindset',
    12,
    'low',
    14,
    60,
    '[{"id":"evidence","instruction":"Review completed and missed orders without judgment.","order":1},{"id":"adjust","instruction":"Choose one realistic adjustment for next week.","order":2}]'
  ),
  (
    'checkpoint.review',
    'Protocol checkpoint',
    'checkpoint',
    18,
    'low',
    14,
    100,
    '[{"id":"measure","instruction":"Record current measurements and private progress evidence.","order":1},{"id":"compare","instruction":"Compare behavior trends, not appearance alone.","order":2},{"id":"adjust","instruction":"Confirm or revise the next phase target.","order":3}]'
  ),
  (
    'career.focus-block',
    'Career focus block',
    'career',
    25,
    'moderate',
    14,
    75,
    '[{"id":"target","instruction":"Choose one useful work or education outcome.","order":1},{"id":"focus","instruction":"Work on it without switching tasks for twenty minutes.","order":2},{"id":"record","instruction":"Record the concrete output produced.","order":3}]'
  ),
  (
    'relationship.social-repetition',
    'One honest interaction',
    'relationship',
    10,
    'low',
    14,
    55,
    '[{"id":"choose","instruction":"Choose one safe, ordinary social interaction.","order":1},{"id":"speak","instruction":"Start with a genuine question or observation.","order":2},{"id":"reflect","instruction":"Record what happened without scoring your worth.","order":3}]'
  );

create or replace function public.activate_protocol(
  p_activation_key uuid,
  p_username text,
  p_schema_version integer,
  p_answers jsonb,
  p_assessment jsonb,
  p_terms_version text,
  p_terms_accepted_at timestamptz,
  p_guardian_consent_version text default null,
  p_guardian_consent_recorded_at timestamptz default null
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
  v_user_id uuid := auth.uid();
  v_submission_id uuid;
  v_plan_id uuid;
  v_plan_key text;
  v_username text := lower(trim(p_username));
  v_age integer;
  v_gym_access text;
  v_current_build text;
  v_target_build text;
  v_relationship_goal text;
  v_base_track text;
  v_full_name text;
  v_height_cm numeric;
  v_weight_kg numeric;
  v_units text;
  v_relationship_status text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_activation_key is null then
    raise exception using errcode = '22023', message = 'Activation key required';
  end if;

  if not exists (
    select 1
    from auth.users as app_user
    where app_user.id = v_user_id
      and app_user.email_confirmed_at is not null
      and app_user.phone_confirmed_at is not null
  ) then
    raise exception using
      errcode = '42501',
      message = 'Verified email and phone required';
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
  where submission.user_id = v_user_id
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
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception using errcode = '22023', message = 'Invalid numeric assessment values';
  end;

  v_gym_access := p_assessment ->> 'gymAccess';
  v_current_build := p_assessment ->> 'currentBuild';
  v_target_build := p_assessment ->> 'targetBuild';
  v_relationship_goal := p_assessment ->> 'relationshipGoal';
  v_full_name := nullif(trim(p_answers #>> '{identity,fullName}'), '');
  v_units := p_answers #>> '{identity,unitSystem}';
  v_relationship_status := p_answers #>> '{relationship,status}';

  if v_age is null
    or v_age not between 14 and 100
    or v_gym_access is null
    or v_gym_access not in ('member', 'home', 'outdoor', 'none')
    or v_current_build is null
    or v_current_build not in ('starting', 'average', 'athletic', 'defined')
    or v_target_build is null
    or v_target_build not in ('lean', 'athletic', 'muscular', 'defined')
    or v_relationship_goal is null
    or v_relationship_goal not in ('selfFocus', 'approach', 'date', 'relationship', 'strengthen')
    or v_full_name is null
    or char_length(v_full_name) > 120
    or v_height_cm is null
    or v_height_cm not between 100 and 250
    or v_weight_kg is null
    or v_weight_kg not between 30 and 350
    or v_units is null
    or v_units not in ('metric', 'imperial') then
    raise exception using errcode = '22023', message = 'Invalid plan assessment values';
  end if;

  if v_age < 18 and (
    p_guardian_consent_version is null
    or p_guardian_consent_recorded_at is null
    or coalesce((p_answers #>> '{consent,guardianConfirmed}')::boolean, false) is false
  ) then
    raise exception using errcode = '22023', message = 'Guardian consent required';
  end if;

  v_base_track := case
    when v_current_build = 'starting' then 'foundation'
    when v_target_build = 'muscular' then 'bodyRecomp'
    when v_target_build = 'defined' then 'definition'
    else 'athletic'
  end;
  v_plan_key := 'wa_' || substr(md5(p_assessment::text), 1, 8);

  update public.profiles_public as profile
  set username = v_username
  where profile.id = v_user_id;

  update public.profiles_private as profile
  set
    full_name = v_full_name,
    height_cm = v_height_cm,
    weight_kg = v_weight_kg,
    preferred_units = v_units,
    relationship_status = v_relationship_status,
    onboarding_status = 'complete',
    onboarding_version = p_schema_version
  where profile.id = v_user_id;

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
    v_user_id,
    p_activation_key,
    p_schema_version,
    p_answers,
    p_assessment,
    p_terms_version,
    p_terms_accepted_at,
    p_guardian_consent_version,
    p_guardian_consent_recorded_at
  )
  returning id into v_submission_id;

  update public.plans as plan
  set status = 'superseded'
  where plan.user_id = v_user_id
    and plan.status = 'active';

  insert into public.plans (
    user_id,
    onboarding_submission_id,
    plan_key,
    generator_version,
    base_track,
    duration_days
  ) values (
    v_user_id,
    v_submission_id,
    v_plan_key,
    1,
    v_base_track,
    90
  )
  returning id into v_plan_id;

  insert into public.plan_days (plan_id, user_id, day_number, kind)
  select
    v_plan_id,
    v_user_id,
    day_number,
    case
      when day_number in (30, 60, 90) then 'checkpoint'
      when day_number % 7 = 0 then 'recovery'
      else 'training'
    end
  from generate_series(1, 90) as day_number;

  with scheduled as (
    select
      day_number,
      1 as ordinal,
      case
        when day_number % 7 = 0 then 'recovery.walk'
        when day_number = 1 or v_current_build = 'starting' then 'physical.baseline-walk'
        when v_gym_access = 'member' then 'physical.gym-foundation'
        else 'physical.bodyweight-circuit'
      end as template_id,
      'core' as source
    from generate_series(1, 90) as day_number

    union all

    select
      day_number,
      2,
      case
        when day_number % 7 = 0 then 'mindset.weekly-review'
        when day_number in (30, 60, 90) then 'checkpoint.review'
        when day_number % 2 = 0 then 'presence.posture-reset'
        else 'mindset.standard-journal'
      end,
      'core'
    from generate_series(1, 90) as day_number

    union all

    select
      day_number,
      3,
      case
        when day_number % 4 = 0 or v_relationship_goal = 'selfFocus'
          then 'career.focus-block'
        else 'relationship.social-repetition'
      end,
      'personalized'
    from generate_series(1, 90) as day_number
    where day_number % 2 = 0
  )
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
    day.id,
    v_user_id,
    v_plan_key || '.' || lpad(scheduled.day_number::text, 2, '0') || '.'
      || template.template_id || '.' || scheduled.source,
    template.template_id,
    scheduled.ordinal,
    template.title,
    template.category,
    scheduled.source,
    template.duration_minutes,
    template.intensity,
    template.minimum_age,
    template.xp_reward,
    template.steps
  from scheduled
  join public.plan_days as day
    on day.plan_id = v_plan_id
    and day.user_id = v_user_id
    and day.day_number = scheduled.day_number
  join private.mission_templates as template
    on template.template_id = scheduled.template_id;

  insert into public.arc_executions (plan_id, user_id)
  values (v_plan_id, v_user_id)
  returning revision into execution_revision;

  insert into public.day_progress (plan_day_id, plan_id, user_id, status)
  select
    day.id,
    v_plan_id,
    v_user_id,
    case when day.day_number = 1 then 'available' else 'locked' end
  from public.plan_days as day
  where day.plan_id = v_plan_id
    and day.user_id = v_user_id;

  insert into public.mission_progress (plan_mission_id, plan_id, user_id, status)
  select
    mission.id,
    v_plan_id,
    v_user_id,
    case when day.day_number = 1 then 'available' else 'locked' end
  from public.plan_missions as mission
  join public.plan_days as day
    on day.id = mission.plan_day_id
    and day.plan_id = mission.plan_id
    and day.user_id = mission.user_id
  where mission.plan_id = v_plan_id
    and mission.user_id = v_user_id;

  activated_plan_id := v_plan_id;
  activated_plan_key := v_plan_key;
  return next;
end;
$$;

revoke all on function public.activate_protocol(
  uuid,
  text,
  integer,
  jsonb,
  jsonb,
  text,
  timestamptz,
  text,
  timestamptz
) from public, anon;

grant execute on function public.activate_protocol(
  uuid,
  text,
  integer,
  jsonb,
  jsonb,
  text,
  timestamptz,
  text,
  timestamptz
) to authenticated;
