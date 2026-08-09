import { describe, expect, test } from "bun:test";
import type { FloatingReaction } from "@/shared/types";
import { buildReactionKeyframes } from "./floating-reaction-animations";

const reaction: FloatingReaction = {
	id: "reaction-1",
	emoji: "🎉",
	leftPct: 50,
	durationMs: 5000,
	animation: "pop",
	opacityPct: 72,
	sizeVmin: 6,
	fadeInPct: 15,
	fadeOutPct: 80,
	amplitudeVw: 8,
	direction: 1,
	rotationDeg: 24,
};

describe("buildReactionKeyframes", () => {
	test("keeps reduced-motion reactions stationary while preserving their fade", () => {
		const keyframes = buildReactionKeyframes(reaction, true);

		expect(keyframes.initial.x).toBe("0vw");
		expect(keyframes.initial.y).toBe("0vh");
		expect(keyframes.initial.rotate).toBe(0);
		expect(keyframes.animate.x).toEqual(["0vw", "0vw", "0vw", "0vw"]);
		expect(keyframes.animate.y).toEqual(["0vh", "0vh", "0vh", "0vh"]);
		expect(keyframes.animate.rotate).toEqual([0, 0, 0, 0]);
		expect(keyframes.animate.opacity).toEqual([0, 0.72, 0.72, 0]);
	});

	test("preserves the normal pop preset's dramatic starting scale", () => {
		const keyframes = buildReactionKeyframes(reaction, false);

		expect(keyframes.initial.scale).toBe(0.35);
	});
});
