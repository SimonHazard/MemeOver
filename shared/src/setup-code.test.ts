import { describe, expect, test } from "bun:test";
import { buildConnectionCode, parseConnectionCode } from "./setup-code";

const guildId = "123456789012345678";
const token = "abcdefghijklmnopqrstuvwxyz123456";

describe("setup code", () => {
	test("builds memeover setup URLs with ws_url", () => {
		expect(
			buildConnectionCode({
				guildId,
				token: "token-123",
				wsUrl: "wss://test.example/ws",
			}),
		).toBe(
			"memeover://setup?guild_id=123456789012345678&token=token-123&ws_url=wss%3A%2F%2Ftest.example%2Fws",
		);
	});

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

	test("parses setup URL camelCase aliases", () => {
		expect(
			parseConnectionCode(
				`memeover://setup?guildId=${guildId}&token=${token}&wsUrl=ws%3A%2F%2Flocalhost%3A3001%2Fws`,
			),
		).toEqual({
			guildId,
			token,
			wsUrl: "ws://localhost:3001/ws",
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

	test("parses JSON snake_case and server aliases", () => {
		expect(
			parseConnectionCode(
				JSON.stringify({
					server_id: guildId,
					token,
					ws_url: "wss://example.com/ws",
				}),
			),
		).toEqual({
			guildId,
			token,
			wsUrl: "wss://example.com/ws",
		});
	});

	test("parses copied credential text", () => {
		expect(parseConnectionCode(`Server ID: ${guildId}\nToken: ${token}`)).toEqual({
			guildId,
			token,
		});
	});

	test("parses copied French credential text", () => {
		expect(parseConnectionCode(`Server ID: ${guildId}\nJeton: ${token}`)).toEqual({
			guildId,
			token,
		});
	});

	test("parses fallback tokens in copied text", () => {
		expect(parseConnectionCode(`${guildId}\n${token}`)).toEqual({
			guildId,
			token,
		});
	});

	test("rejects malformed guild IDs", () => {
		expect(parseConnectionCode("memeover://setup?guild_id=123&token=abcdefghijklmnop")).toBeNull();
		expect(parseConnectionCode(`{"guildId":"123","token":"${token}"}`)).toBeNull();
	});

	test("rejects missing tokens", () => {
		expect(parseConnectionCode(`memeover://setup?guild_id=${guildId}`)).toBeNull();
		expect(parseConnectionCode(`Server ID: ${guildId}`)).toBeNull();
	});

	test("rejects empty input", () => {
		expect(parseConnectionCode("")).toBeNull();
		expect(parseConnectionCode("   ")).toBeNull();
	});
});
