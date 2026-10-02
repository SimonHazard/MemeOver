import { emit } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { traceMetadata } from "@/shared/overlay-trace";
import type { DisplayQueueItem } from "@/shared/types";
export function useTraceDisplayed(current: DisplayQueueItem | null): void {
	useEffect(() => {
		if (current)
			void emit("overlay-trace", {
				id: crypto.randomUUID(),
				at: Date.now(),
				...traceMetadata(JSON.stringify(current)),
				decision: "displayed",
			});
	}, [current]);
}
