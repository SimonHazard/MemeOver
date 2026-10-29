#!/usr/bin/env bash
# PreToolUse heuristic for common shell writes mentioning literal protected paths.
# This is not a shell parser or sandbox: Python/Perl, find/git clean, dynamic paths,
# aliases and other write forms can bypass it. Pairs with guard-protected-paths.sh.
set -eu
cmd=$(jq -r '.tool_input.command // empty')
[ -n "$cmd" ] || exit 0

# Match directories themselves as well as descendants, and every **/data/ directory.
protected="(^|[[:space:]\"'=/:])(data|app/src-tauri/target)($|[/[:space:]\"';|&<>)])|(^|[[:space:]\"'=/:])\.claude/settings\.local\.json($|[[:space:]\"';|&<>)])"
env_path="(^|[[:space:]\"'=/:])(\.env[^[:space:]\"';|&<>)]*)"
# POSIX ERE (bash =~) has no \b, so word boundaries are spelled out.
writing='(>|(^|[[:space:]|;&(])(tee|rm|mv|cp|truncate|ln|chmod|chown|install)([[:space:]]|$)|(^|[[:space:]|;&(])sed[[:space:]]+[^|;]*-[A-Za-z]*i([[:space:]]|$|\.))'

if [[ "$cmd" =~ $writing ]]; then
  blocked=false
  [[ "$cmd" =~ $protected ]] && blocked=true
  remaining=$cmd
  while [[ "$remaining" =~ $env_path ]]; do
    match=${BASH_REMATCH[0]}
    path=${BASH_REMATCH[2]}
    # Only the exact example filename is exempt; suffixes and .env* globs are protected.
    [ "$path" = ".env.example" ] || blocked=true
    remaining=${remaining#*"$match"}
  done
  if [ "$blocked" = true ]; then
    echo "Protected project data or personal configuration: shell write blocked (edit it yourself if needed)." >&2
    exit 2
  fi
fi
exit 0
