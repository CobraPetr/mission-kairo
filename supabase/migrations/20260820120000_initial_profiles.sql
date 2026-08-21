create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles_public (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  avatar_path text,
  total_xp bigint not null default 0 check (total_xp >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.profiles_private (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone_e164 text check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  birth_date date,
  height_cm numeric(5, 2) check (height_cm is null or height_cm between 100 and 250),
  weight_kg numeric(6, 2) check (weight_kg is null or weight_kg between 30 and 350),
  preferred_units text not null default 'metric' check (preferred_units in ('metric', 'imperial')),
  relationship_status text,
  onboarding_status text not null default 'not_started'
    check (onboarding_status in ('not_started', 'in_progress', 'complete')),
  onboarding_version integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_public_set_updated_at
before update on public.profiles_public
for each row execute function public.set_updated_at();

create trigger profiles_private_set_updated_at
before update on public.profiles_private
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles_public (id, username)
  values (new.id, 'recruit_' || substr(replace(new.id::text, '-', ''), 1, 16));

  insert into public.profiles_private (id, full_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''));

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles_public enable row level security;
alter table public.profiles_private enable row level security;

revoke all on public.profiles_public from anon, authenticated;
revoke all on public.profiles_private from anon, authenticated;

grant select on public.profiles_public to authenticated;
grant update (username, avatar_path) on public.profiles_public to authenticated;
grant select, update on public.profiles_private to authenticated;

create policy "Authenticated users can view public-safe profiles"
on public.profiles_public
for select
to authenticated
using (auth.uid() is not null);

create policy "Users can update their own public-safe profile"
on public.profiles_public
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can view their own private profile"
on public.profiles_private
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can update their own private profile"
on public.profiles_private
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);
