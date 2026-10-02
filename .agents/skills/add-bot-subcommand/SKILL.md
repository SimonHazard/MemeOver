---
name: add-bot-subcommand
description: Add or change a MemeOver Discord subcommand with permissions, localized help and documented behavior.
---

# add-bot-subcommand

1. Read [AGENTS.md](../../../AGENTS.md) and inspect `bot/src/commands/commands.ts`.

2. Implement the subcommand in `bot/src/commands/subcommands/`, register its builder and dispatch, and add it to `PRIVILEGED_SUBS` only when ManageGuild is required.

3. Add English/French strings in `bot/src/i18n.ts`; update help and both README command tables. Update site command content if present.

4. Test permitted and denied interactions, guild-only behavior and effects. Do not publish Discord commands or contact real users without authorization.
