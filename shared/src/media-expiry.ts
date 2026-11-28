import { tryParseUrl } from "./url";

export const DISCORD_CDN_HOSTS: ReadonlySet<string> = new Set([
	"cdn.discordapp.com",
	"media.discordapp.net",
]);
export function isCdnUrlExpired(url: string, now: number = Date.now()): boolean {
	const parsed = tryParseUrl(url);
	if (!parsed) return false;
	const ex = parsed.searchParams.get("ex");
	if (!ex) return false;
	const seconds = Number.parseInt(ex, 16);
	return !Number.isNaN(seconds) && seconds * 1000 < now;
}
export function isDiscordCdnUrl(url: string): boolean {
	const parsed = tryParseUrl(url);
	return parsed !== null && DISCORD_CDN_HOSTS.has(parsed.hostname);
}
