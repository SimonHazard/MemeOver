import { EASE_OUT } from "@memeover/ui/lib/motion";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { numberDirection } from "./animated-number-logic";
export function AnimatedNumber({ value }: { value: number }) {
	const reduced = useReducedMotion();
	const [previous, setPrevious] = useState(value),
		[direction, setDirection] = useState(0);
	if (previous !== value) {
		setDirection(numberDirection(previous, value));
		setPrevious(value);
	}
	return (
		<span className="inline-block relative overflow-hidden h-[1lh] align-bottom tabular-nums">
			<AnimatePresence mode="popLayout" initial={false} custom={direction}>
				<motion.span
					key={value}
					className="inline-block"
					custom={direction}
					variants={{
						enter: (d: number) => ({ y: reduced ? 0 : `${d * 100}%`, opacity: 0 }),
						shown: { y: 0, opacity: 1 },
						exit: (d: number) => ({ y: reduced ? 0 : `${-d * 100}%`, opacity: 0 }),
					}}
					initial="enter"
					animate="shown"
					exit="exit"
					transition={{ duration: reduced ? 0.12 : 0.2, ease: EASE_OUT }}
				>
					{value}
				</motion.span>
			</AnimatePresence>
		</span>
	);
}
