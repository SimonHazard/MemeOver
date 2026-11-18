import { expect, test } from "bun:test";
import { TWITCH_ROLES } from "./options";
import { type ChatterRole, chatterRole, meetsMinimumRole } from "./roles";

test("badge aliases and priority", () => {
	for (const [badge, role] of [
		["broadcaster", "broadcaster"],
		["moderator", "moderator"],
		["lead_moderator", "moderator"],
		["vip", "vip"],
		["subscriber", "subscriber"],
		["founder", "subscriber"],
		["other", "viewer"],
	] as const)
		expect(chatterRole([badge])).toBe(role);
	expect(chatterRole(["subscriber", "moderator", "broadcaster"])).toBe("broadcaster");
	expect(chatterRole([])).toBe("viewer");
});
test("all role thresholds follow the complete rank matrix", () => {
	const ranks: ChatterRole[] = ["viewer", "subscriber", "vip", "moderator", "broadcaster"];
	for (const role of ranks)
		for (const min of TWITCH_ROLES)
			expect(meetsMinimumRole(role, min)).toBe(
				min === "everyone" || ranks.indexOf(role) >= ranks.indexOf(min),
			);
});
