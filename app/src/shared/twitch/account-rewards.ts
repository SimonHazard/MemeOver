import { loadTwitchAuth } from "./auth-store";
import { TWITCH_CLIENT_ID } from "./config";
import { listRewards, type RewardsResult } from "./helix";

export async function loadAccountRewards(
	userId: string,
	signal: AbortSignal,
): Promise<RewardsResult> {
	const auth = await loadTwitchAuth();
	if (auth?.userId !== userId) return { status: "unauthorized" };
	return listRewards(
		{ fetch, clientId: TWITCH_CLIENT_ID, accessToken: auth.accessToken, signal },
		userId,
	);
}
