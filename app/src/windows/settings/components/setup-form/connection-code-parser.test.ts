import { describe, expect, test } from "bun:test";
import { parseConnectionCode } from "./connection-code-parser";

const guildId = "123456789012345678";
const token = "abcdefghijklmnopqrstuvwxyz123456";

describe("parseConnectionCode", () => {
	test("parses memeover setup URLs", () => {
		expect(
			parseConnectionCode(
				`memeover://setup?guild_id=${guildId}&token=${token}&ws_url=wss%3A%2F%2Fexample.com%2Fws`,
			),
		).toEqual({
			guildId,
			token,
			wsUrl: "wss://example.com/ws",
		});
	});

	test("parses fenced JSON payloads", () => {
		expect(
			parseConnectionCode(`\`\`\`json
{"guildId":"${guildId}","token":"${token}","wsUrl":"ws://localhost:3001/ws"}
\`\`\``),
		).toEqual({
			guildId,
			token,
			wsUrl: "ws://localhost:3001/ws",
		});
	});

	test("parses copied credential text", () => {
		expect(parseConnectionCode(`Server ID: ${guildId}\nToken: ${token}`)).toEqual({
			guildId,
			token,
		});
	});

	test("rejects missing or malformed data", () => {
		expect(parseConnectionCode("token: short")).toBeNull();
		expect(parseConnectionCode("memeover://setup?guild_id=123&token=abcdefghijklmnop")).toBeNull();
	});
});
