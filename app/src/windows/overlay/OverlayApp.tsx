import { useAppStore } from "@/shared/store";
import { MediaPopup } from "./components/media-popup";
import { useHistoryLogger } from "./hooks/use-history-logger";
import { useMediaDisplay } from "./hooks/useMediaDisplay";
import { useOverlayWs } from "./hooks/useOverlayWs";

// ─── Component ────────────────────────────────────────────────────────────────

export function OverlayApp() {
	const { settings } = useAppStore();

	// Connect to the bot WebSocket and feed the display queue
	useOverlayWs();

	// Sequentially display items from the queue with animations
	const { current, isVisible, onExitComplete, onVideoEnd, startTimer, onMediaError } =
		useMediaDisplay();

	// Persist each displayed item to the history store
	useHistoryLogger(current);

	return (
		<div className="fixed inset-0 w-screen h-screen overflow-hidden pointer-events-none bg-transparent">
			<MediaPopup
				current={current}
				isVisible={isVisible}
				settings={settings}
				onExitComplete={onExitComplete}
				onVideoEnd={onVideoEnd}
				startTimer={startTimer}
				onMediaError={onMediaError}
			/>
		</div>
	);
}
