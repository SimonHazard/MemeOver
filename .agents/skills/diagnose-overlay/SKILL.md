---
name: diagnose-overlay
description: Diagnose missing media on the MemeOver desktop overlay or browser source using destination settings, routing and playback evidence.
---

# Diagnose missing playback

1. Identify the missing event (Discord or Twitch), affected player and destination. Use [playback destinations](../../../CONTEXT.md#playback-destinations) to establish whether it should appear there. Check desktop visibility, source enablement and whether the page has reported in. Redact source links and setup codes.
2. For Discord, check the affected player’s own connection, guild registration, watched channels, Message Content Intent and bot/app source policies. Use bot `/health`, authorized `/metrics` or `/memeover status` as appropriate. A healthy bot alone establishes little about delivery. For Twitch desktop, inspect account/event enablement and the event-specific reward, role or command options.
3. Trace a representative event through the corresponding router, local filters, queue and playback. For Discord start at `app/src/windows/overlay/hooks/route-server-message.ts`. For Twitch start at `app/src/shared/twitch/route-twitch-event.ts`. Check pause, media type, author filters, URL expiry and visibility as applicable. Browser sessions live in `app/src/windows/browser-source/use-source-session.ts`. Desktop presentation can depend on exclusive fullscreen.
4. Use the [local simulator](../../../docs/local-overlay-testing.md) for rendering or [browser fixtures](../../../test/browser/README.md) for a reproducible player/control flow. Report the first observed drop or remaining unknown. A native window, OBS audio or live Discord claim needs evidence from that environment. Leave live registry data untouched.
