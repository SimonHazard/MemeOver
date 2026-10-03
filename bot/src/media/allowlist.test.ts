import { afterEach, expect, setSystemTime, test } from "bun:test";
import { isAllowedAndFresh, isCdnUrlExpired } from "./allowlist";

afterEach(() => setSystemTime());
const now = new Date("2026-10-02T00:00:00Z");
const expiry = (delta: number) => (now.getTime() / 1000 + delta).toString(16);
for (const [name, url, allowed, expired] of [
	["fresh", `https://cdn.discordapp.com/a.png?ex=${expiry(60)}`, true, false],
	["expired", `https://cdn.discordapp.com/a.png?ex=${expiry(-60)}`, false, true],
	["no expiry", "https://cdn.discordapp.com/a.png", true, false],
	// characterization: expiry has no host check.
	["unknown expired host", `https://evil.test/a.png?ex=${expiry(-60)}`, false, true],
	["unknown host", "https://evil.test/a.png", false, false],
	["invalid", "not a url", false, false],
] as const) {
	test(`CDN ${name}`, () => {
		setSystemTime(now);
		expect(isAllowedAndFresh(url)).toBe(allowed);
		expect(isCdnUrlExpired(url)).toBe(expired);
	});
}
