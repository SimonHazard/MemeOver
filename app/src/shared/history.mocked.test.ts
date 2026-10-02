import { afterEach, beforeEach, expect, mock, setSystemTime, test } from "bun:test";
import { createEventModule, createMemoryStoreModule } from "../test-utils/tauri-mocks";
import type { DisplayQueueItem } from "./types";

const memory = createMemoryStoreModule(),
	events = createEventModule();
mock.module("@tauri-apps/plugin-store", () => memory.module);
mock.module("@tauri-apps/api/event", () => events.module);
const { addToHistory, clearHistory, loadHistory, purgeExpiredHistory, replayHistoryItem } =
	await import("./history");
beforeEach(() => {
	memory.stores.clear();
	memory.saves.clear();
	events.emitted.length = 0;
});
afterEach(() => setSystemTime());
function item(id: string): DisplayQueueItem {
	return {
		type: "TEXT",
		queueId: id,
		guild_id: "g",
		channel_id: "c",
		message_id: id,
		author_id: "a",
		author_username: "A",
		author_avatar_url: "",
		text: id,
		timestamp: 1,
	};
}
test("empty history", async () => expect(await loadHistory()).toEqual([]));
test("history prepends and timestamps", async () => {
	setSystemTime(100000);
	await addToHistory(item("a"));
	await addToHistory(item("b"));
	expect(await loadHistory()).toEqual([
		{ ...item("b"), recordedAt: 100000 },
		{ ...item("a"), recordedAt: 100000 },
	]);
	expect(events.emitted).toEqual([
		{ event: "history-updated", payload: undefined },
		{ event: "history-updated", payload: undefined },
	]);
});
test("history retains newest fifty", async () => {
	for (let i = 0; i < 51; i++) await addToHistory(item(String(i)));
	const list = await loadHistory();
	expect(list).toHaveLength(50);
	expect(list[0].queueId).toBe("50");
	expect(list[49].queueId).toBe("1");
	expect(events.emitted).toHaveLength(51);
});
test("load trims persisted overflow", async () => {
	memory.stores.set(
		"history.json",
		new Map([
			["history", Array.from({ length: 60 }, (_, i) => ({ ...item(String(i)), recordedAt: 1 }))],
		]),
	);
	expect(await loadHistory()).toHaveLength(50);
	expect(memory.stores.get("history.json")?.get("history")).toHaveLength(50);
	expect(memory.saves.get("history.json")).toBe(1);
});
test("clear persists and emits", async () => {
	await addToHistory(item("a"));
	events.emitted.length = 0;
	await clearHistory();
	expect(await loadHistory()).toEqual([]);
	expect(events.emitted).toEqual([{ event: "history-updated", payload: undefined }]);
});
test("replay preserves queue identity", async () => {
	// characterization: replay reuses queueId; fixed by plan 018.
	await replayHistoryItem(item("original"));
	expect(events.emitted).toEqual([{ event: "replay-item", payload: item("original") }]);
});

test("purge writes only when expired Discord media was removed", async () => {
	const text = item("text");
	const expired = {
		...item("old"),
		type: "MEDIA",
		media_type: "image",
		media_url: "https://cdn.discordapp.com/a.png?ex=1",
		recordedAt: 1,
	};
	memory.stores.set("history.json", new Map([["history", [expired, { ...text, recordedAt: 1 }]]]));
	expect(await purgeExpiredHistory(1000000)).toBe(1);
	expect(await loadHistory()).toEqual([{ ...text, recordedAt: 1 }]);
	expect(events.emitted).toHaveLength(1);
	expect(memory.saves.get("history.json")).toBe(1);
	expect(await purgeExpiredHistory(1000000)).toBe(0);
	expect(events.emitted).toHaveLength(1);
	expect(memory.saves.get("history.json")).toBe(1);
});
