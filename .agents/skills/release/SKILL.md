---
name: release
description: Prepare a MemeOver desktop release with synchronized versions, changelog and validation; publishing remains an operator action.
---

# release

1. Read [AGENTS.md](../../../AGENTS.md) and confirm the intended version and branch.

2. Synchronize app version in `app/package.json`, `app/src-tauri/Cargo.toml`, `app/src-tauri/Cargo.lock`, `app/src-tauri/tauri.conf.json` and `site/package.json`. Keep bot version independent.

3. Refresh Cargo.lock via cargo check and write a factual user-facing CHANGELOG entry.

4. Run check, typecheck, Bun and Rust tests, app build and site build/check. State any unverified platform gates.

5. Stop after preparing reviewable changes: tagging `app-vX.Y.Z` and publishing the draft release are operator actions unless the user explicitly authorized them.
