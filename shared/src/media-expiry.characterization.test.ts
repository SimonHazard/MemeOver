import { expect, test } from "bun:test";
import { isCdnUrlExpired, isDiscordCdnUrl } from "./media-expiry";

// Characterization: pins the exact URL-parsing behavior behind the CDN expiry
// helpers before extracting a shared tryParseUrl helper.
// Expected values were captured from the implementation as it stands on main.

for (const [url, discord] of [
	["https://cdn.discordapp.com/a", true],
	["https://media.discordapp.net/a", true],
	["HTTPS://CDN.DISCORDAPP.COM/a", true],
	[" https://cdn.discordapp.com/a ", true],
	["https://user@cdn.discordapp.com/a", true],
	["https://cdn.discordapp.com./a", false],
	["https://cdn.discordapp.com.evil.test/a", false],
	["https://media.tenor.com/a", false],
	["http://cdn.discordapp.com/a", true],
	["not a url", false],
	["", false],
	["https://", false],
] as const)
	test(`isDiscordCdnUrl(${JSON.stringify(url)}) === ${discord}`, () =>
		expect(isDiscordCdnUrl(url)).toBe(discord));

for (const [url, expired] of [
	["https://cdn.discordapp.com/a?ex=3e7", true],
	["https://cdn.discordapp.com/a?ex=3e9", false],
	["https://cdn.discordapp.com/a", false],
	["https://cdn.discordapp.com/a?ex=xyz", false],
	["https://cdn.discordapp.com/a?ex=", false],
	["https://evil.test/a?ex=3e7", true],
	["not a url?ex=3e7", false],
] as const)
	test(`isCdnUrlExpired(${JSON.stringify(url)}) === ${expired}`, () =>
		expect(isCdnUrlExpired(url, 1000000)).toBe(expired));
