#!/usr/bin/env bash

set -euo pipefail

task_status_json="$(supabase status -o json 2>/dev/null)"
task_api_url="$(jq -r '.API_URL' <<<"$task_status_json")"
task_anon_key="$(jq -r '.ANON_KEY' <<<"$task_status_json")"
task_service_key="$(jq -r '.SERVICE_ROLE_KEY' <<<"$task_status_json")"
task_suffix="$(date +%s)"
task_email="gate6-${task_suffix}@example.test"
task_username="gate6_${task_suffix}"
task_accepted_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
task_user_id=''
task_log_file="$(mktemp)"

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
      -H 'Content-Type: application/json' \
      --data '{}' || true
  )"
  if [[ "$task_boot_status" == '400' ]]; then
    break
  fi
  sleep 1
done

if [[ "${task_boot_status:-}" != '400' ]]; then
  cat "$task_log_file"
  echo 'activate-protocol failed to boot' >&2
  exit 1
fi

task_created_user="$(
  curl -sS -X POST "$task_api_url/auth/v1/admin/users" \
    -H "apikey: $task_service_key" \
    -H "Authorization: Bearer $task_service_key" \
    -H 'Content-Type: application/json' \
    --data "{\"email\":\"$task_email\",\"password\":\"Gate6-Test-2026!\",\"email_confirm\":true}"
)"
task_user_id="$(jq -r '.id // empty' <<<"$task_created_user")"
if [[ -z "$task_user_id" ]]; then
  echo 'Could not create the Edge smoke-test user' >&2
  exit 1
fi

task_access_token="$(
  curl -sS -X POST "$task_api_url/auth/v1/token?grant_type=password" \
    -H "apikey: $task_anon_key" \
    -H 'Content-Type: application/json' \
    --data "{\"email\":\"$task_email\",\"password\":\"Gate6-Test-2026!\"}" |
    jq -r '.access_token // empty'
)"
if [[ -z "$task_access_token" ]]; then
  echo 'Could not authenticate the Edge smoke-test user' >&2
  exit 1
fi

task_payload="$(
  jq -nc --arg username "$task_username" --arg acceptedAt "$task_accepted_at" '{
    answers: {
      identity: {
        fullName: "Gate Six",
        username: $username,
        age: 24,
        heightCm: 181,
        weightKg: 82,
        unitSystem: "metric"
      },
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

invoke_activation() {
  curl -sS -X POST "$task_api_url/functions/v1/activate-protocol" \
    -H "apikey: $task_anon_key" \
    -H "Authorization: Bearer $task_access_token" \
    -H 'Content-Type: application/json' \
    --data "$task_payload"
}

task_first_response="$(invoke_activation)"
task_second_response="$(invoke_activation)"

if ! jq -e '
  (.executionRevision | type == "number") and
  (.planId | test("^[0-9a-f-]{36}$")) and
  (.planKey | test("^wa_[a-z0-9]{8}$"))
' <<<"$task_first_response" >/dev/null; then
  cat "$task_log_file" >&2
  echo "Initial activation failed: $task_first_response" >&2
  exit 1
fi

task_first_identity="$(jq -c '{executionRevision, planId, planKey}' <<<"$task_first_response")"
task_second_identity="$(jq -c '{executionRevision, planId, planKey}' <<<"$task_second_response")"
if [[ "$task_first_identity" != "$task_second_identity" ]]; then
  echo 'Activation replay did not return the same canonical identity' >&2
  exit 1
fi

echo 'activate-protocol Edge smoke test passed'
