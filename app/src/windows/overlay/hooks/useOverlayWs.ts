import type { JoinMessage, SessionRevocationCode } from "@memeover/shared";
import { emit } from "@tauri-apps/api/event";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fallbackExpiryDelay, isGuildPausedAt } from "@/shared/guild-pause";
import { mutedIdSet } from "@/shared/muted-authors";
import { useAppStore } from "@/shared/store";
import { bindSocket, sendClientMessage, setServerFeatures, unbindSocket } from "../ws-client";

import { routeServerMessage } from "./route-server-message";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOverlayWs(): void {
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
	overlayHealthRef.current = overlayHealth;

	const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const wsRef = useRef<WebSocket | null>(null);
	const revokedRef = useRef<SessionRevocationCode | null>(null);
	const [reconnectNonce, setReconnectNonce] = useState(0);
	const previousCredentialsRef = useRef({ guildId, token });
	useEffect(() => {
		const changed =
			previousCredentialsRef.current.guildId !== guildId ||
			previousCredentialsRef.current.token !== token;
		previousCredentialsRef.current = { guildId, token };
		if (changed && revokedRef.current !== null) {
			revokedRef.current = null;
			setReconnectNonce((n) => n + 1);
		}
	}, [guildId, token]);
	const reconnectTimerRef = useRef<number | null>(null);

	// ── Stable event handlers ─────────────────────────────────────────────────

	const onOpen = useCallback(() => {
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
				mutedAuthors: muteRef.current.muted,
				hideAnonymous: muteRef.current.hideAnonymous,
			});
			switch (action.kind) {
				case "join_ack":
					if (action.success) {
						setServerFeatures(action.features);
						void emit("ws-join-error", null);
						void emit("ws-features-changed", action.features ?? []);
						revokedRef.current = null;
						setWsStatus("connected");
						void emit("ws-status-changed", "connected");
					} else {
						setWsStatus("error");
						void emit("ws-status-changed", "error");
						console.warn("[WS] JOIN_ACK error:", action.error);
						void emit("ws-join-error", action.error ?? null);
					}
					break;
				case "enqueue":
					enqueue(action.item);
					break;
				case "reaction":
					spawnReaction({ emoji: action.emoji, emojiUrl: action.emojiUrl });
					break;
				case "session_revoked":
					revokedRef.current = action.code;
					setWsStatus("error");
					void emit("ws-session-revoked", action.code).then(() =>
						emit("ws-status-changed", "error"),
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
				case "member_count":
					setMemberCount(action.count);
					void emit("member-count-changed", action.count);
					break;
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
		setWsStatus("disconnected");
		void emit("ws-status-changed", "disconnected");
	}, [setWsStatus]);

	const onError = useCallback(() => {
		setWsStatus("error");
		void emit("ws-status-changed", "error");
	}, [setWsStatus]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: nonce deliberately restarts a revoked connection after credentials change.
	useEffect(() => {
		if (!shouldConnect) {
			setWsStatus("disconnected");
			void emit("ws-status-changed", "disconnected");
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

			const ws = new WebSocket(wsUrl);
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
				void emit("ws-features-changed", []);
				if (pauseTimerRef.current !== null) clearTimeout(pauseTimerRef.current);
				useAppStore.getState().setGuildPausedUntil(null);
				unbindSocket(ws);
				if (wsRef.current === ws) {
					wsRef.current = null;
				}

				if (revokedRef.current !== null) return;
				onClose();
				reconnectTimerRef.current = window.setTimeout(connect, 3_000);
			});
		};

		connect();

		return () => {
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
	}, [shouldConnect, wsUrl, reconnectNonce, onOpen, onMessage, onClose, onError, setWsStatus]);
}
