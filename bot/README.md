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
- Exposes `/health` and optional bearer-protected `/metrics` HTTP endpoints.
- Cleans up inactive or single-client server registrations after 24 hours.

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
| `/memeover help` | Everyone | List command help |

## Development

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

Create a `.env` file at the repository root:

```env
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_discord_application_id
```

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

Runtime data is stored in `data/guilds.json` locally, or in the `bot-data`
volume when using Docker Compose.

## Checks

```bash
bun run --cwd bot typecheck
bun run --cwd bot test
```
