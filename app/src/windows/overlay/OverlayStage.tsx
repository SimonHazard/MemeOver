import { type ComponentType, Fragment, type ReactNode, useEffect } from "react";
import { useAppStore } from "@/shared/store";
import type { DisplayQueueItem } from "@/shared/types";
import { ConnectionNotifications } from "./components/connection-notifications";
import { FloatingReactions } from "./components/floating-reactions";
import { MediaPopup } from "./components/media-popup";
import { useMediaDisplay } from "./hooks/useMediaDisplay";
import { useOverlayWs } from "./hooks/useOverlayWs";

// ─── Shared stage ─────────────────────────────────────────────────────────────
// Rendered by the desktop overlay and by the browser source page, which runs in a plain
// browser: nothing here may reach a Tauri API, and window events go through `emitIfTauri`.
// `browser-source.spec.ts` enforces this, and `overlay-parity.spec.ts` compares the rendering.

interface OverlayStageProps {
	/** Mutes media sound on this surface only. */
	muted: boolean;
	/** Keeps the socket and status live while suppressing this surface's playback. */
	playbackEnabled?: boolean;
	/** Called whenever the displayed item changes (desktop history logging). */
	onCurrentChange?: (current: DisplayQueueItem | null) => void;
	/** Wraps the live media, e.g. the desktop dev simulation runtime. */
	MediaWrapper?: ComponentType<{ children: ReactNode }>;
}

function LiveOverlayMedia({
	muted,
	playbackEnabled = true,
	onCurrentChange,
}: Omit<OverlayStageProps, "MediaWrapper">) {
	useOverlayWs(playbackEnabled);
	const display = useMediaDisplay(playbackEnabled);
	const settings = useAppStore((s) => s.settings);
	const { current } = display;
	useEffect(() => {
		onCurrentChange?.(current);
	}, [current, onCurrentChange]);
	// Hide immediately, but leave players attached until useMediaDisplay has paused
	// them and cleared the current item. Detached media can otherwise keep playing.
	return (
		<div hidden={!playbackEnabled}>
			<MediaPopup {...display} settings={settings} muted={muted || !playbackEnabled} />
		</div>
	);
}

export function OverlayStage({
	muted,
	playbackEnabled = true,
	onCurrentChange,
	MediaWrapper = Fragment,
}: OverlayStageProps) {
	useEffect(() => {
		if (playbackEnabled) return;
		useAppStore.getState().clearQueue();
		useAppStore.getState().clearReactions();
	}, [playbackEnabled]);

	return (
		<>
			<MediaWrapper>
				<LiveOverlayMedia
					muted={muted}
					playbackEnabled={playbackEnabled}
					onCurrentChange={onCurrentChange}
				/>
			</MediaWrapper>
			{playbackEnabled && <FloatingReactions />}
			<ConnectionNotifications />
		</>
	);
}
