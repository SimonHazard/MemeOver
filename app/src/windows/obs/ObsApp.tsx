import { useEffect, useState } from "react";
import { OverlayStage } from "@/windows/overlay/OverlayStage";
import { IN_OBS } from "./obs-browser";
import { ObsStatusPill } from "./obs-status-pill";
import { SoundUnlock } from "./sound-unlock";
import { useObsSourceSession } from "./use-obs-source-session";

/** The OBS browser source: the desktop overlay's stage, without history or window APIs. */
export function ObsApp() {
	const [audioUnlocked, setAudioUnlocked] = useState(IN_OBS);
	const sourceState = useObsSourceSession();

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
			{!IN_OBS && <ObsStatusPill sourceStopped={sourceState === "stopped"} />}
			{sourceState === "active" && !audioUnlocked && (
				<SoundUnlock onUnlock={() => setAudioUnlocked(true)} />
			)}
		</div>
	);
}
