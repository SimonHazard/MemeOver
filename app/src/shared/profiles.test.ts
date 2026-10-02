import { expect, test } from "bun:test";
import {
	parseOverlayProfileImport,
	pickOverlayProfileSettings,
	serializeOverlayProfile,
} from "./profiles";
import { CURRENT_SCHEMA_VERSION, DEFAULT_SETTINGS, OVERLAY_PROFILE_FIELDS } from "./types";

const settings = pickOverlayProfileSettings(DEFAULT_SETTINGS);
const profile = { id: "test", name: "Demo", settings, createdAt: 1, updatedAt: 1 };
test("profile export envelope, fields and roundtrip", () => {
	const text = serializeOverlayProfile(profile);
	expect(text.endsWith("\n")).toBe(true);
	expect(JSON.parse(text)).toEqual({
		app: "MemeOver",
		schemaVersion: 1,
		settingsSchemaVersion: CURRENT_SCHEMA_VERSION,
		profile: { name: "Demo", settings },
	});
	expect(Object.keys(JSON.parse(text).profile.settings).sort()).toEqual(
		[...OVERLAY_PROFILE_FIELDS].sort(),
	);
	expect(parseOverlayProfileImport(text)).toMatchObject({ name: "Demo", settings });
});
for (const shape of [
	{ profile: { name: "Demo", settings } },
	{ name: "Demo", settings },
	{ name: "Demo", ...settings },
])
	test(`import shape ${Object.keys(shape).join()}`, () =>
		expect(parseOverlayProfileImport(JSON.stringify(shape))).toMatchObject({
			name: "Demo",
			settings,
		}));
test("profile names trim and truncate", () =>
	expect(
		parseOverlayProfileImport(JSON.stringify({ name: `  ${"a".repeat(60)}  `, settings })).name,
	).toBe("a".repeat(48)));
test("empty profile name rejected", () =>
	expect(() => parseOverlayProfileImport(JSON.stringify({ name: "  ", settings }))).toThrow(
		"Missing profile name",
	));
test("non-object settings rejected", () =>
	expect(() => parseOverlayProfileImport(JSON.stringify({ name: "x", settings: 5 }))).toThrow(
		"Missing profile settings",
	));
test("non JSON rejected", () => expect(() => parseOverlayProfileImport("not json")).toThrow());
