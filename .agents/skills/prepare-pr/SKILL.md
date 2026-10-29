---
name: prepare-pr
description: Prepare a MemeOver change for review — run the gates that match the touched areas, decide version bumps, write the CHANGELOG entry, update the plan index and draft the French conventional-commit title; pushing stays an operator action.
---

# prepare-pr

1. Read [AGENTS.md](../../../AGENTS.md) and identify the actual target branch (normally `origin/main`), refreshing it when possible. Review the full branch diff against that target, plus staged, unstaged and untracked files; `git diff --name-only <target>...HEAD` alone misses uncommitted work. List the touched areas: bot, app, shared, packages/ui, site, src-tauri, workflows, docs and tooling. Report if the target reference could not be refreshed.

2. Run the gates for those areas: always `bun run check`, `bun run typecheck`, `bun run test`; `bun run --cwd app build` when app, shared or packages/ui changed; `bun run build:site` and `bun run --cwd site check` when site, shared or packages/ui changed; `cargo check --manifest-path app/src-tauri/Cargo.toml` and `cargo test --manifest-path app/src-tauri/Cargo.toml` when `app/src-tauri` changed. Report any gate you could not run.

3. Apply `AGENTS.md` "Pull requests and versions": every PR needs a bump relative to the latest target branch, including docs, CI, tests, tooling and refactors. Choose minor for new functionality, patch for routine changes and dependency updates, major for a MemeOver compatibility break. Keep app and bot independent, synchronize the five app files when relevant and the matching `bun.lock` workspace entries, and recheck after rebase or a target-branch update. Repository-wide tooling changes require a patch for both products; verify that each version is above the target and that the lockfile stays consistent. Reuse an adequate bump already present in the PR instead of bumping per commit. After synchronizing versions, run `bun run check:versions`. State old/new versions and the rationale in the PR description.

4. Write the `## [Unreleased]` entry in `CHANGELOG.md` in user-facing words under `### Added`, `### Changed` or `### Fixed`; prefix bot changes with `Bot (x.y.z):`. Skip the entry for pure docs, CI, tests or agent tooling changes and say so; the version bump still applies.

5. Update the plan's row in `plans/README.md` when the change executes a plan. Draft the pull request title as a French conventional commit (for example `fix(bot): filtrer les réactions avant l'appel à Discord`) and a concise body covering what changed and why, old/new versions and their rationale, gates run, and what remains unverified (including native Tauri or Discord checks when relevant). Stop there: pushing, opening the pull request and enabling auto-merge are operator actions unless explicitly authorized.
