---
name: add-protocol-message
description: Add a MemeOver client or server protocol message with backward compatibility and feature negotiation.
---

# add-protocol-message

1. Read [AGENTS.md](../../../AGENTS.md) and inspect the current protocol and capability list.

2. Add Zod schema and exported type in `shared/src/protocol.ts`; update both exhaustive routers: `bot/src/server.ts` and `app/src/windows/overlay/hooks/route-server-message.ts` plus its action executor.

3. For optional client messages, announce a capability on successful JOIN_ACK and gate sending through `app/src/windows/overlay/ws-client.ts`; absent capabilities mean an old bot.

4. Test invalid payloads, old-client/bot compatibility, authorization and routing; use isolated real WebSocket tests where state or membership matters.
