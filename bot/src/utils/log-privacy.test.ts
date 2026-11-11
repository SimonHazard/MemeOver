import { expect, test } from "bun:test";
import pino from "pino";
import {
	discordRefLogFields,
	logHash,
	mediaUrlLogFields,
	serializeLoggedError,
} from "./log-privacy";

test("a logged Discord error never carries the request it failed to send", () => {
	const lines: Record<string, unknown>[] = [];
	const log = pino(
		{ serializers: { err: serializeLoggedError } },
		{ write: (line: string) => lines.push(JSON.parse(line)) },
	);
	const secret = "fixture-guild-token-0123456789abcdef";
	const nested = Object.assign(new Error("inner"), { requestBody: { json: { value: secret } } });
	const err = Object.assign(new Error("Unknown interaction"), {
		code: 10062,
		status: 404,
		requestBody: { files: [], json: { embeds: [{ fields: [{ value: secret }] }] } },
		errors: [nested],
	});
	log.error({ event: "interaction_error", err }, "Interaction handler error");
	const serialized = JSON.stringify(lines);
	expect(serialized).not.toContain(secret);
	expect(serialized).not.toContain("requestBody");
	expect(lines[0]).toMatchObject({
		err: {
			message: "Unknown interaction",
			code: 10062,
			status: 404,
			stack: expect.stringContaining("Unknown interaction"),
		},
	});
});

test("deep and circular error metadata cannot bypass request-body filtering", () => {
	const secret = "fixture-deep-guild-token";
	let deep: Record<string, unknown> = { requestBody: { token: secret } };
	for (let depth = 0; depth < 10; depth++) deep = { nested: deep };
	const circular: Record<string, unknown> = { requestBody: { token: secret } };
	circular.self = circular;
	const err = Object.assign(new Error("Failed reply"), { deep, circular });
	const serialized = JSON.stringify(serializeLoggedError(err));
	expect(serialized).not.toContain(secret);
	expect(serialized).not.toContain("requestBody");
	expect(serialized).toContain("[Truncated]");
	expect(err.circular.requestBody).toEqual({ token: secret });
});

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
