#!/usr/bin/env bash
# Isolated dry runs: command strings go to the guards as JSON and are never evaluated.
set -eu
root=$(cd "$(dirname "$0")/../.." && pwd)
project=$root
count=0
fixture=$(mktemp -d "${TMPDIR:-/tmp}/memeover-hook-test.XXXXXX")
trap 'rm -rf -- "$fixture"' EXIT
assert_exit() {
  expected=$1
  kind=$2
  value=$3
  cwd=${4:-$project}
  status=0
  if [ "$kind" = command ]; then
    payload=$(jq -nc --arg value "$value" --arg cwd "$cwd" '{cwd:$cwd,tool_input:{command:$value}}')
    hook=guard-protected-bash.sh
  else
    payload=$(jq -nc --arg value "$value" '{tool_input:{file_path:$value}}')
    hook=guard-protected-paths.sh
  fi
  output=$(printf '%s' "$payload" | CLAUDE_PROJECT_DIR="$project" bash "$root/.claude/hooks/$hook" 2>&1) || status=$?
  # A crash also exits 2 (fail closed), so a real block must not report "could not run".
  if [ "$status" -ne "$expected" ] || [[ "$output" == *"could not run"* ]]; then
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
2	cp bot/.env.example app/.env.example
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
assert_exit 0 command 'find bot/data -exec /bin/rm {} +'
assert_exit 0 command 'ls bot/data | xargs rm'
assert_exit 0 command 'f=.en; echo x > "${f}v"'

# Write commands resolved by verb, whatever the spelling of the command name.
for command in \
  'sqlite3 bot/data/memeover.db "DELETE FROM guilds"' \
  'unlink bot/data/memeover.db' \
  'touch bot/.env' \
  'dd if=/dev/null of=bot/.env' \
  '/bin/cp foo bot/data/memeover.db' \
  '/bin/rm bot/data/memeover.db' \
  '\rm bot/data/memeover.db' \
  '"rm" bot/data/memeover.db' \
  'sudo rm -rf bot/data' \
  'FOO=1 rm .env' \
  'env -i rm .env' \
  "bash -c 'rm -rf bot/data'" \
  'git rm bot/data/memeover.db' \
  'git -C bot rm data/memeover.db' \
  'git mv bot/data/memeover.db old.db' \
  'git clean -fdx bot/data' \
  'find bot/data -delete' \
  'shred .env' \
  'rmdir bot/data' \
  'rsync -a src/ bot/data/' \
  'cp -t bot/data foo' \
  'cp --target-directory=bot/data foo' \
  'sed -i.bak s/a/b/ bot/.env' \
  'echo X > bot/.env.example' \
  'rm bot/.env.example' \
  'cat bot/.env.example > bot/.env' \
  'echo x &> bot/.env' \
  'echo x 2> bot/.env' \
  $'cd app/src-tauri\ncp x target/y' \
  'pushd app/src-tauri && cp x target/y' \
  'if true; then cd app/src-tauri; fi; cp x target/y' \
  '{ cd app/src-tauri; cp x target/y; }'; do
  assert_exit 2 command "$command"
done

# Reads, prose and redirections that write no protected file stay allowed.
for command in \
  'cat bot/data/memeover.db 2>/dev/null' \
  'cp bot/data/memeover.db /tmp/memeover-backup.db' \
  'cp bot/.env.example /tmp/memeover-env.txt' \
  'cat bot/.env.example > /tmp/memeover-env.txt' \
  'ls bot/data > /tmp/memeover-list.txt' \
  'echo "the data layer" > notes.md' \
  $'cat > notes.md <<\'EOF\'\nThe guild data registry: rm -rf bot/data\nEOF' \
  $'git commit -m "$(cat <<\'EOF\'\nfix: data -> registry\nEOF\n)"' \
  'git commit -m "fix: data -> registry"' \
  'bun run test 2>&1 | tail -5' \
  'echo x >&2' \
  "sed -i 's/data/info/' notes.md" \
  "sed -n '/data/p' notes.md > /tmp/memeover-lines.txt" \
  'pushd app/src-tauri && popd && cp x target/y' \
  'git clean -fd'; do
  assert_exit 0 command "$command"
done

# Rules apply below the project root, so a checkout under a data directory stays usable.
project=/mnt/data/MemeOver
assert_exit 0 command 'echo x > foo.ts'
assert_exit 0 command 'rm -rf src'
assert_exit 2 command 'rm -rf bot/data'
assert_exit 0 file src/foo.ts
assert_exit 2 file bot/data/memeover.db

# Removals and globs that contain an existing protected entry.
project="$fixture/guard"
mkdir -p "$project/bot/data" "$project/bot/src" "$project/app/src-tauri/target" "$project/other"
touch "$project/bot/data/memeover.db" "$project/bot/src/server.ts" "$project/other/file"
for command in 'rm -rf bot' 'rm -rf bot/*' 'rm -rf bot/dat?' 'mv bot /tmp/old-bot' 'rm -rf .' \
  'git clean -fdX' 'git -C app clean -fdx' 'rsync -a --delete empty/ bot/' 'cp x bot/dat?/y' \
  'find . -name "*.log" -delete'; do
  assert_exit 2 command "$command"
done
assert_exit 2 command 'rm -rf ..' "$project/bot"
for command in 'rm -rf bot/src' 'rm *.log' 'mv foo bot' 'rsync -a src/ bot/' 'rm -rf other' \
  'git clean -fd'; do
  assert_exit 0 command "$command"
done
project=$root

# Both guards fail closed when bun cannot run; commands that write no file never need it.
mkdir -p "$fixture/no-bun"
for tool in jq sed cat dirname; do ln -s "$(command -v "$tool")" "$fixture/no-bun/$tool"; done
expect_closed() {
  status=0
  output=$(printf '%s' "$2" | PATH="$fixture/no-bun" "$BASH" "$root/.claude/hooks/$1" 2>&1) || status=$?
  if [ "$status" -ne 2 ] || [[ "$output" != *"could not run"* ]]; then
    printf 'FAIL: %s did not fail closed without bun (%s): %s\n' "$1" "$status" "$output" >&2
    exit 1
  fi
  count=$((count + 1))
}
expect_closed guard-protected-bash.sh '{"tool_input":{"command":"echo x > bot/.env"}}'
expect_closed guard-protected-paths.sh '{"tool_input":{"file_path":"bot/src/server.ts"}}'
printf '%s' '{"tool_input":{"command":"bun run test 2>&1 | tail -5"}}' |
  PATH="$fixture/no-bun" "$BASH" "$root/.claude/hooks/guard-protected-bash.sh"
count=$((count + 1))

for file in bot/data bot/data/ bot/data/memeover.db-wal bot/data/guilds.json.bak other/data/custom.json app/src-tauri/target app/src-tauri/target/ app/src-tauri/target/release/foo .env .envrc .environment bot/.env.local .claude/settings.local.json; do
  assert_exit 2 file "$file"
done
for file in bot/src/server.ts app/src/data-reader.ts bot/database/file.json app/src-tauri/targeted/file.ts; do
  assert_exit 0 file "$file"
done

# Relative operands must stay protected after a cwd change or a literal cd.
assert_exit 2 command 'rm -rf target' "$root/app/src-tauri"
assert_exit 2 command 'rm -rf ./target/release' "$root/app/src-tauri"
assert_exit 2 command 'cp settings.json settings.local.json' "$root/.claude"
assert_exit 2 command 'rm memeover.db' "$root/bot/data"
assert_exit 2 command 'echo x > ../data/custom.json' "$root/bot/src"
assert_exit 2 command 'echo x > target/file.json' "$root/app/src-tauri"
assert_exit 2 command '> target/file.json' "$root/app/src-tauri"
assert_exit 2 command 'cd app/src-tauri && rm -rf target'
assert_exit 2 command 'cd .claude; cp settings.json settings.local.json'
assert_exit 2 command 'cd bot/data && rm memeover.db'
assert_exit 2 command 'cd app && cd src-tauri && rm -rf target'
assert_exit 2 command 'cd -- app/src-tauri && rm -rf target'
assert_exit 2 command '(cd app/src-tauri && rm -rf target)'
assert_exit 2 command 'cd "app/src-tauri" && rm -rf "target/release"'
assert_exit 2 command 'rm -rf target' '/tmp/project with spaces/app/src-tauri'
assert_exit 0 command 'cat memeover.db' "$root/bot/data"
assert_exit 0 command 'cat settings.local.json' "$root/.claude"
assert_exit 0 command 'rm -rf target' "$root/app"
assert_exit 0 command 'rm settings.local.json' "$root/app"
assert_exit 0 command 'cp .env.example other.txt' "$root/bot"
assert_exit 0 command '(cd app/src-tauri && pwd); rm -rf target'

# Never register a tree-wide writer at Stop. Preserve the original formatter/typecheck.
jq -e '
  ([.hooks.PreToolUse[] | select(.matcher == "Bash") | .hooks[].command] | any(contains("guard-protected-bash.sh"))) and
  ([.hooks.Stop[].hooks[].command] | all(contains("format-touched.sh") | not)) and
  ([.hooks.Stop[].hooks[].command] | any(contains("typecheck-touched.sh"))) and
  ([.hooks.PostToolUse[].hooks[].command] | any(contains("format-edited-file.sh")))
' "$root/.claude/settings.json" > /dev/null

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
# The Edit/Write hook delegates to the same formatter for its single named file.
printf 'agent edit\n' > "$fixture/app/edited.ts"
printf '{"tool_input":{"file_path":"app/edited.ts"}}' |
  PATH="$fixture/bin:$PATH" CLAUDE_PROJECT_DIR="$fixture" bash "$root/.claude/hooks/format-edited-file.sh"
[ "$(cat "$fixture/app/edited.ts")" = 'formatted agent work' ]
cmp "$fixture/expected-user" "$fixture/app/user.ts"
[ "$(wc -l < "$FORMAT_TEST_LOG" | tr -d ' ')" = 2 ]
printf '%s guard dry runs, hook registration and explicit formatter isolation passed.\n' "$count"
