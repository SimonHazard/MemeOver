#!/usr/bin/env bash
# PreToolUse guard for common shell writes to protected paths; fails closed. The rules and
# their limits live in protected-paths.mjs: this wrapper only skips commands that cannot
# write a file, so most commands never start bun.
set -eu
trap 'echo "Bash guard could not run: command blocked (check jq and bun)." >&2; exit 2' ERR
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
[ -n "$cmd" ] || exit 0

# File descriptor duplication (2>&1) and /dev/null redirections write no file.
text=$(printf '%s' "$cmd" | sed -E 's/[0-9]*[<>]&([0-9]+-?|-)//g; s/(&|[0-9]*)>>?[[:space:]]*\/dev\/null//g')
# POSIX ERE (bash =~) has no \b, so word boundaries are spelled out.
writers='(>|(^|[^[:alnum:]_.-])(tee|rm|rmdir|unlink|shred|mv|cp|ln|install|truncate|touch|chmod|chown|dd|rsync|sqlite3|sed|clean|-delete)([^[:alnum:]_.-]|$))'
[[ "$text" =~ $writers ]] || exit 0

root=${CLAUDE_PROJECT_DIR:-$(pwd)}
cwd=$(printf '%s' "$input" | jq -r --arg root "$root" '.cwd // $root')
status=0
bun "$(dirname "$0")/protected-paths.mjs" command "$cmd" "$cwd" "$root" || status=$?
[ "$status" -eq 0 ] || [ "$status" -eq 2 ] || echo "Bash guard could not run: command blocked." >&2
[ "$status" -eq 0 ] || exit 2
