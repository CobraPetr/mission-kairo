#!/usr/bin/env bash

set -euo pipefail

task_temp_dir="$(mktemp -d)"
trap 'rm -rf "$task_temp_dir"' EXIT
task_generated_types="$task_temp_dir/database.types.ts"

supabase gen types typescript --local >"$task_generated_types"
pnpm exec prettier --config .prettierrc.json --write "$task_generated_types" >/dev/null
diff -u apps/mobile/src/data/supabase/database.types.ts "$task_generated_types"

echo 'generated database types are current'
