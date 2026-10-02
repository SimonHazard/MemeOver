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

for (const animation of [
	"straight",
	"serpentine",
	"bounce",
	"confetti",
	"pop",
	"firework",
] as const)
	test(`normal ${animation} duration opacity and timing`, () => {
		const frames = buildReactionKeyframes({ ...reaction, animation }, false);
		for (const node of [
			frames,
			...(frames.child ? [frames.child] : []),
			...(frames.particles ?? []),
		]) {
			const opacity = node.animate.opacity;
			if (opacity) {
				expect(opacity[0]).toBe(0);
				expect(opacity[opacity.length - 1]).toBe(0);
				for (const value of opacity)
					expect(Number(value)).toBeLessThanOrEqual(reaction.opacityPct / 100);
			}
			for (const transition of Object.values(node.transition) as {
				duration: number;
				times: number[];
			}[]) {
				expect(transition.duration).toBe(reaction.durationMs / 1000);
				expect(transition.times[0]).toBe(0);
				expect(transition.times[transition.times.length - 1]).toBe(1);
				expect(transition.times).toEqual([...transition.times].sort((a, b) => a - b));
			}
		}
	});
test("firework particle identities", () =>
	expect(
		buildReactionKeyframes({ ...reaction, animation: "firework" }, false).particles?.map(
			(p) => p.id,
		),
	).toEqual(["up-left", "up-right", "left", "right", "top"]));
for (const direction of [-1, 1] as const)
	test(`bounce direction ${direction}`, () => {
		const frames = buildReactionKeyframes({ ...reaction, animation: "bounce", direction }, false);
		expect(frames.animate.x[frames.animate.x.length - 1]).toBe(`${direction * 126}vw`);
		const y = (frames.transition as { y: { ease: string[] } }).y;
		expect(y.ease).toEqual(y.ease.map((_, i) => (i % 2 === 0 ? "circOut" : "circIn")));
	});
test("straight vertical range", () => {
	const frames = buildReactionKeyframes({ ...reaction, animation: "straight" }, false);
	expect(frames.animate.y[0]).toBe("20vh");
	expect(frames.animate.y[frames.animate.y.length - 1]).toBe("-120vh");
});
for (const [fadeInPct, fadeOutPct, expected] of [
	[0, 10, [0, 0.02, 0.55, 1]],
	[90, 100, [0, 0.4, 0.95, 1]],
] as const)
	test(`fade clamps ${fadeInPct}/${fadeOutPct}`, () =>
		expect(
			buildReactionKeyframes({ ...reaction, fadeInPct, fadeOutPct }, true).transition.times,
		).toEqual([...expected]));
