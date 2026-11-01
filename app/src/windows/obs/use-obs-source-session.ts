import { useEffect, useState } from "react";

const SESSION_HEADER = "X-MemeOver-OBS-Session";
const CHECK_INTERVAL_MS = 1000;
const CHECK_TIMEOUT_MS = 3000;

type SourceState = "checking" | "active" | "stopped";

/** A loaded page must stop receiving memes when its serving app exits or restarts. */
export function useObsSourceSession(): SourceState {
	const [state, setState] = useState<SourceState>("checking");

	useEffect(() => {
		let disposed = false;
		let session: string | null = null;
		let nextCheck: ReturnType<typeof setTimeout> | undefined;
		let controller: AbortController | undefined;

		function stop() {
			// Stop sound before React detaches the elements, even if a player still
			// has pending events/references after the stage is removed.
			document.querySelectorAll<HTMLMediaElement>("video, audio").forEach((player) => {
				player.muted = true;
				player.pause();
			});
			setState("stopped");
		}

		async function check() {
			const request = new AbortController();
			controller = request;
			const timeout = setTimeout(() => request.abort(), CHECK_TIMEOUT_MS);
			try {
				// No fragment, credentials or referrer. A fresh HEAD also avoids cached liveness.
				const response = await fetch(new URL("/obs.html", window.location.origin), {
					method: "HEAD",
					cache: "no-store",
					credentials: "omit",
					referrerPolicy: "no-referrer",
					signal: request.signal,
				});
				if (disposed) return;
				const current = response.ok ? response.headers.get(SESSION_HEADER) : null;
				if (!current || (session !== null && current !== session)) {
					stop();
					return;
				}
				session = current;
				setState("active");
				nextCheck = setTimeout(() => void check(), CHECK_INTERVAL_MS);
			} catch {
				if (!disposed) stop();
			} finally {
				clearTimeout(timeout);
			}
		}

		void check();
		return () => {
			disposed = true;
			clearTimeout(nextCheck);
			controller?.abort();
		};
	}, []);

	// A stopped source stays blank until refreshed, even if another app takes the port.
	return state;
}
