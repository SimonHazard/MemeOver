import { emit } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import { isMediaExpired } from "@/shared/history-expiry";
import { traceMetadata } from "@/shared/overlay-trace";
import { useAppStore } from "@/shared/store";
import type { DisplayQueueItem } from "@/shared/types";

import {
	displayDurationMs,
	EXIT_RECOVERY_MS,
	isSkipRequest,
	safetyDelayMs,
	shouldArmDisplayTimer,
	shouldDequeue,
} from "./media-display-decisions";

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseMediaDisplayReturn {
	current: DisplayQueueItem | null;
	isVisible: boolean;
	/** Call when the exit animation has fully completed */
	onExitComplete: () => void;
	/** Call when a video/audio reaches its natural end */
	onVideoEnd: () => void;
	/** Start the display timer. Idempotent — safe to call multiple times. */
	startTimer: () => void;
	/** Skip the current item immediately (called when media fails to load). */
	onMediaError: () => void;
}

export function useMediaDisplay(): UseMediaDisplayReturn {
	// Granular selectors — avoids re-rendering on unrelated store changes
	const guildPaused = useAppStore((s) => s.guildPaused);
	const queue = useAppStore((s) => s.queue);
	const dequeue = useAppStore((s) => s.dequeue);
	const setCurrentAuthorId = useAppStore((s) => s.setCurrentAuthorId);
	const setIsDisplaying = useAppStore((s) => s.setIsDisplaying);
	const duration = useAppStore((s) => s.settings.duration);
	const syncMediaDuration = useAppStore((s) => s.settings.syncMediaDuration);
	const overlayHealth = useAppStore((s) => s.overlayHealth);

	const [current, setCurrent] = useState<DisplayQueueItem | null>(null);
	const [isVisible, setIsVisible] = useState(false);

	// Primary display timer
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	// Safety fallback timer (fires startTimer after a delay if onLoad/onPlay never fires)
	const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Stable refs so startTimer can always read current values without being recreated
	const durationRef = useRef(duration);
	durationRef.current = duration;

	const syncMediaDurationRef = useRef(syncMediaDuration);
	syncMediaDurationRef.current = syncMediaDuration;

	// Tracks the current item without triggering useCallback recreation
	const currentRef = useRef(current);
	currentRef.current = current;

	const hide = useCallback(() => {
		if (timerRef.current !== null) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		if (safetyTimerRef.current !== null) {
			clearTimeout(safetyTimerRef.current);
			safetyTimerRef.current = null;
		}
		setIsVisible(false);
	}, []);

	// Idempotent: if the timer is already running, this is a no-op.
	// Cancels the safety timer the moment the real one starts.
	// When syncMediaDuration is enabled for video/audio, skips the auto-hide timer —
	// onVideoEnd will trigger hide() when the media finishes naturally.
	const startTimer = useCallback(() => {
		if (timerRef.current !== null) return; // already running
		if (safetyTimerRef.current !== null) {
			clearTimeout(safetyTimerRef.current);
			safetyTimerRef.current = null;
		}
		const item = currentRef.current;
		if (!shouldArmDisplayTimer(item, syncMediaDurationRef.current)) return;
		timerRef.current = setTimeout(hide, displayDurationMs({ duration: durationRef.current }));
	}, [hide]);

	// Skip the broken item — immediately triggers hide → onExitComplete → next
	const onMediaError = useCallback(() => {
		console.warn("[MediaDisplay] Media failed to load, skipping item");
		const item = currentRef.current;
		if (item)
			void emit("overlay-trace", {
				id: crypto.randomUUID(),
				at: Date.now(),
				...traceMetadata(JSON.stringify(item)),
				decision: "dropped",
				reason: isMediaExpired(item, Date.now()) ? "expired_url" : "load_failed",
			});
		hide();
	}, [hide]);

	const skipVersion = useAppStore((s) => s.skipVersion);

	// ── Effect 0: Skip current item on demand from settings window ────────────
	useEffect(() => {
		if (!isSkipRequest(skipVersion)) return; // initial mount — not a real skip
		hide();
	}, [skipVersion, hide]);

	// ── Effect 1: Stop current item when overlay is hidden ────────────────────
	useEffect(() => {
		if (overlayHealth === "closed") {
			document.querySelectorAll("video, audio").forEach((el) => {
				(el as HTMLMediaElement).pause();
			});
			setCurrent(null);
			hide();
		}
	}, [overlayHealth, hide]);

	// ── Effect 2: Sync isDisplaying to the store so settings window can read it ─
	// biome-ignore lint/correctness/useExhaustiveDependencies: setIsDisplaying is a stable Zustand setter — omitted from deps intentionally
	useEffect(() => {
		setIsDisplaying(current !== null);
		setCurrentAuthorId(
			current?.type === "MEDIA" && current.anonymous ? "secret" : (current?.author_id ?? null),
		);
	}, [current, setCurrentAuthorId]);

	// Admit the current queue head immediately; preloading is introduced separately.
	useEffect(() => {
		if (guildPaused || overlayHealth === "closed" || !shouldDequeue(current, queue.length)) return;
		const next = queue[0];
		if (!next) return;
		dequeue();
		currentRef.current = next;
		setCurrent(next);
		setIsVisible(true);
	}, [queue, current, dequeue, guildPaused, overlayHealth]);

	// ── Effect 4: Safety fallback ─────────────────────────────────────────────
	// TEXT items have no DOM event to call startTimer → fire immediately (delay=0).
	// Media items get 2s to fire onLoad/onPlay before we force-start the timer.
	useEffect(() => {
		if (current === null) return;

		const delay = safetyDelayMs(current);
		safetyTimerRef.current = setTimeout(() => {
			safetyTimerRef.current = null;
			startTimer();
		}, delay);

		return () => {
			if (safetyTimerRef.current !== null) {
				clearTimeout(safetyTimerRef.current);
				safetyTimerRef.current = null;
			}
		};
	}, [current, startTimer]);

	// ── Effect 5: Queue-stuck recovery ────────────────────────────────────────
	// If isVisible becomes false but current is still set (exit animation in
	// progress), Framer Motion should call onExitComplete to clear current.
	// If it never does (animation bug or edge case), force-clear after 1s to
	// prevent the queue from permanently blocking.
	useEffect(() => {
		if (isVisible || current === null) return;

		const id = setTimeout(() => {
			console.warn("[MediaDisplay] onExitComplete did not fire — force-clearing current");
			setCurrent(null);
		}, EXIT_RECOVERY_MS);

		return () => clearTimeout(id);
	}, [isVisible, current]);

	// When Framer Motion's exit animation finishes, clear current → triggers next
	const onExitComplete = useCallback(() => {
		setCurrent(null);
	}, []);

	// Videos/audio can end early — immediately trigger the hide
	const onVideoEnd = useCallback(() => {
		hide();
	}, [hide]);

	return {
		current,
		isVisible,
		onExitComplete,
		onVideoEnd,
		startTimer,
		onMediaError,
	};
}
