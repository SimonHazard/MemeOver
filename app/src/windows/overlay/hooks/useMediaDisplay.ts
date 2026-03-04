import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/shared/store";
import type { DisplayQueueItem } from "@/shared/types";

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
	const queue = useAppStore((s) => s.queue);
	const dequeue = useAppStore((s) => s.dequeue);
	const duration = useAppStore((s) => s.settings.duration);
	const overlayHealth = useAppStore((s) => s.overlayHealth);

	const [current, setCurrent] = useState<DisplayQueueItem | null>(null);
	const [isVisible, setIsVisible] = useState(false);

	// Primary display timer
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	// Safety fallback timer (fires startTimer after a delay if onLoad/onPlay never fires)
	const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Stable ref so startTimer can always read the current duration without being recreated
	const durationRef = useRef(duration);
	durationRef.current = duration;

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
	const startTimer = useCallback(() => {
		if (timerRef.current !== null) return; // already running
		if (safetyTimerRef.current !== null) {
			clearTimeout(safetyTimerRef.current);
			safetyTimerRef.current = null;
		}
		timerRef.current = setTimeout(hide, durationRef.current * 1_000);
	}, [hide]);

	// Skip the broken item — immediately triggers hide → onExitComplete → next
	const onMediaError = useCallback(() => {
		console.warn("[MediaDisplay] Media failed to load, skipping item");
		hide();
	}, [hide]);

	// ── Effect 0: Stop current item when overlay is hidden ────────────────────
	useEffect(() => {
		if (overlayHealth === "closed") {
			document.querySelectorAll("video, audio").forEach((el) => {
				(el as HTMLMediaElement).pause();
			});
			setCurrent(null);
			hide();
		}
	}, [overlayHealth, hide]);

	// ── Effect 1: Dequeue the next item ───────────────────────────────────────
	useEffect(() => {
		if (current !== null || queue.length === 0) return;

		const next = queue[0];
		dequeue();
		setCurrent(next);
		setIsVisible(true);
	}, [queue, current, dequeue]);

	// ── Effect 2: Safety fallback ──────────────────────────────────────────────
	// TEXT items have no DOM event to call startTimer → fire immediately (delay=0).
	// Media items get 2s to fire onLoad/onPlay before we force-start the timer.
	useEffect(() => {
		if (current === null) return;

		const delay = current.type === "TEXT" ? 0 : 2_000;
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

	// ── Effect 3: Queue-stuck recovery ────────────────────────────────────────
	// If isVisible becomes false but current is still set (exit animation in
	// progress), Framer Motion should call onExitComplete to clear current.
	// If it never does (animation bug or edge case), force-clear after 1s to
	// prevent the queue from permanently blocking.
	useEffect(() => {
		if (isVisible || current === null) return;

		const id = setTimeout(() => {
			console.warn("[MediaDisplay] onExitComplete did not fire — force-clearing current");
			setCurrent(null);
		}, 1_000);

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

	return { current, isVisible, onExitComplete, onVideoEnd, startTimer, onMediaError };
}
