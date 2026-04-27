import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAppStore } from "@/shared/store";
import type { FloatingReaction } from "@/shared/types";
import { buildReactionKeyframes } from "./floating-reaction-animations";

function ReactionContent({
	reaction,
	decorative = false,
}: {
	reaction: FloatingReaction;
	decorative?: boolean;
}) {
	if (reaction.emojiUrl) {
		return (
			<img
				src={reaction.emojiUrl}
				alt={decorative ? "" : reaction.emoji}
				aria-hidden={decorative}
				draggable={false}
				style={{ height: "1em", width: "auto", display: "block" }}
			/>
		);
	}

	return decorative ? <span aria-hidden>{reaction.emoji}</span> : reaction.emoji;
}

/** `leftPct` and `durationMs` are stamped at spawn-time (not render-time) so each
 *  reaction keeps a stable trajectory across re-renders / strict-mode double invokes. */
export function FloatingReactions() {
	const reactions = useAppStore((s) => s.reactions);
	const removeReaction = useAppStore((s) => s.removeReaction);
	const reduceMotion = useReducedMotion();

	return (
		<div className="fixed inset-0 overflow-hidden pointer-events-none z-10">
			<AnimatePresence>
				{reactions.map((r) => {
					const keyframes = buildReactionKeyframes(r, reduceMotion === true);
					return (
						<motion.div
							key={r.id}
							className="absolute select-none flex items-center justify-center"
							style={{
								left: `${r.leftPct}%`,
								bottom: r.animation === "bounce" ? "3vh" : 0,
								fontSize: `${r.sizeVmin}vmin`,
								lineHeight: 1,
								transformOrigin: "50% 100%",
								translateX: "-50%",
							}}
							initial={keyframes.initial}
							animate={keyframes.animate}
							transition={keyframes.transition}
							onAnimationComplete={() => removeReaction(r.id)}
						>
							{keyframes.child ? (
								<motion.div
									className="flex items-center justify-center"
									initial={keyframes.child.initial}
									animate={keyframes.child.animate}
									transition={keyframes.child.transition}
								>
									<ReactionContent reaction={r} />
								</motion.div>
							) : (
								<ReactionContent reaction={r} />
							)}
							{keyframes.particles?.map((particle) => (
								<motion.div
									key={`${r.id}-${particle.id}`}
									className="absolute inset-0 flex items-center justify-center"
									initial={particle.initial}
									animate={particle.animate}
									transition={particle.transition}
								>
									<ReactionContent reaction={r} decorative />
								</motion.div>
							))}
						</motion.div>
					);
				})}
			</AnimatePresence>
		</div>
	);
}
