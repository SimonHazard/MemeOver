#!/usr/bin/env bash
# Explicit formatter for named files edited through Bash; never discover dirty files.
# Usage: .claude/hooks/format-touched.sh path/to/file.ts [another/file.json ...]
# No arguments is a no-op, including when accidentally invoked with hook JSON on stdin.
set -eu
[ "$#" -gt 0 ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"
files=()
for file in "$@"; do
  case "$file" in
    *.ts|*.tsx|*.json|*.css|*.astro) [ -f "$file" ] && files+=("$file") ;;
  esac
done
[ "${#files[@]}" -gt 0 ] || exit 0
bunx biome check --write --no-errors-on-unmatched --files-ignore-unknown=true -- "${files[@]}"
