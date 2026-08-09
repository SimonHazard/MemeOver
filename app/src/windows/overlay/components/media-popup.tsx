import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { DisplayQueueItem, OverlayPosition, Settings } from "@/shared/types";
import { MediaDisplay } from "./media-display";

// ─── Position map (Tailwind) ──────────────────────────────────────────────────

const POSITION_CLASSES: Record<OverlayPosition, string> = {
	center: "inset-0 m-auto",
	"top-left": "top-8 left-8",
	top: "top-8 left-1/2 -translate-x-1/2",
	"top-right": "top-8 right-8",
	left: "top-1/2 left-8 -translate-y-1/2",
	right: "top-1/2 right-8 -translate-y-1/2",
	"bottom-left": "bottom-8 left-8",
	bottom: "bottom-8 left-1/2 -translate-x-1/2",
	"bottom-right": "bottom-8 right-8",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface MediaPopupProps {
	current: DisplayQueueItem | null;
	isVisible: boolean;
	settings: Settings;
	onExitComplete: () => void;
	onVideoEnd: () => void;
	startTimer: () => void;
	onMediaError: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MediaPopup({
	current,
	isVisible,
	settings,
	onExitComplete,
	onVideoEnd,
	startTimer,
	onMediaError,
}: MediaPopupProps) {
	const reduceMotion = useReducedMotion();

	return (
		<AnimatePresence mode="wait" onExitComplete={onExitComplete}>
			{isVisible && current && (
				<motion.div
					key={current.queueId}
					className={`fixed flex items-center justify-center ${POSITION_CLASSES[settings.position]}`}
					initial={{ scale: reduceMotion ? 1 : 0.3, opacity: 0 }}
					animate={{
						scale: 1,
						opacity: 1,
						transition: reduceMotion
							? { duration: 0.12, ease: [0.23, 1, 0.32, 1] }
							: { type: "spring", duration: 0.28, bounce: 0.2 },
					}}
					exit={{
						scale: reduceMotion ? 1 : 0.96,
						opacity: 0,
						transition: { duration: reduceMotion ? 0.12 : 0.13, ease: [0.23, 1, 0.32, 1] },
					}}
				>
					{/* Inner wrapper applies the user offset without fighting the anchor's
					    Tailwind -translate-x-1/2 on top/bottom/center positions. */}
					<div
						style={{
							transform: `translate(${settings.positionOffsetX}vw, ${settings.positionOffsetY}vh)`,
						}}
					>
						<MediaDisplay
							item={current}
							settings={settings}
							onVideoEnd={onVideoEnd}
							startTimer={startTimer}
							onMediaError={onMediaError}
						/>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
