# Workflow constraints

- Keep `status` as the sole required merge check. Every run includes Biome, version consistency, typechecks and Bun tests. PRs and main pushes select builds by changed inputs. Merge groups run all builds.
- Include Rust `include_str!` inputs and external Astro imports in their matching path filters. [Filter tests](../../scripts/ci-filters.test.ts) cover these dependencies. Real dependency changes select all groups. Keep the workspace-version-only exception shared with site deployment in [lockfile-dependencies.ts](../../scripts/lockfile-dependencies.ts).
- Pin third-party actions by SHA with a version comment and set a timeout on each job. CI uses Ubuntu 24.04 and Linux release bundles use 22.04. Fork and Dependabot PRs must never enter site deployment.
- Give each push to main its own CI concurrency group. Replacing a pending run would skip that commit’s release and image. Docker validation is build-only. On main, `bot-image` publishes to GHCR after `status` succeeds.
- [app-release](app-release.yml) accepts successful CI for a push to this repository’s main. Use `workflow_run.head_sha` for the version check, every build and the release tag. An existing release, including a draft, skips that version. See [deployment](../../README.md#deployment) for the publication flow.
