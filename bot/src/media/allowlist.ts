/**
 * Hosts from which we accept media URLs. Any URL outside this set is dropped
 * before broadcast — same rule applies to user-pasted links AND to the upcoming
 * `/memeover secret` command, so this module owns the single source of truth.
 */
export const ALLOWED_MEDIA_HOSTS: ReadonlySet<string> = new Set([
	"cdn.discordapp.com",
	"media.discordapp.net",
	// Tenor (Google) — media1 subdomain also active
	"tenor.com",
	"media.tenor.com",
	"media1.tenor.com",
	"c.tenor.com",
	// Giphy (Shutterstock) — numbered subdomains media0–media4 for load balancing
	"giphy.com",
	"media.giphy.com",
	"media0.giphy.com",
	"media1.giphy.com",
	"media2.giphy.com",
	"media3.giphy.com",
	"media4.giphy.com",
	"i.imgur.com",
]);

/**
 * Returns true if the URL's host is in the allowlist AND, for Discord CDN URLs,
 * the `ex=` expiry param is still in the future (or absent).
 * Ref: https://discord.com/developers/docs/reference#cdn-formatting
 */
export function isAllowedAndFresh(url: string): boolean {
	try {
		const parsed = new URL(url);
		if (!ALLOWED_MEDIA_HOSTS.has(parsed.hostname)) return false;
		const ex = parsed.searchParams.get("ex");
		if (ex && parseInt(ex, 16) * 1_000 < Date.now()) return false;
		return true;
	} catch {
		return false;
	}
}

/**
 * Returns true if the Discord CDN URL has an `ex=` expiry param that is in the past.
 * Distinct from `isAllowedAndFresh` because attachment URLs are already validated
 * as coming from Discord — we only need the expiry check.
 */
export function isCdnUrlExpired(url: string): boolean {
	try {
		const ex = new URL(url).searchParams.get("ex");
		if (!ex) return false;
		return parseInt(ex, 16) * 1_000 < Date.now();
	} catch {
		return false;
	}
}
