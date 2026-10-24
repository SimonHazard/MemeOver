import { afterEach, beforeEach, expect, mock, setSystemTime, test } from "bun:test";
import type { MessageReaction, User } from "discord.js";

const broadcasts: unknown[] = [];
let guildId: string;
let channelAllowed: boolean;
let pausedUntil: number | null;
let allowBotAppSources: boolean;

mock.module("../server", () => ({
	broadcastToGuild: (_guildId: string, event: unknown) => broadcasts.push(event),
}));
mock.module("../utils/registry", () => ({
	guildRegistry: {
		isChannelAllowed: () => channelAllowed,
		getConfig: () => ({
			paused_until: pausedUntil,
			allow_bot_app_sources: allowBotAppSources,
		}),
	},
}));

// Keep the real rate limiter: these tests cover its interaction with delayed Discord calls.
const { dispatchReaction } = await import("./reactions");
const user = { bot: false, id: "user-1" } as User;

function pendingReaction() {
	let release!: () => void;
	const pending = new Promise<void>((resolve) => {
		release = resolve;
	});
	const reaction = {
		partial: true,
		message: { guildId, channelId: "channel-1", id: crypto.randomUUID() },
		emoji: { id: null, name: "fire", animated: false },
		fetch: mock(async () => {
			await pending;
			return reaction;
		}),
	};
	return { reaction: reaction as unknown as MessageReaction, fetch: reaction.fetch, release };
}

beforeEach(() => {
	guildId = crypto.randomUUID();
	broadcasts.length = 0;
	channelAllowed = true;
	pausedUntil = null;
	allowBotAppSources = true;
	setSystemTime(10_000);
});
afterEach(() => setSystemTime());

for (const gate of ["channel", "pause", "bot sources"] as const) {
	test(`rechecks ${gate} after a pending fetch`, async () => {
		const { reaction, fetch, release } = pendingReaction();
		const reactor = gate === "bot sources" ? ({ bot: true, id: "bot-1" } as User) : user;
		const dispatch = dispatchReaction(reaction, reactor);
		expect(fetch).toHaveBeenCalledTimes(1);

		if (gate === "channel") channelAllowed = false;
		if (gate === "pause") pausedUntil = Date.now() + 60_000;
		if (gate === "bot sources") allowBotAppSources = false;
		release();
		await dispatch;

		expect(broadcasts).toHaveLength(0);
	});
}

test("fetches admitted in separate windows cannot burst past the broadcast quota", async () => {
	const pending: ReturnType<typeof pendingReaction>[] = [];
	const dispatches: Promise<void>[] = [];
	for (let window = 0; window < 3; window++) {
		setSystemTime(10_000 + window * 1_000);
		for (let index = 0; index < 10; index++) {
			const item = pendingReaction();
			pending.push(item);
			dispatches.push(dispatchReaction(item.reaction, user));
		}
	}
	expect(pending.every(({ fetch }) => fetch.mock.calls.length === 1)).toBe(true);

	setSystemTime(20_000);
	for (const item of pending) item.release();
	await Promise.all(dispatches);

	expect(broadcasts).toHaveLength(10);
});

test("pending fetches are limited without halving the successful reaction quota", async () => {
	const pending = Array.from({ length: 11 }, pendingReaction);
	const dispatches = pending.map(({ reaction }) => dispatchReaction(reaction, user));
	expect(pending.slice(0, 10).every(({ fetch }) => fetch.mock.calls.length === 1)).toBe(true);
	expect(pending[10].fetch).not.toHaveBeenCalled();

	for (const item of pending) item.release();
	await Promise.all(dispatches);

	expect(broadcasts).toHaveLength(10);
});
