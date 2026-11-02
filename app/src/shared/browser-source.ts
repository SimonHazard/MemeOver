import { DISCORD_SNOWFLAKE_REGEX } from "@memeover/shared";
import {
	pickOverlayProfileSettings,
	pickStoredProfileSettings,
	resolveOverlayProfileSettings,
} from "./profiles";
import {
	DEFAULT_SETTINGS,
	MAX_BROWSER_SOURCE_PORT,
	MIN_BROWSER_SOURCE_PORT,
	type OverlayProfile,
	type OverlayProfileSettings,
	type Settings,
} from "./types";

// ─── browser source URL ───────────────────────────────────────────────────
// The local server only serves public assets. Credentials and the display profile
// travel in the fragment, which browsers never send in an HTTP request.

export const BROWSER_SOURCE_PATH = "/browser-source.html";
const MAX_TOKEN_LENGTH = 256;
const MASK = "••••••";

export interface BrowserSourceConfig {
	guildId: string;
	token: string;
	wsUrl: string;
	/** Only the profile fields the link defines; null when absent or undecodable. */
	profile: Partial<OverlayProfileSettings> | null;
}

interface BrowserSourceUrlInput {
	origin: string;
	guildId: string;
	token: string;
	wsUrl: string;
	profile: Partial<Settings> | OverlayProfileSettings;
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

export function buildBrowserSourceUrl({
	origin,
	guildId,
	token,
	wsUrl,
	profile,
}: BrowserSourceUrlInput) {
	const encodedProfile = encodeBase64Url(JSON.stringify(pickOverlayProfileSettings(profile)));
	const fragment = [
		["g", guildId],
		["t", token],
		["w", wsUrl],
		["p", encodedProfile],
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

/** Returns null when the link lacks valid credentials; an unreadable profile is only ignored. */
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
	return { guildId, token, wsUrl, profile: decodeProfile(params.get("p")) };
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
