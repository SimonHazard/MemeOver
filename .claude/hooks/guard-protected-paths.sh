#!/usr/bin/env bash
# Guards Edit/MultiEdit/Write only; writes through Bash are outside this hook.
set -eu
root=${CLAUDE_PROJECT_DIR:-$(pwd)}
file=$(jq -r '.tool_input.file_path // .tool_input.path // empty')
[ -n "$file" ] || exit 0
file=$(bun -e 'const p = require("node:path"); const fs = require("node:fs"); let file = p.resolve(process.argv[1], process.argv[2]); let parent = p.dirname(file); if (fs.existsSync(file)) file = fs.realpathSync(file); else if (fs.existsSync(parent)) file = p.join(fs.realpathSync(parent), p.basename(file)); process.stdout.write(file);' "$root" "$file")
if [[ "$file" =~ (^|/)\.env($|\.) ]] || [[ "$file" =~ (^|/)data/guilds\.json$ ]] || [[ "$file" == */app/src-tauri/target/* ]] || [[ "$file" == */.claude/settings.local.json ]]; then
  echo "Protected project data or personal configuration: edit blocked." >&2
  exit 2
fi
