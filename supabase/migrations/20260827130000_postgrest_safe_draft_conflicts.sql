-- Return optimistic draft conflicts without triggering PostgREST's SQLSTATE 40001 retry loop.

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
      raise exception using errcode = 'PT409', message = 'Onboarding draft revision conflict';
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
      raise exception using errcode = 'PT409', message = 'Onboarding draft revision conflict';
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
