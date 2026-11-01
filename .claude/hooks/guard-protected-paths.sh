#!/usr/bin/env bash
# Guards Edit/MultiEdit/Write with the rules in protected-paths.mjs; fails closed.
set -eu
trap 'echo "Edit guard could not run: edit blocked (check jq and bun)." >&2; exit 2' ERR
root=${CLAUDE_PROJECT_DIR:-$(pwd)}
file=$(jq -r '.tool_input.file_path // .tool_input.path // empty')
[ -n "$file" ] || exit 0
status=0
bun "$(dirname "$0")/protected-paths.mjs" path "$file" "$root" || status=$?
[ "$status" -eq 0 ] || [ "$status" -eq 2 ] || echo "Edit guard could not run: edit blocked." >&2
[ "$status" -eq 0 ] || exit 2
