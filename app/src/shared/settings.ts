import { emit } from "@tauri-apps/api/event";
import { Store } from "@tauri-apps/plugin-store";
import { CURRENT_SCHEMA_VERSION, DEFAULT_SETTINGS, type Settings } from "../shared/types";

// Pre-v2 releases stored textSize as a Tailwind-style key. This table maps those
// legacy values to their pixel equivalents so users keep a visually identical size
// after upgrading to the numeric textSize input.
const LEGACY_TEXT_SIZE_PX: Record<string, number> = {
	xs: 11,
	sm: 13,
	base: 16,
	lg: 18,
	xl: 20,
	"2xl": 24,
	"3xl": 30,
	"4xl": 36,
};

/**
 * Normalises an incoming persisted settings object to the current schema shape.
 * Returns a partial — missing fields fall back to DEFAULT_SETTINGS via spread.
 */
function migrateSettings(saved: unknown): Partial<Settings> {
	if (!saved || typeof saved !== "object") return {};
	const out: Record<string, unknown> = { ...(saved as Record<string, unknown>) };

	// textSize: legacy string → number
	if (typeof out.textSize === "string") {
		out.textSize = LEGACY_TEXT_SIZE_PX[out.textSize] ?? DEFAULT_SETTINGS.textSize;
	}
	if (typeof out.textSize === "number") {
		out.textSize = Math.max(12, Math.min(96, Math.round(out.textSize)));
	}

	// Clamp offsets to valid range — also catches values from the pre-tightened ±50 range.
	if (typeof out.positionOffsetX === "number") {
		out.positionOffsetX = Math.max(-20, Math.min(20, out.positionOffsetX));
	}
	if (typeof out.positionOffsetY === "number") {
		out.positionOffsetY = Math.max(-20, Math.min(20, out.positionOffsetY));
	}

	// v0 → v1: legacy mediaSize was `%` of viewport width (vw). The new fit-box
	// renderer expresses it as `%` of viewport min (vmin). On a 16:9 monitor
	// 100vw ≈ 1.78 × 100vmin, so an old value of 40 looks ~44% smaller in the new
	// model. Bumping by ~1.5 pulls the visual size back into the same ballpark
	// while staying under the 90 cap for reasonable pre-migration values.
	const savedVersion = typeof out.schemaVersion === "number" ? out.schemaVersion : 0;
	if (savedVersion < 1) {
		if (typeof out.mediaSize === "number") {
			out.mediaSize = Math.max(10, Math.min(90, Math.round(out.mediaSize * 1.5)));
		}
	}
	out.schemaVersion = CURRENT_SCHEMA_VERSION;

	return out as Partial<Settings>;
}

export async function loadSettings(): Promise<Settings> {
	const store = await Store.load("settings.json");
	const saved = await store.get<unknown>("settings");
	const migrated = migrateSettings(saved);
	// Shallow merge for top-level fields — new fields not in old settings.json get defaults.
	// Deep merge for enabledTypes: a new media type (e.g. "sticker") added after the initial
	// release must not be silently dropped when the saved object overwrites the default.
	return {
		...DEFAULT_SETTINGS,
		...migrated,
		enabledTypes: {
			...DEFAULT_SETTINGS.enabledTypes,
			...((migrated.enabledTypes ?? {}) as Partial<typeof DEFAULT_SETTINGS.enabledTypes>),
		},
	};
}

export async function persistSettings(settings: Settings): Promise<void> {
	const store = await Store.load("settings.json");
	await store.set("settings", settings);
	await store.save();
	await emit("settings-changed", settings);
}
