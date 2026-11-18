import { z } from "zod";
import { TWITCH_SCOPES } from "./config";

const TwitchAuthSchema = z.object({
	accessToken: z.string().min(1).max(4096),
	refreshToken: z.string().min(1).max(4096),
	expiresAt: z.number().finite().nonnegative().max(8.64e15),
	userId: z.string().regex(/^\d{1,20}$/),
	login: z.string().regex(/^[a-z0-9_]{1,25}$/),
	scopes: z.array(z.string().min(1).max(128)).max(64),
});

export interface TwitchAuth {
	accessToken: string;
	refreshToken: string;
	/** Epoch ms after which the access token must be refreshed. */
	expiresAt: number;
	userId: string;
	login: string;
	scopes: string[];
}

export function normalizeTwitchAuth(value: unknown): TwitchAuth | null {
	const result = TwitchAuthSchema.safeParse(value);
	return result.success ? result.data : null;
}

export type TokenDecision = "use" | "refresh";
/** Refresh 5 minutes before expiry so a session never starts with a dying token. */
export function tokenDecision(auth: TwitchAuth, now: number): TokenDecision {
	return auth.expiresAt - now <= 5 * 60 * 1000 ? "refresh" : "use";
}

export function hasRequiredScopes(auth: Pick<TwitchAuth, "scopes">): boolean {
	return TWITCH_SCOPES.every((scope) => auth.scopes.includes(scope));
}
