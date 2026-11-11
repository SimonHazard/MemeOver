import { normalizeSettings } from "./settings-normalization";
import {
	CURRENT_SCHEMA_VERSION,
	OVERLAY_PROFILE_FIELDS,
	type OverlayProfile,
	type OverlayProfileSettings,
} from "./types";

const EXPORT_SCHEMA_VERSION = 1;

interface OverlayProfileExport {
	app: "MemeOver";
	schemaVersion: typeof EXPORT_SCHEMA_VERSION;
	settingsSchemaVersion: typeof CURRENT_SCHEMA_VERSION;
	profile: {
		name: string;
		settings: Partial<OverlayProfileSettings>;
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

export function pickOverlayProfileSettings(settings: unknown): OverlayProfileSettings {
	const normalized = normalizeSettings({
		schemaVersion: CURRENT_SCHEMA_VERSION,
		...(isRecord(settings) ? settings : {}),
	});
	return OVERLAY_PROFILE_FIELDS.reduce((acc, key) => {
		acc[key] = normalized[key] as never;
		return acc;
	}, {} as OverlayProfileSettings);
}

/**
 * Validates only the fields a saved or imported profile actually defines. A profile
 * written before a field existed must not reset that field to its default on apply.
 */
export function pickStoredProfileSettings(settings: unknown): Partial<OverlayProfileSettings> {
	if (!isRecord(settings)) return {};
	const normalized = pickOverlayProfileSettings(settings);
	return OVERLAY_PROFILE_FIELDS.reduce(
		(acc, key) => {
			if (key in settings) acc[key] = normalized[key] as never;
			return acc;
		},
		{} as Partial<OverlayProfileSettings>,
	);
}

export function resolveOverlayProfileSettings(
	stored: Partial<OverlayProfileSettings>,
	current: OverlayProfileSettings,
): OverlayProfileSettings {
	return pickOverlayProfileSettings({ ...current, ...stored });
}

export function normalizeProfile(raw: unknown): OverlayProfile | null {
	if (!isRecord(raw)) return null;
	const now = Date.now();
	const name = typeof raw.name === "string" ? raw.name.trim() : "";
	if (!name) return null;
	if (!isRecord(raw.settings)) return null;

	return {
		id: typeof raw.id === "string" && raw.id.length > 0 ? raw.id : crypto.randomUUID(),
		name: name.slice(0, 48),
		settings: pickStoredProfileSettings(raw.settings),
		createdAt: typeof raw.createdAt === "number" ? raw.createdAt : now,
		updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : now,
	};
}

export function serializeOverlayProfile(profile: OverlayProfile): string {
	const payload: OverlayProfileExport = {
		app: "MemeOver",
		schemaVersion: EXPORT_SCHEMA_VERSION,
		settingsSchemaVersion: CURRENT_SCHEMA_VERSION,
		profile: {
			name: profile.name,
			settings: pickStoredProfileSettings(profile.settings),
		},
	};
	return `${JSON.stringify(payload, null, 2)}\n`;
}

export function parseOverlayProfileImport(text: string): OverlayProfile {
	const raw: unknown = JSON.parse(text);
	const now = Date.now();
	let name = "";
	let settingsSource: unknown = raw;

	if (isRecord(raw) && isRecord(raw.profile)) {
		name = typeof raw.profile.name === "string" ? raw.profile.name : "";
		settingsSource = raw.profile.settings;
	} else if (isRecord(raw)) {
		name = typeof raw.name === "string" ? raw.name : "";
		settingsSource = raw.settings ?? raw;
	}

	const cleanName = name.trim().slice(0, 48);
	if (!cleanName) throw new Error("Missing profile name");
	if (!isRecord(settingsSource)) throw new Error("Missing profile settings");

	return {
		id: crypto.randomUUID(),
		name: cleanName,
		settings: pickStoredProfileSettings(settingsSource),
		createdAt: now,
		updatedAt: now,
	};
}
