#!/usr/bin/env bash

set -euo pipefail

task_status_json="$(supabase status -o json 2>/dev/null)"
task_api_url="$(jq -r '.API_URL' <<<"$task_status_json")"
task_service_key="$(jq -r '.SERVICE_ROLE_KEY' <<<"$task_status_json")"
task_authorization='Bearer local-revenuecat-test'
task_signing_secret='local-revenuecat-signing-secret'
task_suffix="$(date +%s)"
task_email="revenuecat-${task_suffix}@example.test"
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

supabase functions serve revenuecat-webhook \
  --no-verify-jwt \
  --env-file supabase/tests/fixtures/revenuecat-edge-env \
  --import-map supabase/functions/deno.json >"$task_log_file" 2>&1 &
task_function_pid=$!

for _ in {1..30}; do
  task_boot_status="$(
    curl -sS -o /dev/null -w '%{http_code}' -X POST \
      "$task_api_url/functions/v1/revenuecat-webhook" --data '{}' || true
  )"
  [[ "$task_boot_status" == '401' ]] && break
  sleep 1
done
if [[ "${task_boot_status:-}" != '401' ]]; then
  cat "$task_log_file"
  echo 'revenuecat-webhook failed to boot' >&2
  exit 1
fi

task_created_user="$(
  curl -sS -X POST "$task_api_url/auth/v1/admin/users" \
    -H "apikey: $task_service_key" \
    -H "Authorization: Bearer $task_service_key" \
    -H 'Content-Type: application/json' \
    --data "{\"email\":\"$task_email\",\"email_confirm\":true}"
)"
task_user_id="$(jq -r '.id // empty' <<<"$task_created_user")"
if [[ -z "$task_user_id" ]]; then
  echo 'Could not create the webhook test user' >&2
  exit 1
fi

task_event_ms="$(( $(date +%s) * 1000 ))"
task_expiration_ms="$(( task_event_ms + 259200000 ))"
task_payload="$(
  jq -nc \
    --arg userId "$task_user_id" \
    --argjson eventMs "$task_event_ms" \
    --argjson expirationMs "$task_expiration_ms" \
    --arg eventId "rc-local-$task_suffix" \
    '{
      api_version: "1.0",
      event: {
        aliases: [$userId],
        app_user_id: $userId,
        entitlement_id: "mission_kairo_pro",
        entitlement_ids: ["mission_kairo_pro"],
        environment: "SANDBOX",
        event_timestamp_ms: $eventMs,
        expiration_at_ms: $expirationMs,
        id: $eventId,
        original_app_user_id: $userId,
        period_type: "TRIAL",
        product_id: "mission_kairo_monthly",
        type: "INITIAL_PURCHASE"
      }
    }'
)"

invoke_webhook() {
  local task_body="$1"
  local task_timestamp
  local task_signature
  task_timestamp="$(date +%s)"
  task_signature="$(
    printf '%s' "${task_timestamp}.${task_body}" |
      openssl dgst -sha256 -hmac "$task_signing_secret" |
      awk '{print $2}'
  )"
  curl -sS -X POST "$task_api_url/functions/v1/revenuecat-webhook" \
    -H "Authorization: $task_authorization" \
    -H "X-RevenueCat-Webhook-Signature: t=$task_timestamp,v1=$task_signature" \
    -H 'Content-Type: application/json' \
    --data "$task_body"
}

task_first_response="$(invoke_webhook "$task_payload")"
if ! jq -e '.processed == true' <<<"$task_first_response" >/dev/null; then
  cat "$task_log_file" >&2
  echo "Webhook event was not processed: $task_first_response" >&2
  exit 1
fi

task_replay_response="$(invoke_webhook "$task_payload")"
if ! jq -e '.processed == false' <<<"$task_replay_response" >/dev/null; then
  echo "Webhook replay was not idempotent: $task_replay_response" >&2
  exit 1
fi

task_invalid_status="$(
  curl -sS -o /dev/null -w '%{http_code}' -X POST \
    "$task_api_url/functions/v1/revenuecat-webhook" \
    -H "Authorization: $task_authorization" \
    -H 'X-RevenueCat-Webhook-Signature: t=1,v1=00' \
    -H 'Content-Type: application/json' \
    --data "$task_payload"
)"
if [[ "$task_invalid_status" != '401' ]]; then
  echo "Invalid webhook signature returned HTTP $task_invalid_status" >&2
  exit 1
fi

echo 'RevenueCat webhook authentication, idempotency, and ledger test passed'
