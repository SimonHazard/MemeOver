import type { Transition } from "framer-motion";
import type { FloatingReaction } from "@/shared/types";

type ReactionKeyframes = {
	initial: Record<string, number | string>;
	animate: Record<string, Array<number | string>>;
	transition: Transition;
	child?: {
		initial: Record<string, number | string>;
		animate: Record<string, Array<number | string>>;
		transition: Transition;
	};
	particles?: Array<{
		id: string;
		initial: Record<string, number | string>;
		animate: Record<string, Array<number | string>>;
		transition: Transition;
	}>;
};

const FIREWORK_PARTICLES = [
	{ id: "up-left", x: -8, y: -7, rotate: -28 },
	{ id: "up-right", x: 8, y: -8, rotate: 24 },
	{ id: "left", x: -11, y: 1, rotate: -16 },
	{ id: "right", x: 11, y: 0, rotate: 18 },
	{ id: "top", x: 0, y: -11, rotate: 8 },
] as const;

function clampProgress(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value / 100));
}

function sampledOpacity(
	times: number[],
	fadeIn: number,
	fadeOut: number,
	maxOpacity: number,
): number[] {
	return times.map((time) => {
		if (time <= fadeIn) return maxOpacity * (time / fadeIn);
		if (time >= fadeOut) return maxOpacity * Math.max(0, (1 - time) / (1 - fadeOut));
		return maxOpacity;
	});
}

function bounceEaseSegments(times: number[]): Array<"circIn" | "circOut"> {
	return times.slice(1).map((_, index) => (index % 2 === 0 ? "circOut" : "circIn"));
}

export function buildReactionKeyframes(
	reaction: FloatingReaction,
	reduceMotion: boolean,
): ReactionKeyframes {
	const fadeIn = clampProgress(reaction.fadeInPct, 0.02, 0.4);
	const fadeOut = clampProgress(reaction.fadeOutPct, Math.max(0.55, fadeIn + 0.1), 0.95);
	const amp = reaction.amplitudeVw;
	const direction = reaction.direction;
	const rotate = reaction.rotationDeg;
	const maxOpacity = reaction.opacityPct / 100;
	const duration = reaction.durationMs / 1000;

	if (reduceMotion) {
		const times = [0, fadeIn, fadeOut, 1];
		return {
			initial: { y: "0vh", opacity: 0, scale: 0.85 },
			animate: {
				x: ["0vw", "0vw", "0vw", "0vw"],
				y: ["0vh", "-8vh", "-10vh", "-10vh"],
				opacity: [0, maxOpacity, maxOpacity, 0],
				rotate: [0, 0, 0, 0],
				scale: [0.85, 1, 1, 0.95],
			},
			transition: { duration, ease: "easeOut", times },
		};
	}

	if (reaction.animation === "serpentine") {
		const verticalTimes = [0, fadeIn, fadeOut, 1];
		const waveTimes = [0, 0.08, 0.24, 0.4, 0.56, 0.72, 0.88, 1];
		const x = [
			"0vw",
			`${amp}vw`,
			`${-amp}vw`,
			`${amp}vw`,
			`${-amp}vw`,
			`${amp}vw`,
			`${-amp}vw`,
			"0vw",
		];
		const childRotate = [
			0,
			rotate * 0.1,
			-rotate * 0.1,
			rotate * 0.1,
			-rotate * 0.1,
			rotate * 0.1,
			-rotate * 0.1,
			0,
		];
		return {
			initial: { y: "18vh", opacity: 0, scale: 1 },
			animate: {
				x: ["0vw", "0vw", "0vw", "0vw"],
				y: ["18vh", "0vh", "-104vh", "-120vh"],
				opacity: [0, maxOpacity, maxOpacity, 0],
				rotate: [0, 0, 0, 0],
				scale: [1, 1, 1, 0.94],
			},
			transition: {
				x: { duration, ease: "linear" as const, times: verticalTimes },
				y: { duration, ease: "linear" as const, times: verticalTimes },
				opacity: { duration, ease: "linear" as const, times: verticalTimes },
				rotate: { duration, ease: "linear" as const, times: verticalTimes },
				scale: { duration, ease: "linear" as const, times: verticalTimes },
			},
			child: {
				initial: { x: "0vw", rotate: 0 },
				animate: { x, rotate: childRotate },
				transition: {
					x: { duration, ease: "easeInOut" as const, times: waveTimes },
					rotate: { duration, ease: "easeInOut" as const, times: waveTimes },
				},
			},
		};
	}

	if (reaction.animation === "bounce") {
		const times = [0, 0.15, 0.3, 0.42, 0.54, 0.64, 0.74, 0.82, 0.9, 0.96, 1];
		const segmentEase = bounceEaseSegments(times);
		return {
			initial: { y: "0vh", opacity: 0, scaleX: 0.9, scaleY: 0.9 },
			animate: {
				x: times.map((time) => `${direction * (time * 126)}vw`),
				y: ["0vh", "-42vh", "0vh", "-29vh", "0vh", "-19vh", "0vh", "-11vh", "0vh", "-5vh", "0vh"],
				opacity: sampledOpacity(times, fadeIn, fadeOut, maxOpacity),
				rotate: times.map((time) => direction * time * 540),
				scaleX: [0.94, 1, 1.13, 1, 1.1, 1, 1.07, 1, 1.04, 1, 1],
				scaleY: [0.94, 1, 0.84, 1, 0.88, 1, 0.92, 1, 0.96, 1, 1],
			},
			transition: {
				x: { duration, ease: "linear" as const, times },
				y: { duration, ease: segmentEase, times },
				opacity: { duration, ease: "linear" as const, times },
				rotate: { duration, ease: "linear" as const, times },
				scaleX: { duration, ease: segmentEase, times },
				scaleY: { duration, ease: segmentEase, times },
			},
		};
	}

	if (reaction.animation === "confetti") {
		const times = [0, fadeIn, 0.36, 0.62, fadeOut, 1];
		const drift = direction * (amp * 2.4);
		return {
			initial: { x: "0vw", y: "18vh", opacity: 0, rotate: -rotate * 0.4, scale: 0.82 },
			animate: {
				x: [
					"0vw",
					`${drift * 0.2}vw`,
					`${drift * 0.55}vw`,
					`${drift * 0.85}vw`,
					`${drift}vw`,
					`${drift * 1.08}vw`,
				],
				y: ["18vh", "1vh", "-30vh", "-66vh", "-104vh", "-120vh"],
				opacity: [0, maxOpacity, maxOpacity, maxOpacity, maxOpacity, 0],
				rotate: [-rotate * 0.4, rotate * 0.8, -rotate * 0.55, rotate * 0.45, -rotate * 0.2, 0],
				scale: [0.82, 1.04, 1, 1.02, 0.94, 0.82],
			},
			transition: {
				x: { duration, ease: "easeInOut" as const, times },
				y: { duration, ease: "linear" as const, times },
				opacity: { duration, ease: "linear" as const, times },
				rotate: { duration, ease: "easeInOut" as const, times },
				scale: { duration, ease: "easeOut" as const, times },
			},
		};
	}

	if (reaction.animation === "pop") {
		const times = [0, 0.16, 0.34, 0.68, fadeOut, 1];
		return {
			initial: { x: "0vw", y: "6vh", opacity: 0, rotate: 0, scale: 0.35 },
			animate: {
				x: ["0vw", "0vw", `${direction * 1.2}vw`, `${direction * -0.7}vw`, "0vw", "0vw"],
				y: ["6vh", "-4vh", "-7vh", "-9vh", "-18vh", "-24vh"],
				opacity: [0, maxOpacity, maxOpacity, maxOpacity, maxOpacity, 0],
				rotate: [0, rotate * 0.08, -rotate * 0.08, rotate * 0.04, 0, 0],
				scale: [0.35, 1.22, 0.94, 1, 0.96, 0.82],
			},
			transition: {
				x: { duration, ease: "easeInOut" as const, times },
				y: { duration, ease: "easeOut" as const, times },
				opacity: { duration, ease: "linear" as const, times },
				rotate: { duration, ease: "easeInOut" as const, times },
				scale: {
					duration,
					ease: ["backOut", "easeInOut", "easeOut", "linear", "easeIn"],
					times,
				},
			},
		};
	}

	if (reaction.animation === "firework") {
		const times = [0, 0.22, 0.48, 0.62, fadeOut, 1];
		const particleTimes = [0, 0.48, 0.7, 1];
		return {
			initial: { x: "0vw", y: "20vh", opacity: 0, rotate: 0, scale: 0.72 },
			animate: {
				x: [
					"0vw",
					"0vw",
					`${direction * 1.5}vw`,
					`${direction * 1.5}vw`,
					`${direction * 1.5}vw`,
					`${direction * 1.5}vw`,
				],
				y: ["20vh", "-18vh", "-44vh", "-45vh", "-48vh", "-50vh"],
				opacity: [0, maxOpacity, maxOpacity, maxOpacity * 0.2, 0, 0],
				rotate: [0, rotate * 0.08, 0, 0, 0, 0],
				scale: [0.72, 1.03, 1, 0.55, 0.25, 0.2],
			},
			transition: {
				x: { duration, ease: "linear" as const, times },
				y: { duration, ease: ["circOut", "easeOut", "linear", "linear", "linear"], times },
				opacity: { duration, ease: "linear" as const, times },
				rotate: { duration, ease: "easeOut" as const, times },
				scale: { duration, ease: ["backOut", "easeOut", "easeIn", "linear", "linear"], times },
			},
			particles: FIREWORK_PARTICLES.map((particle) => ({
				id: particle.id,
				initial: { x: "0vw", y: "0vh", opacity: 0, scale: 0.25, rotate: 0 },
				animate: {
					x: ["0vw", "0vw", `${particle.x}vw`, `${particle.x * 1.35}vw`],
					y: ["0vh", "0vh", `${particle.y}vh`, `${particle.y * 1.2 + 6}vh`],
					opacity: [0, 0, maxOpacity * 0.62, 0],
					scale: [0.25, 0.25, 0.58, 0.24],
					rotate: [0, 0, particle.rotate, particle.rotate * 1.4],
				},
				transition: {
					x: { duration, ease: "easeOut" as const, times: particleTimes },
					y: { duration, ease: "easeOut" as const, times: particleTimes },
					opacity: { duration, ease: "linear" as const, times: particleTimes },
					scale: { duration, ease: "easeOut" as const, times: particleTimes },
					rotate: { duration, ease: "easeOut" as const, times: particleTimes },
				},
			})),
		};
	}

	const middle = fadeIn + (fadeOut - fadeIn) / 2;
	const straightTimes = [0, fadeIn, middle, fadeOut, 1];
	return {
		initial: { y: "20vh", opacity: 0, scale: 1 },
		animate: {
			x: ["0vw", "0vw", "0vw", "0vw", "0vw"],
			y: ["20vh", "0vh", "-50vh", "-96vh", "-120vh"],
			opacity: [0, maxOpacity, maxOpacity, maxOpacity, 0],
			rotate: [0, 0, 0, 0, 0],
			scale: [1, 1, 1, 1, 1],
		},
		transition: {
			x: { duration, ease: "linear" as const, times: straightTimes },
			y: { duration, ease: "linear" as const, times: straightTimes },
			opacity: { duration, ease: "linear" as const, times: straightTimes },
			rotate: { duration, ease: "linear" as const, times: straightTimes },
			scale: { duration, ease: "linear" as const, times: straightTimes },
		},
	};
}
