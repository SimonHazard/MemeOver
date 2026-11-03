import type { SessionRevocationCode } from "@memeover/shared";
import type { WsStatus } from "@/shared/types";

const PROBE_TIMEOUT_MS = 1000;
const PROBE_SAMPLE_RATE = 8000;
const PROBE_SAMPLES = 80;

/** 10 ms of silence as an 8-bit mono PCM WAV. A blob URL is allowed by the app's `media-src`. */
function silentWav(): Blob {
	const header = new DataView(new ArrayBuffer(44));
	const ascii = (offset: number, text: string) => {
		for (let i = 0; i < text.length; i++) header.setUint8(offset + i, text.charCodeAt(i));
	};
	ascii(0, "RIFF");
	header.setUint32(4, 36 + PROBE_SAMPLES, true);
	ascii(8, "WAVEfmt ");
	header.setUint32(16, 16, true); // PCM chunk size
	header.setUint16(20, 1, true); // PCM
	header.setUint16(22, 1, true); // mono
	header.setUint32(24, PROBE_SAMPLE_RATE, true);
	header.setUint32(28, PROBE_SAMPLE_RATE, true); // bytes per second
	header.setUint16(32, 1, true); // block align
	header.setUint16(34, 8, true); // bits per sample
	ascii(36, "data");
	header.setUint32(40, PROBE_SAMPLES, true);
	// 8-bit PCM is unsigned: 128 is silence.
	return new Blob([header, new Uint8Array(PROBE_SAMPLES).fill(128)], { type: "audio/wav" });
}

/**
 * Whether this page may play sound without a user gesture. Streaming software loads
 * browser sources with that permission, while a regular browser tab normally lacks it.
 * Testing the capability keeps the page independent of any particular software.
 */
export async function canAutoplayWithSound(): Promise<boolean> {
	const url = URL.createObjectURL(silentWav());
	const probe = new Audio(url);
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		await Promise.race([
			probe.play(),
			new Promise((_, reject) => {
				timer = setTimeout(() => reject(new Error("Autoplay probe timed out")), PROBE_TIMEOUT_MS);
			}),
		]);
		return true;
	} catch {
		return false;
	} finally {
		clearTimeout(timer);
		probe.pause();
		// Abort a load still in flight, so revoking the URL logs no network error.
		probe.removeAttribute("src");
		probe.load();
		URL.revokeObjectURL(url);
	}
}

export type SourcePreviewStatus =
	| "connecting"
	| "connected"
	| "reconnecting"
	| "revoked"
	| "rejected";

/** What the preview pill says; a revoked or rejected session never reconnects on its own. */
export function sourcePreviewStatus(
	status: WsStatus,
	revoked: SessionRevocationCode | null,
	joinRejected: boolean,
): SourcePreviewStatus {
	if (revoked) return "revoked";
	if (joinRejected) return "rejected";
	if (status === "connected") return "connected";
	if (status === "connecting") return "connecting";
	return "reconnecting";
}

// ─── Local server liveness ────────────────────────────────────────────────────

/** Consecutive failed requests before stopping: one can be a network change or a busy machine. */
export const MAX_LIVENESS_FAILURES = 3;

export type SourceStatus = "checking" | "active" | "stopped";

export interface SourceLiveness {
	status: SourceStatus;
	/** Instance identifier of the app that served this page, once verified. */
	session: string | null;
	failures: number;
}

export const INITIAL_LIVENESS: SourceLiveness = { status: "checking", session: null, failures: 0 };

/** `failed`: no HTTP answer. `session`: the answer's instance header, null if absent or not OK. */
export type LivenessResult = { failed: true } | { failed: false; session: string | null };

/**
 * Decides from one check whether the source keeps running, stops or restarts. Only a
 * response carrying the instance header proves MemeOver is back, and it reloads the page
 * to discard whatever the stopped or previous session left behind.
 */
export function nextLiveness(
	state: SourceLiveness,
	result: LivenessResult,
): { state: SourceLiveness; reload: boolean } {
	if (result.failed) {
		const failures = state.failures + 1;
		return {
			state: {
				...state,
				failures,
				status: failures >= MAX_LIVENESS_FAILURES ? "stopped" : state.status,
			},
			reload: false,
		};
	}
	if (result.session === null) {
		return { state: { ...state, status: "stopped", failures: 0 }, reload: false };
	}
	if (state.status === "stopped" || (state.session !== null && state.session !== result.session)) {
		return { state, reload: true };
	}
	return { state: { status: "active", session: result.session, failures: 0 }, reload: false };
}
