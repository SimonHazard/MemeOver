import { emit } from "@tauri-apps/api/event";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/shared/store";
import type { DisplayQueueItem } from "@/shared/types";
import {
	dismissConnectionNotification,
	showConnectionNotification,
} from "@/windows/overlay/components/connection-notifications";
import { MediaPopup } from "@/windows/overlay/components/media-popup";
import { newlyConnectedCount } from "@/windows/overlay/hooks/connection-notification";
import { listenDevEvent } from "./events";
import {
	DEV_OVERLAY_COMMAND,
	DEV_OVERLAY_STATE,
	INITIAL_SIMULATION,
	reduceSimulation,
	type SimulationCommand,
} from "./overlay-simulation";

const sampleImage = `data:image/svg+xml,${encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" width="540" height="720" viewBox="0 0 540 720"><rect width="540" height="720" fill="#facc15"/><path d="M0 180h540M0 360h540M0 540h540M180 0v720M360 0v720" stroke="#111" stroke-width="3"/><rect x="45" y="235" width="450" height="250" fill="#fff" stroke="#111" stroke-width="6"/><text x="270" y="335" font-family="sans-serif" font-size="52" font-weight="900" text-anchor="middle" fill="#111">MEMEOVER</text><text x="270" y="410" font-family="monospace" font-size="34" text-anchor="middle" fill="#111">LOCAL DEV</text></svg>',
)}`;
const noop = () => {};

/** Loaded only by Vite's DEV branch. Replaces the live queue/WS without writing history. */
export default function OverlayTestRuntime({ children }: { children: ReactNode }) {
	const { t } = useTranslation();
	const [state, setState] = useState(INITIAL_SIMULATION);
	const snapshot = useRef(INITIAL_SIMULATION);
	const settings = useAppStore((s) => s.settings);
	const health = useAppStore((s) => s.overlayHealth);
	useEffect(() => {
		const publish = () => emit(DEV_OVERLAY_STATE, snapshot.current);
		const stop = listenDevEvent<SimulationCommand>(
			DEV_OVERLAY_COMMAND,
			(command) => {
				const before = snapshot.current;
				const next = reduceSimulation(before, command);
				snapshot.current = next;
				setState(next);
				if (before.enabled !== next.enabled) {
					dismissConnectionNotification();
					if (next.enabled) {
						useAppStore.getState().setWsStatus("disconnected");
						void emit("ws-status-changed", "disconnected");
					}
				}
				if (next.enabled) {
					const current = useAppStore.getState();
					const { announce } = newlyConnectedCount(
						{ count: before.enabled ? before.peers + 1 : null },
						next.peers + 1,
						current.settings.connectionNotificationsEnabled,
						current.overlayHealth,
					);
					if (announce > 0) showConnectionNotification(announce);
					if (
						command.type === "leave" &&
						before.peers > next.peers &&
						current.settings.connectionNotificationsEnabled &&
						current.overlayHealth !== "closed"
					) {
						showConnectionNotification(before.peers - next.peers, "devOverlay.userDisconnected");
					}
				}
				void publish().catch((error) =>
					console.warn("[Dev overlay] Could not publish state", error),
				);
			},
			publish,
		);
		return () => {
			stop();
			dismissConnectionNotification();
		};
	}, []);
	if (!state.enabled) return children;
	const author = {
		guild_id: "local-dev",
		channel_id: "local-dev",
		message_id: "local-dev",
		author_id: "local-dev",
		author_username: "MemeOver DEV",
		author_avatar_url: sampleImage,
		timestamp: 0,
		queueId: `dev-overlay-sample-${state.media}`,
	};
	const item: DisplayQueueItem | null =
		state.media === "none"
			? null
			: state.media === "text"
				? { ...author, type: "TEXT", text: t("devOverlay.sampleText") }
				: {
						...author,
						type: "MEDIA",
						media_type: "image",
						media_url: sampleImage,
						text: t("devOverlay.sampleCaption"),
					};
	return (
		<div data-dev-overlay-sample={state.media}>
			<MediaPopup
				current={item}
				isVisible={health !== "closed"}
				settings={settings}
				onExitComplete={noop}
				onVideoEnd={noop}
				startTimer={noop}
				onMediaError={noop}
			/>
		</div>
	);
}
