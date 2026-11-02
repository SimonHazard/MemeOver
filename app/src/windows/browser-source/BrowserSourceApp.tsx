import { useEffect, useState } from "react";
import { OverlayStage } from "@/windows/overlay/OverlayStage";
import { SoundUnlock } from "./sound-unlock";
import { SourceStatusPill } from "./source-status-pill";
import { useSourceSession } from "./use-source-session";

/**
 * The browser source: the desktop overlay's stage, without history or window APIs.
 * Preview aids appear only where sound needs a gesture, so nothing is drawn on stream.
 */
export function BrowserSourceApp({ autoplayAllowed }: { autoplayAllowed: boolean }) {
	const [audioUnlocked, setAudioUnlocked] = useState(autoplayAllowed);
	const sourceState = useSourceSession();

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
			{!autoplayAllowed && <SourceStatusPill sourceStopped={sourceState === "stopped"} />}
			{sourceState === "active" && !audioUnlocked && (
				<SoundUnlock onUnlock={() => setAudioUnlocked(true)} />
			)}
		</div>
	);
}
