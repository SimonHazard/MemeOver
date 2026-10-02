import { expect, test } from "bun:test";
import { createDiscordInviteUrl, DISCORD_INVITE_PERMISSIONS } from "./discord";

test("invite retains the agreed permissions and command scope", () => {
	const url = new URL(createDiscordInviteUrl(" 123456789012345678 ") ?? "");
	expect(url.origin + url.pathname).toBe("https://discord.com/oauth2/authorize");
	expect(url.searchParams.get("client_id")).toBe("123456789012345678");
	expect(url.searchParams.get("permissions")).toBe("68608");
	expect(DISCORD_INVITE_PERMISSIONS).toBe(1024 + 2048 + 65536);
	expect(url.searchParams.get("scope")).toBe("bot applications.commands");
	expect(url.searchParams.has("integration_type")).toBe(false);
});
test("admin and site installation options are explicit", () => {
	expect(
		new URL(createDiscordInviteUrl("123456789012345678", true) ?? "").searchParams.get(
			"permissions",
		),
	).toBe("8");
	expect(
		new URL(
			createDiscordInviteUrl("123456789012345678", false, { integrationType: 0 }) ?? "",
		).searchParams.get("integration_type"),
	).toBe("0");
	expect(createDiscordInviteUrl("invalid")).toBeNull();
});
