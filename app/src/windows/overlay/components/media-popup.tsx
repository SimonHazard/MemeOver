import { AnimatePresence, motion } from "framer-motion";
import type { DisplayQueueItem, OverlayPosition, Settings } from "@/shared/types";
import { MediaDisplay } from "./media-display";

// ─── Position map (Tailwind) ──────────────────────────────────────────────────

const POSITION_CLASSES: Record<OverlayPosition, string> = {
	center: "inset-0 m-auto",
	"top-left": "top-8 left-8",
	"top-right": "top-8 right-8",
	"bottom-left": "bottom-8 left-8",
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
	return (
		<AnimatePresence mode="wait" onExitComplete={onExitComplete}>
			{isVisible && current && (
				<motion.div
					key={current.queueId}
					className={`fixed flex items-center justify-center ${POSITION_CLASSES[settings.position]}`}
					initial={{ scale: 0.3, opacity: 0 }}
					animate={{
						scale: 1,
						opacity: 1,
						transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
					}}
					exit={{
						scale: 0.85,
						opacity: 0,
						transition: { duration: 0.18, ease: "easeIn" },
					}}
				>
					<MediaDisplay
						item={current}
						settings={settings}
						onVideoEnd={onVideoEnd}
						startTimer={startTimer}
						onMediaError={onMediaError}
					/>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
