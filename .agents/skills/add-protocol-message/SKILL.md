---
name: add-protocol-message
description: Add a MemeOver client or server protocol message with backward compatibility and feature negotiation.
---

# add-protocol-message

1. Read [AGENTS.md](../../../AGENTS.md) and inspect the current protocol and capability list.

2. Define the payload and exported type in the matching union in `shared/src/protocol.ts`.
   - **Client → bot**. Send through `app/src/windows/overlay/ws-client.ts` and handle the message in the exhaustive client-message switch in `bot/src/server.ts`. For an optional client message, advertise its feature on successful JOIN_ACK and gate the send. Missing features mean an older bot.
   - **Bot → client**. Update the producing bot path, then `app/src/windows/overlay/hooks/route-server-message.ts` and its action executor in `useOverlayWs.ts`. Check how an older client handles the new event.
3. If the exchange includes a reply, follow the opposite direction for that reply. Keep older peers’ existing message shapes usable.

4. Test invalid payloads, old-client/bot compatibility, authorization and routing; use isolated real WebSocket tests where state or membership matters.
