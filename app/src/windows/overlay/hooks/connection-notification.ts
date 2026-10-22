import type { OverlayHealth } from "@/shared/types";

/** The first count is a snapshot, including this overlay, rather than a new arrival. */
export function newlyConnectedCount(
	previous: number | null,
	current: number,
	enabled: boolean,
	health: OverlayHealth,
): number {
	if (!enabled || health === "closed" || previous === null) return 0;
	return Math.max(0, current - previous);
}
