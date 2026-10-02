---
name: diagnose-overlay
description: Investigate a MemeOver overlay that connects but displays nothing using concrete local status and bot evidence.
---

# diagnose-overlay

1. Read [AGENTS.md](../../../AGENTS.md). Check connection status and overlay visibility in the app without exposing the connection token.

2. Read bot `/health`; use `/metrics` only with authorized credentials, and `/memeover status` only in an authorized test/server interaction.

3. Check Message Content Intent, guild registration, watched channels, bot/app source policies, enabled media types, local author filters, expired URLs and exclusive-fullscreen games.

4. Inspect `app/src/windows/overlay/hooks/route-server-message.ts` and the diagnostics panel if present; distinguish a routing drop from queue, preload and playback failures.

5. Report exact observed evidence and missing platform/Discord proof; never mutate live registry data to diagnose a source issue.
