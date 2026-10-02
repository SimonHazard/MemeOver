import { expect, test } from "bun:test";
import {
	extractDefaults,
	OverlaySettingsSchema,
} from "../windows/settings/components/overlay-form/schema";
import { normalizeSettings } from "./settings";
import { DEFAULT_SETTINGS, OVERLAY_PROFILE_FIELDS } from "./types";

// Update Settings, defaults/profile fields, form schema and extractDefaults together.
test("all display settings agree across the four places", () => {
	const keys = [...OVERLAY_PROFILE_FIELDS].sort();
	expect(Object.keys(OverlaySettingsSchema.shape).sort()).toEqual(keys);
	expect(Object.keys(extractDefaults(DEFAULT_SETTINGS)).sort()).toEqual(keys);
	expect(OverlaySettingsSchema.safeParse(extractDefaults(DEFAULT_SETTINGS)).success).toBe(true);
	const settings = normalizeSettings({});
	for (const key of keys) expect(settings[key]).toBeDefined();
});
