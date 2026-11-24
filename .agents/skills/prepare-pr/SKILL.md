---
name: prepare-pr
description: Prepare a MemeOver PR or dependent PR stack with scoped checks, per-product versions and a French description grounded in the final diff.
---

# Prepare a PR

Refresh the actual target and inspect the branch diff against it, plus staged, unstaged and untracked work. Preserve unrelated changes. For a requested batch of dependent PRs use the [native stack procedure](references/stacked-prs.md).

## Versions

Every PR, including a draft or one prepared for the operator to open, needs a bump relative to its actual target. Fix a missing bump when updating an existing PR. Reuse an adequate bump already in that layer. Recompute after a rebase or scope change.

- Apply the highest impact per product. A new compatible feature is minor. A bug fix, performance or security fix, refactor, dependency update, docs, CI, tests or tooling change is patch. A deliberate MemeOver compatibility break is major and needs migration instructions.
- Bot changes and supporting docs bump `bot/package.json`. App/site changes synchronize `app/package.json`, `app/src-tauri/Cargo.toml`, the app entry in `app/src-tauri/Cargo.lock`, `app/src-tauri/tauri.conf.json` and `site/package.json`. Shared work bumps each affected product. Repository-wide-only changes bump both.
- Synchronize the corresponding workspace entries in `bun.lock` and run `bun run check:versions`. This checks consistency. Compare versions with the target separately.
- For product changes add a user-facing English `CHANGELOG.md` entry in `[Unreleased]` under Added, Changed or Fixed, prefixed with the affected products and versions, e.g. `App/site (x.y.z):`. Pure docs, CI, tests or agent tooling skip the changelog entry.

## Checks and handoff

Run `bun run check`, `bun run typecheck` and `bun run test`. Build the app frontend for app, shared or shared UI changes. Build and check the site for site, shared or shared UI changes. Run Cargo check and tests for native changes. See [commands](../../../AGENTS.md#running-and-checking) and exercise the affected user path. For an app UI change, run the relevant Playwright scenario through the affected control and player (for example `bun run test:browser test/browser/notifications.spec.ts --project=chrome`). Record the scenario, engine, observed result and any missing native or streaming acceptance. For site-only UI, exercise the changed page in its built preview.

For plan work update the versioned index in `plans/README.md` in the same change. Write a French conventional-commit title and a concise French description of the actual change, why it matters, versions before/after and the checks run. For user-visible compatibility changes describe what an existing user must do. After a rebase or fix compare the description with the final diff, current head and its CI. Report any material native, OBS or Discord acceptance still outstanding. Keep credentials and identifiable live data out of public text.

Preparing a PR ends with local changes and draft copy unless the request includes publication. Use conventional commits and squash merges for authorized delivery.
