import { useEffect, useRef, useState } from "react";
import { type SourceControls, sourceHeartbeatQuery } from "@/shared/browser-source";
import {
	BROWSER_SOURCE_CONTROLS_HEADER,
	BROWSER_SOURCE_PATH,
	BROWSER_SOURCE_SESSION_HEADER,
} from "@/shared/browser-source-contract";
import { useAppStore } from "@/shared/store";
import { applySourceControls } from "./source-controls";
import {
	INITIAL_LIVENESS,
	type LivenessResult,
	nextLiveness,
	type SourceStatus,
} from "./source-liveness";
import { sourcePreviewStatus } from "./source-preview-status";

const CHECK_INTERVAL_MS = 1000;
const CHECK_TIMEOUT_MS = 3000;

/** Stop sound before React detaches the elements, even if a player keeps a pending reference. */
function silencePlayers() {
	document.querySelectorAll<HTMLMediaElement>("video, audio").forEach((player) => {
		player.muted = true;
		player.pause();
	});
}

/**
 * A loaded page stops receiving memes when its serving app exits, then keeps checking
 * so it resumes on its own once MemeOver serves the page again. Each check also applies the
 * streamer's live controls and tells the app how this page is doing.
 */
export function useSourceSession(soundBlocked: boolean): SourceStatus {
	const [status, setStatus] = useState<SourceStatus>(INITIAL_LIVENESS.status);
	const soundBlockedRef = useRef(soundBlocked);
	soundBlockedRef.current = soundBlocked;

	useEffect(() => {
		let disposed = false;
		let liveness = INITIAL_LIVENESS;
		let controls: SourceControls | null = null;
		let nextCheck: ReturnType<typeof setTimeout> | undefined;
		let controller: AbortController | undefined;

		function checkUrl(): URL {
			const url = new URL(BROWSER_SOURCE_PATH, window.location.origin);
			const { wsStatus, wsRevokedReason, wsJoinRejected } = useAppStore.getState();
			url.search = sourceHeartbeatQuery(
				soundBlockedRef.current,
				sourcePreviewStatus(wsStatus, wsRevokedReason, wsJoinRejected),
			);
			return url;
		}

		async function request(): Promise<LivenessResult & { controls?: string | null }> {
			const abort = new AbortController();
			controller = abort;
			const timeout = setTimeout(() => abort.abort(), CHECK_TIMEOUT_MS);
			try {
				// No fragment, credentials or referrer. A fresh HEAD also avoids cached liveness.
				const response = await fetch(checkUrl(), {
					method: "HEAD",
					cache: "no-store",
					credentials: "omit",
					referrerPolicy: "no-referrer",
					signal: abort.signal,
				});
				return {
					failed: false,
					session: response.ok ? response.headers.get(BROWSER_SOURCE_SESSION_HEADER) : null,
					controls: response.headers.get(BROWSER_SOURCE_CONTROLS_HEADER),
				};
			} catch {
				return { failed: true };
			} finally {
				clearTimeout(timeout);
			}
		}

		async function check() {
			const result = await request();
			if (disposed) return;
			const next = nextLiveness(liveness, result);
			if (next.reload) {
				window.location.reload();
				return;
			}
			if (next.state.status === "stopped" && liveness.status !== "stopped") silencePlayers();
			// Before the stage mounts on the first check, so nothing muted gets through.
			if (next.state.status === "active")
				controls = applySourceControls(controls, result.controls ?? null);
			liveness = next.state;
			setStatus(liveness.status);
			nextCheck = setTimeout(() => void check(), CHECK_INTERVAL_MS);
		}

		void check();
		return () => {
			disposed = true;
			clearTimeout(nextCheck);
			controller?.abort();
		};
	}, []);

	return status;
}
