#!/usr/bin/env bash

set -euo pipefail

task_status_json="$(supabase status -o json 2>/dev/null)"
task_api_url="$(jq -r '.API_URL' <<<"$task_status_json")"
task_anon_key="$(jq -r '.ANON_KEY' <<<"$task_status_json")"
task_service_key="$(jq -r '.SERVICE_ROLE_KEY' <<<"$task_status_json")"
task_suffix="$(date +%s)"
task_user_a=''
task_user_b=''
task_log_file="$(mktemp)"

cleanup() {
  for task_user_id in "$task_user_a" "$task_user_b"; do
    if [[ -n "$task_user_id" ]]; then
      curl -sS -X DELETE "$task_api_url/auth/v1/admin/users/$task_user_id" \
        -H "apikey: $task_service_key" \
        -H "Authorization: Bearer $task_service_key" >/dev/null || true
    fi
  done
  if [[ -n "${task_function_pid:-}" ]]; then
    kill "$task_function_pid" 2>/dev/null || true
    wait "$task_function_pid" 2>/dev/null || true
  fi
  rm -f "$task_log_file"
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
  echo 'activate-protocol failed to boot' >&2
  exit 1
fi

create_client() {
  local task_email="$1"
  local task_created
  task_created="$(
    curl -sS -X POST "$task_api_url/auth/v1/admin/users" \
      -H "apikey: $task_service_key" \
      -H "Authorization: Bearer $task_service_key" \
      -H 'Content-Type: application/json' \
      --data "{\"email\":\"$task_email\",\"password\":\"Gate7-Test-2026!\",\"email_confirm\":true}"
  )"
  jq -r '.id // empty' <<<"$task_created"
}

login_client() {
  local task_email="$1"
  curl -sS -X POST "$task_api_url/auth/v1/token?grant_type=password" \
    -H "apikey: $task_anon_key" \
    -H 'Content-Type: application/json' \
    --data "{\"email\":\"$task_email\",\"password\":\"Gate7-Test-2026!\"}" |
    jq -r '.access_token // empty'
}

activate_client() {
  local task_token="$1"
  local task_username="$2"
  local task_accepted_at
  local task_payload
  task_accepted_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  task_payload="$(
    jq -nc --arg username "$task_username" --arg acceptedAt "$task_accepted_at" '{
      answers: {
        identity: {fullName: "Isolation Guard", username: $username, age: 24, heightCm: 181, weightKg: 82, unitSystem: "metric"},
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
      timeZone: "Europe/Zurich",
      username: $username
    }'
  )"
  local task_response=''
  for _ in {1..5}; do
    task_response="$(
      curl -sS -X POST "$task_api_url/functions/v1/activate-protocol" \
        -H "apikey: $task_anon_key" \
        -H "Authorization: Bearer $task_token" \
        -H 'Content-Type: application/json' \
        --data "$task_payload"
    )"
    if jq -e '.planId and .planKey' <<<"$task_response" >/dev/null; then
      break
    fi
    if ! jq -e '.message == "An invalid response was received from the upstream server"' \
      <<<"$task_response" >/dev/null; then
      break
    fi
    sleep 1
  done
  printf '%s' "$task_response"
}

task_email_a="gate7-a-${task_suffix}@example.test"
task_email_b="gate7-b-${task_suffix}@example.test"
task_user_a="$(create_client "$task_email_a")"
task_user_b="$(create_client "$task_email_b")"
if [[ -z "$task_user_a" || -z "$task_user_b" ]]; then
  echo 'Could not create both API isolation users' >&2
  exit 1
fi
task_token_a="$(login_client "$task_email_a")"
task_token_b="$(login_client "$task_email_b")"
if [[ -z "$task_token_a" || -z "$task_token_b" ]]; then
  echo 'Could not authenticate both API isolation users' >&2
  exit 1
fi

task_activation_a="$(activate_client "$task_token_a" "g7a_$task_suffix")"
task_activation_b="$(activate_client "$task_token_b" "g7b_$task_suffix")"
if ! jq -e '.planId and .planKey' <<<"$task_activation_a" >/dev/null; then
  cat "$task_log_file" >&2
  echo "Client A activation failed: $task_activation_a" >&2
  exit 1
fi
if ! jq -e '.planId and .planKey' <<<"$task_activation_b" >/dev/null; then
  cat "$task_log_file" >&2
  echo "Client B activation failed: $task_activation_b" >&2
  exit 1
fi

task_plans_a="$(
  curl -sS "$task_api_url/rest/v1/plans?select=user_id" \
    -H "apikey: $task_anon_key" -H "Authorization: Bearer $task_token_a"
)"
task_plans_b="$(
  curl -sS "$task_api_url/rest/v1/plans?select=user_id" \
    -H "apikey: $task_anon_key" -H "Authorization: Bearer $task_token_b"
)"
if ! jq -e --arg id "$task_user_a" 'length == 1 and .[0].user_id == $id' <<<"$task_plans_a" >/dev/null; then
  echo "Client A plan isolation failed: $task_plans_a" >&2
  exit 1
fi
if ! jq -e --arg id "$task_user_b" 'length == 1 and .[0].user_id == $id' <<<"$task_plans_b" >/dev/null; then
  echo "Client B plan isolation failed: $task_plans_b" >&2
  exit 1
fi

task_cross_read="$(
  curl -sS "$task_api_url/rest/v1/plans?select=id&user_id=eq.$task_user_b" \
    -H "apikey: $task_anon_key" -H "Authorization: Bearer $task_token_a"
)"
if ! jq -e 'length == 0' <<<"$task_cross_read" >/dev/null; then
  echo "Cross-user read leaked rows: $task_cross_read" >&2
  exit 1
fi

task_write_status="$(
  curl -sS -o /dev/null -w '%{http_code}' -X PATCH \
    "$task_api_url/rest/v1/mission_progress?user_id=eq.$task_user_b" \
    -H "apikey: $task_anon_key" \
    -H "Authorization: Bearer $task_token_a" \
    -H 'Content-Type: application/json' \
    --data '{"status":"completed"}'
)"
if [[ "$task_write_status" =~ ^2 ]]; then
  echo 'cross-user canonical write unexpectedly succeeded' >&2
  exit 1
fi

echo 'two authenticated API-client isolation test passed'
