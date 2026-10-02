import { expect, test } from "bun:test";
import { discordRefLogFields, logHash, mediaUrlLogFields } from "./log-privacy";

test("stable truncated SHA256", () => {
	expect(logHash("abc")).toBe("ba7816bf8f01");
});
for (const value of ["", null, undefined])
	test(`empty hash ${value}`, () => expect(logHash(value)).toBeUndefined());
test("invalid media URL hashes raw input", () =>
	expect(mediaUrlLogFields("not a url")).toEqual({
		media_host: "invalid-url",
		media_path_hash: logHash("not a url"),
	}));
test("valid media URL excludes signed query", () =>
	expect(mediaUrlLogFields("https://cdn.discordapp.com/a?token=secret")).toEqual({
		media_host: "cdn.discordapp.com",
		media_path_hash: logHash("/a"),
	}));
test("absent references are omitted", () =>
	expect(discordRefLogFields({ guildId: "1", wsId: null })).toEqual({
		guild_hash: "6b86b273ff34",
	}));
