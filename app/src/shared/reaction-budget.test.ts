import { describe, expect, test } from "bun:test";
import {
	appendReactionWithinBudget,
	REACTION_ANIMATION_COST,
	REACTION_SCENE_BUDGET,
} from "./reaction-budget";
import type { FloatingReaction, FloatingReactionAnimation } from "./types";

function createReaction(id: string, animation: FloatingReactionAnimation): FloatingReaction {
	return {
		id,
		emoji: "🎉",
		leftPct: 50,
		durationMs: 5000,
		animation,
		opacityPct: 100,
		sizeVmin: 6,
		fadeInPct: 10,
		fadeOutPct: 80,
		amplitudeVw: 8,
		direction: 1,
		rotationDeg: 12,
	};
}

function appendBurst(reactions: FloatingReaction[]): FloatingReaction[] {
	return reactions.reduce<FloatingReaction[]>(appendReactionWithinBudget, []);
}

function getSceneCost(reactions: readonly FloatingReaction[]): number {
	return reactions.reduce(
		(total, reaction) => total + REACTION_ANIMATION_COST[reaction.animation],
		0,
	);
}

describe("reaction complexity budget", () => {
	test("evicts the oldest mixed reactions and always admits the latest", () => {
		const existing = [
			...Array.from({ length: 20 }, (_, index) =>
				createReaction(`straight-${index + 1}`, "straight"),
			),
			...Array.from({ length: 4 }, (_, index) =>
				createReaction(`firework-${index + 1}`, "firework"),
			),
		];
		const incoming = createReaction("latest", "pop");

		const retained = appendReactionWithinBudget(existing, incoming);

		expect(retained.map((reaction) => reaction.id)).toEqual([
			...existing.slice(1).map((reaction) => reaction.id),
			incoming.id,
		]);
		expect(retained[retained.length - 1]).toBe(incoming);
		expect(getSceneCost(retained)).toBe(REACTION_SCENE_BUDGET);
	});

	test("does not mutate the input array", () => {
		const first = createReaction("first", "straight");
		const second = createReaction("second", "firework");
		const existing = Object.freeze([first, second]);

		const retained = appendReactionWithinBudget(existing, createReaction("latest", "pop"));

		expect(existing).toEqual([first, second]);
		expect(retained).not.toBe(existing);
	});

	for (const [animation, capacity] of [
		["straight", 30],
		["serpentine", 20],
		["bounce", 20],
		["confetti", 20],
		["pop", 30],
		["firework", 12],
	] as const) {
		test(`a ${animation} burst keeps the newest ${capacity} reactions`, () => {
			const burst = Array.from({ length: 40 }, (_, index) =>
				createReaction(String(index), animation),
			);
			expect(appendBurst(burst)).toEqual(burst.slice(-capacity));
		});
	}
});
