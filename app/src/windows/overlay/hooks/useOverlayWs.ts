import { emit } from "@tauri-apps/api/event";
import { useCallback, useMemo, useRef } from "react";
import useWebSocket from "react-use-websocket";
import { mediaEventToQueueItem, textEventToQueueItem } from "@/shared/media-factory";
import { ServerMessageSchema } from "@/shared/schemas";
import { useAppStore } from "@/shared/store";
import type { JoinMessage, PongMessage } from "@/shared/types";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOverlayWs(): void {
	// Granular selectors — only re-render when these specific values change.
	// Zustand functions are stable references, never change.
	const enqueue = useAppStore((s) => s.enqueue);
	const setWsStatus = useAppStore((s) => s.setWsStatus);
	const wsUrl = useAppStore((s) => s.settings.wsUrl);
	const guildId = useAppStore((s) => s.settings.guildId);
	const token = useAppStore((s) => s.settings.token);
	const enabledTypes = useAppStore((s) => s.settings.enabledTypes);

	// Keep credentials and filter settings in refs so WS callbacks always read
	// the latest values without recreating the memoized handlers below.
	const credentialsRef = useRef({ guildId, token });
	credentialsRef.current = { guildId, token };

	const enabledTypesRef = useRef(enabledTypes);
	enabledTypesRef.current = enabledTypes;

	// sendMessage is returned by useWebSocket; capture it via ref so onOpen can
	// call it even though the callback is defined before the return value is known.
	const sendRef = useRef<((msg: string) => void) | null>(null);

	// ── Stable event handlers (deps are all stable Zustand functions) ──────────

	const onOpen = useCallback(() => {
		setWsStatus("connecting");
		const join: JoinMessage = {
			type: "JOIN",
			guild_id: credentialsRef.current.guildId,
			token: credentialsRef.current.token,
		};
		sendRef.current?.(JSON.stringify(join));
	}, [setWsStatus]);

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

			const msg = result.data;

			switch (msg.type) {
				case "JOIN_ACK":
					if (msg.success) {
						setWsStatus("connected");
						void emit("ws-status-changed", "connected");
					} else {
						setWsStatus("error");
						void emit("ws-status-changed", "error");
						console.warn("[WS] JOIN_ACK error:", msg.error);
					}
					break;

				case "MEDIA": {
					// Apply media-type filter before enqueuing
					const et = enabledTypesRef.current;
					const allowed =
						(msg.media_type === "image" && et.image) ||
						(msg.media_type === "gif" && et.gif) ||
						(msg.media_type === "video" && et.video) ||
						(msg.media_type === "audio" && et.audio);
					if (allowed) enqueue(mediaEventToQueueItem(msg));
					break;
				}

				case "TEXT":
					if (enabledTypesRef.current.text) enqueue(textEventToQueueItem(msg));
					break;

				case "ERROR":
					console.warn("[WS] Server error:", msg);
					break;

				case "PING": {
					// Respond immediately to keep the connection alive
					const pong: PongMessage = { type: "PONG" };
					sendRef.current?.(JSON.stringify(pong));
					break;
				}
			}
		},
		[enqueue, setWsStatus],
	);

	const onClose = useCallback(() => {
		setWsStatus("disconnected");
		void emit("ws-status-changed", "disconnected");
	}, [setWsStatus]);

	const onError = useCallback(() => {
		setWsStatus("error");
		void emit("ws-status-changed", "error");
	}, [setWsStatus]);

	// Memoized options object — only recreated when handlers change (i.e. never,
	// since all deps are stable Zustand functions). Prevents react-use-websocket
	// from seeing a new options reference on every store update.
	const wsOptions = useMemo(
		() => ({
			shouldReconnect: () => true,
			reconnectAttempts: Number.MAX_SAFE_INTEGER,
			reconnectInterval: 3_000,
			onOpen,
			onMessage,
			onClose,
			onError,
		}),
		[onOpen, onMessage, onClose, onError],
	);

	const { sendMessage } = useWebSocket(
		wsUrl,
		wsOptions,
		// Only open a connection when credentials are provided
		Boolean(guildId && token && wsUrl),
	);

	// Sync the send ref with the stable function returned by react-use-websocket
	sendRef.current = sendMessage;
}
