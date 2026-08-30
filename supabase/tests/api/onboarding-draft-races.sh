#!/usr/bin/env bash

set -euo pipefail

task_status_json="$(supabase status -o json 2>/dev/null)"
task_api_url="$(jq -r '.API_URL' <<<"$task_status_json")"
task_anon_key="$(jq -r '.ANON_KEY' <<<"$task_status_json")"
task_service_key="$(jq -r '.SERVICE_ROLE_KEY' <<<"$task_status_json")"
task_suffix="$(date +%s)"
task_email="draft-race-${task_suffix}@example.test"
task_password='Draft-Race-2026!'
task_user_id=''
task_temp_dir="$(mktemp -d)"

cleanup() {
  if [[ -n "$task_user_id" ]]; then
    curl -sS -X DELETE "$task_api_url/auth/v1/admin/users/$task_user_id" \
      -H "apikey: $task_service_key" \
      -H "Authorization: Bearer $task_service_key" >/dev/null || true
  fi
  rm -rf "$task_temp_dir"
}
trap cleanup EXIT

task_created_user="$(
  curl -sS -X POST "$task_api_url/auth/v1/admin/users" \
    -H "apikey: $task_service_key" \
    -H "Authorization: Bearer $task_service_key" \
    -H 'Content-Type: application/json' \
    --data "{\"email\":\"$task_email\",\"password\":\"$task_password\",\"email_confirm\":true}"
)"
task_user_id="$(jq -r '.id // empty' <<<"$task_created_user")"
if [[ -z "$task_user_id" ]]; then
  echo 'Could not create the onboarding race user' >&2
  exit 1
fi

task_access_token="$(
  curl -sS -X POST "$task_api_url/auth/v1/token?grant_type=password" \
    -H "apikey: $task_anon_key" \
    -H 'Content-Type: application/json' \
    --data "{\"email\":\"$task_email\",\"password\":\"$task_password\"}" |
    jq -r '.access_token // empty'
)"
if [[ -z "$task_access_token" ]]; then
  echo 'Could not authenticate the onboarding race user' >&2
  exit 1
fi

invoke_save() {
  local task_payload="$1"
  local task_output_prefix="$2"
  curl -sS -o "${task_output_prefix}.body" -w '%{http_code}' -X POST \
    "$task_api_url/rest/v1/rpc/save_onboarding_draft" \
    -H "apikey: $task_anon_key" \
    -H "Authorization: Bearer $task_access_token" \
    -H 'Content-Type: application/json' \
    --data "$task_payload" >"${task_output_prefix}.status"
}

task_now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
task_initial_payload="$(
  jq -nc --arg clientAt "$task_now" '{
    p_schema_version: 2,
    p_section: "identity",
    p_payload: {section: "identity", version: 2},
    p_expected_revision: 0,
    p_client_updated_at: $clientAt
  }'
)"
invoke_save "$task_initial_payload" "$task_temp_dir/initial"
if [[ "$(<"$task_temp_dir/initial.status")" != '200' ]]; then
  echo "Initial onboarding save failed: $(<"$task_temp_dir/initial.body")" >&2
  exit 1
fi

task_payload_a="$(
  jq -nc --arg clientAt "$task_now" '{
    p_schema_version: 2,
    p_section: "activity",
    p_payload: {device: "a", section: "activity", version: 2},
    p_expected_revision: 1,
    p_client_updated_at: $clientAt
  }'
)"
task_payload_b="$(
  jq -nc --arg clientAt "$task_now" '{
    p_schema_version: 2,
    p_section: "physical",
    p_payload: {device: "b", section: "physical", version: 2},
    p_expected_revision: 1,
    p_client_updated_at: $clientAt
  }'
)"

invoke_save "$task_payload_a" "$task_temp_dir/race-a" &
task_pid_a=$!
invoke_save "$task_payload_b" "$task_temp_dir/race-b" &
task_pid_b=$!
wait "$task_pid_a"
wait "$task_pid_b"

task_status_a="$(<"$task_temp_dir/race-a.status")"
task_status_b="$(<"$task_temp_dir/race-b.status")"
if [[ "$task_status_a" == '200' && "$task_status_b" == '409' ]]; then
  task_loser="$task_temp_dir/race-b"
elif [[ "$task_status_b" == '200' && "$task_status_a" == '409' ]]; then
  task_loser="$task_temp_dir/race-a"
else
  echo "Expected one draft winner and one conflict, got HTTP $task_status_a and $task_status_b" >&2
  exit 1
fi

if ! jq -e '.code == "PT409" and .message == "Onboarding draft revision conflict"' \
  "$task_loser.body" >/dev/null; then
  echo "Draft race loser returned the wrong error: $(<"$task_loser.body")" >&2
  exit 1
fi

task_stored="$(
  curl -sS "$task_api_url/rest/v1/onboarding_drafts?select=revision&user_id=eq.$task_user_id" \
    -H "apikey: $task_anon_key" \
    -H "Authorization: Bearer $task_access_token"
)"
if ! jq -e 'length == 1 and .[0].revision == 2' <<<"$task_stored" >/dev/null; then
  echo "Draft revision drifted after the race: $task_stored" >&2
  exit 1
fi

echo 'onboarding draft two-client race test passed'
