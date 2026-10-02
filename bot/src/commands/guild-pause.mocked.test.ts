import { expect, mock, test } from "bun:test";
import type { ChatInputCommandInteraction, Interaction } from "discord.js";
import { PAUSE_INDEFINITE } from "../utils/guild-pause";

const events: { guild: string; event: { type: string; paused_until: number | null } }[] = [];
mock.module("../server", () => ({
	broadcastToGuild: (guild: string, event: { type: string; paused_until: number | null }) =>
		events.push({ guild, event }),
	evictGuild: () => 0,
}));
const { guildRegistry } = await import("../utils/registry");
const { applyGuildPause, rearmAllGuildPauses } = await import("../utils/guild-pause-timers");
const { handlePause } = await import("./subcommands/pause");
const { handleResume } = await import("./subcommands/resume");
const { handleInteraction, memeover } = await import("./commands");
const guild = "123456789012345687";
function interaction(sub: string, allowed = true, duration = "indefinite") {
	const replies: unknown[] = [];
	return {
		replies,
		value: {
			guildId: guild,
			locale: "en",
			commandName: "memeover",
			isButton: () => false,
			isChatInputCommand: () => true,
			memberPermissions: { has: () => allowed },
			options: { getSubcommand: () => sub, getString: () => duration },
			reply: async (value: unknown) => {
				replies.push(value);
			},
		} as unknown as ChatInputCommandInteraction,
	};
}
test("localized slash builder accepts all pause choices and resume", () => {
	const json = memeover.toJSON();
	const pause = json.options?.find((option) => option.name === "pause");
	expect(pause).toBeDefined();
	if (pause && "options" in pause) {
		const duration = pause.options?.[0];
		expect(duration?.required).toBe(true);
		if (duration && "choices" in duration) expect(duration.choices).toHaveLength(6);
	}
	expect(json.options?.some((option) => option.name === "resume")).toBe(true);
});
test("both pause commands deny non-admin before mutating", async () => {
	guildRegistry.register(guild, null);
	try {
		for (const sub of ["pause", "resume"]) {
			const input = interaction(sub, false);
			await handleInteraction(input.value as Interaction);
			expect(input.replies).toHaveLength(1);
			expect(guildRegistry.getConfig(guild)?.paused_until).toBeNull();
		}
	} finally {
		guildRegistry.unregister(guild);
	}
});
test("pause, preserved registration, resume and already-active response", async () => {
	guildRegistry.register(guild, null);
	try {
		const pause = interaction("pause");
		await handlePause(pause.value, guild);
		expect(guildRegistry.getConfig(guild)?.paused_until).toBe(PAUSE_INDEFINITE);
		guildRegistry.register(guild, "channel");
		expect(guildRegistry.getConfig(guild)?.paused_until).toBe(PAUSE_INDEFINITE);
		const resume = interaction("resume");
		await handleResume(resume.value, guild);
		expect(guildRegistry.getConfig(guild)?.paused_until).toBeNull();
		await handleResume(resume.value, guild);
		expect(resume.replies).toHaveLength(2);
	} finally {
		guildRegistry.unregister(guild);
	}
});
test("expiry resumes and removal prevents late broadcasts", async () => {
	guildRegistry.register(guild, null);
	applyGuildPause(guild, Date.now() + 15);
	await Bun.sleep(60);
	expect(guildRegistry.getConfig(guild)?.paused_until).toBeNull();
	expect(events[events.length - 1]?.event.paused_until).toBeNull();
	applyGuildPause(guild, Date.now() + 15);
	guildRegistry.unregister(guild);
	const count = events.length;
	await Bun.sleep(60);
	expect(events).toHaveLength(count);
});
test("startup clears expired values and rearms active values", async () => {
	guildRegistry.register(guild, null);
	try {
		guildRegistry.setPausedUntil(guild, Date.now() - 1);
		rearmAllGuildPauses();
		expect(guildRegistry.getConfig(guild)?.paused_until).toBeNull();
		guildRegistry.setPausedUntil(guild, Date.now() + 15);
		rearmAllGuildPauses();
		await Bun.sleep(60);
		expect(guildRegistry.getConfig(guild)?.paused_until).toBeNull();
	} finally {
		guildRegistry.unregister(guild);
	}
});
