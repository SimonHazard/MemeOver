import type { FloatingReaction, FloatingReactionAnimation } from "./types";

export const MAX_REACTION_COUNT = 30;
export const REACTION_SCENE_BUDGET = 60;

export const REACTION_ANIMATION_COST = {
	straight: 2,
	pop: 2,
	serpentine: 3,
	bounce: 3,
	confetti: 3,
	firework: 5,
} as const satisfies Record<FloatingReactionAnimation, number>;

export function getReactionCapacity(animation: FloatingReactionAnimation): number {
	return Math.min(
		MAX_REACTION_COUNT,
		Math.floor(REACTION_SCENE_BUDGET / REACTION_ANIMATION_COST[animation]),
	);
}

export function appendReactionWithinBudget(
	reactions: readonly FloatingReaction[],
	incoming: FloatingReaction,
): FloatingReaction[] {
	const candidates = [...reactions, incoming];
	let totalCost = candidates.reduce(
		(sum, reaction) => sum + REACTION_ANIMATION_COST[reaction.animation],
		0,
	);
	let firstRetainedIndex = 0;

	while (
		candidates.length - firstRetainedIndex > MAX_REACTION_COUNT ||
		totalCost > REACTION_SCENE_BUDGET
	) {
		totalCost -= REACTION_ANIMATION_COST[candidates[firstRetainedIndex].animation];
		firstRetainedIndex += 1;
	}

	return candidates.slice(firstRetainedIndex);
}
