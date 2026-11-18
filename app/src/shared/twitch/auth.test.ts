import { describe, expect, test } from "bun:test";
import { hasRequiredScopes, normalizeTwitchAuth, type TwitchAuth, tokenDecision } from "./auth";
import { isTwitchConfigured, TWITCH_SCOPES } from "./config";

const account: TwitchAuth = {
	accessToken: "fake-access",
	refreshToken: "fake-refresh",
	expiresAt: 1_000_000,
	userId: "12345",
	login: "test_streamer",
	scopes: [...TWITCH_SCOPES],
};
describe("Twitch account", () => {
	test("normalizes a complete account and ignores unrelated fields", () => {
		expect(normalizeTwitchAuth({ ...account, extra: true })).toEqual(account);
	});
	test("refuses missing or mistyped account fields", () => {
		for (const key of Object.keys(account)) {
			const missing = { ...account } as Record<string, unknown>;
			delete missing[key];
			expect(normalizeTwitchAuth(missing)).toBeNull();
			expect(normalizeTwitchAuth({ ...account, [key]: false })).toBeNull();
		}
		for (const value of [null, [], "auth", 0]) expect(normalizeTwitchAuth(value)).toBeNull();
	});
	test("refuses invalid identities, empty tokens and non-finite expiry", () => {
		for (const patch of [
			{ userId: "123/456" },
			{ userId: "1".repeat(21) },
			{ login: "../bad" },
			{ login: "a".repeat(26) },
			{ accessToken: "" },
			{ refreshToken: "" },
			{ expiresAt: NaN },
			{ expiresAt: Infinity },
			{ expiresAt: -1 },
			{ scopes: [5] },
		])
			expect(normalizeTwitchAuth({ ...account, ...patch })).toBeNull();
	});
	test("refreshes at five minutes, at expiry and after expiry", () => {
		expect(tokenDecision(account, account.expiresAt - 6 * 60_000)).toBe("use");
		for (const now of [account.expiresAt - 5 * 60_000, account.expiresAt, account.expiresAt + 1]) {
			expect(tokenDecision(account, now)).toBe("refresh");
		}
	});
	test("requires both read-only scopes", () => {
		expect(hasRequiredScopes(account)).toBe(true);
		for (const scope of TWITCH_SCOPES) expect(hasRequiredScopes({ scopes: [scope] })).toBe(false);
		expect(hasRequiredScopes({ scopes: [] })).toBe(false);
	});
	test("enables the bundled Twitch application and rejects invalid overrides", () => {
		expect(isTwitchConfigured()).toBe(true);
		for (const id of ["", "abc", "A".repeat(30), "a".repeat(41)])
			expect(isTwitchConfigured(id)).toBe(false);
		expect(isTwitchConfigured("a".repeat(30))).toBe(true);
	});
});
