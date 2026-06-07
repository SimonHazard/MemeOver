import { describe, expect, test } from "bun:test";
import { pickOverlayProfileSettings } from "./profiles";
import { normalizeSettings } from "./settings";
import { CURRENT_SCHEMA_VERSION, OVERLAY_PROFILE_FIELDS } from "./types";

describe("settings normalization", () => {
	test("defaults bot/app sources to hidden during migration", () => {
		const settings = normalizeSettings({
			schemaVersion: 7,
			clientId: "client-123456",
		});

		expect(settings.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
		expect(settings.showBotAppSources).toBe(false);
	});

	test("preserves explicit bot/app source preference", () => {
		const settings = normalizeSettings({
			schemaVersion: CURRENT_SCHEMA_VERSION,
			clientId: "client-123456",
			showBotAppSources: true,
		});

		expect(settings.showBotAppSources).toBe(true);
	});

	test("includes bot/app source preference in overlay profiles", () => {
		const profileSettings = pickOverlayProfileSettings({
			showBotAppSources: true,
		});

		expect(OVERLAY_PROFILE_FIELDS.includes("showBotAppSources")).toBe(true);
		expect(profileSettings.showBotAppSources).toBe(true);
	});
});
