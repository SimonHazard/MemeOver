// Tells a streaming source from a preview tab by testing a capability, so the page
// stays independent of any particular software.

/**
 * - `stream`: sound plays on its own, and nothing but memes may be drawn.
 * - `preview`: a regular browser tab, where sound needs a gesture and the aids are shown.
 */
export type SourceMode = "stream" | "preview";

export type AutoplayProbeResult = "allowed" | "blocked" | "inconclusive";

const PROBE_TIMEOUT_MS = 1000;
const PROBE_ATTEMPTS = 3;
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

/** Only `NotAllowedError` is a refusal; a timeout or a playback failure says nothing about autoplay. */
export function classifyAutoplayError(error: unknown): AutoplayProbeResult {
	return error instanceof Error && error.name === "NotAllowedError" ? "blocked" : "inconclusive";
}

async function probeAutoplay(): Promise<AutoplayProbeResult> {
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
		return "allowed";
	} catch (error) {
		return classifyAutoplayError(error);
	} finally {
		clearTimeout(timer);
		probe.pause();
		// Abort a load still in flight, so revoking the URL logs no network error.
		probe.removeAttribute("src");
		probe.load();
		URL.revokeObjectURL(url);
	}
}

/**
 * Retries an inconclusive probe, then settles on `stream`: browsers refuse at once, so a probe
 * that never concludes comes from a busy machine, and the aids must not reach a live stream.
 */
export async function resolveSourceMode(
	probe: () => Promise<AutoplayProbeResult>,
	attempts = PROBE_ATTEMPTS,
): Promise<SourceMode> {
	for (let attempt = 0; attempt < attempts; attempt++) {
		const result = await probe();
		if (result === "allowed") return "stream";
		if (result === "blocked") return "preview";
	}
	return "stream";
}

export function detectSourceMode(): Promise<SourceMode> {
	return resolveSourceMode(probeAutoplay);
}
