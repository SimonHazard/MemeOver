import { expect, test } from "bun:test";
import { ServerMessageSchema } from "@memeover/shared";
import { shouldLogToHistory } from "./history-expiry";
import { buildLocalTestEvent, isLocalTestItem } from "./local-test";
import { type OverlayTraceEntry, pushTrace, traceMetadata } from "./overlay-trace";

const entry: OverlayTraceEntry = {
	id: "new",
	at: 1,
	kind: "MEDIA",
	decision: "queued",
	author: "a".repeat(40),
};
test("trace is immutable, newest first, capped and truncates author names", () => {
	const buffer = [{ ...entry, id: "old" }];
	const result = pushTrace(buffer, entry, 1);
	expect(result).toHaveLength(1);
	expect(result[0]?.id).toBe("new");
	expect(result[0]?.author).toHaveLength(32);
	expect(buffer[0]?.id).toBe("old");
	expect(entry.author).toHaveLength(40);
	expect(pushTrace(buffer, entry, 0)).toEqual([]);
	expect(pushTrace(buffer, entry)[1]?.id).toBe("old");
});
test("local test validates and never enters history", () => {
	const event = buildLocalTestEvent("123456789012345678", 123);
	expect(ServerMessageSchema.safeParse(event).success).toBe(true);
	expect(isLocalTestItem(event)).toBe(true);
	expect(isLocalTestItem({ message_id: "123" })).toBe(false);
	expect(shouldLogToHistory({ ...event, queueId: "test" })).toBe(false);
	expect(traceMetadata(JSON.stringify(event))).toEqual({
		kind: "TEST",
		mediaType: "image",
		author: "MemeOver",
	});
});
test("trace metadata excludes identifiers, URLs, anonymous author and invalid payloads", () => {
	const event = {
		...buildLocalTestEvent("123456789012345678", 123),
		message_id: "normal",
		author_display_name: "B".repeat(50),
		media_url: "https://cdn.example/secret",
	};
	expect(traceMetadata(JSON.stringify(event))).toEqual({
		kind: "MEDIA",
		mediaType: "image",
		author: "B".repeat(32),
	});
	expect(traceMetadata(JSON.stringify({ ...event, anonymous: true })).author).toBeUndefined();
	expect(traceMetadata("not json secret")).toEqual({ kind: "SYSTEM" });
	expect(traceMetadata(JSON.stringify({ token: "secret" }))).toEqual({ kind: "SYSTEM" });
});
