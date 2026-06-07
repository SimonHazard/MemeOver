import { DISCORD_SNOWFLAKE_REGEX, DISCORD_SNOWFLAKE_SEARCH_REGEX } from "./protocol";

export interface ParsedConnectionCode {
	guildId: string;
	token: string;
	wsUrl?: string;
}

export interface BuildConnectionCodeOptions {
	guildId: string;
	token: string;
	wsUrl: string;
}

const TOKEN_RE = /(?:token|jeton)\s*[:=]\s*([A-Za-z0-9._~-]{16,})/i;
const TOKEN_FALLBACK_RE = /^[A-Za-z0-9._~-]{16,}$/;

function stripCodeFence(raw: string): string {
	return raw
		.trim()
		.replace(/^```[a-z]*\s*/i, "")
		.replace(/\s*```$/i, "")
		.trim();
}

function parseSetupUrl(raw: string): ParsedConnectionCode | null {
	try {
		const url = new URL(raw);
		if (url.protocol !== "memeover:") return null;
		const action = url.hostname || url.pathname.replace(/^\/+/, "");
		if (action !== "setup") return null;

		const guildId = url.searchParams.get("guild_id") ?? url.searchParams.get("guildId");
		const token = url.searchParams.get("token");
		const wsUrl = url.searchParams.get("ws_url") ?? url.searchParams.get("wsUrl") ?? undefined;
		if (!guildId || !token || !DISCORD_SNOWFLAKE_REGEX.test(guildId)) return null;

		return { guildId, token, wsUrl };
	} catch {
		return null;
	}
}

function parseJson(raw: string): ParsedConnectionCode | null {
	try {
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		const guildId = parsed.guild_id ?? parsed.guildId ?? parsed.server_id ?? parsed.serverId;
		const token = parsed.token;
		const wsUrl = parsed.ws_url ?? parsed.wsUrl;

		if (typeof guildId !== "string" || typeof token !== "string") return null;
		if (!DISCORD_SNOWFLAKE_REGEX.test(guildId)) return null;

		return {
			guildId,
			token,
			wsUrl: typeof wsUrl === "string" ? wsUrl : undefined,
		};
	} catch {
		return null;
	}
}

export function buildConnectionCode({ guildId, token, wsUrl }: BuildConnectionCodeOptions): string {
	const params = new URLSearchParams({
		guild_id: guildId,
		token,
		ws_url: wsUrl,
	});
	return `memeover://setup?${params.toString()}`;
}

export function parseConnectionCode(raw: string): ParsedConnectionCode | null {
	const value = stripCodeFence(raw);
	if (!value) return null;

	const parsedUrl = parseSetupUrl(value);
	if (parsedUrl) return parsedUrl;

	const parsedJson = parseJson(value);
	if (parsedJson) return parsedJson;

	const guildId = value.match(DISCORD_SNOWFLAKE_SEARCH_REGEX)?.[0];
	const namedToken = value.match(TOKEN_RE)?.[1];
	const fallbackToken = value
		.split(/\s+/)
		.find((part) => part !== guildId && TOKEN_FALLBACK_RE.test(part));
	const token = namedToken ?? fallbackToken;

	if (!guildId || !token) return null;
	return { guildId, token };
}
