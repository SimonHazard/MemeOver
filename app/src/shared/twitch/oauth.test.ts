import { describe, expect, test } from "bun:test";
import { TWITCH_AUTH_BASE, TWITCH_SCOPES } from "./config";
import {
	pollDeviceToken,
	refreshTokens,
	revokeToken,
	startDeviceFlow,
	validateToken,
} from "./oauth";

const tokens = {
	access_token: "fake-access-sensitive",
	refresh_token: "fake-refresh-sensitive",
	expires_in: 3600,
	scope: [...TWITCH_SCOPES],
};
const device = {
	device_code: "fake-device-sensitive",
	user_code: "CODE123",
	verification_uri: "https://www.twitch.tv/activate",
	expires_in: 1800,
	interval: 5,
};
const valid = {
	client_id: "test-client",
	user_id: "123",
	login: "streamer",
	scopes: [...TWITCH_SCOPES],
	expires_in: 3000,
};
function fixture(body: unknown, status = 200) {
	const calls: { url: string; init: RequestInit }[] = [];
	const fake = async function (this: unknown, url: string | URL | Request, init: RequestInit = {}) {
		expect(this).toBeUndefined();
		calls.push({ url: String(url), init });
		return new Response(JSON.stringify(body), { status });
	} as typeof fetch;
	return { deps: { fetch: fake, clientId: "test-client" }, calls };
}
describe("Twitch OAuth", () => {
	test("starts device flow with plural scopes and a form body", async () => {
		const { deps, calls } = fixture(device);
		expect(await startDeviceFlow(deps)).toEqual({
			deviceCode: device.device_code,
			userCode: device.user_code,
			verificationUri: device.verification_uri,
			expiresInS: 1800,
			intervalS: 5,
		});
		expect(calls[0].url).toBe(`${TWITCH_AUTH_BASE}/device`);
		expect(calls[0].init.method).toBe("POST");
		expect(calls[0].init.headers).toEqual({ "Content-Type": "application/x-www-form-urlencoded" });
		expect(Object.fromEntries(calls[0].init.body as URLSearchParams)).toEqual({
			client_id: "test-client",
			scopes: TWITCH_SCOPES.join(" "),
		});
	});
	test("rejects unsafe verification addresses", async () => {
		for (const verification_uri of [
			"http://twitch.tv/activate",
			"https://twitch.tv.evil.test",
			"https://eviltwitch.tv",
			"https://user:pass@twitch.tv",
			"https://twitch.tv:444/activate",
			"javascript:alert(1)",
		]) {
			await expect(startDeviceFlow(fixture({ ...device, verification_uri }).deps)).rejects.toThrow(
				"Invalid Twitch",
			);
		}
	});
	test("polls with the device grant and returns a deterministic expiry", async () => {
		const { deps, calls } = fixture(tokens);
		expect(await pollDeviceToken(deps, device.device_code, 1000)).toEqual({
			status: "granted",
			tokens: {
				accessToken: tokens.access_token,
				refreshToken: tokens.refresh_token,
				expiresAt: 3_601_000,
			},
		});
		expect(Object.fromEntries(calls[0].init.body as URLSearchParams)).toEqual({
			client_id: "test-client",
			scopes: TWITCH_SCOPES.join(" "),
			device_code: device.device_code,
			grant_type: "urn:ietf:params:oauth:grant-type:device_code",
		});
	});
	test("maps all device authorization outcomes", async () => {
		for (const [message, status] of [
			["authorization_pending", "pending"],
			["slow_down", "slow_down"],
			["access_denied", "denied"],
			["expired_token", "expired"],
			["other", "expired"],
		] as const) {
			expect(await pollDeviceToken(fixture({ message }, 400).deps, "device")).toEqual({ status });
		}
	});
	test("refreshes without a secret and retains replacement token pair", async () => {
		const { deps, calls } = fixture(tokens);
		expect(await refreshTokens(deps, "old+refresh/value", 1000)).toEqual({
			status: "refreshed",
			tokens: {
				accessToken: tokens.access_token,
				refreshToken: tokens.refresh_token,
				expiresAt: 3_601_000,
			},
		});
		expect(Object.fromEntries(calls[0].init.body as URLSearchParams)).toEqual({
			client_id: "test-client",
			refresh_token: "old+refresh/value",
			grant_type: "refresh_token",
		});
		for (const status of [400, 401])
			expect(await refreshTokens(fixture({}, status).deps, "old")).toEqual({
				status: "reauth_required",
			});
		await expect(refreshTokens(fixture({}, 503).deps, "old")).rejects.toThrow(
			"Twitch refresh failed",
		);
	});
	test("validates identity, scopes and client id", async () => {
		const { deps, calls } = fixture(valid);
		expect(await validateToken(deps, "access")).toEqual({
			status: "valid",
			userId: "123",
			login: "streamer",
			scopes: [...TWITCH_SCOPES],
			expiresInS: 3000,
		});
		expect(calls[0].init.headers).toEqual({ Authorization: "OAuth access" });
		for (const response of [
			fixture({}, 401),
			fixture({ ...valid, client_id: "wrong" }),
			fixture({ ...valid, user_id: null }),
		]) {
			expect(await validateToken(response.deps, "access")).toEqual({ status: "invalid" });
		}
		await expect(validateToken(fixture({}, 503).deps, "access")).rejects.toThrow(
			"Twitch validation failed",
		);
	});
	test("revoke uses form fields and tolerates an HTTP failure", async () => {
		const { deps, calls } = fixture({}, 400);
		await revokeToken(deps, "token");
		expect(calls[0].url).toBe(`${TWITCH_AUTH_BASE}/revoke`);
		expect(Object.fromEntries(calls[0].init.body as URLSearchParams)).toEqual({
			client_id: "test-client",
			token: "token",
		});
	});
	test("sanitizes body, JSON, schema and network errors", async () => {
		const secret = "fake-secret-never-print";
		const throwingFetch = (async () => {
			throw new Error(secret);
		}) as unknown as typeof fetch;
		const invalidJson = (async () => new Response(secret)) as unknown as typeof fetch;
		const tasks = [
			() => startDeviceFlow(fixture({ message: secret }, 500).deps),
			() => pollDeviceToken(fixture({ ...tokens, expires_in: secret }).deps, secret),
			() => refreshTokens({ fetch: throwingFetch, clientId: "client" }, secret),
			() => validateToken({ fetch: invalidJson, clientId: "client" }, secret),
		];
		for (const task of tasks) {
			let thrown: unknown;
			try {
				await task();
			} catch (error) {
				thrown = error;
			}
			expect(thrown).toBeInstanceOf(Error);
			expect(String(thrown)).not.toContain(secret);
			expect((thrown as Error).cause).toBeUndefined();
		}
	});
	test("passes caller cancellation to the request", async () => {
		const { deps, calls } = fixture(device);
		const controller = new AbortController();
		await startDeviceFlow({ ...deps, signal: controller.signal });
		controller.abort();
		expect(calls[0].init.signal?.aborted).toBe(true);
	});
});
