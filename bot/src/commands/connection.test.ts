import { describe, expect, test } from "bun:test";
import { MessageFlags } from "discord.js";

process.env.DISCORD_TOKEN ??= "test-discord-token";
process.env.DISCORD_CLIENT_ID ??= "123456789012345678";
process.env.PUBLIC_WS_URL = "wss://test.example/ws";

const {
	buildConnectionCode,
	buildConnectionFields,
	formatBotAppSources,
	formatWatchedChannels,
	notConfiguredResponse,
} = await import("./connection");
const { componentsToJson, EPHEMERAL_COMPONENTS_V2 } = await import("./response-panel");

describe("Discord connection helpers", () => {
	test("formats watched channel lists", () => {
		expect(formatWatchedChannels([])).toBe("All channels");
		expect(formatWatchedChannels([], "fr")).toBe("Tous les salons");
		expect(formatWatchedChannels(["111", "222"])).toBe("<#111>, <#222>");
	});

	test("formats bot/app source state", () => {
		expect(formatBotAppSources(false)).toBe("Muted");
		expect(formatBotAppSources(true)).toBe("Enabled");
		expect(formatBotAppSources(false, "fr")).toBe("Masqué");
		expect(formatBotAppSources(true, "fr")).toBe("Activé");
	});

	test("builds setup codes with the public websocket URL", () => {
		expect(buildConnectionCode("123456789012345678", "token-123")).toBe(
			"memeover://setup?guild_id=123456789012345678&token=token-123&ws_url=wss%3A%2F%2Ftest.example%2Fws",
		);
	});

	test("builds reusable credential fields", () => {
		const fields = buildConnectionFields({
			guildId: "123456789012345678",
			token: "token-123",
			config: { channel_ids: ["111"], allow_bot_app_sources: true },
		});

		expect(fields.map((field) => field.name)).toEqual([
			"📺 Watching",
			"🤖 Bots & apps",
			"🏠 Server ID",
			"🔑 Token",
			"⚡ App setup code",
		]);
		expect(fields[0]?.value).toBe("<#111>");
		expect(fields[1]?.value).toBe("Enabled");
		expect(fields[4]?.value).toContain("memeover://setup?");
	});

	test("builds localized credential fields", () => {
		const fields = buildConnectionFields({
			guildId: "123456789012345678",
			token: "token-123",
			locale: "fr",
			config: { channel_ids: [], allow_bot_app_sources: false },
		});

		expect(fields.map((field) => field.name)).toEqual([
			"📺 Écoute",
			"🤖 Bots & apps",
			"🏠 Server ID",
			"🔑 Jeton",
			"⚡ Code de configuration app",
		]);
		expect(fields[0]?.value).toBe("Tous les salons");
		expect(fields[1]?.value).toBe("Masqué");
	});

	test("builds the shared not-configured Components V2 response", () => {
		const response = notConfiguredResponse();
		const json = JSON.stringify(componentsToJson(response));

		expect(response.flags).toBe(MessageFlags.Ephemeral | MessageFlags.IsComponentsV2);
		expect(response.flags).toBe(EPHEMERAL_COMPONENTS_V2);
		expect(json).toContain("Not configured");
		expect(json).toContain("/memeover setup");
	});

	test("builds localized not-configured Components V2 responses", () => {
		const response = notConfiguredResponse("fr");
		const json = JSON.stringify(componentsToJson(response));

		expect(json).toContain("Non configuré");
		expect(json).toContain("/memeover setup");
	});
});
