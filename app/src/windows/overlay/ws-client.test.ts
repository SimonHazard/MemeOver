import { beforeEach, expect, test } from "bun:test";
import {
	bindSocket,
	sendClientMessage,
	sendIfSupported,
	serverSupports,
	setServerFeatures,
	unbindSocket,
} from "./ws-client";

beforeEach(() => bindSocket(null));
function socket(readyState = 1) {
	return {
		readyState,
		sent: [] as string[],
		send(data: string) {
			this.sent.push(data);
		},
	};
}
const pong = { type: "PONG" } as const;
test("no socket", () => expect(sendClientMessage(pong)).toBe(false));
for (const state of [0, 2, 3])
	test(`closed socket state ${state}`, () => {
		const ws = socket(state);
		bindSocket(ws);
		expect(sendClientMessage(pong)).toBe(false);
		expect(ws.sent).toEqual([]);
	});
test("open socket sends exact JSON", () => {
	const ws = socket();
	bindSocket(ws);
	expect(sendClientMessage(pong)).toBe(true);
	expect(ws.sent).toEqual(['{"type":"PONG"}']);
});
test("send exception returns false", () => {
	bindSocket({
		readyState: 1,
		send() {
			throw new Error("closed");
		},
	});
	expect(sendClientMessage(pong)).toBe(false);
});
test("stale unbind preserves current session", () => {
	const old = socket(),
		current = socket();
	bindSocket(old);
	bindSocket(current);
	unbindSocket(old);
	expect(sendClientMessage(pong)).toBe(true);
	expect(current.sent).toHaveLength(1);
	unbindSocket(current);
	expect(sendClientMessage(pong)).toBe(false);
});
test("optional messages require advertised feature", () => {
	const ws = socket();
	bindSocket(ws);
	expect(sendIfSupported("x", pong)).toBe(false);
	setServerFeatures(["x"]);
	expect(serverSupports("x")).toBe(true);
	expect(sendIfSupported("x", pong)).toBe(true);
	expect(sendIfSupported("y", pong)).toBe(false);
	expect(ws.sent).toHaveLength(1);
});
test("binding a new socket resets negotiation", () => {
	bindSocket(socket());
	setServerFeatures(["x"]);
	bindSocket(socket());
	expect(serverSupports("x")).toBe(false);
});
