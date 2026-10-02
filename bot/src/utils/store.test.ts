import { afterEach, expect, test } from "bun:test";
import { store } from "./store";

const ids: string[] = [];
afterEach(() => {
	for (const id of ids) store.removeClient(id);
	ids.length = 0;
});
function client() {
	const id = crypto.randomUUID();
	ids.push(id);
	store.addClient(id, { id, send() {}, close() {} });
	return id;
}
test("removeClient cleans both rooms and inverse index", () => {
	const before = store.getGuildCount();
	const id = client();
	store.joinGuild(id, id);
	store.joinGuild(id, `${id}-2`);
	expect(store.isClientInGuild(id, id)).toBe(true);
	expect(store.getGuildCount()).toBe(before + 2);
	store.removeClient(id);
	expect(store.getGuildCount()).toBe(before);
	expect(store.getClient(id)).toBeUndefined();
});
test("last leave deletes room", () => {
	const id = client();
	store.joinGuild(id, id);
	store.leaveGuild(id, id);
	expect(store.getAllGuildIds()).not.toContain(id);
});
test("joined count deduplicates sockets across rooms", () => {
	const before = store.getJoinedClientCount();
	const id = client();
	store.joinGuild(id, id);
	store.joinGuild(id, `${id}-2`);
	expect(store.getJoinedClientCount()).toBe(before + 1);
});
test("unknown room returns an unstored empty set", () => {
	const id = crypto.randomUUID();
	store.getGuildMembers(id).add("x");
	expect(store.getGuildMembers(id).size).toBe(0);
});
test("unknown socket join is ignored", () => {
	const id = crypto.randomUUID();
	store.joinGuild(id, id);
	expect(store.getGuildMembers(id).size).toBe(0);
});
