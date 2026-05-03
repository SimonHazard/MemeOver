import { emit } from "@tauri-apps/api/event";
import { Store } from "@tauri-apps/plugin-store";
import {
	CURRENT_SCHEMA_VERSION,
	DEFAULT_SETTINGS,
	DEFAULT_WS_URL,
	FLOATING_REACTION_PRESETS,
	type FloatingReactionPreset,
	LEGACY_DEFAULT_WS_URL,
	type Settings,
} from "../shared/types";

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

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
	if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
	return Math.max(min, Math.min(max, Math.round(value)));
}

function coerceFloatingReactionPreset(out: Record<string, unknown>): FloatingReactionPreset {
	if (
		typeof out.floatingReactionPreset === "string" &&
		FLOATING_REACTION_PRESETS.includes(out.floatingReactionPreset as FloatingReactionPreset)
	) {
		return out.floatingReactionPreset as FloatingReactionPreset;
	}

	return DEFAULT_SETTINGS.floatingReactionPreset;
}

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
	// v1 → v2: introduce `expertMode` + swap the legacy localhost default for the
	// hosted URL. Users who kept the default didn't "choose" localhost, so we
	// silently upgrade them. Users who set a custom URL get expertMode=true so
	// their value stays visible and editable in the UI.
	if (savedVersion < 2) {
		if (out.wsUrl === LEGACY_DEFAULT_WS_URL) {
			out.wsUrl = DEFAULT_WS_URL;
			out.expertMode = false;
		} else if (typeof out.wsUrl === "string" && out.wsUrl.length > 0) {
			out.expertMode = true;
		} else {
			out.expertMode = false;
		}
	}
	// v2 → v3: introduce `floatingReactionsEnabled`. On by default — the feature
	// is visually passive until a Discord reaction lands, so enabling-by-default
	// surfaces it without opt-in friction.
	if (savedVersion < 3) {
		if (typeof out.floatingReactionsEnabled !== "boolean") {
			out.floatingReactionsEnabled = true;
		}
	}
	// v3 → v6: introduce preset-based reactions plus duration/opacity/size.
	// v4/v5 were never shipped, so they collapse into this single migration path.
	out.floatingReactionPreset = coerceFloatingReactionPreset(out);
	out.floatingReactionDuration = clampNumber(
		out.floatingReactionDuration,
		2,
		10,
		DEFAULT_SETTINGS.floatingReactionDuration,
	);
	out.floatingReactionOpacity = clampNumber(
		out.floatingReactionOpacity,
		20,
		100,
		DEFAULT_SETTINGS.floatingReactionOpacity,
	);
	out.floatingReactionSize = clampNumber(
		out.floatingReactionSize,
		3,
		12,
		DEFAULT_SETTINGS.floatingReactionSize,
	);
	out.schemaVersion = CURRENT_SCHEMA_VERSION;

	return out as Partial<Settings>;
}

export async function loadSettings(): Promise<Settings> {
	const store = await Store.load("settings.json");
	const saved = await store.get<unknown>("settings");
	return normalizeSettings(saved);
}

export function normalizeSettings(saved: unknown): Settings {
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
