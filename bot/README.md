# MemeOver Discord Bot

The MemeOver bot connects Discord servers to the MemeOver desktop overlay through
a lightweight WebSocket server.

## What It Does

- Registers a Discord server with `/memeover setup`.
- Provides credentials and a one-paste `memeover://setup` code with `/memeover token`.
- Rotates credentials with `/memeover rotate` after a Discord confirmation.
- Lets server managers allow or mute bots/apps with `/memeover bots`.
- Sends supported Discord media, stickers, text and reactions to connected desktop apps.
- Supports anonymous media pushes with `/memeover secret`.
- Exposes `/health` and optional bearer-protected `/metrics` HTTP endpoints. `/health` returns 503 once Discord closes the gateway for good (invalid token or intents); fix the cause, then restart.
- Removes disconnected server registrations after 48 hours of inactivity, or once they are 48 hours old if at most one client has ever connected; also removes them as soon as the bot is removed from the server.

## Discord Commands

| Command | Permission | Description |
| --- | --- | --- |
| `/memeover setup [#channel]` | Manage Server | Register the server; omit channel to watch all channels |
| `/memeover token` | Everyone | Display credentials and setup code, visible only to the caller |
| `/memeover rotate` | Manage Server | Confirm, then regenerate the token and invalidate the previous one |
| `/memeover remove` | Manage Server | Confirm, then remove this server registration |
| `/memeover bots enabled:<true\|false>` | Manage Server | Allow or mute messages and reactions from bots/apps |
| `/memeover secret [media] [url] [text]` | Everyone | Send an anonymous media item to connected overlays |
| `/memeover status` | Manage Server | Show watched channels, active overlays and uptime |
| `/memeover pause duration:<5m\|15m\|30m\|1h\|2h\|indefinite>` | Manage Server | Pause broadcasts; incoming events are dropped |
| `/memeover resume` | Manage Server | Resume broadcasts |
| `/memeover help` | Everyone | List command help |

## Development

Use stable Bun 1.4.2 or newer. CI and Docker use exactly 1.4.2. The app's Server tab
checks this minimum before installing or starting the bot; its Bun installer installs
1.4.2 when no compatible version is found.

From the repository root:

```bash
bun install
bun run dev:bot
```

Or from this package:

```bash
cd bot
bun run dev
```

## Configuration

For `bun run dev:bot`, copy `bot/.env.example` to `bot/.env`, then fill in
(Docker Compose reads a `.env` at the repository root instead):

```env
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_discord_application_id
```

In the Discord Developer Portal, enable `Bot > Privileged Gateway Intents > Message Content Intent`.
Without this intent, Discord rejects the bot login with `Used disallowed intents`.

Optional variables:

```env
WS_PORT=3001
PUBLIC_WS_URL=wss://bot-memeover.simonhazard.com/ws
LOGTAIL_TOKEN=
METRICS_TOKEN=
```

`PUBLIC_WS_URL` is embedded in setup codes sent by `/memeover setup`,
`/memeover token` and `/memeover rotate`. Set it to the public `ws://` or
`wss://` endpoint of your self-hosted bot.

## Production

```bash
bun run --cwd bot start
```

Docker Compose is available from the repository root:

```bash
docker compose up -d --build
```

Updates stay manual, using the existing Compose checkout and project on `main`:

1. Confirm the tracked working tree is clean (`git status --short`) and the intended
   revision on `main` has passed CI. Preserve the local root `.env` and `bot-data` volume.
2. Run `git pull --ff-only origin main`, then record `git rev-parse HEAD` privately.
   Verify CI succeeded for that exact revision before continuing, including if `main`
   advanced after the first check.
3. Run `docker compose up -d --build bot`. If supported by the installed Compose
   version, add `--wait --wait-timeout 180` to wait for Docker health.
4. Check `docker compose ps` and `docker compose logs --tail=100 bot` locally. Then
   run a Discord command, connect an overlay and confirm media delivery. A healthy
   container or a successful `/health` response alone does not prove Discord login
   or overlay delivery. Keep logs and diagnostics private; they can contain credentials,
   setup codes, guild identifiers and infrastructure details.

Keep the same Compose project and volume identity across updates. Never use
`docker compose down -v` for an update: it deletes the persistent volume. If a check
fails, diagnose locally and redeploy an identified prior revision when compatible.
Reverting code or an image does not undo a database migration; assess schema
compatibility before reverting a future release that changes the database.

A failed build normally leaves the previous container running, but startup can fail
after replacement and cause downtime. Source builds use host CPU and disk, so keep
enough free space and retain a usable recovery image. CI validates Docker builds on
relevant pull requests without publishing them; the GHCR image published on `main`
is not consumed by this Compose source-build procedure. CI does not deploy the VPS.

Runtime data is stored in the SQLite database `data/memeover.db` locally, or in the
`bot-data` volume when using Docker Compose. On first start, an existing `data/guilds.json`
is imported and renamed to `guilds.json.migrated`; an unreadable file stops startup instead
of starting with an empty registry. The first successful initialization is recorded in SQLite,
in the import transaction. A leftover or restored JSON file cannot revive removed guilds or old
tokens, even if the registry becomes empty or the rename failed. An existing populated SQLite
registry takes precedence over JSON.

The database runs in WAL mode: while the bot is running, recent writes may still live in
`memeover.db-wal`. Stop the bot before copying all `memeover.db*` files together, or take a
consistent snapshot of the running database with `VACUUM INTO`.

## Checks

```bash
bun run --cwd bot typecheck
bun run --cwd bot test
```

`MEMEOVER_DATA_DIR` optionally overrides registry storage (default: `./data` relative to the working directory).
