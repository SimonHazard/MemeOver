# MemeOver Desktop App

The MemeOver desktop app displays Discord media as a customizable overlay on the user's screen.

## Main Features

- Receive images, GIFs, videos, audio, text and reactions from a connected Discord server.
- Configure overlay position, size, opacity, duration, sound and display mode.
- Save and import overlay profiles.
- Choose the target screen on multi-monitor setups.
- Review received media in the history and replay it.
- Check for updates from GitHub releases.

## Development

From the repository root:

```bash
bun install
cd app
bun run tauri dev
```

## Build

```bash
cd app
bun run build
bun run tauri build
```

The app version is defined in both `app/package.json` and `app/src-tauri/tauri.conf.json`.
