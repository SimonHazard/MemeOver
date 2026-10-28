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
2. Update app CSP `img-src`/`media-src` in `app/src-tauri/tauri.conf.json` for the host.
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

## Pull requests and versions

Every PR must include a version bump before it is opened, including draft PRs and PRs prepared for the user to open. Fix a missing bump when updating an existing PR.

- Review the full PR diff against the latest target branch and choose the bump from its actual impact, not its size or title. Use the highest required level for each affected product.
- **Minor** (`x.y.z → x.(y+1).0`): new user-facing functionality or a significant feature that preserves compatibility. Example: `1.6.3 → 1.7.0`.
- **Patch** (`x.y.z → x.y.(z+1)`): bug fixes, minor adjustments, performance/security fixes, refactors and package updates. A dependency's own major bump does not automatically make MemeOver's bump major.
- **Major** (`x.y.z → (x+1).0.0`): an intentional compatibility break in MemeOver (protocol, configuration or supported usage). Explain the break and migration in the PR.
- Documentation, CI, tests and tooling-only PRs still require a patch for the relevant product; repository-wide-only work bumps both app and bot.
- Keep app and bot independent: bot changes and their supporting documentation bump the bot; app/site changes bump the app/site stream. Shared code or dependencies bump every product they actually affect.
- App versions stay synchronized in `app/package.json`, `app/src-tauri/{Cargo.toml,Cargo.lock,tauri.conf.json}` and `site/package.json`. Bot version lives in `bot/package.json`. Synchronize the corresponding workspace versions in `bun.lock`; avoid unrelated dependency changes.
- Bump once per PR, not once per commit or review round. An adequate bump already in the PR satisfies the rule. After a rebase or another PR's merge, recheck that the version is still above the target branch and matches the final scope; recompute it if necessary.
- Before opening or handing off the PR, verify the version diff and lockfile consistency, add a factual `CHANGELOG.md` entry for product changes, and state the old/new versions and the reason in the PR description.

A version bump does not authorize a push, tag or release. App release tags remain `app-vX.Y.Z`.

## Conventions and boundaries

Biome uses tabs, double quotes, 100 columns. `packages/ui/src` is outside the root Biome include list: match its style manually.
Use conventional commits and squash merges. Do not push, tag, publish or open PRs without authorization.
Preserve pre-existing changes and exclude them from unrelated commits.
Never edit `.env*`, `**/data/` (guild registry `memeover.db*`, legacy `guilds.json*`), `app/src-tauri/target/` or `.claude/settings.local.json` during ordinary source work.
Project skills live under `.agents/skills` with `.claude/skills` and `.agent/skills` symlinks; vendored skill metadata stays in `skills-lock.json`.

Product ideas in `docs/feature-ideas.md` are not implementation plans. Require an explicit user request before implementing them.
