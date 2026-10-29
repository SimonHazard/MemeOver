import { describe, expect, test } from "bun:test";
import { pickOverlayProfileSettings } from "./profiles";
import { normalizeSettings } from "./settings";
import {
	CONNECTION_NOTIFICATION_POSITIONS,
	CURRENT_SCHEMA_VERSION,
	DEFAULT_SETTINGS,
	OVERLAY_PROFILE_FIELDS,
} from "./types";

test("connection notifications migrate on, preserve opt out and validate all four corners", () => {
	expect(normalizeSettings({ schemaVersion: 12 })).toMatchObject({
		schemaVersion: CURRENT_SCHEMA_VERSION,
		connectionNotificationsEnabled: true,
		connectionNotificationPosition: "bottom-right",
	});
	for (const position of CONNECTION_NOTIFICATION_POSITIONS) {
		expect(
			normalizeSettings({
				connectionNotificationsEnabled: false,
				connectionNotificationPosition: position,
			}),
		).toMatchObject({
			connectionNotificationsEnabled: false,
			connectionNotificationPosition: position,
		});
	}
	for (const position of ["top-center", "center", null, 42]) {
		expect(
			normalizeSettings({
				connectionNotificationsEnabled: "false",
				connectionNotificationPosition: position,
			}),
		).toMatchObject({
			connectionNotificationsEnabled: true,
			connectionNotificationPosition: "bottom-right",
		});
	}
	expect(
		pickOverlayProfileSettings({
			connectionNotificationsEnabled: false,
			connectionNotificationPosition: "top-left",
		}),
	).toMatchObject({
		connectionNotificationsEnabled: false,
		connectionNotificationPosition: "top-left",
	});
});

test("connection notification duration migrates to four seconds and validates saved values", () => {
	expect(normalizeSettings({ schemaVersion: 13 })).toMatchObject({
		schemaVersion: CURRENT_SCHEMA_VERSION,
		connectionNotificationDuration: 4,
	});
	for (const [saved, expected] of [
		[1, 1],
		[30, 30],
		[8, 8],
		[0, 1],
		[-5, 1],
		[60, 30],
		[6.6, 7],
		[null, 4],
		["8", 4],
		[Number.NaN, 4],
		[Number.POSITIVE_INFINITY, 4],
	] as const) {
		expect(
			normalizeSettings({ connectionNotificationDuration: saved }).connectionNotificationDuration,
		).toBe(expected);
	}
});

describe("settings normalization", () => {
	test("clamps hand-edited display settings without advancing the schema", () => {
		expect(
			normalizeSettings({
				schemaVersion: CURRENT_SCHEMA_VERSION,
				mediaSize: 500,
				volume: -3,
				bgBorderRadius: 50,
				textColor: "red",
			}),
		).toMatchObject({
			mediaSize: 90,
			volume: 0,
			bgBorderRadius: 30,
			textColor: DEFAULT_SETTINGS.textColor,
			schemaVersion: CURRENT_SCHEMA_VERSION,
		});
	});

	for (const [field, min, max] of [
		["mediaSize", 10, 90],
		["duration", 1, 30],
		["volume", 0, 100],
		["positionOffsetX", -20, 20],
		["positionOffsetY", -20, 20],
		["textSize", 12, 96],
		["mediaOpacity", 0, 100],
		["bgOpacity", 0, 100],
		["bgBorderOpacity", 0, 100],
		["bgBorderWidth", 0, 20],
		["bgBorderRadius", 0, 30],
		["bgPadding", 0, 100],
	] as const) {
		test(`${field} respects bounds and falls back for invalid numbers`, () => {
			const saved = { schemaVersion: CURRENT_SCHEMA_VERSION };
			for (const [value, expected] of [
				[min - 1, min],
				[max + 1, max],
				[min, min],
				[max, max],
			]) {
				expect(normalizeSettings({ ...saved, [field]: value })[field]).toBe(expected);
			}
			for (const value of [null, "invalid", Number.NaN, Infinity, -Infinity]) {
				expect(normalizeSettings({ ...saved, [field]: value })[field]).toBe(
					DEFAULT_SETTINGS[field],
				);
			}
		});
	}

	for (const field of ["bgColor", "bgBorderColor", "textColor"] as const) {
		test(`${field} accepts six-digit hex colours only`, () => {
			for (const value of ["#aB12Ef", "#000000", "#FFFFFF"]) {
				expect(normalizeSettings({ [field]: value })[field]).toBe(value);
			}
			for (const value of ["red", "#fff", "#12345678", "#gg0000", "123456", null, 42]) {
				expect(normalizeSettings({ [field]: value })[field]).toBe(DEFAULT_SETTINGS[field]);
			}
		});
	}

	test("preserves valid display values and normalization is idempotent", () => {
		const saved = {
			...DEFAULT_SETTINGS,
			clientId: "client-123456",
			mediaSize: 55,
			volume: 40,
			positionOffsetX: -8,
			bgBorderRadius: 12,
			textColor: "#aB12Ef",
		};
		expect(normalizeSettings(saved)).toEqual(saved);
		expect(normalizeSettings(normalizeSettings(saved))).toEqual(saved);
		for (const mediaSize of [NaN, Infinity, -Infinity]) {
			expect(normalizeSettings({ schemaVersion: 0, mediaSize }).mediaSize).toBe(
				DEFAULT_SETTINGS.mediaSize,
			);
		}
	});

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

test("history auto purge migration and opt out", () => {
	expect(normalizeSettings({ schemaVersion: 8 }).historyAutoPurge).toBe(true);
	expect(normalizeSettings({ historyAutoPurge: false }).historyAutoPurge).toBe(false);
	expect(normalizeSettings({ schemaVersion: 8 }).schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
	expect(OVERLAY_PROFILE_FIELDS as readonly string[]).not.toContain("historyAutoPurge");
});

test("auto update migration and opt out", () => {
	expect(normalizeSettings({ schemaVersion: 11 }).autoUpdate).toBe(true);
	expect(normalizeSettings({ schemaVersion: 11, autoUpdate: false }).autoUpdate).toBe(false);
	expect(normalizeSettings({ autoUpdate: "yes" }).autoUpdate).toBe(true);
	expect(OVERLAY_PROFILE_FIELDS as readonly string[]).not.toContain("autoUpdate");
});

test("per author cap migrates and belongs to profiles", () => {
	expect(normalizeSettings({ schemaVersion: 9 }).maxQueuedPerAuthor).toBe(3);
	expect(normalizeSettings({ maxQueuedPerAuthor: -5 }).maxQueuedPerAuthor).toBe(0);
	expect(normalizeSettings({ maxQueuedPerAuthor: 25 }).maxQueuedPerAuthor).toBe(10);
	expect(normalizeSettings({ maxQueuedPerAuthor: 2.6 }).maxQueuedPerAuthor).toBe(3);
	expect(pickOverlayProfileSettings({}).maxQueuedPerAuthor).toBe(3);
	expect(OVERLAY_PROFILE_FIELDS).toContain("maxQueuedPerAuthor");
});

test("local mute migration sanitizes and stays outside profiles", () => {
	expect(normalizeSettings({}).mutedAuthors).toEqual([]);
	expect(normalizeSettings({}).hideAnonymous).toBe(false);
	const settings = normalizeSettings({
		mutedAuthors: [null, {}, { id: "a", username: 1 }, { id: "a", username: "A", mutedAt: 3 }],
	});
	expect(settings.mutedAuthors).toEqual([{ id: "a", username: "A", avatarUrl: "", mutedAt: 3 }]);
	expect(OVERLAY_PROFILE_FIELDS as readonly string[]).not.toContain("mutedAuthors");
	expect(OVERLAY_PROFILE_FIELDS as readonly string[]).not.toContain("hideAnonymous");
});
