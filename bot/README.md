# MemeOver Discord Bot

The MemeOver bot connects a Discord server to the MemeOver desktop overlay.

## What It Does

- Registers a Discord server with `/memeover setup`.
- Provides connection credentials with `/memeover token`.
- Rotates credentials with `/memeover rotate`.
- Removes a server registration with `/memeover remove`.
- Sends supported Discord media and messages to connected desktop apps.

## Development

From the repository root:

```bash
bun install
cd bot
bun run dev
```

## Configuration

Create a `.env` file at the repository root:

```env
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_application_id
```

Optional variables:

```env
WS_PORT=3001
LOGTAIL_TOKEN=
METRICS_TOKEN=
```

## Production

```bash
cd bot
bun run start
```
