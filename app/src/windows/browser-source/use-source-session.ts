import { useEffect, useState } from "react";
import {
	INITIAL_LIVENESS,
	type LivenessResult,
	nextLiveness,
	type SourceStatus,
} from "./source-environment";

const SESSION_HEADER = "X-MemeOver-Source-Session";
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
 * so it resumes on its own once MemeOver serves the page again.
 */
export function useSourceSession(): SourceStatus {
	const [status, setStatus] = useState<SourceStatus>(INITIAL_LIVENESS.status);

	useEffect(() => {
		let disposed = false;
		let liveness = INITIAL_LIVENESS;
		let nextCheck: ReturnType<typeof setTimeout> | undefined;
		let controller: AbortController | undefined;

		async function request(): Promise<LivenessResult> {
			const abort = new AbortController();
			controller = abort;
			const timeout = setTimeout(() => abort.abort(), CHECK_TIMEOUT_MS);
			try {
				// No fragment, credentials or referrer. A fresh HEAD also avoids cached liveness.
				const response = await fetch(new URL("/browser-source.html", window.location.origin), {
					method: "HEAD",
					cache: "no-store",
					credentials: "omit",
					referrerPolicy: "no-referrer",
					signal: abort.signal,
				});
				return {
					failed: false,
					session: response.ok ? response.headers.get(SESSION_HEADER) : null,
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
