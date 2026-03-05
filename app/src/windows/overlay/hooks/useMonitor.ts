import { useQuery } from "@tanstack/react-query";
import { currentMonitor } from "@tauri-apps/api/window";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MonitorSize {
	/** Logical pixel width of the current monitor */
	width: number;
	/** Logical pixel height of the current monitor */
	height: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Detects the current monitor's logical dimensions via the Tauri monitor API.
 * Returns `null` until the async detection resolves.
 *
 * Uses TanStack Query with `staleTime: Infinity` — monitor size is stable for
 * the lifetime of the window session and never needs automatic refetching.
 */
export function useMonitor(): MonitorSize | null {
	const { data = null } = useQuery({
		queryKey: ["monitor"],
		queryFn: async (): Promise<MonitorSize | null> => {
			const monitor = await currentMonitor();
			if (!monitor) return null;
			const logical = monitor.size.toLogical(monitor.scaleFactor);
			return {
				width: Math.round(logical.width),
				height: Math.round(logical.height),
			};
		},
		// Monitor dimensions don't change during a session — never stale, never GC'd.
		staleTime: Infinity,
		gcTime: Infinity,
		retry: false,
	});

	return data;
}
