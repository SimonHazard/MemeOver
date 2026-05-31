import { type JoinMessage, type PongMessage, ServerMessageSchema } from "@memeover/shared";
import { emit } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef } from "react";
import { match } from "ts-pattern";
import { mediaEventToQueueItem, textEventToQueueItem } from "@/shared/media-factory";
import { useAppStore } from "@/shared/store";

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
	const floatingReactionsEnabled = useAppStore((s) => s.settings.floatingReactionsEnabled);
	const overlayHealth = useAppStore((s) => s.overlayHealth);
	const shouldConnect = Boolean(guildId && token && wsUrl);

	// Keep credentials and filter settings in refs so WS callbacks always read
	// the latest values without recreating the memoized handlers below.
	const credentialsRef = useRef({ guildId, token, clientId });
	credentialsRef.current = { guildId, token, clientId };

	const enabledTypesRef = useRef(enabledTypes);
	enabledTypesRef.current = enabledTypes;

	const reactionsEnabledRef = useRef(floatingReactionsEnabled);
	reactionsEnabledRef.current = floatingReactionsEnabled;

	// Discard incoming media/text messages while the overlay is hidden.
	const overlayHealthRef = useRef(overlayHealth);
	overlayHealthRef.current = overlayHealth;

	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimerRef = useRef<number | null>(null);

	// ── Stable event handlers ─────────────────────────────────────────────────

	const onOpen = useCallback(
		(ws: WebSocket) => {
			setWsStatus("connecting");
			const join: JoinMessage = {
				type: "JOIN",
				guild_id: credentialsRef.current.guildId,
				token: credentialsRef.current.token,
				client_id: credentialsRef.current.clientId || undefined,
			};
			ws.send(JSON.stringify(join));
		},
		[setWsStatus],
	);

	const onMessage = useCallback(
		(event: MessageEvent<string>) => {
			const result = ServerMessageSchema.safeParse(
				(() => {
					try {
						return JSON.parse(event.data) as unknown;
					} catch {
						console.warn("[WS] Failed to parse message:", event.data);
						return null;
					}
				})(),
			);

			if (!result.success) {
				console.warn("[WS] Invalid message schema:", result.error.issues);
				return;
			}

			match(result.data)
				.with({ type: "JOIN_ACK", success: true }, () => {
					setWsStatus("connected");
					void emit("ws-status-changed", "connected");
				})
				.with({ type: "JOIN_ACK", success: false }, (msg) => {
					setWsStatus("error");
					void emit("ws-status-changed", "error");
					console.warn("[WS] JOIN_ACK error:", msg.error);
				})
				.with({ type: "MEDIA" }, (msg) => {
					if (overlayHealthRef.current === "closed") return;
					const et = enabledTypesRef.current;
					const allowed = match(msg.media_type)
						.with("image", () => et.image)
						.with("gif", () => et.gif)
						.with("video", () => et.video)
						.with("audio", () => et.audio)
						.with("sticker", () => et.sticker)
						.exhaustive();
					if (allowed) enqueue(mediaEventToQueueItem(msg));
				})
				.with({ type: "TEXT" }, (msg) => {
					if (overlayHealthRef.current === "closed") return;
					if (enabledTypesRef.current.text) enqueue(textEventToQueueItem(msg));
				})
				.with({ type: "REACTION" }, (msg) => {
					if (overlayHealthRef.current === "closed") return;
					if (!reactionsEnabledRef.current) return;
					spawnReaction({ emoji: msg.emoji, emojiUrl: msg.emoji_url });
				})
				.with({ type: "ERROR" }, (msg) => {
					console.warn("[WS] Server error:", msg);
				})
				.with({ type: "PING" }, () => {
					const pong: PongMessage = { type: "PONG" };
					wsRef.current?.send(JSON.stringify(pong));
				})
				.with({ type: "MEMBER_COUNT_UPDATE" }, (msg) => {
					// Only forward counts that match our guild
					if (msg.guild_id !== credentialsRef.current.guildId) return;
					setMemberCount(msg.count);
					void emit("member-count-changed", msg.count);
				})
				.exhaustive();
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
			if (disposed) return;

			const ws = new WebSocket(wsUrl);
			wsRef.current = ws;
			setWsStatus("connecting");

			ws.addEventListener("open", () => {
				if (!disposed) onOpen(ws);
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
				if (wsRef.current === ws) {
					wsRef.current = null;
				}

				if (disposed) return;
				onClose();
				reconnectTimerRef.current = window.setTimeout(connect, 3_000);
			});
		};

		connect();

		return () => {
			disposed = true;
			clearReconnect();
			wsRef.current?.close();
			wsRef.current = null;
		};
	}, [shouldConnect, wsUrl, onOpen, onMessage, onClose, onError, setWsStatus]);
}
