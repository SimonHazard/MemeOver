import { AnimatePresence, motion } from "framer-motion";
import { useAppStore } from "@/shared/store";

/** `leftPct` and `durationMs` are stamped at spawn-time (not render-time) so each
 *  reaction keeps a stable trajectory across re-renders / strict-mode double invokes. */
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
