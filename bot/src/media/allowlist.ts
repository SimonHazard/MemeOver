import { DISCORD_CDN_HOSTS, isCdnUrlExpired, MEDIA_CDN_HOSTS, tryParseUrl } from "@memeover/shared";

export { isCdnUrlExpired } from "@memeover/shared";

const BARE_MEDIA_DOMAINS = ["tenor.com", "giphy.com", "klipy.com"];

export const ALLOWED_MEDIA_HOSTS: ReadonlySet<string> = new Set([
	...DISCORD_CDN_HOSTS,
	...MEDIA_CDN_HOSTS,
	...BARE_MEDIA_DOMAINS,
]);

/** Host in allowlist AND (for Discord CDN URLs) the `ex=` expiry param is fresh.
 *  Ref: https://discord.com/developers/docs/reference#cdn-formatting */
export function isAllowedAndFresh(url: string): boolean {
	const parsed = tryParseUrl(url);
	if (!parsed) return false;
	if (parsed.protocol !== "https:" || parsed.port !== "") return false;
	if (!ALLOWED_MEDIA_HOSTS.has(parsed.hostname)) return false;
	if (isCdnUrlExpired(url)) return false;
	return true;
}
