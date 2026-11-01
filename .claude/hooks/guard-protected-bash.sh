#!/usr/bin/env bash
# PreToolUse heuristic for common shell writes mentioning literal protected paths.
# This is not a shell parser or sandbox: Python/Perl, find/git clean, dynamic paths,
# aliases and other write forms can bypass it. Pairs with guard-protected-paths.sh.
set -eu
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
[ -n "$cmd" ] || exit 0

# Match directories themselves as well as descendants, and every **/data/ directory.
protected="(^|[[:space:]\"'=/:])(data|app/src-tauri/target)($|[/[:space:]\"';|&<>)])|(^|[[:space:]\"'=/:])\.claude/settings\.local\.json($|[[:space:]\"';|&<>)])"
env_path="(^|[[:space:]\"'=/:])(\.env[^[:space:]\"';|&<>)]*)"
# POSIX ERE (bash =~) has no \b, so word boundaries are spelled out.
writing='(>|(^|[[:space:]|;&(])(tee|rm|mv|cp|truncate|ln|chmod|chown|install)([[:space:]]|$)|(^|[[:space:]|;&(])sed[[:space:]]+[^|;]*-[A-Za-z]*i([[:space:]]|$|\.))'

resolve_operands() {
  bun - "$@" <<'JS'
const { resolve } = require("node:path");
const [command, initialCwd] = process.argv.slice(2);
const words = command.match(/(?:[^\s"';&|()<>]+|"[^"]*"|'[^']*')+|&&|\|\||[;&|()<>\n]/g) ?? [];
let cwd = resolve(initialCwd);
let start = true;
let cd = false;
let redirect = false;
const parents = [];
for (const word of words) {
  if (/^[;&|()\n]+$/.test(word)) {
    if (word === "(") parents.push(cwd);
    if (word === ")") cwd = parents.pop() ?? cwd;
    start = true;
    cd = false;
    redirect = false;
    continue;
  }
  if (word === ">" || word === "<") {
    redirect = true;
    continue;
  }
  const literal = word.replace(/(["'])([\s\S]*?)\1/g, "$2");
  if (/[$`\\]/.test(literal)) {
    start = false;
    cd = false;
    redirect = false;
    continue;
  }
  if (redirect) {
    console.log(resolve(cwd, literal));
    redirect = false;
  } else if (start) {
    cd = literal === "cd";
    start = false;
  } else if (!literal.startsWith("-")) {
    if (cd) {
      cwd = resolve(cwd, literal);
      cd = false;
    } else {
      console.log(resolve(cwd, literal));
    }
  }
}
JS
}

if [[ "$cmd" =~ $writing ]]; then
  cwd=$(printf '%s' "$input" | jq -r --arg root "${CLAUDE_PROJECT_DIR:-$(pwd)}" '.cwd // $root')
  # Resolve literal operands without evaluating the shell. Track simple cd commands
  # and subshells; expansions, aliases and arbitrary shell programs remain out of scope.
  resolved=$(resolve_operands "$cmd" "$cwd")
  paths="$cmd"$'\n'"$resolved"
  blocked=false
  [[ "$paths" =~ $protected ]] && blocked=true
  remaining=$paths
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
