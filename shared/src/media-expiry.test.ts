import { expect, test } from "bun:test";
import { isCdnUrlExpired, isDiscordCdnUrl } from "./media-expiry";

for (const [url, expired] of [
	["https://cdn.discordapp.com/a?ex=3e7", true],
	["https://cdn.discordapp.com/a?ex=3e9", false],
	["https://cdn.discordapp.com/a?ex=3e8", false],
	["https://cdn.discordapp.com/a", false],
	["invalid", false],
	["https://cdn.discordapp.com/a?ex=xyz", false],
] as const)
	test(`expiry ${url}`, () => expect(isCdnUrlExpired(url, 1000000)).toBe(expired));
for (const [url, discord] of [
	["https://cdn.discordapp.com/a", true],
	["https://media.discordapp.net/a", true],
	["https://media.tenor.com/a", false],
	["bad", false],
] as const)
	test(`host ${url}`, () => expect(isDiscordCdnUrl(url)).toBe(discord));
