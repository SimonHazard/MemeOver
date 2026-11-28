import { afterEach, expect, setSystemTime, test } from "bun:test";
import {
	normalizeProfile,
	parseOverlayProfileImport,
	pickOverlayProfileSettings,
} from "./profile-settings";
import { DEFAULT_SETTINGS } from "./types";

// Characterization: pins the exact current behavior of profile-name sanitization
// and import parsing before extracting a shared sanitizeProfileName helper.
// Expected values were captured from the implementation as it stands on main.

const settings = pickOverlayProfileSettings(DEFAULT_SETTINGS);
const FIXED_NOW = new Date("2026-11-27T12:00:00Z").getTime();

afterEach(() => setSystemTime());

test("normalizeProfile keeps a valid id and timestamps", () => {
	setSystemTime(FIXED_NOW);
	const profile = normalizeProfile({
		id: "keep-me",
		name: "Demo",
		settings,
		createdAt: 1,
		updatedAt: 2,
	});
	expect(profile).toEqual({
		id: "keep-me",
		name: "Demo",
		settings,
		createdAt: 1,
		updatedAt: 2,
	});
});

test("normalizeProfile generates an id and timestamps when missing or invalid", () => {
	setSystemTime(FIXED_NOW);
	for (const raw of [
		{ name: "Demo", settings },
		{ id: "", name: "Demo", settings },
		{ id: 42, name: "Demo", settings, createdAt: "x", updatedAt: null },
	]) {
		const profile = normalizeProfile(raw);
		expect(profile).not.toBeNull();
		expect(profile?.id).toMatch(/^[0-9a-f-]{36}$/);
		expect(profile?.createdAt).toBe(FIXED_NOW);
		expect(profile?.updatedAt).toBe(FIXED_NOW);
	}
});

test("normalizeProfile rejects non-records, missing names and non-record settings", () => {
	for (const raw of [
		null,
		"x",
		42,
		[],
		{},
		{ name: 5, settings },
		{ name: "   ", settings },
		{ name: "", settings },
		{ name: "Demo" },
		{ name: "Demo", settings: "nope" },
	])
		expect(normalizeProfile(raw)).toBeNull();
});

test("normalizeProfile trims and truncates names to 48 UTF-16 units", () => {
	const base = { settings };
	expect(normalizeProfile({ ...base, name: "  Demo  " })?.name).toBe("Demo");
	expect(normalizeProfile({ ...base, name: "a".repeat(48) })?.name).toBe("a".repeat(48));
	expect(normalizeProfile({ ...base, name: `  ${"a".repeat(60)}  ` })?.name).toBe("a".repeat(48));
	// Emoji count as two UTF-16 code units: 30 emoji (60 units) truncate to 24 (48 units).
	expect(normalizeProfile({ ...base, name: "🎉".repeat(30) })?.name).toBe("🎉".repeat(24));
	// Inner whitespace is preserved, only the edges are trimmed.
	expect(normalizeProfile({ ...base, name: " a  b " })?.name).toBe("a  b");
});

test("parseOverlayProfileImport accepts the three export shapes", () => {
	setSystemTime(FIXED_NOW);
	for (const shape of [
		{ profile: { name: "Demo", settings } },
		{ name: "Demo", settings },
		{ name: "Demo", ...settings },
	]) {
		const profile = parseOverlayProfileImport(JSON.stringify(shape));
		expect(profile).toEqual({
			id: profile.id,
			name: "Demo",
			settings,
			createdAt: FIXED_NOW,
			updatedAt: FIXED_NOW,
		});
		expect(profile.id).toMatch(/^[0-9a-f-]{36}$/);
	}
});

test("parseOverlayProfileImport trims and truncates names to 48 UTF-16 units", () => {
	expect(
		parseOverlayProfileImport(JSON.stringify({ name: `  ${"a".repeat(60)}  `, settings })).name,
	).toBe("a".repeat(48));
	expect(parseOverlayProfileImport(JSON.stringify({ name: "🎉".repeat(30), settings })).name).toBe(
		"🎉".repeat(24),
	);
	expect(parseOverlayProfileImport(JSON.stringify({ name: " a  b ", settings })).name).toBe("a  b");
});

test("parseOverlayProfileImport rejects empty names, missing settings and invalid JSON", () => {
	for (const shape of [
		{ name: "   ", settings },
		{ name: "", settings },
		{ settings },
		{ name: "Demo", settings: 5 },
		{ profile: { name: "Demo", settings: null } },
	])
		expect(() => parseOverlayProfileImport(JSON.stringify(shape))).toThrow();
	expect(() => parseOverlayProfileImport(JSON.stringify({ name: "  ", settings }))).toThrow(
		"Missing profile name",
	);
	expect(() => parseOverlayProfileImport(JSON.stringify({ name: "x", settings: 5 }))).toThrow(
		"Missing profile settings",
	);
	expect(() => parseOverlayProfileImport("not json")).toThrow();
});
