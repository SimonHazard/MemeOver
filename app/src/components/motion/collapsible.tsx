import { EASE_OUT } from "@memeover/ui/lib/motion";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
export function Collapsible({ open, children }: { open: boolean; children: ReactNode }) {
	const reduced = useReducedMotion();
	return (
		<AnimatePresence initial={false}>
			{open && (
				<motion.div
					className="grid"
					initial={{ gridTemplateRows: reduced ? "1fr" : "0fr", opacity: 0 }}
					animate={{
						gridTemplateRows: "1fr",
						opacity: 1,
						transition: { duration: reduced ? 0.12 : 0.2, ease: EASE_OUT },
					}}
					exit={{
						gridTemplateRows: reduced ? "1fr" : "0fr",
						opacity: 0,
						transition: { duration: reduced ? 0.12 : 0.15, ease: EASE_OUT },
					}}
				>
					<div className="min-h-0 overflow-hidden">{children}</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
