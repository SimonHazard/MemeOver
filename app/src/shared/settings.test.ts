import { describe, expect, test } from "bun:test";
import { pickOverlayProfileSettings } from "./profiles";
import { normalizeSettings } from "./settings";
import { CURRENT_SCHEMA_VERSION, DEFAULT_SETTINGS, OVERLAY_PROFILE_FIELDS } from "./types";

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

for (const [name, saved, expected] of [
	["legacy text", { textSize: "lg" }, { textSize: 18 }],
	["unknown legacy text", { textSize: "nonsense" }, { textSize: DEFAULT_SETTINGS.textSize }],
	["text clamp", { textSize: 200 }, { textSize: 96 }],
	[
		"offset clamp",
		{ positionOffsetX: 50, positionOffsetY: -50 },
		{ positionOffsetX: 20, positionOffsetY: -20 },
	],
	["media scaling", { schemaVersion: 0, mediaSize: 40 }, { mediaSize: 60 }],
	["media scaling cap", { schemaVersion: 0, mediaSize: 80 }, { mediaSize: 90 }],
	[
		"localhost upgrade",
		{ schemaVersion: 1, wsUrl: "ws://localhost:3001/ws" },
		{ wsUrl: DEFAULT_SETTINGS.wsUrl, expertMode: false },
	],
	[
		"custom URL",
		{ schemaVersion: 1, wsUrl: "wss://custom.test/ws" },
		{ wsUrl: "wss://custom.test/ws", expertMode: true },
	],
	["empty URL", { schemaVersion: 1, wsUrl: "" }, { expertMode: false }],
	["reactions default", { schemaVersion: 2 }, { floatingReactionsEnabled: true }],
	[
		"reactions false retained",
		{ schemaVersion: 2, floatingReactionsEnabled: false },
		{ floatingReactionsEnabled: false },
	],
	[
		"preset fallback",
		{ floatingReactionPreset: "bad" },
		{ floatingReactionPreset: DEFAULT_SETTINGS.floatingReactionPreset },
	],
	[
		"reaction clamp low",
		{ floatingReactionDuration: -1, floatingReactionOpacity: 0, floatingReactionSize: 0 },
		{ floatingReactionDuration: 2, floatingReactionOpacity: 20, floatingReactionSize: 3 },
	],
	[
		"reaction clamp high",
		{ floatingReactionDuration: 99, floatingReactionOpacity: 999, floatingReactionSize: 99 },
		{ floatingReactionDuration: 10, floatingReactionOpacity: 100, floatingReactionSize: 12 },
	],
] as const)
	test(`migration ${name}`, () => expect(normalizeSettings(saved)).toMatchObject(expected));
test("client ID regenerated when short and preserved when valid", () => {
	const regenerated = normalizeSettings({ clientId: "short" }).clientId;
	expect(regenerated.length).toBeGreaterThanOrEqual(8);
	expect(regenerated).not.toBe("short");
	expect(normalizeSettings({ clientId: "12345678" }).clientId).toBe("12345678");
});
test("enabled types merge deeply", () =>
	expect(normalizeSettings({ enabledTypes: { image: false } }).enabledTypes).toEqual({
		...DEFAULT_SETTINGS.enabledTypes,
		image: false,
	}));
for (const value of [null, "garbage"])
	test(`invalid saved settings ${value}`, () => {
		const actual = normalizeSettings(value);
		expect(actual).toEqual({ ...DEFAULT_SETTINGS, clientId: actual.clientId });
		expect(actual.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
	});
