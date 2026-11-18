/** Public identifier of MemeOver's Twitch application (Client Type: Public). Not a secret. */
export const TWITCH_CLIENT_ID = "6wybfz760os23n9tslcq7e6lszsq4a";
export const TWITCH_SCOPES = ["user:read:chat", "channel:read:redemptions"] as const;
export const TWITCH_AUTH_BASE = "https://id.twitch.tv/oauth2";
export const TWITCH_API_BASE = "https://api.twitch.tv/helix";
export function isTwitchConfigured(clientId: string = TWITCH_CLIENT_ID): boolean {
	return /^[a-z0-9]{20,40}$/.test(clientId);
}
