# Working on MemeOver

Start with the requested outcome and the current checkout. [CONTEXT.md](CONTEXT.md) explains what each player can display and which settings travel with it. The [README](README.md) describes what users can do today.

## Picking up work

- Keep analysis-only requests read-only. For a review, inspect the current implementation and explain the concrete gain, cost and observed regressions. Identify what already worked on the base branch before crediting a change.
- For plan work, start with the [roadmap](plans/README.md) and the linked plan on the requested base. Check its prerequisites against the current code. Hand off the plan path, base revision and outstanding acceptance. If a STOP condition applies or shipped behavior conflicts with the plan, surface the precise decision before changing that behavior. [Feature ideas](docs/feature-ideas.md) need their own implementation request.
- In a requested multi-agent wave, assign one agent per plan in isolated worktrees. The integrator reconciles dependent changes, regression coverage and versions against each actual parent. Update the versioned plan index with the outcome and any outstanding acceptance.
- Preserve unrelated dirty files. If they overlap your task, use a separate worktree at the requested base. “Ship” means create the branch, commit, push and open the PR. Follow narrower instructions such as “local only”. Merge, tag and publication require their own authorization.
- When handing off, give the checkout/branch, what changed for the user, the checks actually run and any remaining decision or acceptance step. Cite the tested SHA for remote CI. Give exact visible copy or captures when the task calls for them. Keep updates for decisions, blockers and results. In touched code, keep comments that explain constraints or surprising behavior and remove stale narration alongside the change.

## Where to work

| Change | Entry point |
| --- | --- |
| Desktop settings or display profiles | [add-setting](.agents/skills/add-setting/SKILL.md) |
| Missing events on desktop or stream | [diagnose-overlay](.agents/skills/diagnose-overlay/SKILL.md) |
| Media provider / direct-media host | [add-media-host](.agents/skills/add-media-host/SKILL.md) |
| WebSocket message or capability | [add-protocol-message](.agents/skills/add-protocol-message/SKILL.md) |
| Discord command | [add-bot-subcommand](.agents/skills/add-bot-subcommand/SKILL.md) |
| Bot runtime, services or lifecycle tests | [bot conventions](bot/AGENTS.md) |
| CI filters, merge or release workflows | [workflow constraints](.github/workflows/AGENTS.md) |
| Preparing a PR, including a draft or operator handoff | [prepare-pr](.agents/skills/prepare-pr/SKILL.md) for gates, mandatory per-product versions and French PR copy |
| Preparing or verifying a desktop release | [release](.agents/skills/release/SKILL.md) |

`app/` contains the React windows and Tauri host. `bot/` runs Discord and the Elysia WebSocket server. `shared/` owns the Zod protocol, setup codes and expiry helpers. The app and Astro site import `@memeover/ui/*` directly from `packages/ui/src/`. A new Tauri command needs registration in `app/src-tauri/build.rs` and a grant in each calling window’s capability file.

## Checking a library API

Before introducing a library call, permission or CLI flag, find the resolved version in `bun.lock` or `app/src-tauri/Cargo.lock`. Consult the installed CLI’s help or the library’s documentation MCP when available. Match the result to that version and the project configuration. If the tool lacks the answer, check the versioned upstream reference or the installed types and source. Verify the specific call in its consuming workspace. If a runtime behavior is still uncertain, say which part needs a live check.

- Tauri commands and flags: run `bun run --cwd app tauri --version` and the relevant subcommand’s `--help`, for example `bun run --cwd app tauri permission --help`. For API signatures use the [JavaScript reference](https://v2.tauri.app/reference/javascript/api/) or the Rust crate documentation for the locked version.
- shadcn components: run `bun run --cwd packages/ui shadcn docs button` (replace `button` with the component). Open the returned docs for the configured base, then check the component MemeOver actually ships under `packages/ui/src/`.
- Astro site APIs: use the [Astro Docs MCP](https://docs.astro.build/en/guides/build-with-ai/) when connected. Its index follows the latest release, so check that the API exists in the installed Astro version.

## Agent tools

- Use the `discord-docs` MCP for Discord developer APIs and the `astro-docs` MCP for Astro. Codex loads [project settings](.codex/config.toml) in a trusted checkout. Claude Code asks for approval for each [project server](.mcp.json). Check availability with `codex mcp list` or `claude mcp list`. Both public docs services accept queries without credentials. Keep tokens, private Discord data and full browser-source links out of queries. If a server is unavailable, use [Discord Developer Documentation](https://docs.discord.com/llms.txt) or [Astro Docs](https://docs.astro.build/).
- For TanStack work, run `bun run intent list` from the workspace root and `bun run intent load '<package>#<skill>'` for the matching guide. Intent resolves the guide from the installed package. For Query and Form, use [TanStack CLI's documentation commands](https://tanstack.com/cli/latest/docs/cli-reference#tanstack-doc) when Intent has no guide. For example, run `bunx @tanstack/cli@0.72.16 doc query framework/react/overview --docs-version v5` or `bunx @tanstack/cli@0.72.16 search-docs 'form validation' --library form --framework react`. Verify APIs against the installed versions.
- For Elysia WebSocket or HTTP work, use the [Elysia 1.x skill](.agents/skills/elysia-v1/SKILL.md) and [bot conventions](bot/AGENTS.md). The skill points to the official 1.x source revision.
- For interactive web checks, use [Playwright CLI](test/browser/README.md#interactive-browser-checks) from the installed Playwright version. Use the [browser suite](test/browser/README.md) for repeatable regression checks. To check the real desktop windows, run the [native smoke test](test/browser/README.md#native-desktop-smoke-test).

## Interface changes

Start with the shipped screen and its audience. Use [surface behavior](CONTEXT.md#what-belongs-on-screen) to decide where a change belongs. Trace each visual variant to a mounted caller. Scope the change to the variant users reach on that surface. Use the existing visual language for changes to shipped screens. Use the generic frontend-design skill for visual exploration when the brief calls for a new direction.

Use the closest [branded component](packages/ui/src/components/branded/nb-button.tsx), the shared [theme](packages/ui/src/theme.css) and [NB classes](packages/ui/src/lib/nb-classes.ts). Bungee display type, Poppins text, strong borders and offset shadows come from these shared styles. Keep labels actionable in both languages. App strings live in `app/src/i18n/locales/`, bot strings in `bot/src/i18n.ts` and site strings in `site/src/i18n/`. Match interpolation placeholders.

For a visual change, compare the same state before and after in the affected surface. Pick the case that could expose the regression: a French label at minimum window width, a toast in light and dark themes, or the [same media on desktop and stream](test/browser/overlay-parity.spec.ts). A settings preview is only evidence for what it actually renders.

Use [motion tokens](packages/ui/src/lib/motion.ts), explicit transition properties (including `translate` and `scale` when used) and `ease-out` or `ease-in-out`. Provide a reduced-motion path. Preserve the media entrance from 0.3 to 1 with the 0.28 s, 0.2-bounce spring. Keep keyboard and frequent actions free of decorative motion.

For shadcn changes, run `bunx --bun shadcn@latest add <name>` from `app/` or `packages/ui/`. Preview updates with `--dry-run` and `--diff`. The app imports the root shadcn package’s CSS at build time.

## Running and checking

Use the Bun version in the root `package.json`. Bun 1.3.12 can hang on server-initiated WebSocket shutdown. Run `bun install --frozen-lockfile` in the worktree. Start the needed surface with `bun run dev:app`, `dev:bot` or `dev:site`. Local bot development reads `bot/.env` and Compose reads the root `.env`.

- After relevant source changes run `bun run check`, `bun run typecheck`, `bun run test` and the affected builds. Biome uses tabs, double quotes and 100 columns. App frontend build is `bun run --cwd app build`. For site, shared or shared UI changes also run `bun run build:site` and `bun run --cwd site check`. For Rust, build the app frontend first so Tauri can resolve `frontendDist`, then run `cargo check --manifest-path app/src-tauri/Cargo.toml` and the relevant Rust tests.
- Use `bun:test` for pure decisions. Name suites using `mock.module` `*.mocked.test.ts` for process isolation. Use the repo’s test preload and temporary registry data. Preserve the regression assertions behind refactors.
- Exercise visible changes through the real control. [Playwright fixtures](test/browser/README.md) cover Chrome/WebKit, themes, keyboard, reduced motion and persistence. [Local overlay simulation](docs/local-overlay-testing.md) exercises rendering. State which integrations were simulated and which ran live when reporting a result.

## Local boundaries

Keep ordinary edits out of `.env*`, every `data/` directory (including registry and WAL), `app/src-tauri/target/` and `.claude/settings.local.json`. Redact setup codes, full browser-source links and tokens from shared output.

The [Claude hooks](.claude/settings.json) guard common writes and format the named file. The Stop hook selects TypeScript checks for bot, app, shared, UI and browser tests. For Astro changes run `bun run --cwd site check` explicitly. Shell detection is heuristic. Outside Claude Code, apply the same boundaries yourself. For shell edits use `.claude/hooks/format-touched.sh <files…>` on your own files. After a hook change run `bash .claude/hooks/test-hooks.sh`.

Edit project skills under `.agents/skills/`. The other agent directories link there. Keep vendored skill provenance in `skills-lock.json`.
