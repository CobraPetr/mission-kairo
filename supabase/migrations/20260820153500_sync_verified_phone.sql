create or replace function public.sync_verified_phone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles_private
  set phone_e164 = case
    when new.phone_confirmed_at is not null and new.phone is not null
      then case when new.phone like '+%' then new.phone else '+' || new.phone end
    else null
  end
  where id = new.id;

  return new;
end;
$$;

create trigger on_auth_user_phone_confirmed
after update of phone, phone_confirmed_at on auth.users
for each row execute function public.sync_verified_phone();

update public.profiles_private as profile
set phone_e164 = case
  when auth_user.phone like '+%' then auth_user.phone
  else '+' || auth_user.phone
end
from auth.users as auth_user
where profile.id = auth_user.id
  and auth_user.phone is not null
  and auth_user.phone_confirmed_at is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles_public (id, username)
  values (new.id, 'recruit_' || substr(replace(new.id::text, '-', ''), 1, 16));

  insert into public.profiles_private (id, full_name, phone_e164)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    case
      when new.phone_confirmed_at is not null and new.phone is not null
        then case when new.phone like '+%' then new.phone else '+' || new.phone end
      else null
    end
  );

  return new;
end;
$$;

revoke update on public.profiles_private from authenticated;
grant update (
  full_name,
  birth_date,
  height_cm,
  weight_kg,
  preferred_units,
  relationship_status,
  onboarding_status,
  onboarding_version
) on public.profiles_private to authenticated;
