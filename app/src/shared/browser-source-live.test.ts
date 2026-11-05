import { describe, expect, test } from "bun:test";
import {
	decodeSourceControls,
	encodeSourceControls,
	sourceConnection,
	sourceHeartbeatQuery,
} from "./browser-source";

const author = (id: string) => ({ id, username: "Name", avatarUrl: "url", mutedAt: 1 });

describe("browser source live controls", () => {
	test("survive the header round trip, with ids only and header-safe characters", () => {
		const value = encodeSourceControls({
			skip: 3,
			clear: 1,
			commandLog: "sscs",
			mutedAuthors: [author("111"), author("222")],
			hideAnonymous: true,
		});
		expect(value).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(Buffer.from(value, "base64url").toString()).not.toContain("Name");
		const decoded = decodeSourceControls(value);
		expect(decoded).toMatchObject({ skip: 3, clear: 1, commandLog: "sscs", hideAnonymous: true });
		expect(decoded?.mutedAuthors.map((muted) => muted.id).sort()).toEqual(["111", "222"]);
	});

	test("a missing or unreadable value is ignored", () => {
		expect(decodeSourceControls(null)).toBeNull();
		expect(decodeSourceControls("")).toBeNull();
		expect(decodeSourceControls("not base64 json")).toBeNull();
		const noCounters = Buffer.from(JSON.stringify({ m: [], a: false })).toString("base64url");
		expect(decodeSourceControls(noCounters)).toBeNull();
	});

	test("invalid counters and malformed or unbounded command logs are rejected", () => {
		for (const value of [
			{ s: -1, c: 0 },
			{ s: 0, c: 0.5 },
			{ s: Number.MAX_SAFE_INTEGER, c: 1 },
			{ s: 1, c: 0, q: "x" },
			{ s: 1, c: 0, q: "c" },
			{ s: 1, c: 0, q: "" },
			{ s: 65, c: 0, q: "s".repeat(65) },
		]) {
			expect(
				decodeSourceControls(Buffer.from(JSON.stringify(value)).toString("base64url")),
			).toBeNull();
		}
	});
});

describe("browser source connection status", () => {
	const seen = (soundBlocked: boolean, bot: string, ageMs = 500) => ({
		ageMs,
		query: sourceHeartbeatQuery(soundBlocked, bot),
	});

	test("reports start with the prefix the native server looks for", () => {
		expect(sourceHeartbeatQuery(false, "connected")).toBe("source=1&sound=on&bot=connected");
	});

	test("no recent report means no source is running", () => {
		expect(sourceConnection(null)).toBe("waiting");
		expect(sourceConnection(seen(false, "connected", 6000))).toBe("waiting");
	});

	test("what cannot be seen on stream is reported", () => {
		expect(sourceConnection(seen(false, "connected"))).toBe("connected");
		expect(sourceConnection(seen(true, "connected"))).toBe("soundBlocked");
		expect(sourceConnection(seen(false, "rejected"))).toBe("linkRefused");
		expect(sourceConnection(seen(true, "revoked"))).toBe("linkRefused");
		expect(sourceConnection(seen(false, "reconnecting"))).toBe("reconnecting");
		expect(sourceConnection(seen(false, "connecting"))).toBe("reconnecting");
	});
});
