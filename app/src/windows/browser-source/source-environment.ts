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

export type SourcePreviewStatus = "connecting" | "connected" | "reconnecting" | "revoked";

/** What the preview pill says; a revoked session never reconnects on its own. */
export function sourcePreviewStatus(
	status: WsStatus,
	revoked: SessionRevocationCode | null,
): SourcePreviewStatus {
	if (revoked) return "revoked";
	if (status === "connected") return "connected";
	if (status === "connecting") return "connecting";
	return "reconnecting";
}
