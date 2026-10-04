# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project adheres to Semantic Versioning.

## [Unreleased]

## [1.7.0]

### Added

- Add privileged `/memeover pause` and `/memeover resume` commands.
- Persist timed pauses, restore timers after restart and negotiate guild state with overlays.
- Clear pending media during a pause while allowing the visible item to finish.

## [1.6.3]

### Fixed

- Center the author badge above content and keep it outside the configurable media background; remove its outer halo.
- Restore all overlay settings sliders after the Base UI migration, including pointer and keyboard interactions.
- Remove the duplicate arrow from selection menus and label slider and switch controls for assistive technology.
- Handle failed profile creation, replacement and imports without unhandled errors; allow retrying the same import file.
- Keep the first-configuration wizard open through its final step and report failed connection saves and screen changes.

### Changed

- Restore the slight lift and stronger offset shadow on button hover, with a stationary reduced-motion variant.

## [1.6.2]

### Changed

- Migrate shared UI components from Radix to Base UI and adapt the settings controls.
- Harmonize switches, inputs, profile actions and connection buttons with the neo-brutalist design.
- Replace the bundled Bungee font and improve reduced-motion transitions for settings controls.
- Translate position and color controls, preview summaries and French interface labels.
- Identify site deployments by the published app release and queue production deployments without interrupting an active run.

### Fixed

- Show localized connection errors for unknown servers and invalid tokens, with a generic fallback for unknown errors.
- Add localized titles and technical details to local server operation errors.

## [1.6.1]

### Fixed

- Restore the history settings page by providing tooltip context to all settings routes.
- Refresh the production website from protected main after app releases instead of deploying from a rejected release tag.

## [1.6.0]

### Added

- Hide selected authors and anonymous messages locally.
- Limit pending media per author with profile-aware settings.
- Extract and test overlay message routing and display decisions.

### Fixed

- Revoke active overlay sessions immediately after token rotation or server removal.
- Regenerate replay IDs, prevent replay duplication in history and purge expired Discord media.

## [1.5.1]

### Changed

- Refresh English and French website content and add command, self-hosting and changelog pages.
- Share the minimal Discord invite permission helper.
- Resolve published downloads from GitHub with a safe offline fallback.
- Improve navigation accessibility and reduced-motion behavior.

## [1.5.0]

### Added

- Add shared motion tokens and reduced-motion paths.
- Improve author badges and captions while preserving the media entrance.
- Add hold-to-confirm profile deletion, copy feedback, animated counters and profile lists.

### Changed

- Keep settings transitions focused and improve position and theme previews.

## [1.4.5]

### Added

- Isolate test configuration and registry data, and run mocked suites in separate processes.
- Add characterization tests and CI gates for Bun, Rust and Astro.

### Changed

- Refresh vendored agent skills and document contributor workflows.
- Add project skills and Claude hooks for protected paths, formatting and type checks.
- Backfill release notes for existing versions 1.2.0 through 1.4.4.

## [1.4.4]

### Fixed

- Render Discord video-backed GIFs and KLIPY GIF media correctly.

## [1.4.3]

### Added

- Respect reduced motion for media, reactions, the audio equalizer and onboarding.
- Limit reaction bursts with a complexity budget.

### Changed

- Make routine settings motion calmer and tooltips quicker.
- Simplify the update dialog's information sequence.

## [1.4.2]

### Fixed

- Open the canonical privacy and legal page from the app.
- Start login sessions in the tray, keeping settings hidden until requested.
- Restore and focus settings from the tray, including on macOS.
- Refresh existing startup registrations with the background launch flag.

## [1.4.1]

### Fixed

- Explain the missing Discord Message Content Intent when the self-hosted bot fails to start.

## [1.4.0]

Released without an `app-v1.4.0` Git tag.

### Added

- Create a self-hosted bot from a guided Server settings tab.
- Install, start, stop and restart the bot with live redacted logs and health checks.
- Import the host's connection code and generate a code to share with friends.

### Changed

- Keep installation work off the interface thread and stop the managed bot on app exit.

## [1.3.0]

### Added

- Manage bot and application messages with `/memeover bots`.
- Show the server's bot/app source policy in connection replies.
- Localize source-management commands and responses in English and French.

## [1.2.0]

### Changed

- Use Discord Components V2 panels for connection responses.
- Confirm token rotation and server removal through action buttons.
- Refresh localized confirmations and help descriptions.

## [1.1.0]

### Added

- Add the one-paste `memeover://setup` connection code flow.
- Add floating Discord reactions, anonymous `/memeover secret` sends, and `/memeover status`.
- Add autostart support, multi-client activity tracking, and inactive guild cleanup.

### Changed

- Default new installs to the hosted MemeOver WebSocket endpoint while keeping self-hosting in expert mode.
- Refresh README documentation, development scripts, and bot deployment notes.
- Move bot replies to Discord Components V2 and add confirmations for `/memeover rotate` and `/memeover remove`.
- Stop tracking generated Astro `.astro` files.

## [1.0.0]

### Changed

- Release MemeOver as a stable 1.0 desktop app and website.
- Refresh product copy around the core MemeOver features.
- Remove old launch wording from the app and website.
- Update package and Tauri versions for the 1.0 release.

## [0.5.0]

### Changed

- Discord bot refacto in Bun

## [0.4.0]

### Changed

- Let the code visible until the user is connected :fire:
- Start the timeout when the video or the audio is playing :100:

### Added

- Handle audio attachment :sound:
- Add text to onboard users :tada:

### Fixed

- Delete link for the embed attachments :heavy_check_mark:

## [0.3.1]

### Added

- Add a tray icon :100:

## [0.3.0]

### Changed

- Better stability between you and the bot :rocket:
- Add a tray icon, still work in progress, let me cook :eyes:

### Added

- Use react-use-websocket (heartbeat, reconnect)
- Add TrayIcon
- Delete closed connection from the map
