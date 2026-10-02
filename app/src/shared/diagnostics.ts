import type { DiagMessage } from "@memeover/shared";
import { emit, listen } from "@tauri-apps/api/event";
export type DiagResult = { ok: true; diag: DiagMessage } | { ok: false; reason: string };
let active: Promise<DiagResult> | null = null;
export function requestDiag(): Promise<DiagResult> {
	if (active) return active;
	active = (async () => {
		let unlisten: (() => void) | undefined;
		let timer: ReturnType<typeof setTimeout> | undefined;
		let finished = false;
		try {
			return await new Promise<DiagResult>((resolve) => {
				timer = setTimeout(() => resolve({ ok: false, reason: "timeout" }), 6000);
				void listen<DiagResult>("diag-result", (event) => resolve(event.payload))
					.then((fn) => {
						if (finished) {
							fn();
							return;
						}
						unlisten = fn;
						return emit("diag-request");
					})
					.catch(() => resolve({ ok: false, reason: "offline" }));
			});
		} finally {
			finished = true;
			if (timer) clearTimeout(timer);
			unlisten?.();
			active = null;
		}
	})();
	return active;
}
