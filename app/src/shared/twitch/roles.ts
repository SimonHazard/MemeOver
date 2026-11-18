import type { TwitchRole } from "./options";
export type ChatterRole = Exclude<TwitchRole, "everyone"> | "viewer";
const ROLE_RANK: Record<ChatterRole, number> = {
	viewer: 0,
	subscriber: 1,
	vip: 2,
	moderator: 3,
	broadcaster: 4,
};
export function chatterRole(badgeSetIds: readonly string[]): ChatterRole {
	if (badgeSetIds.includes("broadcaster")) return "broadcaster";
	if (badgeSetIds.includes("moderator") || badgeSetIds.includes("lead_moderator"))
		return "moderator";
	if (badgeSetIds.includes("vip")) return "vip";
	if (badgeSetIds.includes("subscriber") || badgeSetIds.includes("founder")) return "subscriber";
	return "viewer";
}
export function meetsMinimumRole(role: ChatterRole, min: TwitchRole): boolean {
	return min === "everyone" || ROLE_RANK[role] >= ROLE_RANK[min];
}
