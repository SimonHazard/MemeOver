---
name: add-setting
description: Add a MemeOver display or machine preference with compatible persistence, the right profile scope and localized controls.
---

# Add a setting

1. Decide who owns the preference. A portable display choice belongs in `OVERLAY_PROFILE_FIELDS`; connection credentials, monitor selection, stream destination and desktop mute belong to the machine. See [playback destinations](../../../CONTEXT.md#playback-destinations).
2. For a new control, derive its default from today’s rendered behavior. If units or bounds are open, label your proposed values when asking for a design decision.
3. Add the type and default in `app/src/shared/types.ts`. Advance `CURRENT_SCHEMA_VERSION` for the new setting and migrate older data in `app/src/shared/settings-normalization.ts`. Cover an older saved configuration in `app/src/shared/settings.test.ts`. Keep native persistence in `settings.ts`.
4. For an overlay form field, update `app/src/windows/settings/components/overlay-form/schema.ts` and inspect `use-overlay-form.ts`. `extractDefaults` projects the profile fields. For a machine setting, follow the owning page’s persistence path. Add app en/fr labels and the consumer.
5. Exercise save/reload and the affected player. For a portable field check profile import/application, older partial profiles and any effect on **Current settings** versus a saved browser-source appearance. For a machine field check that applying or exporting a profile leaves it local.
