import { type JoinMessage, type PongMessage, ServerMessageSchema } from "@memeover/shared";
import { emit } from "@tauri-apps/api/event";
import { useCallback, useMemo, useRef } from "react";
import useWebSocket from "react-use-websocket";
import { match } from "ts-pattern";
import { mediaEventToQueueItem, textEventToQueueItem } from "@/shared/media-factory";
import { useAppStore } from "@/shared/store";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOverlayWs(): void {
	// Granular selectors — only re-render when these specific values change.
	// Zustand functions are stable references, never change.
	const enqueue = useAppStore((s) => s.enqueue);
	const setWsStatus = useAppStore((s) => s.setWsStatus);
	const setMemberCount = useAppStore((s) => s.setMemberCount);
	const wsUrl = useAppStore((s) => s.settings.wsUrl);
	const guildId = useAppStore((s) => s.settings.guildId);
	const token = useAppStore((s) => s.settings.token);
	const enabledTypes = useAppStore((s) => s.settings.enabledTypes);
	const overlayHealth = useAppStore((s) => s.overlayHealth);

	// Keep credentials and filter settings in refs so WS callbacks always read
	// the latest values without recreating the memoized handlers below.
	const credentialsRef = useRef({ guildId, token });
	credentialsRef.current = { guildId, token };

	const enabledTypesRef = useRef(enabledTypes);
	enabledTypesRef.current = enabledTypes;

	// Discard incoming media/text messages while the overlay is hidden.
	const overlayHealthRef = useRef(overlayHealth);
	overlayHealthRef.current = overlayHealth;

	// sendMessage is returned by useWebSocket; capture it via ref so onOpen can
	// call it even though the callback is defined before the return value is known.
	const sendRef = useRef<((msg: string) => void) | null>(null);

	// ── Stable event handlers ─────────────────────────────────────────────────

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
				.with({ type: "ERROR" }, (msg) => {
					console.warn("[WS] Server error:", msg);
				})
				.with({ type: "PING" }, () => {
					const pong: PongMessage = { type: "PONG" };
					sendRef.current?.(JSON.stringify(pong));
				})
				.with({ type: "MEMBER_COUNT_UPDATE" }, (msg) => {
					// Only forward counts that match our guild
					if (msg.guild_id !== credentialsRef.current.guildId) return;
					setMemberCount(msg.count);
					void emit("member-count-changed", msg.count);
				})
				.exhaustive();
		},
		[enqueue, setWsStatus, setMemberCount],
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
