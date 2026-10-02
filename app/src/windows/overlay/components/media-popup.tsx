import { EASE_OUT } from "@memeover/ui/lib/motion";
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
	src?: string;
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
	src,
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
				<div
					key={current.queueId}
					className={`fixed flex items-center justify-center ${POSITION_CLASSES[settings.position]}`}
				>
					<div
						style={{
							transform: `translate(${settings.positionOffsetX}vw, ${settings.positionOffsetY}vh)`,
						}}
					>
						<motion.div
							style={{ transformOrigin: "50% 50%" }}
							initial={{ scale: reduceMotion ? 1 : 0.3, opacity: 0 }}
							animate={{
								scale: 1,
								opacity: 1,
								transition: reduceMotion
									? { duration: 0.12, ease: EASE_OUT }
									: { type: "spring", duration: 0.28, bounce: 0.2 },
							}}
							exit={{
								scale: reduceMotion ? 1 : 0.96,
								opacity: 0,
								transition: { duration: reduceMotion ? 0.12 : 0.13, ease: EASE_OUT },
							}}
						>
							<MediaDisplay
								item={current}
								src={src}
								settings={settings}
								onVideoEnd={onVideoEnd}
								startTimer={startTimer}
								onMediaError={onMediaError}
							/>
						</motion.div>
					</div>
				</div>
			)}
		</AnimatePresence>
	);
}
