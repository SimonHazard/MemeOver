import { type ComponentType, Fragment, type ReactNode, useEffect } from "react";
import { useAppStore } from "@/shared/store";
import type { DisplayQueueItem } from "@/shared/types";
import { ConnectionNotifications } from "./components/connection-notifications";
import { FloatingReactions } from "./components/floating-reactions";
import { MediaPopup } from "./components/media-popup";
import { useMediaDisplay } from "./hooks/useMediaDisplay";
import { useOverlayWs } from "./hooks/useOverlayWs";

// ─── Shared stage ─────────────────────────────────────────────────────────────
// Rendered by the desktop overlay and by the OBS browser source page. Nothing on
// this import path may call a Tauri API at import time: the OBS page runs in a
// plain browser. Window events go through `emitIfTauri`.

interface OverlayStageProps {
	/** Mutes media sound on this surface only. */
	muted: boolean;
	/** Called whenever the displayed item changes (desktop history logging). */
	onCurrentChange?: (current: DisplayQueueItem | null) => void;
	/** Wraps the live media, e.g. the desktop dev simulation runtime. */
	MediaWrapper?: ComponentType<{ children: ReactNode }>;
}

function LiveOverlayMedia({ muted, onCurrentChange }: Omit<OverlayStageProps, "MediaWrapper">) {
	useOverlayWs();
	const display = useMediaDisplay();
	const settings = useAppStore((s) => s.settings);
	const { current } = display;
	useEffect(() => {
		onCurrentChange?.(current);
	}, [current, onCurrentChange]);
	return <MediaPopup {...display} settings={settings} muted={muted} />;
}

export function OverlayStage({
	muted,
	onCurrentChange,
	MediaWrapper = Fragment,
}: OverlayStageProps) {
	return (
		<>
			<MediaWrapper>
				<LiveOverlayMedia muted={muted} onCurrentChange={onCurrentChange} />
			</MediaWrapper>
			<FloatingReactions />
			<ConnectionNotifications />
		</>
	);
}
