import { describe, expect, test } from "bun:test";
import {
	browserSourceDisplayScale,
	browserSourceNeedsRestart,
	browserSourceOrigin,
	buildBrowserSourceUrl,
	maskBrowserSourceUrl,
	parseBrowserSourceFragment,
	resolveBrowserSourceProfile,
	scalePixelSettings,
} from "./browser-source";
import { isValidBrowserSourcePort } from "./browser-source-port";
import { pickOverlayProfileSettings } from "./profile-settings";
import { DEFAULT_SETTINGS, type OverlayProfile } from "./types";

const GUILD_ID = "123456789012345678";
const TOKEN = "s3cr3t+token/with=chars&more";
const WS_URL = "wss://bot.example.com/ws";
const CLIENT_ID = "desktop-install-id";
const NOW = 1_700_000_000_000;

function build(profile = DEFAULT_SETTINGS) {
	return buildBrowserSourceUrl({
		origin: browserSourceOrigin(4466),
		guildId: GUILD_ID,
		token: TOKEN,
		wsUrl: WS_URL,
		clientId: CLIENT_ID,
		profile,
		mutedAuthors: [],
		hideAnonymous: false,
		referenceSize: null,
		language: "fr",
	});
}

function hashOf(url: string) {
	return url.slice(url.indexOf("#"));
}

function fragmentWith(overrides: Record<string, string | null>) {
	const params = new URLSearchParams(hashOf(build()).slice(1));
	for (const [key, value] of Object.entries(overrides)) {
		if (value === null) params.delete(key);
		else params.set(key, value);
	}
	return `#${params.toString()}`;
}

describe("browser source URL", () => {
	test("round trips credentials and the display profile", () => {
		const profile = { ...DEFAULT_SETTINGS, volume: 25, position: "top-left" as const };
		const parsed = parseBrowserSourceFragment(hashOf(build(profile)));
		expect(parsed).toEqual({
			guildId: GUILD_ID,
			token: TOKEN,
			wsUrl: WS_URL,
			clientId: CLIENT_ID,
			profile: pickOverlayProfileSettings(profile),
			mutedAuthors: [],
			hideAnonymous: false,
			referenceSize: null,
			language: "fr",
		});
	});

	test("carries the moderation filters as ids, without names or avatars", () => {
		const url = buildBrowserSourceUrl({
			origin: browserSourceOrigin(4466),
			guildId: GUILD_ID,
			token: TOKEN,
			wsUrl: WS_URL,
			clientId: CLIENT_ID,
			profile: DEFAULT_SETTINGS,
			mutedAuthors: [{ id: "111", username: "Troll", avatarUrl: "https://a.test/x", mutedAt: NOW }],
			hideAnonymous: true,
			referenceSize: null,
			language: "en",
		});
		const parsed = parseBrowserSourceFragment(hashOf(url));
		expect(parsed?.mutedAuthors.map((author) => author.id)).toEqual(["111"]);
		expect(parsed?.mutedAuthors[0]?.username).toBe("");
		expect(parsed?.hideAnonymous).toBe(true);
		expect(atob(new URLSearchParams(hashOf(url).slice(1)).get("f") ?? "")).not.toContain("Troll");
	});

	test("unreadable or tampered filters are ignored, not fatal", () => {
		for (const f of ["%%%", "bm90IGpzb24", null]) {
			const parsed = parseBrowserSourceFragment(fragmentWith({ f }));
			expect(parsed?.token).toBe(TOKEN);
			expect(parsed?.mutedAuthors).toEqual([]);
			expect(parsed?.hideAnonymous).toBe(false);
		}
		const tampered = btoa(JSON.stringify({ m: ["222", 5, null], a: "yes" })).replace(/=+$/, "");
		const parsed = parseBrowserSourceFragment(fragmentWith({ f: tampered }));
		expect(parsed?.mutedAuthors.map((author) => author.id)).toEqual(["222"]);
		expect(parsed?.hideAnonymous).toBe(false);
	});

	test("ignores a client id the bot's protocol would refuse", () => {
		for (const c of ["short", "x".repeat(129), null]) {
			expect(parseBrowserSourceFragment(fragmentWith({ c }))?.clientId).toBeNull();
		}
	});

	test("reads the desktop's size and ignores an unusable one", () => {
		expect(parseBrowserSourceFragment(fragmentWith({ r: "864" }))?.referenceSize).toBe(864);
		for (const r of ["0", "-864", "99", "20001", "abc", "", null]) {
			expect(parseBrowserSourceFragment(fragmentWith({ r }))?.referenceSize).toBeNull();
		}
	});

	test("carries the app language and ignores an unsupported one", () => {
		expect(parseBrowserSourceFragment(fragmentWith({ l: "en" }))?.language).toBe("en");
		for (const l of ["de", "EN", "", null]) {
			expect(parseBrowserSourceFragment(fragmentWith({ l }))?.language).toBeNull();
		}
	});

	test("draws fixed sizes bigger only when the source is bigger than the desktop", () => {
		expect(browserSourceDisplayScale(864, 1920, 1080)).toBe(1.25);
		expect(browserSourceDisplayScale(1440, 1920, 1080)).toBe(0.75);
		expect(browserSourceDisplayScale(1080, 1920, 1080)).toBe(1);
		// Portrait sources compare their short side too.
		expect(browserSourceDisplayScale(864, 1080, 1920)).toBe(1.25);
		// An older link, or a source that has no size yet, keeps the sizes as they are.
		expect(browserSourceDisplayScale(null, 1920, 1080)).toBe(1);
		expect(browserSourceDisplayScale(864, 0, 0)).toBe(1);
		// A tiny preview tab stays usable.
		expect(browserSourceDisplayScale(4000, 100, 100)).toBe(0.25);
	});

	test("scales only the settings given in pixels", () => {
		const scaled = scalePixelSettings(
			{
				...DEFAULT_SETTINGS,
				textSize: 28,
				bgBorderWidth: 4,
				bgBorderRadius: 12,
				bgPadding: 8,
			},
			1.25,
		);
		expect(scaled).toMatchObject({
			textSize: 35,
			bgBorderWidth: 5,
			bgBorderRadius: 15,
			bgPadding: 10,
			mediaSize: DEFAULT_SETTINGS.mediaSize,
			floatingReactionSize: DEFAULT_SETTINGS.floatingReactionSize,
			positionOffsetX: DEFAULT_SETTINGS.positionOffsetX,
		});
	});

	test("serves the page from loopback and carries the token only after #", () => {
		const url = build();
		expect(url.startsWith("http://127.0.0.1:4466/browser-source.html#")).toBe(true);
		const beforeHash = url.slice(0, url.indexOf("#"));
		expect(beforeHash).not.toContain(encodeURIComponent(TOKEN));
		expect(beforeHash).not.toContain(GUILD_ID);
		expect(new URL(url).search).toBe("");
	});

	test("never embeds machine preferences or credentials in the profile", () => {
		const url = build({ ...DEFAULT_SETTINGS, token: TOKEN, browserSourcePort: 5000 });
		const profile = parseBrowserSourceFragment(hashOf(url))?.profile as Record<string, unknown>;
		for (const key of [
			"token",
			"guildId",
			"wsUrl",
			"browserSourcePort",
			"mutedAuthors",
			"clientId",
		]) {
			expect(key in profile).toBe(false);
		}
	});

	test("strips tampered and unknown profile keys", () => {
		const tampered = btoa(JSON.stringify({ volume: 500, evil: "x", token: "stolen" }))
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=+$/, "");
		const parsed = parseBrowserSourceFragment(fragmentWith({ p: tampered }));
		expect(parsed?.profile).toEqual({ volume: 100 });
	});

	test("an undecodable profile is ignored, not fatal", () => {
		for (const p of ["%%%", "bm90IGpzb24", "WzEsMl0", null]) {
			const parsed = parseBrowserSourceFragment(fragmentWith({ p }));
			expect(parsed?.token).toBe(TOKEN);
			expect(parsed?.profile).toBeNull();
		}
	});

	test("rejects missing or invalid credentials", () => {
		const invalid: Record<string, string | null>[] = [
			{ g: null },
			{ t: null },
			{ w: null },
			{ g: "not-a-snowflake" },
			{ t: "" },
			{ t: "x".repeat(257) },
			{ w: "https://bot.example.com/ws" },
			{ w: "javascript:alert(1)" },
			{ w: "not a url" },
		];
		for (const overrides of invalid) {
			expect(parseBrowserSourceFragment(fragmentWith(overrides))).toBeNull();
		}
		expect(parseBrowserSourceFragment("")).toBeNull();
		expect(parseBrowserSourceFragment(fragmentWith({ w: "ws://localhost:3001/ws" }))?.wsUrl).toBe(
			"ws://localhost:3001/ws",
		);
	});

	test("masking hides the fragment", () => {
		const masked = maskBrowserSourceUrl(build());
		expect(masked).toBe("http://127.0.0.1:4466/browser-source.html#••••••");
		expect(masked).not.toContain("s3cr3t");
		expect(maskBrowserSourceUrl("http://127.0.0.1:4466/browser-source.html")).toBe(
			"http://127.0.0.1:4466/browser-source.html",
		);
	});

	test("port bounds", () => {
		for (const port of [1024, 4466, 65535]) expect(isValidBrowserSourcePort(port)).toBe(true);
		for (const port of [0, 80, 1023, 65536, 4466.5, Number.NaN, "4466"]) {
			expect(isValidBrowserSourcePort(port)).toBe(false);
		}
	});
});

describe("Stream tab decisions", () => {
	const settings = { ...DEFAULT_SETTINGS, volume: 30, position: "top-left" as const };
	const profile: OverlayProfile = {
		id: "stream",
		name: "Stream",
		settings: { volume: 90 },
		createdAt: 0,
		updatedAt: 0,
	};

	test("the embedded profile follows the selected source", () => {
		expect(resolveBrowserSourceProfile("current", settings, [profile])).toMatchObject({
			volume: 30,
			position: "top-left",
		});
		expect(resolveBrowserSourceProfile("defaults", settings, [profile])).toMatchObject({
			volume: DEFAULT_SETTINGS.volume,
			position: DEFAULT_SETTINGS.position,
		});
		// Fields a saved profile does not define keep the current values.
		expect(resolveBrowserSourceProfile("stream", settings, [profile])).toMatchObject({
			volume: 90,
			position: "top-left",
		});
		expect(resolveBrowserSourceProfile("deleted", settings, [profile])).toMatchObject({
			volume: 30,
		});
	});

	test("a running server only stops or moves after a restart", () => {
		const on = { browserSourceEnabled: true, browserSourcePort: 4466 };
		expect(browserSourceNeedsRestart(null, on)).toBe(false);
		expect(browserSourceNeedsRestart(null, { ...on, browserSourceEnabled: false })).toBe(false);
		expect(browserSourceNeedsRestart(4466, on)).toBe(false);
		expect(browserSourceNeedsRestart(4466, { ...on, browserSourceEnabled: false })).toBe(true);
		expect(browserSourceNeedsRestart(4466, { ...on, browserSourcePort: 5000 })).toBe(true);
	});
});
