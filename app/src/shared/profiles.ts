import { Store } from "@tauri-apps/plugin-store";
import { normalizeSettings } from "./settings";
import type { OverlayProfileSettings } from "./types";
import { CURRENT_SCHEMA_VERSION, OVERLAY_PROFILE_FIELDS, type OverlayProfile } from "./types";

const PROFILE_STORE = "overlay-profiles.json";
const PROFILE_KEY = "profiles";
const EXPORT_SCHEMA_VERSION = 1;

interface OverlayProfileExport {
	app: "MemeOver";
	schemaVersion: typeof EXPORT_SCHEMA_VERSION;
	settingsSchemaVersion: typeof CURRENT_SCHEMA_VERSION;
	profile: {
		name: string;
		settings: OverlayProfileSettings;
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

function normalizeProfile(raw: unknown): OverlayProfile | null {
	if (!isRecord(raw)) return null;
	const now = Date.now();
	const name = typeof raw.name === "string" ? raw.name.trim() : "";
	if (!name) return null;
	if (!isRecord(raw.settings)) return null;

	return {
		id: typeof raw.id === "string" && raw.id.length > 0 ? raw.id : crypto.randomUUID(),
		name: name.slice(0, 48),
		settings: pickOverlayProfileSettings(raw.settings),
		createdAt: typeof raw.createdAt === "number" ? raw.createdAt : now,
		updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : now,
	};
}

async function loadProfileStore(): Promise<Store> {
	return Store.load(PROFILE_STORE);
}

export async function loadOverlayProfiles(): Promise<OverlayProfile[]> {
	const store = await loadProfileStore();
	const saved = await store.get<unknown>(PROFILE_KEY);
	if (!Array.isArray(saved)) return [];
	return saved
		.map(normalizeProfile)
		.filter((profile): profile is OverlayProfile => profile !== null)
		.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveOverlayProfiles(profiles: OverlayProfile[]): Promise<void> {
	const store = await loadProfileStore();
	await store.set(PROFILE_KEY, profiles);
	await store.save();
}

export async function createOverlayProfile(
	name: string,
	settings: OverlayProfileSettings,
): Promise<OverlayProfile> {
	const profiles = await loadOverlayProfiles();
	const now = Date.now();
	const profile: OverlayProfile = {
		id: crypto.randomUUID(),
		name: name.trim().slice(0, 48),
		settings: pickOverlayProfileSettings(settings),
		createdAt: now,
		updatedAt: now,
	};
	await saveOverlayProfiles([profile, ...profiles]);
	return profile;
}

export async function updateOverlayProfile(
	id: string,
	settings: OverlayProfileSettings,
): Promise<OverlayProfile | null> {
	const profiles = await loadOverlayProfiles();
	let updated: OverlayProfile | null = null;
	const next = profiles.map((profile) => {
		if (profile.id !== id) return profile;
		updated = {
			...profile,
			settings: pickOverlayProfileSettings(settings),
			updatedAt: Date.now(),
		};
		return updated;
	});
	await saveOverlayProfiles(next);
	return updated;
}

export async function deleteOverlayProfile(id: string): Promise<void> {
	const profiles = await loadOverlayProfiles();
	await saveOverlayProfiles(profiles.filter((profile) => profile.id !== id));
}

export function serializeOverlayProfile(profile: OverlayProfile): string {
	const payload: OverlayProfileExport = {
		app: "MemeOver",
		schemaVersion: EXPORT_SCHEMA_VERSION,
		settingsSchemaVersion: CURRENT_SCHEMA_VERSION,
		profile: {
			name: profile.name,
			settings: pickOverlayProfileSettings(profile.settings),
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
		settings: pickOverlayProfileSettings(settingsSource),
		createdAt: now,
		updatedAt: now,
	};
}

export async function importOverlayProfile(text: string): Promise<OverlayProfile> {
	const profile = parseOverlayProfileImport(text);
	const profiles = await loadOverlayProfiles();
	await saveOverlayProfiles([profile, ...profiles]);
	return profile;
}
