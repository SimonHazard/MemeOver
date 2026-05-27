import { describe, expect, test } from "bun:test";

process.env.DISCORD_TOKEN ??= "test-discord-token";
process.env.DISCORD_CLIENT_ID ??= "123456789012345678";
process.env.PUBLIC_WS_URL = "wss://test.example/ws";

const { buildConnectionCode, buildConnectionFields, formatWatchedChannels, notConfiguredEmbed } =
	await import("./connection");

describe("Discord connection helpers", () => {
	test("formats watched channel lists", () => {
		expect(formatWatchedChannels([])).toBe("All channels");
		expect(formatWatchedChannels([], "fr")).toBe("Tous les salons");
		expect(formatWatchedChannels(["111", "222"])).toBe("<#111>, <#222>");
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
			config: { channel_ids: ["111"] },
		});

		expect(fields.map((field) => field.name)).toEqual([
			"📺 Watching",
			"🏠 Server ID",
			"🔑 Token",
			"⚡ App setup code",
		]);
		expect(fields[0]?.value).toBe("<#111>");
		expect(fields[3]?.value).toContain("memeover://setup?");
	});

	test("builds localized credential fields", () => {
		const fields = buildConnectionFields({
			guildId: "123456789012345678",
			token: "token-123",
			locale: "fr",
			config: { channel_ids: [] },
		});

		expect(fields.map((field) => field.name)).toEqual([
			"📺 Écoute",
			"🏠 Server ID",
			"🔑 Jeton",
			"⚡ Code de configuration app",
		]);
		expect(fields[0]?.value).toBe("Tous les salons");
	});

	test("builds the shared not-configured embed", () => {
		const embed = notConfiguredEmbed().toJSON();
		expect(embed.title).toBe("Not configured");
		expect(embed.description).toContain("/memeover setup");
	});

	test("builds localized not-configured embeds", () => {
		const embed = notConfiguredEmbed("fr").toJSON();
		expect(embed.title).toBe("Non configuré");
		expect(embed.description).toContain("/memeover setup");
	});
});
