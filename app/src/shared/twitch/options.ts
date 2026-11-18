export const TWITCH_ROLES = ["broadcaster", "moderator", "vip", "subscriber", "everyone"] as const;
export type TwitchRole = (typeof TWITCH_ROLES)[number];
export interface TwitchOptions {
	enabled: boolean;
	emoteReactions: boolean;
	mediaCommand: boolean;
	mediaMinRole: TwitchRole;
	textCommand: boolean;
	textMinRole: TwitchRole;
	rewardId: string;
	alerts: boolean;
}
export const DEFAULT_TWITCH_OPTIONS: TwitchOptions = {
	enabled: false,
	emoteReactions: true,
	mediaCommand: true,
	mediaMinRole: "moderator",
	textCommand: false,
	textMinRole: "moderator",
	rewardId: "",
	alerts: true,
};
export const TWITCH_MEDIA_COMMAND = "!meme";
export const TWITCH_TEXT_COMMAND = "!say";
export function normalizeTwitchOptions(value: unknown): TwitchOptions {
	const out = { ...DEFAULT_TWITCH_OPTIONS };
	if (!value || typeof value !== "object" || Array.isArray(value)) return out;
	const saved = value as Record<string, unknown>;
	for (const key of [
		"enabled",
		"emoteReactions",
		"mediaCommand",
		"textCommand",
		"alerts",
	] as const) {
		if (typeof saved[key] === "boolean") out[key] = saved[key];
	}
	for (const key of ["mediaMinRole", "textMinRole"] as const) {
		const role = saved[key];
		if (typeof role === "string" && TWITCH_ROLES.some((allowed) => allowed === role))
			out[key] = role as TwitchRole;
	}
	if (typeof saved.rewardId === "string" && /^[A-Za-z0-9-]{0,64}$/.test(saved.rewardId))
		out.rewardId = saved.rewardId;
	return out;
}
