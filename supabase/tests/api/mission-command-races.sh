#!/usr/bin/env bash

set -euo pipefail

task_status_json="$(supabase status -o json 2>/dev/null)"
task_api_url="$(jq -r '.API_URL' <<<"$task_status_json")"
task_anon_key="$(jq -r '.ANON_KEY' <<<"$task_status_json")"
task_service_key="$(jq -r '.SERVICE_ROLE_KEY' <<<"$task_status_json")"
task_suffix="$(date +%s)"
task_email="gate8-race-${task_suffix}@example.test"
task_username="g8_${task_suffix}"
task_password='Gate8-Test-2026!'
task_user_id=''
task_log_file="$(mktemp)"
task_temp_dir="$(mktemp -d)"

cleanup() {
  if [[ -n "$task_user_id" ]]; then
    curl -sS -X DELETE "$task_api_url/auth/v1/admin/users/$task_user_id" \
      -H "apikey: $task_service_key" \
      -H "Authorization: Bearer $task_service_key" >/dev/null || true
  fi
  if [[ -n "${task_function_pid:-}" ]]; then
    kill "$task_function_pid" 2>/dev/null || true
    wait "$task_function_pid" 2>/dev/null || true
  fi
  rm -f "$task_log_file"
  rm -rf "$task_temp_dir"
}
trap cleanup EXIT

supabase functions serve activate-protocol --no-verify-jwt >"$task_log_file" 2>&1 &
task_function_pid=$!
for _ in {1..30}; do
  task_boot_status="$(
    curl -sS -o /dev/null -w '%{http_code}' -X POST \
      "$task_api_url/functions/v1/activate-protocol" \
      -H "apikey: $task_anon_key" \
      -H 'Authorization: Bearer readiness-probe' \
      -H 'Content-Type: application/json' --data '{}' || true
  )"
  [[ "$task_boot_status" == '400' ]] && break
  sleep 1
done
if [[ "${task_boot_status:-}" != '400' ]]; then
  cat "$task_log_file"
  echo 'activate-protocol failed to boot for the command race test' >&2
  exit 1
fi

task_created_user="$(
  curl -sS -X POST "$task_api_url/auth/v1/admin/users" \
    -H "apikey: $task_service_key" \
    -H "Authorization: Bearer $task_service_key" \
    -H 'Content-Type: application/json' \
    --data "{\"email\":\"$task_email\",\"password\":\"$task_password\",\"email_confirm\":true}"
)"
task_user_id="$(jq -r '.id // empty' <<<"$task_created_user")"
if [[ -z "$task_user_id" ]]; then
  echo 'Could not create the command race user' >&2
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
  echo 'Could not authenticate the command race user' >&2
  exit 1
fi

task_accepted_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
task_activation_payload="$(
  jq -nc --arg username "$task_username" --arg acceptedAt "$task_accepted_at" '{
    answers: {
      identity: {fullName: "Race Guard", username: $username, age: 24, heightCm: 181, weightKg: 82, unitSystem: "metric"},
      relationship: {status: "single"},
      consent: {generalConfirmed: true, confirmedAt: $acceptedAt}
    },
    assessment: {
      age: 24,
      careerGoal: "Build consistent professional discipline",
      confidenceGoals: ["Speak with confidence"],
      currentBuild: "average",
      currentWeightKg: 82,
      gymAccess: "member",
      hoursPerWeek: 5,
      mainGoal: "Build a stronger body and disciplined daily routine.",
      relationshipGoal: "approach",
      targetBuild: "defined",
      targetWeightKg: 78
    },
    schemaVersion: 2,
    termsAcceptedAt: $acceptedAt,
    termsVersion: "2026-08-21",
    username: $username
  }'
)"
task_activation="$(
  curl -sS -X POST "$task_api_url/functions/v1/activate-protocol" \
    -H "apikey: $task_anon_key" \
    -H "Authorization: Bearer $task_access_token" \
    -H 'Content-Type: application/json' \
    --data "$task_activation_payload"
)"
task_plan_id="$(jq -r '.planId // empty' <<<"$task_activation")"
if [[ -z "$task_plan_id" ]]; then
  cat "$task_log_file" >&2
  echo "Command race activation failed: $task_activation" >&2
  exit 1
fi

task_day_id="$(
  curl -sS "$task_api_url/rest/v1/plan_days?select=id&plan_id=eq.$task_plan_id&day_number=eq.1" \
    -H "apikey: $task_anon_key" -H "Authorization: Bearer $task_access_token" |
    jq -r '.[0].id // empty'
)"
task_target_id="$(
  curl -sS "$task_api_url/rest/v1/plan_missions?select=scheduled_key&plan_day_id=eq.$task_day_id&ordinal=eq.1" \
    -H "apikey: $task_anon_key" -H "Authorization: Bearer $task_access_token" |
    jq -r '.[0].scheduled_key // empty'
)"
if [[ -z "$task_target_id" ]]; then
  echo 'Could not resolve the first canonical mission' >&2
  exit 1
fi

write_command_payload() {
  local task_command="$1"
  local task_revision="$2"
  local task_key="$3"
  local task_client_at="$4"
  jq -nc \
    --arg command "$task_command" \
    --arg target "$task_target_id" \
    --argjson revision "$task_revision" \
    --arg key "$task_key" \
    --arg clientAt "$task_client_at" \
    '{
      p_command: $command,
      p_target_id: $target,
      p_expected_revision: $revision,
      p_idempotency_key: $key,
      p_client_occurred_at: $clientAt
    }'
}

invoke_command() {
  local task_payload="$1"
  local task_output_prefix="$2"
  curl -sS -o "${task_output_prefix}.body" -w '%{http_code}' -X POST \
    "$task_api_url/rest/v1/rpc/execute_mission_command" \
    -H "apikey: $task_anon_key" \
    -H "Authorization: Bearer $task_access_token" \
    -H 'Content-Type: application/json' \
    --data "$task_payload" >"${task_output_prefix}.status"
}

assert_success_identity() {
  local task_output_prefix="$1"
  local task_expected="$2"
  if [[ "$(<"${task_output_prefix}.status")" != '200' ]]; then
    echo "Command failed: $(<"${task_output_prefix}.body")" >&2
    exit 1
  fi
  local task_identity
  task_identity="$(jq -c '.[0] | {awarded_xp, command_result, execution_revision, total_xp}' "${task_output_prefix}.body")"
  if [[ "$task_identity" != "$task_expected" ]]; then
    echo "Unexpected command response: $task_identity" >&2
    exit 1
  fi
}

task_begin_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
task_begin_payload="$(write_command_payload begin 1 'b1000000-0000-4000-8000-000000000001' "$task_begin_at")"
invoke_command "$task_begin_payload" "$task_temp_dir/begin-a" &
task_begin_pid_a=$!
invoke_command "$task_begin_payload" "$task_temp_dir/begin-b" &
task_begin_pid_b=$!
wait "$task_begin_pid_a"
wait "$task_begin_pid_b"

task_begin_identity='{"awarded_xp":0,"command_result":"active","execution_revision":2,"total_xp":0}'
assert_success_identity "$task_temp_dir/begin-a" "$task_begin_identity"
assert_success_identity "$task_temp_dir/begin-b" "$task_begin_identity"

invoke_command "$task_begin_payload" "$task_temp_dir/begin-replay"
assert_success_identity "$task_temp_dir/begin-replay" "$task_begin_identity"

task_race_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
task_race_payload_a="$(write_command_payload advance 2 'b2000000-0000-4000-8000-000000000002' "$task_race_at")"
task_race_payload_b="$(write_command_payload advance 2 'b3000000-0000-4000-8000-000000000003' "$task_race_at")"
invoke_command "$task_race_payload_a" "$task_temp_dir/race-a" &
task_race_pid_a=$!
invoke_command "$task_race_payload_b" "$task_temp_dir/race-b" &
task_race_pid_b=$!
wait "$task_race_pid_a"
wait "$task_race_pid_b"

task_race_status_a="$(<"$task_temp_dir/race-a.status")"
task_race_status_b="$(<"$task_temp_dir/race-b.status")"
if [[ "$task_race_status_a" == '200' && "$task_race_status_b" != '200' ]]; then
  task_race_winner="$task_temp_dir/race-a"
  task_race_loser="$task_temp_dir/race-b"
elif [[ "$task_race_status_b" == '200' && "$task_race_status_a" != '200' ]]; then
  task_race_winner="$task_temp_dir/race-b"
  task_race_loser="$task_temp_dir/race-a"
else
  echo "Expected one race winner, got HTTP $task_race_status_a and $task_race_status_b" >&2
  exit 1
fi
assert_success_identity \
  "$task_race_winner" \
  '{"awarded_xp":0,"command_result":"advanced","execution_revision":3,"total_xp":0}'
if [[ "$(<"$task_race_loser.status")" != '409' ]] ||
  ! jq -e '.code == "PT409"' "$task_race_loser.body" >/dev/null; then
  echo "Race loser was not rejected as stale: $(<"$task_race_loser.body")" >&2
  exit 1
fi

task_advance_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
task_advance_payload="$(write_command_payload advance 3 'b4000000-0000-4000-8000-000000000004' "$task_advance_at")"
invoke_command "$task_advance_payload" "$task_temp_dir/advance"
assert_success_identity \
  "$task_temp_dir/advance" \
  '{"awarded_xp":0,"command_result":"advanced","execution_revision":4,"total_xp":0}'

task_complete_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
task_complete_payload="$(write_command_payload advance 4 'b5000000-0000-4000-8000-000000000005' "$task_complete_at")"
invoke_command "$task_complete_payload" "$task_temp_dir/complete-a" &
task_complete_pid_a=$!
invoke_command "$task_complete_payload" "$task_temp_dir/complete-b" &
task_complete_pid_b=$!
wait "$task_complete_pid_a"
wait "$task_complete_pid_b"

task_complete_identity='{"awarded_xp":60,"command_result":"completed","execution_revision":5,"total_xp":60}'
assert_success_identity "$task_temp_dir/complete-a" "$task_complete_identity"
assert_success_identity "$task_temp_dir/complete-b" "$task_complete_identity"

task_server_state="$(
  curl -sS \
    "$task_api_url/rest/v1/mission_command_receipts?select=idempotency_key,command_result,awarded_xp&order=received_at.asc" \
    -H "apikey: $task_anon_key" -H "Authorization: Bearer $task_access_token"
)"
if ! jq -e 'length == 4 and ([.[] | select(.awarded_xp > 0)] | length == 1)' <<<"$task_server_state" >/dev/null; then
  echo "Unexpected command receipts after races: $task_server_state" >&2
  exit 1
fi

task_xp_state="$(
  curl -sS "$task_api_url/rest/v1/xp_ledger?select=delta" \
    -H "apikey: $task_anon_key" -H "Authorization: Bearer $task_access_token"
)"
task_profile_state="$(
  curl -sS "$task_api_url/rest/v1/profiles_public?select=total_xp&id=eq.$task_user_id" \
    -H "apikey: $task_anon_key" -H "Authorization: Bearer $task_access_token"
)"
if ! jq -e 'length == 1 and .[0].delta == 60' <<<"$task_xp_state" >/dev/null; then
  echo "Concurrent completion duplicated the XP ledger: $task_xp_state" >&2
  exit 1
fi
if ! jq -e 'length == 1 and .[0].total_xp == 60' <<<"$task_profile_state" >/dev/null; then
  echo "Profile XP drifted after command races: $task_profile_state" >&2
  exit 1
fi

echo 'mission command retry and two-client race test passed'
