import { expect, setSystemTime, test } from "bun:test";
import { ALLOWED_MEDIA_HOSTS, isAllowedAndFresh } from "./allowlist";

// Characterization: pins the exact media-host allowlist and URL admission
// behavior before sourcing the CDN hosts from @memeover/shared.
// Expected values were captured from the implementation as it stands on main.

const EXPECTED_HOSTS = [
	"c.tenor.com",
	"cdn.discordapp.com",
	"giphy.com",
	"i.giphy.com",
	"i.imgur.com",
	"klipy.com",
	"media.discordapp.net",
	"media.giphy.com",
	"media.tenor.com",
	"media0.giphy.com",
	"media1.giphy.com",
	"media1.tenor.com",
	"media2.giphy.com",
	"media3.giphy.com",
	"media4.giphy.com",
	"static.klipy.com",
	"static1.klipy.com",
	"static2.klipy.com",
	"tenor.com",
];

test("allowlist contains exactly the expected hosts", () => {
	expect([...ALLOWED_MEDIA_HOSTS].sort()).toEqual(EXPECTED_HOSTS);
	expect(ALLOWED_MEDIA_HOSTS.size).toBe(19);
});

test("every allowlisted host admits a plain https media URL", () => {
	const now = new Date("2026-10-02T00:00:00Z");
	setSystemTime(now);
	for (const host of ALLOWED_MEDIA_HOSTS)
		expect(isAllowedAndFresh(`https://${host}/a.png`)).toBe(true);
	setSystemTime();
});

test("admission pins scheme, host normalization, credentials and ports", () => {
	const now = new Date("2026-10-02T00:00:00Z");
	setSystemTime(now);
	for (const [url, allowed] of [
		["HTTPS://CDN.DISCORDAPP.COM/a.png", true],
		["https://cdn.discordapp.com/a.png", true],
		["https://cdn.discordapp.com:443/a.png", true],
		["https://cdn.discordapp.com:8443/a.png", false],
		["http://cdn.discordapp.com/a.png", false],
		["https://user:pw@cdn.discordapp.com/a.png", true],
		["https://cdn.discordapp.com./a.png", false],
		["https://cdn.discordapp.com.evil.test/a.png", false],
		["https://tenor.com/a.gif", true],
		["https://media.tenor.com/a.gif", true],
		["not a url", false],
		["", false],
	] as const)
		expect(isAllowedAndFresh(url)).toBe(allowed);
	setSystemTime();
});
