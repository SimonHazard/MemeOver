# MemeOver Desktop App

The MemeOver desktop app displays Discord media as a customizable overlay on the
user's screen.

## Main Features

- Receive images, GIFs, videos, audio, stickers, text and reactions from Discord.
- Connect quickly by pasting the `memeover://setup` code returned by the bot.
- Use expert mode to point the app at a self-hosted WebSocket server.
- Configure overlay position, size, opacity, duration, sound and display mode.
- Save, import and export overlay profiles without Discord credentials.
- Choose the target screen on multi-monitor setups.
- Review local history and replay recently displayed media.
- Launch at system startup and check for updates from GitHub releases.

## Development

From the repository root:

```bash
bun install
bun run dev:app
```

Or from this package:

```bash
cd app
bun run tauri dev
```

## Build

```bash
bun run build:app
```

Or from this package:

```bash
cd app
bun run build
bun run tauri build
```

## Checks

```bash
bun run --cwd app typecheck
bun run --cwd app test
```

The app version is defined in `app/package.json`, `app/src-tauri/tauri.conf.json`
and `app/src-tauri/Cargo.toml`.
