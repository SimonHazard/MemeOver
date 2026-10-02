#!/usr/bin/env bash
set -eu
input=$(cat)
[ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false')" = true ] && exit 0
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"
bot=false; app=false; shared=false; ui=false
while IFS= read -r -d '' file; do
 case "$file" in
  bot/*.ts|bot/package.json|bot/tsconfig.json) bot=true ;;
  app/*.ts|app/*.tsx|app/package.json|app/tsconfig*.json) app=true ;;
  shared/*.ts|shared/package.json|shared/tsconfig.json) shared=true ;;
  packages/ui/*.ts|packages/ui/*.tsx|packages/ui/package.json|packages/ui/tsconfig.json) ui=true ;;
 esac
done < <(git diff --name-only -z HEAD; git ls-files --others --exclude-standard -z)
failed=false
for workspace in bot app shared ui; do
 case "$workspace" in bot) touched=$bot ;; app) touched=$app ;; shared) touched=$shared ;; ui) touched=$ui ;; esac
 if [ "$touched" = true ]; then
  output=$(bun run "typecheck:$workspace" 2>&1) || { printf '%s\n' "$output" >&2; failed=true; }
 fi
done
[ "$failed" = false ] || exit 2
