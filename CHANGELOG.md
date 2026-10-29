# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project adheres to Semantic Versioning.

## [Unreleased]

### Fixed

- App (1.8.3): install dependencies and start app-managed bots with the exact validated Bun executable when several Bun installations coexist. Keep nested bot commands on the selected runtime.
- App/site (1.8.2): wait for successful main CI before preparing draft app releases, and build and tag the exact commit validated by that CI.
- App (1.8.1): require stable Bun 1.4.2 or newer for app-managed bots, offer the pinned installer when the installed runtime is unsupported, and keep compatible newer versions.
- Bot (1.6.4): delete a server's configuration and revoke overlay sessions when the bot is removed from Discord. Preserve configurations when an overlay reconnects, recent activity is recorded or setup is replaced while a cleanup notice is being sent.
- Bot (1.6.3): filter reactions before calling Discord, then recheck the watched channel, pause and bot-source settings after the response. Limit Discord fetches and outgoing reactions independently to 10 per guild per second so delayed responses cannot flood the overlay.

### Changed

- Bot (1.6.6): exclude local certificates and backups from Docker build contexts, and document manual source updates with revision checks, Discord/overlay verification and persistent-volume safeguards.
- App/site (1.8.1), bot (1.6.5): consolidate CI into one workflow with fast checks, path-filtered app builds/browser tests, Rust checks, Astro checks/site builds, and an aggregate `status` gate that requires every selected job to succeed. Ignore workspace version-only lockfile changes when selecting expensive jobs; keep real dependency changes fully checked. Restrict Cloudflare previews to internal PRs, excluding forks and Dependabot. Pin Bun in these workflows to the repository version, limit app bundling to new versions on main, and rename the site deployment workflows.
- App/site (1.8.1), bot (1.6.5): validate bot Docker builds before merging, pin the bot image and remaining CI workflow to Bun 1.4.2, exclude private files and generated artifacts from Docker contexts, check product/workspace versions before releases, and build Linux releases on Ubuntu 22.04.
- App/site (1.8.1), bot (1.6.5): migrate workflow actions to Node 24, pin Ubuntu CI runners to 24.04, and replace the duplicate Bot CI workflow with GHCR publication after the main CI status succeeds.
- Bot (1.6.4): extend both disconnected-server cleanup thresholds from 24 to 48 hours. Explain configuration deletion and the single-client rule in cleanup notices and retention documentation.
- Bot (1.6.3): cap the message cache at 25 messages per channel and sweep messages older than 30 minutes every 5 minutes. Ignore embed updates without a cached previous message to avoid replaying old media.

## [1.8.0]

### Added

- Show a short notification on the overlay when another user connects to the same server. Connection notifications are enabled by default and can be turned off or placed in any of the four corners from display settings and profiles.
- Adjust connection notification duration from 1 to 30 seconds (4 seconds by default), save it in display profiles, and choose the notification corner from a menu.
- Ignore the initial member count, departures and repeated counts so opening or reconnecting the app does not announce existing users. Hide connection toasts when the overlay is closed or notifications are disabled.

### Fixed

- Keep connection notifications in sync with the app's language and light/dark theme across windows, including a notification already on screen. Without a saved theme, follow the system theme. Stop synchronizing closed windows.
- The bot (1.6.1) counts distinct app installs, so replacing a connection does not count the same app twice while its previous connection is still closing. A new arrival immediately after another user's departure is still announced; a reconnect after a full disconnect may also be announced.

## [1.7.1]

### Changed

- Remove the admin pause banner from the overlay. Pause status remains visible in settings.

## [1.7.0]

### Added

- Add privileged `/memeover pause` and `/memeover resume` commands.
- Save timed pauses, restore timers after restart and keep overlays informed of the server's pause status.
- Clear pending media during a pause while allowing the visible item to finish.
- Keep history replays playable during a pause; new Discord activity is ignored.

## [1.6.6]

### Fixed

- Cover the full monitor with the overlay, including the taskbar or menu bar area, and restore its size when reopened on Windows. Remove the unwanted thin border and rounded corners around the Windows overlay.
- Fit the overlay to its monitor again within two seconds after a resolution or scaling change, or after its monitor is disconnected.
- Keep the author badge on screen for tall media: the media height now leaves room for the badge, background and caption, which previously pushed the badge off the top edge at bottom positions.
- Restore keyboard navigation for position, text position, preview format, language and media type options: the up and down arrows move between options again, and tabbing into a single-choice group focuses the selected option.
- Keep Enter from saving the overlay form while a slider is focused, as before the 1.6.2 migration.
- Replace the hold-to-confirm buttons (delete a profile, clear the history from History or About) with a confirmation dialog. Some keyboard, screen reader and voice control users could not confirm by holding a key. The confirmation focuses Cancel first, closes with Escape and ignores clicks outside it.
- Give the member count badge a screen-reader description of its state; its visible parts were hidden from assistive technology.
- Show replays of muted authors and hidden anonymous memes. History confirmed these replays, but the overlay dropped them.
- Stop accepting the self-hosted server's placeholder public address for installation, progress and friend codes, which pointed friends to the unreachable `YOUR_PUBLIC_IP` host.
- Translate every tray menu entry, including Hide, from startup instead of only after changing the language.
- Announce the selected text color, the custom color value and why an expired replay is unavailable to screen readers.

### Changed

- Keep the overlay on top without showing a redundant permission error.
- Give every dialog the same MemeOver look: strong frame, display font titles, a lightly blurred backdrop, and no zoom or fade under reduced motion.
- Use formal French ("vous") in the unsaved changes dialog, like the rest of the interface.
- Remove 18 unused interface translations.

## [1.6.5]

### Fixed

- Keep author badges visible if their entrance animation is interrupted or disabled.

### Changed

- Keep confetti, pop and firework reactions working with custom fade timings. Built-in reaction effects keep their existing appearance.

## [1.6.4]

### Added

- Automatic updates: new releases download in the background and apply on the next launch (on quit for Windows), with a toggle and a restart-now action in About.

### Fixed

- Preserve newer display settings when applying older overlay profiles.
- Avoid grouping all anonymous senders under the per-author queue limit.
- Allow revoked sessions to reconnect after changing the bot URL.
- Hide the settings window when its close request receives no response.

### Changed

- Update bundled software and require Bun 1.4.2 to run the bot.

## [1.6.3]

### Fixed

- Center the author badge above content and keep it outside the configurable media background; remove its outer halo.
- Restore pointer and keyboard interactions for all overlay settings sliders.
- Remove the duplicate arrow from selection menus and label slider and switch controls for assistive technology.
- Show errors when profile creation, replacement or import fails, and allow retrying the same import file.
- Keep the first-configuration wizard open through its final step and report failed connection saves and screen changes.

### Changed

- Restore the slight lift and stronger offset shadow on button hover, with a stationary reduced-motion variant.

## [1.6.2]

### Changed

- Rebuild the shared controls and adapt the settings interface.
- Harmonize switches, inputs, profile actions and connection buttons with the neo-brutalist design.
- Refresh the display font and improve reduced-motion transitions for settings controls.
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
