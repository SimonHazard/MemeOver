---
name: add-setting
description: Add a MemeOver display or machine preference with consistent schema migration, profiles, form and translations.
---

# add-setting

1. Read [AGENTS.md](../../../AGENTS.md), the requested behavior and current schema version; distinguish display preferences from machine preferences.

2. Update `app/src/shared/types.ts`: type, default and profile fields only for display preferences. Add a monotonic migration and compatibility test in `app/src/shared/settings.ts` and `settings.test.ts`.

3. Update `overlay-form/schema.ts` including `extractDefaults`, inspect `use-overlay-form.ts`, add the section control and app en/fr labels.

4. Wire the overlay consumer; validate profiles, migration, translation parity and relevant behavior, then run the repo gates.
