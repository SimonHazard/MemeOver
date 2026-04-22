import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "@/shared/store";

/**
 * Translucent emojis that drift from the bottom of the overlay to the top when
 * a watched Discord channel receives a reaction. Independent of the media
 * queue — always rendered above the media popup but beneath the DEV badge.
 *
 * `leftPct` and `durationMs` are stamped once at spawn-time (store action), so
 * each reaction has a stable trajectory even across React re-renders.
 */
export function FloatingReactions() {
	const reactions = useAppStore((s) => s.reactions);
	const removeReaction = useAppStore((s) => s.removeReaction);

	return (
		<div className="fixed inset-0 overflow-hidden pointer-events-none z-10">
			<AnimatePresence>
				{reactions.map((r) => (
					<motion.div
						key={r.id}
						className="absolute select-none flex items-center justify-center"
						style={{
							left: `${r.leftPct}%`,
							bottom: 0,
							fontSize: "6vmin",
							lineHeight: 1,
							// Center the glyph on the randomized x position
							translateX: "-50%",
						}}
						initial={{ y: "20vh", opacity: 0, scale: 0.6 }}
						animate={{
							y: "-110vh",
							opacity: [0, 0.8, 0.8, 0],
							scale: [0.6, 1.1, 1, 0.85],
						}}
						transition={{
							duration: r.durationMs / 1000,
							ease: "easeOut",
							times: [0, 0.15, 0.75, 1],
						}}
						onAnimationComplete={() => removeReaction(r.id)}
					>
						{r.emojiUrl ? (
							<img
								src={r.emojiUrl}
								alt={r.emoji}
								draggable={false}
								// Match the unicode glyph height — `1em` syncs to the container's fontSize
								style={{ height: "1em", width: "auto", display: "block" }}
							/>
						) : (
							r.emoji
						)}
					</motion.div>
				))}
			</AnimatePresence>
		</div>
	);
}
