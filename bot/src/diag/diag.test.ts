import { expect, test } from "bun:test";
import { buildGuildDiag, createCooldown, type GuildDiagFacts } from "./diag";

const facts = (patch: Partial<GuildDiagFacts> = {}): GuildDiagFacts => ({
	guildId: "g",
	cfg: undefined,
	overlaysConnected: 2,
	clientId: "bot",
	intent: null,
	channels: [],
	unviewableCount: null,
	...patch,
});
const cfg = {
	token: "never returned",
	channel_ids: [],
	allow_bot_app_sources: false,
	paused_until: null,
	registered_at: 1,
	last_active_at: null,
	unique_client_ids: [],
};
test("unregistered and all-channel diagnostics expose only advisory facts", () => {
	expect(buildGuildDiag(facts())).toMatchObject({
		registered: false,
		all_channels: false,
		message_content_intent: null,
	});
	const result = buildGuildDiag(facts({ cfg, unviewableCount: 3 }));
	expect(result).toMatchObject({
		registered: true,
		all_channels: true,
		unviewable_channel_count: 3,
	});
	expect(JSON.stringify(result)).not.toContain(cfg.token);
});
test("channels sort by name with missing last and preserve permission booleans", () => {
	const result = buildGuildDiag(
		facts({
			cfg: { ...cfg, channel_ids: ["b", "a", "missing"] },
			channels: [
				{ id: "missing", name: null, view: false, history: false },
				{ id: "b", name: "Bravo", view: true, history: false },
				{ id: "a", name: "Alpha", view: false, history: true },
			],
		}),
	);
	expect(result.channels.map((c) => c.id)).toEqual(["a", "b", "missing"]);
	expect(result.channels[0].perms).toEqual({ view: false, history: true });
	expect(result.channels[2].missing).toBe(true);
});
test("stable order and cap at 25 without mutating input", () => {
	const channels = Array.from({ length: 30 }, (_, i) => ({
		id: String(i).padStart(2, "0"),
		name: "same",
		view: true,
		history: true,
	})).reverse();
	const original = [...channels];
	const result = buildGuildDiag(facts({ channels }));
	expect(result.channels).toHaveLength(25);
	expect(result.channels[0].id).toBe("00");
	expect(channels).toEqual(original);
});
test("per-socket cooldown, exact boundary and forget", () => {
	let now = 0;
	const cooldown = createCooldown(5000, () => now);
	expect(cooldown.tryTake("a")).toBe(true);
	expect(cooldown.tryTake("a")).toBe(false);
	expect(cooldown.tryTake("b")).toBe(true);
	now = 4999;
	expect(cooldown.tryTake("a")).toBe(false);
	now = 5000;
	expect(cooldown.tryTake("a")).toBe(true);
	cooldown.forget("a");
	expect(cooldown.tryTake("a")).toBe(true);
});
