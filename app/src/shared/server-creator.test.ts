import { describe, expect, test } from "bun:test";
import {
	createDiscordInviteUrl,
	createFriendSetupCode,
	createPublicWsUrl,
	DISCORD_INVITE_PERMISSIONS,
	parseServerSetupCode,
} from "./server-creator";

const guildId = "123456789012345678";
const token = "synthetic-friend-token";
const wsUrl = "wss://friend.example/ws";

describe("server creator helpers", () => {
	test("builds public WebSocket URLs from trimmed hostnames", () => {
		expect(createPublicWsUrl("  example.com  ", 3001)).toBe("ws://example.com:3001/ws");
	});

	test("preserves existing WebSocket URLs", () => {
		expect(createPublicWsUrl("ws://localhost:3001/ws", 3001)).toBe("ws://localhost:3001/ws");
		expect(createPublicWsUrl("wss://example.com/ws", 3001)).toBe("wss://example.com/ws");
	});

	test("returns a placeholder public WebSocket URL for blank input", () => {
		expect(createPublicWsUrl("  ", 3001)).toBe("ws://YOUR_PUBLIC_IP:3001/ws");
	});

	test("rejects invalid Discord client IDs", () => {
		expect(createDiscordInviteUrl("123")).toBeNull();
		expect(createDiscordInviteUrl("not-a-client-id")).toBeNull();
	});

	test("builds Discord invite URLs with limited and administrator permissions", () => {
		const defaultInvite = createDiscordInviteUrl("123456789012345678");
		const adminInvite = createDiscordInviteUrl("123456789012345678", true);

		expect(defaultInvite).not.toBeNull();
		expect(adminInvite).not.toBeNull();

		const defaultParams = new URL(defaultInvite ?? "").searchParams;
		const adminParams = new URL(adminInvite ?? "").searchParams;

		expect(defaultParams.get("client_id")).toBe("123456789012345678");
		expect(defaultParams.get("scope")).toBe("bot applications.commands");
		expect(defaultParams.get("permissions")).toBe(String(DISCORD_INVITE_PERMISSIONS));
		expect(adminParams.get("permissions")).toBe("8");
	});

	test("returns null when setup code fields are blank", () => {
		expect(createFriendSetupCode({ guildId: "", token, wsUrl })).toBeNull();
		expect(createFriendSetupCode({ guildId, token: "", wsUrl })).toBeNull();
		expect(createFriendSetupCode({ guildId, token, wsUrl: "" })).toBeNull();
	});

	test("builds parseable friend setup codes", () => {
		const setupCode = createFriendSetupCode({ guildId, token, wsUrl });

		expect(setupCode).not.toBeNull();
		expect(setupCode?.startsWith("memeover://setup?")).toBe(true);
		expect(parseServerSetupCode(setupCode ?? "")).toEqual({
			guildId,
			token,
			wsUrl,
		});
	});

	test("round-trips friend setup codes through the parser", () => {
		const setupCode = createFriendSetupCode({ guildId, token, wsUrl });

		expect(parseServerSetupCode(setupCode ?? "")).toEqual({
			guildId,
			token,
			wsUrl,
		});
	});
});
