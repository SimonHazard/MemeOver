#!/usr/bin/env bash
# Isolated dry runs: command strings go to the guards as JSON and are never evaluated.
set -eu
root=$(cd "$(dirname "$0")/../.." && pwd)
count=0
assert_exit() {
  expected=$1
  kind=$2
  value=$3
  status=0
  if [ "$kind" = command ]; then
    payload=$(jq -nc --arg value "$value" '{tool_input:{command:$value}}')
    hook=guard-protected-bash.sh
  else
    payload=$(jq -nc --arg value "$value" '{tool_input:{file_path:$value}}')
    hook=guard-protected-paths.sh
  fi
  output=$(printf '%s' "$payload" | CLAUDE_PROJECT_DIR="$root" bash "$root/.claude/hooks/$hook" 2>&1) || status=$?
  if [ "$status" -ne "$expected" ]; then
    printf 'FAIL: %s expected %s, got %s: %s\n%s\n' "$kind" "$expected" "$status" "$value" "$output" >&2
    exit 1
  fi
  count=$((count + 1))
}
while IFS=$'\t' read -r expected command; do
  assert_exit "$expected" command "$command"
done <<'CASES'
0	cat bot/.env.example
0	grep -rn DISCORD_TOKEN bot/src
0	ls -la bot/data
0	cargo check --manifest-path app/src-tauri/Cargo.toml
0	bun run test
0	sed -n '1,20p' .claude/settings.json
0	cat bot/.env
0	cat bot/data/memeover.db
0	cp bot/.env.example app/.env.example
0	echo x > bot/metadata.json
0	rm -rf bot/database
0	rm -rf app/src-tauri/targeted
0	echo x > app/src/data-reader.ts
2	echo X > bot/.env
2	printf 'A=1\n' >> .env.local
2	sed -i '' 's/a/b/' .env
2	rm bot/data/memeover.db
2	cp foo bot/data/guilds.json
2	cat x | tee .claude/settings.local.json
2	rm -rf app/src-tauri/target/release
2	cd bot && echo T > .env
2	rm -rf bot/data
2	rm -rf bot/data/
2	rm -rf 'bot/data'
2	rm -rf "bot/data/"
2	rm -rf app/src-tauri/target
2	rm -rf app/src-tauri/target/
2	rm -rf 'app/src-tauri/target'
2	rm -rf /tmp/project/app/src-tauri/target
2	rm -rf data
2	rm -rf other/nested/data/
2	echo x > other/data/custom.json
2	rm bot/data/memeover.db-wal
2	rm bot/data/memeover.db-shm
2	rm bot/data/guilds.json.bak
2	echo x > '.env'
2	echo x > ".env.local"
2	rm .env .env.example
2	rm .env.example.local
2	rm .env.example-backup
2	rm .env.example1
2	rm .env.example/child
2	rm .envrc
2	rm .environment
2	rm .env*
2	rm bot/.env*
2	chmod 600 .env
2	mv foo bot/data
2	install foo other/data/bar
2	echo x > bot/.env && echo done
2	echo x > bot/.env; echo done
2	truncate -s 0 .claude/settings.local.json
2	ln -s foo app/src-tauri/target
CASES

# Known limitations: literal paths alone cannot identify every write mechanism.
# These must never be mistaken for protection; none of the strings is executed.
assert_exit 0 command 'python3 -c "from pathlib import Path; Path(\"bot/.env\").write_text(\"x\")"'
assert_exit 0 command "perl -pi -e 's/a/b/' bot/.env"
assert_exit 0 command 'find bot/data -delete'
assert_exit 0 command 'find bot/data -exec /bin/rm {} +'
assert_exit 0 command 'git clean -fdx bot/data'
assert_exit 0 command 'f=.en; echo x > "${f}v"'

for file in bot/data bot/data/ bot/data/memeover.db-wal bot/data/guilds.json.bak other/data/custom.json app/src-tauri/target app/src-tauri/target/ app/src-tauri/target/release/foo .env .envrc .environment bot/.env.local .claude/settings.local.json; do
  assert_exit 2 file "$file"
done
for file in bot/src/server.ts app/src/data-reader.ts bot/database/file.json app/src-tauri/targeted/file.ts; do
  assert_exit 0 file "$file"
done

# Never register a tree-wide writer at Stop. Preserve the original formatter/typecheck.
jq -e '
  ([.hooks.Stop[].hooks[].command] | all(contains("format-touched.sh") | not)) and
  ([.hooks.Stop[].hooks[].command] | any(contains("typecheck-touched.sh"))) and
  ([.hooks.PostToolUse[].hooks[].command] | any(contains("format-edited-file.sh")))
' "$root/.claude/settings.json" > /dev/null

fixture=$(mktemp -d "${TMPDIR:-/tmp}/memeover-hook-test.XXXXXX")
trap 'rm -rf -- "$fixture"' EXIT
mkdir -p "$fixture/bin" "$fixture/app"
# Staged user work plus different unstaged work must survive both invocations.
printf 'staged user work\n' > "$fixture/app/user.ts"
git -C "$fixture" init -q
git -C "$fixture" add app/user.ts
printf 'unstaged user work\n' > "$fixture/app/user.ts"
cp "$fixture/app/user.ts" "$fixture/expected-user"
git -C "$fixture" show :app/user.ts > "$fixture/expected-index"
printf 'agent work\n' > "$fixture/app/agent file.ts"
cat > "$fixture/bin/bunx" <<'STUB'
#!/usr/bin/env bash
set -eu
[ -n "${FORMAT_TEST_LOG:-}" ]
printf 'called\n' >> "$FORMAT_TEST_LOG"
while [ "$#" -gt 0 ] && [ "$1" != -- ]; do shift; done
[ "$#" -gt 0 ]
shift
for file in "$@"; do printf 'formatted agent work\n' > "$file"; done
STUB
chmod +x "$fixture/bin/bunx"
export FORMAT_TEST_LOG="$fixture/formatter.log"
printf '{}' | PATH="$fixture/bin:$PATH" CLAUDE_PROJECT_DIR="$fixture" bash "$root/.claude/hooks/format-touched.sh"
[ ! -e "$FORMAT_TEST_LOG" ]
cmp "$fixture/expected-user" "$fixture/app/user.ts"
PATH="$fixture/bin:$PATH" CLAUDE_PROJECT_DIR="$fixture" bash "$root/.claude/hooks/format-touched.sh" 'app/agent file.ts'
cmp "$fixture/expected-user" "$fixture/app/user.ts"
git -C "$fixture" show :app/user.ts > "$fixture/actual-index"
cmp "$fixture/expected-index" "$fixture/actual-index"
[ "$(cat "$fixture/app/agent file.ts")" = 'formatted agent work' ]
[ "$(wc -l < "$FORMAT_TEST_LOG" | tr -d ' ')" = 1 ]
printf '%s guard dry runs, hook registration and explicit formatter isolation passed.\n' "$count"
