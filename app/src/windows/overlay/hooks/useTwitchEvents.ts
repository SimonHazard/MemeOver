import { useEffect, useRef } from "react";
import { useTauriEventVersion } from "@/hooks/useTauriEvent";
import { mutedIdSet } from "@/shared/muted-authors";
import { emitIfTauri } from "@/shared/platform-events";
import { useAppStore } from "@/shared/store";
import { desktopPlaybackEnabled } from "@/shared/stream-destination";
import { clearTwitchAuth, loadTwitchAuth, saveTwitchAuth } from "@/shared/twitch/auth-store";
import { isTwitchConfigured, TWITCH_CLIENT_ID } from "@/shared/twitch/config";
import { startTwitchRuntime } from "@/shared/twitch/eventsub-runtime";
import { routeTwitchEvent } from "@/shared/twitch/route-twitch-event";
import { nextReconnectDelay } from "../reconnect-backoff";

/** Mounted only by OverlayApp: the browser source never gets an account or Twitch connection. */
export function useTwitchEvents(): void {
	const enabled = useAppStore((state) => state.settings.twitch.enabled);
	const authVersion = useTauriEventVersion("twitch-auth-changed");
	const rewardsRequest = useTauriEventVersion("twitch-rewards-request");
	const runtime = useRef<ReturnType<typeof startTwitchRuntime> | null>(null);

	useEffect(() => {
		if (!enabled || !isTwitchConfigured()) {
			void emitIfTauri("twitch-status-changed", "disabled").catch(() => {});
			return;
		}
		const session = startTwitchRuntime({
			fetch,
			clientId: TWITCH_CLIENT_ID,
			createSocket: (url) => new WebSocket(url),
			loadAuth: loadTwitchAuth,
			saveAuth: saveTwitchAuth,
			clearAuth: clearTwitchAuth,
			reconnectDelay: nextReconnectDelay,
			onStatus: (status) => {
				void emitIfTauri("twitch-status-changed", status).catch(() => {});
			},
			onRewards: (result) => {
				void emitIfTauri("twitch-rewards-changed", result).catch(() => {});
			},
			onNotification: (type, event) => {
				const state = useAppStore.getState();
				const { settings } = state;
				for (const action of routeTwitchEvent(type, event, {
					options: settings.twitch,
					overlayHealth: desktopPlaybackEnabled(settings) ? state.overlayHealth : "closed",
					enabledTypes: settings.enabledTypes,
					floatingReactionsEnabled: settings.floatingReactionsEnabled,
					mutedAuthors: mutedIdSet(settings.mutedAuthors),
					now: Date.now(),
				})) {
					switch (action.kind) {
						case "enqueue":
							state.enqueue(action.item);
							break;
						case "reaction":
							state.spawnReaction(action);
							break;
						case "purge_message":
						case "purge_author":
						case "purge_all":
							state.applyTwitchPurge(action);
							break;
					}
				}
			},
		});
		runtime.current = session;
		return () => {
			session.stop();
			runtime.current = null;
			useAppStore.getState().applyTwitchPurge({ kind: "purge_all" });
		};
	}, [enabled]);

	useEffect(() => {
		if (authVersion > 0) void runtime.current?.authChanged().catch(() => {});
	}, [authVersion]);
	useEffect(() => {
		if (rewardsRequest > 0) void runtime.current?.requestRewards();
	}, [rewardsRequest]);
}
