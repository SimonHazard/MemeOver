import { EASE_OUT } from "@memeover/ui/lib/motion";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
export function StatusLabel({ status, label }: { status: string; label: string }) {
	const reduced = useReducedMotion();
	return (
		<span className="relative inline-block">
			<AnimatePresence mode="popLayout" initial={false}>
				<motion.span
					key={status}
					className="inline-block"
					initial={{ opacity: 0, filter: reduced ? "none" : "blur(2px)" }}
					animate={{
						opacity: 1,
						filter: "blur(0px)",
						transition: { duration: 0.15, ease: EASE_OUT },
					}}
					exit={{
						opacity: 0,
						filter: reduced ? "none" : "blur(2px)",
						transition: { duration: 0.1, ease: EASE_OUT },
					}}
				>
					{label}
				</motion.span>
			</AnimatePresence>
		</span>
	);
}
