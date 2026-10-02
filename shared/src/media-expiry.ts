export const DISCORD_CDN_HOSTS: ReadonlySet<string> = new Set([
	"cdn.discordapp.com",
	"media.discordapp.net",
]);
export function isCdnUrlExpired(url: string, now: number = Date.now()): boolean {
	try {
		const ex = new URL(url).searchParams.get("ex");
		if (!ex) return false;
		const seconds = Number.parseInt(ex, 16);
		return !Number.isNaN(seconds) && seconds * 1000 < now;
	} catch {
		return false;
	}
}
export function isDiscordCdnUrl(url: string): boolean {
	try {
		return DISCORD_CDN_HOSTS.has(new URL(url).hostname);
	} catch {
		return false;
	}
}
