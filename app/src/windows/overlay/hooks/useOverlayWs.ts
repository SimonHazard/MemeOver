import type { JoinMessage, SessionRevocationCode } from "@memeover/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fallbackExpiryDelay, isGuildPausedAt } from "@/shared/guild-pause";
import { mutedIdSet } from "@/shared/muted-authors";
import { emitIfTauri } from "@/shared/platform-events";
import { useAppStore } from "@/shared/store";
import {
	dismissConnectionNotification,
	showConnectionNotification,
} from "../components/connection-notifications";
import { nextReconnectDelay } from "../reconnect-backoff";
import { bindSocket, sendClientMessage, setServerFeatures, unbindSocket } from "../ws-client";

import {
	type ConnectionTracker,
	INITIAL_CONNECTION_TRACKER,
	newlyConnectedCount,
} from "./connection-notification";
import { routeServerMessage } from "./route-server-message";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOverlayWs(playbackEnabled = true): void {
	// Granular selectors — only re-render when these specific values change.
	// Zustand functions are stable references, never change.
	const enqueue = useAppStore((s) => s.enqueue);
	const spawnReaction = useAppStore((s) => s.spawnReaction);
	const setWsStatus = useAppStore((s) => s.setWsStatus);
	const setMemberCount = useAppStore((s) => s.setMemberCount);
	const wsUrl = useAppStore((s) => s.settings.wsUrl);
	const guildId = useAppStore((s) => s.settings.guildId);
	const token = useAppStore((s) => s.settings.token);
	const clientId = useAppStore((s) => s.settings.clientId);
	const enabledTypes = useAppStore((s) => s.settings.enabledTypes);
	const showBotAppSources = useAppStore((s) => s.settings.showBotAppSources);
	const floatingReactionsEnabled = useAppStore((s) => s.settings.floatingReactionsEnabled);
	const overlayHealth = useAppStore((s) => s.overlayHealth);
	const mutedAuthors = useAppStore((s) => s.settings.mutedAuthors);
	const hideAnonymous = useAppStore((s) => s.settings.hideAnonymous);
	const muted = useMemo(() => mutedIdSet(mutedAuthors), [mutedAuthors]);
	const muteRef = useRef({ muted, hideAnonymous });
	muteRef.current = { muted, hideAnonymous };
	const shouldConnect = Boolean(guildId && token && wsUrl);

	// Keep credentials and filter settings in refs so WS callbacks always read
	// the latest values without recreating the memoized handlers below.
	const credentialsRef = useRef({ guildId, token, clientId });
	credentialsRef.current = { guildId, token, clientId };

	const enabledTypesRef = useRef(enabledTypes);
	enabledTypesRef.current = enabledTypes;

	const showBotAppSourcesRef = useRef(showBotAppSources);
	showBotAppSourcesRef.current = showBotAppSources;

	const reactionsEnabledRef = useRef(floatingReactionsEnabled);
	reactionsEnabledRef.current = floatingReactionsEnabled;

	// Discard incoming media/text messages while the overlay is hidden.
	const overlayHealthRef = useRef(overlayHealth);
	overlayHealthRef.current = playbackEnabled ? overlayHealth : "closed";

	const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const connectionsRef = useRef<ConnectionTracker>(INITIAL_CONNECTION_TRACKER);
	const wsRef = useRef<WebSocket | null>(null);
	const revokedRef = useRef<SessionRevocationCode | null>(null);
	const [reconnectNonce, setReconnectNonce] = useState(0);
	// A revoked session stays idle until the user points it at different credentials or another bot.
	const previousCredentialsRef = useRef({ guildId, token, wsUrl });
	useEffect(() => {
		const changed =
			previousCredentialsRef.current.guildId !== guildId ||
			previousCredentialsRef.current.token !== token ||
			previousCredentialsRef.current.wsUrl !== wsUrl;
		previousCredentialsRef.current = { guildId, token, wsUrl };
		if (changed && revokedRef.current !== null) {
			revokedRef.current = null;
			setReconnectNonce((n) => n + 1);
		}
	}, [guildId, token, wsUrl]);
	const reconnectTimerRef = useRef<number | null>(null);
	const reconnectAttemptRef = useRef(0);

	// ── Stable event handlers ─────────────────────────────────────────────────

	const onOpen = useCallback(() => {
		connectionsRef.current = INITIAL_CONNECTION_TRACKER;
		dismissConnectionNotification();
		setWsStatus("connecting");
		const join: JoinMessage = {
			type: "JOIN",
			guild_id: credentialsRef.current.guildId,
			token: credentialsRef.current.token,
			client_id: credentialsRef.current.clientId || undefined,
		};
		sendClientMessage(join);
	}, [setWsStatus]);

	const onMessage = useCallback(
		(event: MessageEvent<string>) => {
			const action = routeServerMessage(event.data, {
				overlayHealth: overlayHealthRef.current,
				showBotAppSources: showBotAppSourcesRef.current,
				enabledTypes: enabledTypesRef.current,
				floatingReactionsEnabled: reactionsEnabledRef.current,
				guildId: credentialsRef.current.guildId,
				guildPaused: useAppStore.getState().guildPaused,
				mutedAuthors: muteRef.current.muted,
				hideAnonymous: muteRef.current.hideAnonymous,
			});
			switch (action.kind) {
				case "join_ack":
					if (action.success) {
						reconnectAttemptRef.current = 0;
						setServerFeatures(action.features);
						void emitIfTauri("ws-join-error", null);
						void emitIfTauri("ws-features-changed", action.features ?? []);
						revokedRef.current = null;
						useAppStore.getState().setWsRevokedReason(null);
						useAppStore.getState().setWsJoinRejected(false);
						setWsStatus("connected");
						void emitIfTauri("ws-status-changed", "connected");
					} else {
						// Read by the browser source's status pill; the settings window uses ws-join-error.
						useAppStore.getState().setWsJoinRejected(true);
						setWsStatus("error");
						void emitIfTauri("ws-status-changed", "error");
						console.warn("[WS] JOIN_ACK error:", action.error);
						void emitIfTauri("ws-join-error", action.error ?? null);
					}
					break;
				case "enqueue":
					enqueue(action.item);
					break;
				case "reaction":
					spawnReaction({ emoji: action.emoji, emojiUrl: action.emojiUrl });
					break;
				case "session_revoked":
					connectionsRef.current = INITIAL_CONNECTION_TRACKER;
					dismissConnectionNotification();
					revokedRef.current = action.code;
					// Read by the browser source page's status pill; the settings window keeps its own copy.
					useAppStore.getState().setWsRevokedReason(action.code);
					setWsStatus("error");
					void emitIfTauri("ws-session-revoked", action.code).then(() =>
						emitIfTauri("ws-status-changed", "error"),
					);
					break;
				case "server_error":
					console.warn("[WS] Server error:", action.message);
					break;
				case "guild_state": {
					if (pauseTimerRef.current !== null) clearTimeout(pauseTimerRef.current);
					const value = isGuildPausedAt(action.pausedUntil, Date.now()) ? action.pausedUntil : null;
					useAppStore.getState().setGuildPausedUntil(value);
					if (value !== null) {
						const delay = fallbackExpiryDelay(value, Date.now());
						if (delay !== null)
							pauseTimerRef.current = setTimeout(
								() => useAppStore.getState().setGuildPausedUntil(null),
								delay,
							);
					}
					break;
				}
				case "pong":
					sendClientMessage({ type: "PONG" });
					break;
				case "member_count": {
					const state = useAppStore.getState();
					const { tracker, announce } = newlyConnectedCount(
						connectionsRef.current,
						action.count,
						state.settings.connectionNotificationsEnabled,
						state.overlayHealth,
					);
					connectionsRef.current = tracker;
					if (announce > 0) showConnectionNotification(announce);
					setMemberCount(action.count);
					void emitIfTauri("member-count-changed", action.count);
					break;
				}
				case "drop":
					if (action.reason === "invalid_json")
						console.warn("[WS] Failed to parse message:", action.detail);
					else if (action.reason === "invalid_schema")
						console.warn("[WS] Invalid message schema:", action.detail);
					break;
				default: {
					const exhaustive: never = action;
					return exhaustive;
				}
			}
		},
		[enqueue, spawnReaction, setWsStatus, setMemberCount],
	);

	const onClose = useCallback(() => {
		connectionsRef.current = INITIAL_CONNECTION_TRACKER;
		dismissConnectionNotification();
		setWsStatus("disconnected");
		void emitIfTauri("ws-status-changed", "disconnected");
	}, [setWsStatus]);

	const onError = useCallback(() => {
		dismissConnectionNotification();
		setWsStatus("error");
		void emitIfTauri("ws-status-changed", "error");
	}, [setWsStatus]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: nonce, guild id and token deliberately restart the connection when credentials change.
	useEffect(() => {
		if (!shouldConnect) {
			setWsStatus("disconnected");
			void emitIfTauri("ws-status-changed", "disconnected");
			return;
		}

		let disposed = false;

		const clearReconnect = () => {
			if (reconnectTimerRef.current !== null) {
				window.clearTimeout(reconnectTimerRef.current);
				reconnectTimerRef.current = null;
			}
		};

		const connect = () => {
			clearReconnect();
			if (disposed || revokedRef.current !== null) return;

			let ws: WebSocket;
			try {
				ws = new WebSocket(wsUrl);
			} catch (error) {
				// An unparsable URL cannot start working by retrying: wait for a settings change.
				console.warn("[WS] Invalid bot URL", error);
				onError();
				return;
			}
			wsRef.current = ws;
			bindSocket(ws);
			setWsStatus("connecting");

			ws.addEventListener("open", () => {
				if (!disposed) onOpen();
			});

			ws.addEventListener("message", (event) => {
				if (!disposed) onMessage(event as MessageEvent<string>);
			});

			ws.addEventListener("error", () => {
				if (disposed) return;
				onError();
				ws.close();
			});

			ws.addEventListener("close", () => {
				// A retired socket may close after its replacement has already joined.
				if (disposed || wsRef.current !== ws) return;
				void emitIfTauri("ws-features-changed", []);
				if (pauseTimerRef.current !== null) clearTimeout(pauseTimerRef.current);
				useAppStore.getState().setGuildPausedUntil(null);
				unbindSocket(ws);
				if (wsRef.current === ws) {
					wsRef.current = null;
				}

				if (revokedRef.current !== null) return;
				onClose();
				reconnectTimerRef.current = window.setTimeout(
					connect,
					nextReconnectDelay(reconnectAttemptRef.current++),
				);
			});
		};

		connect();

		return () => {
			reconnectAttemptRef.current = 0;
			connectionsRef.current = INITIAL_CONNECTION_TRACKER;
			dismissConnectionNotification();
			disposed = true;
			if (pauseTimerRef.current !== null) clearTimeout(pauseTimerRef.current);
			useAppStore.getState().setGuildPausedUntil(null);
			clearReconnect();
			if (wsRef.current) {
				unbindSocket(wsRef.current);
				wsRef.current.close();
			}
			wsRef.current = null;
		};
	}, [
		shouldConnect,
		wsUrl,
		guildId,
		token,
		reconnectNonce,
		onOpen,
		onMessage,
		onClose,
		onError,
		setWsStatus,
	]);
}
