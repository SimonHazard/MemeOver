import { expect, test } from "bun:test";
import { stats } from "./stats";
import { store } from "./store";

test("active connection count saturates at zero", () => {
	const before = stats.snapshot().connections.active;
	for (let i = 0; i < before + 5; i++) stats.connectionClosed();
	expect(stats.snapshot().connections.active).toBe(0);
});
test("active guild stats derive from store", () => {
	expect(stats.snapshot().guilds.active).toBe(store.getGuildCount());
});
