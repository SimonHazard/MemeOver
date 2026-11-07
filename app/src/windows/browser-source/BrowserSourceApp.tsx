import { useEffect, useState } from "react";
import { OverlayStage } from "@/windows/overlay/OverlayStage";
import type { SourceMode } from "./autoplay";
import { SoundUnlock } from "./sound-unlock";
import { SourceStatusPill } from "./source-status-pill";
import { useAidsVisible } from "./use-aids-visible";
import { useSourceSession } from "./use-source-session";

/**
 * The browser source: the desktop overlay's stage, without history or window APIs.
 * Preview aids appear only in `preview` mode and fade quickly, so nothing stays on stream.
 */
export function BrowserSourceApp({ mode }: { mode: SourceMode }) {
	const [audioUnlocked, setAudioUnlocked] = useState(mode === "stream");
	const sourceState = useSourceSession(!audioUnlocked);
	const aidsVisible = useAidsVisible();

	useEffect(() => {
		if (audioUnlocked) return;
		const unlock = () => setAudioUnlocked(true);
		window.addEventListener("pointerdown", unlock);
		window.addEventListener("keydown", unlock);
		return () => {
			window.removeEventListener("pointerdown", unlock);
			window.removeEventListener("keydown", unlock);
		};
	}, [audioUnlocked]);

	return (
		<div className="fixed inset-0 w-screen h-screen overflow-hidden pointer-events-none bg-transparent">
			{sourceState === "active" && <OverlayStage muted={!audioUnlocked} />}
			{mode === "preview" && aidsVisible && (
				<SourceStatusPill sourceStopped={sourceState === "stopped"} />
			)}
			{sourceState === "active" && !audioUnlocked && aidsVisible && (
				<SoundUnlock onUnlock={() => setAudioUnlocked(true)} />
			)}
		</div>
	);
}
