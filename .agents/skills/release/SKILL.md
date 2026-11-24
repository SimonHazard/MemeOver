---
name: release
description: Prepare or verify a MemeOver desktop release, from synchronized app versions through the draft artifacts and updater manifest.
---

# Desktop release

For local preparation, follow [PR versions and gates](../prepare-pr/SKILL.md). Confirm the intended branch and app version, synchronize the app/Tauri/site and workspace lock entries, and write the user-facing changelog. Run the Bun and Rust checks and tests, app build, site build and site check. Report which platforms ran.

For a delivery request, follow the [release workflow](../../../.github/workflows/app-release.yml) for the CI-validated main SHA. A draft can exist before all platform jobs finish. Wait for the complete workflow, then verify `app-vX.Y.Z` targets that SHA, the platform installers and updater artifacts exist, and `latest.json` refers to the matching downloads with signatures. Inspect the workflow conclusion and job outcomes if a release was skipped or failed.

Publish only within the operator’s authorization. For an authorized publication verify the release is public and report the resulting [site refresh](../../../.github/workflows/site-refresh.yml) state. Bot image publication and deployment have their own [delivery path](../../../README.md#deployment).
