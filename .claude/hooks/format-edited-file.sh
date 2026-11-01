#!/usr/bin/env bash
# PostToolUse formatter for the file named by Edit/Write; a formatter failure never blocks.
set -eu
root=${CLAUDE_PROJECT_DIR:-$(pwd)}
file=$(jq -r '.tool_input.file_path // .tool_input.path // empty')
[ -n "$file" ] || exit 0
[[ "$file" == /* ]] || file="$root/$file"
output=$(bash "$(dirname "$0")/format-touched.sh" "$file" 2>&1) || echo "$output" >&2
exit 0
