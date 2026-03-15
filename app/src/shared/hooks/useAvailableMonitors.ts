import { useQuery } from "@tanstack/react-query";
import { availableMonitors } from "@tauri-apps/api/window";
import type { OverlayMonitor } from "@/shared/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AvailableMonitor {
	/** Position in the sorted list */
	index: number;
	/** OS-assigned monitor name (may be null on some platforms) */
	name: string | null;
	/** Physical origin — used as stable identifier across sessions */
	position: OverlayMonitor;
	/** Logical dimensions (physical ÷ scaleFactor) for display purposes */
	logicalSize: { width: number; height: number };
	scaleFactor: number;
	/**
	 * True if this is the primary monitor.
	 * Detected via the OS convention: the primary monitor always has its
	 * top-left corner at physical (0, 0) on both macOS and Windows.
	 * Falls back to index 0 if no monitor has origin (0, 0).
	 */
	isPrimary: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Lists all monitors available to the current machine.
 * Uses a short staleTime (30 s) since monitors can be plugged/unplugged.
 * Returns an empty array while loading.
 */
export function useAvailableMonitors(): AvailableMonitor[] {
	const { data = [] } = useQuery({
		queryKey: ["monitors"],
		queryFn: async (): Promise<AvailableMonitor[]> => {
			const monitors = await availableMonitors();
			// Primary monitor is always at physical origin (0, 0) on macOS and Windows.
			// If none matches (exotic setup), fall back to index 0.
			const hasTrueOrigin = monitors.some((m) => m.position.x === 0 && m.position.y === 0);
			return monitors.map((m, index) => ({
				index,
				name: m.name,
				position: { x: m.position.x, y: m.position.y },
				logicalSize: {
					width: Math.round(m.size.width / m.scaleFactor),
					height: Math.round(m.size.height / m.scaleFactor),
				},
				scaleFactor: m.scaleFactor,
				isPrimary: hasTrueOrigin ? m.position.x === 0 && m.position.y === 0 : index === 0,
			}));
		},
		staleTime: 30_000,
		retry: false,
	});

	return data;
}
