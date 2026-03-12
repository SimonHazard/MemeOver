import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { useAppStore } from "@/shared/store";
import { MediaPopup } from "./components/media-popup";
import { useHistoryLogger } from "./hooks/useHistoryLogger";
import { useMediaDisplay } from "./hooks/useMediaDisplay";
import { useOverlayWs } from "./hooks/useOverlayWs";

// ─── Component ────────────────────────────────────────────────────────────────

export function OverlayApp() {
	const { settings } = useAppStore();

	// Dev-only: simulated production background
	const [devPreview, setDevPreview] = useState(false);

	useEffect(() => {
		if (!import.meta.env.DEV) return;
		// Store the unlisten fn once the promise resolves so cleanup is synchronous.
		let unlistenFn: (() => void) | undefined;
		void listen<boolean>("overlay-dev-preview", (e) => setDevPreview(e.payload)).then(
			(fn) => { unlistenFn = fn; },
		);
		return () => { unlistenFn?.(); };
	}, []);

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

			{/* ── DEV badge (always visible in dev, not only in preview) ── */}
			{import.meta.env.DEV && (
				<div
					className="absolute top-3 left-3 pointer-events-none select-none"
					style={{
						fontFamily: "monospace",
						fontSize: "10px",
						fontWeight: 700,
						letterSpacing: "0.1em",
						color: devPreview ? "#4ade80" : "#facc15",
						background: devPreview ? "rgba(0,40,10,0.75)" : "rgba(40,30,0,0.75)",
						border: `1px solid ${devPreview ? "#4ade80" : "#facc15"}`,
						borderRadius: "4px",
						padding: "2px 6px",
					}}
				>
					{devPreview ? "DEV · PROD PREVIEW" : "DEV"}
				</div>
			)}
		</div>
	);
}
