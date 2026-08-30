#!/usr/bin/env bash

set -euo pipefail

supabase db reset --local --no-seed --version 20260821130000
task_db_container="$(docker ps --filter 'name=supabase_db_' --format '{{.Names}}' | head -n 1)"
if [[ -z "$task_db_container" ]]; then
  echo 'Local Supabase database container was not found' >&2
  exit 1
fi

docker exec -i "$task_db_container" psql -v ON_ERROR_STOP=1 -U postgres -d postgres >/dev/null <<'SQL'
begin;

insert into auth.users (
  id,
  email,
  phone,
  email_confirmed_at,
  phone_confirmed_at,
  raw_user_meta_data
) values (
  'e1000000-0000-0000-0000-000000000001',
  'six-migration-upgrade@example.test',
  '+41790000991',
  timezone('utc', now()),
  timezone('utc', now()),
  '{}'
);

set local role authenticated;
set local request.jwt.claim.sub = 'e1000000-0000-0000-0000-000000000001';
set local request.jwt.claim.role = 'authenticated';

select * from public.activate_protocol(
  'e2000000-0000-0000-0000-000000000002',
  'upgrade_guard',
  2,
  '{"identity":{"fullName":"Upgrade Guard","heightCm":181,"weightKg":82,"unitSystem":"metric"},"relationship":{"status":"single"},"consent":{"guardianConfirmed":false}}',
  '{"age":24,"gymAccess":"member","currentBuild":"average","targetBuild":"defined","relationshipGoal":"approach"}',
  '2026-08-21',
  timezone('utc', now()),
  '+41790000991',
  timezone('utc', now())
);

commit;
SQL

supabase migration up --local

docker exec -i "$task_db_container" psql -v ON_ERROR_STOP=1 -U postgres -d postgres >/dev/null <<'SQL'
do $$
begin
  if (select count(*) from public.plan_days where user_id = 'e1000000-0000-0000-0000-000000000001') <> 90 then
    raise exception 'six-migration fixture did not preserve its 90-day plan';
  end if;
  if (select count(*) from public.plan_missions where user_id = 'e1000000-0000-0000-0000-000000000001') <> 225 then
    raise exception 'six-migration fixture did not preserve its canonical missions';
  end if;
  if exists (select 1 from private.detect_xp_drift()) then
    raise exception 'six-migration fixture upgraded with XP drift';
  end if;
end;
$$;
SQL

echo 'six-migration upgrade test passed'
