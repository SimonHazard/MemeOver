import { DISCORD_SNOWFLAKE_REGEX } from "@memeover/shared";
import { BROWSER_SOURCE_HEARTBEAT_PREFIX, BROWSER_SOURCE_PATH } from "./browser-source-contract";
import { normalizeMutedAuthors } from "./muted-authors";
import {
	pickOverlayProfileSettings,
	pickStoredProfileSettings,
	resolveOverlayProfileSettings,
} from "./profiles";
import {
	DEFAULT_SETTINGS,
	MAX_BROWSER_SOURCE_PORT,
	MIN_BROWSER_SOURCE_PORT,
	type MutedAuthor,
	type OverlayProfile,
	type OverlayProfileSettings,
	type Settings,
} from "./types";

// ─── browser source URL ───────────────────────────────────────────────────
// The local server only serves public assets. Credentials, the display profile and the
// moderation filters travel in the fragment, which browsers never send in an HTTP request.

const MAX_TOKEN_LENGTH = 256;
const MIN_CLIENT_ID_LENGTH = 8;
const MAX_CLIENT_ID_LENGTH = 128;
const MASK = "••••••";
const MIN_REFERENCE_SIZE = 100;
const MAX_REFERENCE_SIZE = 20000;
const MIN_DISPLAY_SCALE = 0.25;
const MAX_DISPLAY_SCALE = 4;

export interface BrowserSourceConfig {
	guildId: string;
	token: string;
	wsUrl: string;
	/** The desktop install id, so the bot counts this page and the overlay once; null when absent. */
	clientId: string | null;
	/** Only the profile fields the link defines; null when absent or undecodable. */
	profile: Partial<OverlayProfileSettings> | null;
	mutedAuthors: MutedAuthor[];
	hideAnonymous: boolean;
	/** Short side of the desktop overlay in CSS pixels, to keep its proportions; null when absent. */
	referenceSize: number | null;
	/** The app's interface language, for the preview aids; null when absent. */
	language: BrowserSourceLanguage | null;
}

export type BrowserSourceLanguage = "en" | "fr";

interface BrowserSourceUrlInput {
	origin: string;
	guildId: string;
	token: string;
	wsUrl: string;
	clientId: string;
	profile: Partial<Settings> | OverlayProfileSettings;
	mutedAuthors: readonly MutedAuthor[];
	hideAnonymous: boolean;
	referenceSize: number | null;
	language: BrowserSourceLanguage;
}

export function isValidBrowserSourcePort(port: unknown): port is number {
	return (
		typeof port === "number" &&
		Number.isInteger(port) &&
		port >= MIN_BROWSER_SOURCE_PORT &&
		port <= MAX_BROWSER_SOURCE_PORT
	);
}

/** Loopback only: the plugin is bound to 127.0.0.1, never to the LAN. */
export function browserSourceOrigin(port: number): string {
	return `http://127.0.0.1:${port}`;
}

function encodeBase64Url(text: string): string {
	let binary = "";
	for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64Url(value: string): string {
	const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
	const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
	return new TextDecoder("utf-8", { fatal: true }).decode(
		Uint8Array.from(binary, (char) => char.charCodeAt(0)),
	);
}

/** Ids only: the page filters on them, and names and avatars would only add length. */
function filtersPayload(mutedAuthors: readonly MutedAuthor[], hideAnonymous: boolean) {
	return { m: mutedAuthors.map((author) => author.id), a: hideAnonymous };
}

export function buildBrowserSourceUrl({
	origin,
	guildId,
	token,
	wsUrl,
	clientId,
	profile,
	mutedAuthors,
	hideAnonymous,
	referenceSize,
	language,
}: BrowserSourceUrlInput) {
	const encodedProfile = encodeBase64Url(JSON.stringify(pickOverlayProfileSettings(profile)));
	const encodedFilters = encodeBase64Url(
		JSON.stringify(filtersPayload(mutedAuthors, hideAnonymous)),
	);
	const fragment = [
		["g", guildId],
		["t", token],
		["w", wsUrl],
		["c", clientId],
		["p", encodedProfile],
		["f", encodedFilters],
		...(referenceSize === null ? [] : [["r", String(referenceSize)]]),
		["l", language],
	]
		.map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
		.join("&");
	return `${origin}${BROWSER_SOURCE_PATH}#${fragment}`;
}

function isWebSocketUrl(value: string): boolean {
	try {
		const protocol = new URL(value).protocol;
		return protocol === "ws:" || protocol === "wss:";
	} catch {
		return false;
	}
}

function decodeProfile(value: string | null): Partial<OverlayProfileSettings> | null {
	if (!value) return null;
	try {
		const parsed: unknown = JSON.parse(decodeBase64Url(value));
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
		return pickStoredProfileSettings(parsed);
	} catch {
		return null;
	}
}

function decodeFilters(
	value: string | null,
): Pick<BrowserSourceConfig, "mutedAuthors" | "hideAnonymous"> {
	const none = { mutedAuthors: [], hideAnonymous: false };
	if (!value) return none;
	try {
		const parsed: unknown = JSON.parse(decodeBase64Url(value));
		if (!parsed || typeof parsed !== "object") return none;
		const { m, a } = parsed as { m?: unknown; a?: unknown };
		return {
			mutedAuthors: normalizeMutedAuthors(Array.isArray(m) ? m.map((id) => ({ id })) : []),
			hideAnonymous: a === true,
		};
	} catch {
		return none;
	}
}

function parseClientId(value: string | null): string | null {
	return value && value.length >= MIN_CLIENT_ID_LENGTH && value.length <= MAX_CLIENT_ID_LENGTH
		? value
		: null;
}

function parseReferenceSize(value: string | null): number | null {
	const size = Number(value);
	return value && size >= MIN_REFERENCE_SIZE && size <= MAX_REFERENCE_SIZE ? size : null;
}

function parseLanguage(value: string | null): BrowserSourceLanguage | null {
	return value === "en" || value === "fr" ? value : null;
}

/** Returns null when the link lacks valid credentials; unreadable optional parts are only ignored. */
export function parseBrowserSourceFragment(hash: string): BrowserSourceConfig | null {
	let params: URLSearchParams;
	try {
		params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
	} catch {
		return null;
	}
	const guildId = params.get("g") ?? "";
	const token = params.get("t") ?? "";
	const wsUrl = params.get("w") ?? "";
	if (!DISCORD_SNOWFLAKE_REGEX.test(guildId)) return null;
	if (token.length === 0 || token.length > MAX_TOKEN_LENGTH) return null;
	if (!isWebSocketUrl(wsUrl)) return null;
	return {
		guildId,
		token,
		wsUrl,
		clientId: parseClientId(params.get("c")),
		profile: decodeProfile(params.get("p")),
		...decodeFilters(params.get("f")),
		referenceSize: parseReferenceSize(params.get("r")),
		language: parseLanguage(params.get("l")),
	};
}

// ─── Live link between the app and loaded pages ───────────────────────────────
// A loaded page's only contact with the app is its liveness check. These values travel over an
// unauthenticated loopback server: author ids and commands only, never the link's credentials.

/** Enough for a burst of clicks while keeping the HTTP header bounded. */
export const SOURCE_COMMAND_LOG_LIMIT = 64;

export interface SourceControls {
	/** Changes each time the streamer skips the current item. */
	skip: number;
	/** Changes each time the streamer clears the queue. */
	clear: number;
	/** Ordered tail of actions: s = skip, c = clear. Absent on older headers. */
	commandLog?: string;
	mutedAuthors: MutedAuthor[];
	hideAnonymous: boolean;
}

export function encodeSourceControls({
	skip,
	clear,
	commandLog,
	mutedAuthors,
	hideAnonymous,
}: SourceControls): string {
	return encodeBase64Url(
		JSON.stringify({
			...filtersPayload(mutedAuthors, hideAnonymous),
			s: skip,
			c: clear,
			q: commandLog,
		}),
	);
}

/** Returns null for a missing or unreadable value: the page then keeps what it already applied. */
export function decodeSourceControls(value: string | null): SourceControls | null {
	if (!value) return null;
	try {
		const parsed: unknown = JSON.parse(decodeBase64Url(value));
		if (!parsed || typeof parsed !== "object") return null;
		const { s, c, q } = parsed as { s?: unknown; c?: unknown; q?: unknown };
		if (typeof s !== "number" || typeof c !== "number") return null;
		if (!Number.isSafeInteger(s) || !Number.isSafeInteger(c) || s < 0 || c < 0) return null;
		if (!Number.isSafeInteger(s + c)) return null;
		if (q !== undefined) {
			if (typeof q !== "string" || !/^[sc]*$/.test(q)) return null;
			if (q.length !== Math.min(s + c, SOURCE_COMMAND_LOG_LIMIT)) return null;
			const skips = [...q].filter((command) => command === "s").length;
			if (skips > s || q.length - skips > c) return null;
		}
		return { skip: s, clear: c, commandLog: q as string | undefined, ...decodeFilters(value) };
	} catch {
		return null;
	}
}

export function sourceHeartbeatQuery(soundBlocked: boolean, bot: string): string {
	const sound = soundBlocked ? "blocked" : "on";
	return `${BROWSER_SOURCE_HEARTBEAT_PREFIX}1&sound=${sound}&bot=${encodeURIComponent(bot)}`;
}

export interface SourceHeartbeat {
	ageMs: number;
	query: string;
}

export type SourceConnection =
	| "waiting"
	| "connected"
	| "soundBlocked"
	| "linkRefused"
	| "reconnecting";

/** Checks come every second: a few missed ones mean no page is running any more. */
const HEARTBEAT_STALE_MS = 5000;

/** What the Stream tab says about the page, from its latest report. */
export function sourceConnection(heartbeat: SourceHeartbeat | null): SourceConnection {
	if (!heartbeat || heartbeat.ageMs > HEARTBEAT_STALE_MS) return "waiting";
	const report = new URLSearchParams(heartbeat.query);
	const bot = report.get("bot");
	if (bot === "revoked" || bot === "rejected") return "linkRefused";
	if (bot !== "connected") return "reconnecting";
	return report.get("sound") === "blocked" ? "soundBlocked" : "connected";
}

// ─── Proportions ──────────────────────────────────────────────────────────────
// Media and reactions are sized in viewport units, so they already keep their share of the
// screen. Text, borders and spacing are not: 28 px is a bigger share of a 125 % desktop
// (1536 × 864) than of a 1920 × 1080 source. These two steps give them the same share.

/** How much bigger than on the desktop the fixed sizes must be drawn in a source of this size. */
export function browserSourceDisplayScale(
	referenceSize: number | null,
	width: number,
	height: number,
): number {
	const shortSide = Math.min(width, height);
	if (referenceSize === null || shortSide <= 0) return 1;
	return Math.min(MAX_DISPLAY_SCALE, Math.max(MIN_DISPLAY_SCALE, shortSide / referenceSize));
}

/** The display settings given in pixels. Spacing follows the root font size instead. */
export function scalePixelSettings(settings: Settings, scale: number): Settings {
	return {
		...settings,
		textSize: settings.textSize * scale,
		bgBorderWidth: settings.bgBorderWidth * scale,
		bgBorderRadius: settings.bgBorderRadius * scale,
		bgPadding: settings.bgPadding * scale,
	};
}

/** Keeps the origin and path so the user recognizes the link, hides everything after `#`. */
export function maskBrowserSourceUrl(url: string): string {
	const hashIndex = url.indexOf("#");
	return hashIndex === -1 ? url : `${url.slice(0, hashIndex)}#${MASK}`;
}

// ─── Stream tab decisions ─────────────────────────────────────────────────────

/** "current" embeds the live settings, "defaults" the factory display, otherwise a saved profile id. */
export type BrowserSourceProfileChoice = "current" | "defaults" | (string & {});

/** A saved profile only defines some fields: the rest come from the current settings. */
export function resolveBrowserSourceProfile(
	choice: BrowserSourceProfileChoice,
	settings: Settings,
	profiles: readonly OverlayProfile[],
): OverlayProfileSettings {
	if (choice === "defaults") return pickOverlayProfileSettings(DEFAULT_SETTINGS);
	const current = pickOverlayProfileSettings(settings);
	const saved = profiles.find((profile) => profile.id === choice);
	return saved ? resolveOverlayProfileSettings(saved.settings, current) : current;
}

/**
 * The plugin cannot stop or rebind: a server running this session only goes away,
 * or moves to a new port, after a restart.
 */
export function browserSourceNeedsRestart(
	runningPort: number | null,
	settings: Pick<Settings, "browserSourceEnabled" | "browserSourcePort">,
): boolean {
	if (runningPort === null) return false;
	return !settings.browserSourceEnabled || runningPort !== settings.browserSourcePort;
}
