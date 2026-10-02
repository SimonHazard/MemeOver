# MemeOver agent guide

## Workspace

- `app/`: Tauri v2 + React desktop settings and transparent overlay.
- `bot/`: Bun + discord.js + Elysia Discord bot and WebSocket server.
- `shared/`: Zod protocol, setup codes and media expiry helpers.
- `packages/ui/`: shadcn components and neo-brutalist classes; app/site alias to source; tsup builds explicit entries.
- `site/`: Astro marketing site deployed to Cloudflare.
- `plans/`: ignored implementation plans; read the applicable plan and update `plans/README.md` truthfully.

## Commands and checks

Use Bun 1.4.2+ for tests: older Bun 1.3.12 can hang during server-initiated WebSocket shutdown.
`bun install --frozen-lockfile`; `bun run dev:app`, `bun run dev:bot`, `bun run dev:site`.
Run `bun run check`, `bun run typecheck`, `bun run test`, and `bun run --cwd app build` after relevant source changes.
Run `bun run build:site` and `bun run --cwd site check` for site or shared UI changes.
For Rust: `cargo check --manifest-path app/src-tauri/Cargo.toml` and appropriate Rust tests.
Local bot development reads `bot/.env`; Docker Compose reads the root `.env`.

## Change checklists

### Display setting

1. Add type and default in `app/src/shared/types.ts`; include in `OVERLAY_PROFILE_FIELDS` only for display preferences.
2. Advance `CURRENT_SCHEMA_VERSION` and add a backward-compatible migration in `app/src/shared/settings.ts` with a test in `settings.test.ts`.
3. Update Zod schema and `extractDefaults` in `app/src/windows/settings/components/overlay-form/schema.ts`; check `use-overlay-form.ts` consumers.
4. Add the control in the relevant form section, app en/fr JSON labels and overlay consumer.
5. Keep credentials and machine preferences out of profiles.

### Media host

1. Update `ALLOWED_MEDIA_HOSTS` in `bot/src/media/allowlist.ts`.
2. Update app CSP `img-src`/`media-src` in `app/src-tauri/tauri.conf.json`; add `connect-src` when the preloader fetches the host.
3. Update `bot/src/media/extractor.ts`, with extraction and host validation tests.

### Protocol message

1. Add schema and exported type in `shared/src/protocol.ts` (re-exported by `shared/src/index.ts`).
2. Update bot routing and its exhaustive guard in `bot/src/server.ts`.
3. Update `app/src/windows/overlay/hooks/route-server-message.ts` and the hook action executor.
4. For optional messages, negotiate the capability through JOIN_ACK features before sending; missing features means an older bot.
5. Test validation, routing, backward compatibility and real WebSocket behavior.

### Bot subcommand

1. Add `bot/src/commands/subcommands/<name>.ts`, builder and dispatch in `bot/src/commands/commands.ts`.
2. Add ManageGuild commands to `PRIVILEGED_SUBS`.
3. Add bot en/fr strings in `bot/src/i18n.ts`, update `/memeover help` and both README command tables.
4. Update site command content when present and test permissions and behavior.

### Translations

App: `app/src/i18n/locales/{en,fr}.json`; bot: `bot/src/i18n.ts`; site: `site/src/i18n/{en,fr}.ts`.
Keep both languages and interpolation placeholders in parity; these are separate systems.

## Tests

Use `bun:test` for pure decisions and state modules; no component DOM test harness exists.
Root `test:unit` discovers tests under app/bot/shared/site/packages UI.
Name suites using `mock.module` `*.mocked.test.ts`: `scripts/run-mocked-tests.ts` runs each in its own process.
Add meaningful tests for changed behavior, not snapshots of class strings.
`test/setup.ts` isolates environment, local storage and registry data. Never use live guild data in tests.
CI runs Bun tests, Rust tests and Astro checks; local success is not remote CI proof.

## Design and motion

Preserve the existing neo-brutalist system: shared `NB_*` classes, strong borders, offset shadows and display typography.
Overlay = spectacle; settings = tool; site = marketing. Settings tab changes stay instant.
Use `@memeover/ui/lib/motion` tokens and `ease-out`/`ease-in-out` utilities; avoid `transition-all`.
Include `translate` and `scale` in explicit transitions for Tailwind v4 movement utilities.
Every animation needs a reduced-motion path; avoid decorative motion for keyboard or frequent actions.
The media `0.3 → 1` entrance and its 0.28 s / 0.2-bounce spring are product decisions: preserve them.
New published UI modules need an entry in `packages/ui/tsup.config.ts`.

## Conventions and boundaries

Biome uses tabs, double quotes, 100 columns. `packages/ui/src` is outside the root Biome include list: match its style manually.
Use conventional commits and squash merges. Do not push, tag, publish or open PRs without authorization.
App versions stay synchronized in `app/package.json`, `app/src-tauri/{Cargo.toml,Cargo.lock,tauri.conf.json}` and `site/package.json`.
Bot has an independent version. Release tags are `app-vX.Y.Z`.
Preserve pre-existing changes and exclude them from unrelated commits.
Never edit `.env*`, `**/data/guilds.json`, `app/src-tauri/target/` or `.claude/settings.local.json` during ordinary source work.
Project skills live under `.agents/skills` with `.claude/skills` and `.agent/skills` symlinks; vendored skill metadata stays in `skills-lock.json`.
