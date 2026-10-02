#!/usr/bin/env bash
set -eu
root=${CLAUDE_PROJECT_DIR:-$(pwd)}
file=$(jq -r '.tool_input.file_path // .tool_input.path // empty')
case "$file" in *.ts|*.tsx|*.json|*.css|*.astro) ;; *) exit 0 ;; esac
[[ "$file" == /* ]] || file="$root/$file"
[ -f "$file" ] || exit 0
output=$(cd "$root" && bunx biome check --write --no-errors-on-unmatched --files-ignore-unknown=true "$file" 2>&1) || { echo "$output" >&2; exit 0; }
exit 0
