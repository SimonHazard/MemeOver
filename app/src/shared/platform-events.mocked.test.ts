import { afterEach, expect, mock, test } from "bun:test";

const emitted: { event: string; payload?: unknown }[] = [];
let inTauri = false;
mock.module("@tauri-apps/api/core", () => ({ isTauri: () => inTauri }));
mock.module("@tauri-apps/api/event", () => ({
	async emit(event: string, payload?: unknown) {
		emitted.push({ event, payload });
	},
}));
const { emitIfTauri } = await import("./platform-events");

afterEach(() => {
	emitted.length = 0;
	inTauri = false;
});

test("a plain browser has no other window to notify", async () => {
	await emitIfTauri("ws-status-changed", "connected");
	expect(emitted).toEqual([]);
});

test("a Tauri window emits normally", async () => {
	inTauri = true;
	await emitIfTauri("ws-status-changed", "connected");
	expect(emitted).toEqual([{ event: "ws-status-changed", payload: "connected" }]);
});
