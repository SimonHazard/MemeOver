import { z } from "zod";
import { TWITCH_AUTH_BASE, TWITCH_SCOPES } from "./config";

export interface OAuthDeps {
	fetch: typeof fetch;
	clientId: string;
	signal?: AbortSignal;
}
export interface TwitchTokens {
	accessToken: string;
	refreshToken: string;
	expiresAt: number;
}
const TokenSchema = z.object({
	access_token: z.string().min(1),
	refresh_token: z.string().min(1),
	expires_in: z.number().int().positive(),
	scope: z.array(z.string()),
});
const DeviceSchema = z.object({
	device_code: z.string().min(1),
	user_code: z.string().min(1),
	verification_uri: z.string().url(),
	expires_in: z.number().int().positive(),
	interval: z.number().int().positive(),
});
const ValidationSchema = z.object({
	client_id: z.string(),
	user_id: z.string().regex(/^\d{1,20}$/),
	login: z.string().regex(/^[a-z0-9_]{1,25}$/),
	scopes: z.array(z.string()),
	expires_in: z.number().int().nonnegative(),
});

// Never retain a response body or the original network error in an error chain: either may
// contain credentials. Cancellation still propagates through deps.signal for the caller.
async function request(deps: OAuthDeps, path: string, init: RequestInit): Promise<Response> {
	try {
		const timeout = AbortSignal.timeout(15_000);
		// Window.fetch rejects an arbitrary receiver; invoke the injected function on its own.
		const fetchRequest = deps.fetch;
		return await fetchRequest(`${TWITCH_AUTH_BASE}/${path}`, {
			...init,
			credentials: "omit",
			referrerPolicy: "no-referrer",
			signal: deps.signal ? AbortSignal.any([deps.signal, timeout]) : timeout,
		});
	} catch {
		throw new Error("Twitch request failed");
	}
}
async function readJson(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		throw new Error("Invalid Twitch response");
	}
}
function form(fields: Record<string, string>): RequestInit {
	return {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams(fields),
	};
}
async function readTokens(response: Response, now: number): Promise<TwitchTokens> {
	const result = TokenSchema.safeParse(await readJson(response));
	if (!result.success) throw new Error("Invalid Twitch token response");
	return {
		accessToken: result.data.access_token,
		refreshToken: result.data.refresh_token,
		expiresAt: now + result.data.expires_in * 1000,
	};
}

export async function startDeviceFlow(deps: OAuthDeps) {
	const response = await request(
		deps,
		"device",
		form({ client_id: deps.clientId, scopes: TWITCH_SCOPES.join(" ") }),
	);
	if (!response.ok) throw new Error("Twitch device authorization failed");
	const result = DeviceSchema.safeParse(await readJson(response));
	if (!result.success) throw new Error("Invalid Twitch device response");
	const data = result.data;
	const uri = new URL(data.verification_uri);
	if (
		uri.protocol !== "https:" ||
		(uri.hostname !== "twitch.tv" && !uri.hostname.endsWith(".twitch.tv")) ||
		uri.username ||
		uri.password ||
		uri.port
	)
		throw new Error("Invalid Twitch verification address");
	return {
		deviceCode: data.device_code,
		userCode: data.user_code,
		verificationUri: data.verification_uri,
		expiresInS: data.expires_in,
		intervalS: data.interval,
	};
}

export type DeviceTokenResult =
	| { status: "pending" | "slow_down" | "denied" | "expired" }
	| { status: "granted"; tokens: TwitchTokens };
export async function pollDeviceToken(
	deps: OAuthDeps,
	deviceCode: string,
	now = Date.now(),
): Promise<DeviceTokenResult> {
	const response = await request(
		deps,
		"token",
		form({
			client_id: deps.clientId,
			scopes: TWITCH_SCOPES.join(" "),
			device_code: deviceCode,
			grant_type: "urn:ietf:params:oauth:grant-type:device_code",
		}),
	);
	if (response.status === 400) {
		const parsed = z.object({ message: z.string() }).safeParse(await readJson(response));
		switch (parsed.success ? parsed.data.message : "") {
			case "authorization_pending":
				return { status: "pending" };
			case "slow_down":
				return { status: "slow_down" };
			case "access_denied":
				return { status: "denied" };
			default:
				return { status: "expired" };
		}
	}
	if (!response.ok) throw new Error("Twitch token request failed");
	return { status: "granted", tokens: await readTokens(response, now) };
}

export async function refreshTokens(
	deps: OAuthDeps,
	refreshToken: string,
	now = Date.now(),
): Promise<{ status: "refreshed"; tokens: TwitchTokens } | { status: "reauth_required" }> {
	const response = await request(
		deps,
		"token",
		form({
			grant_type: "refresh_token",
			refresh_token: refreshToken,
			client_id: deps.clientId,
		}),
	);
	if (response.status === 400 || response.status === 401) return { status: "reauth_required" };
	if (!response.ok) throw new Error("Twitch refresh failed");
	return { status: "refreshed", tokens: await readTokens(response, now) };
}

export async function validateToken(
	deps: OAuthDeps,
	accessToken: string,
): Promise<
	| { status: "invalid" }
	| {
			status: "valid";
			userId: string;
			login: string;
			scopes: string[];
			expiresInS: number;
	  }
> {
	const response = await request(deps, "validate", {
		headers: { Authorization: `OAuth ${accessToken}` },
	});
	if (response.status === 401) return { status: "invalid" };
	if (!response.ok) throw new Error("Twitch validation failed");
	const parsed = ValidationSchema.safeParse(await readJson(response));
	if (!parsed.success || parsed.data.client_id !== deps.clientId) return { status: "invalid" };
	return {
		status: "valid",
		userId: parsed.data.user_id,
		login: parsed.data.login,
		scopes: parsed.data.scopes,
		expiresInS: parsed.data.expires_in,
	};
}

export async function revokeToken(deps: OAuthDeps, token: string): Promise<void> {
	await request(deps, "revoke", form({ client_id: deps.clientId, token }));
}
