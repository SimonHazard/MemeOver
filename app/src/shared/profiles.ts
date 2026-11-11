import { Store } from "@tauri-apps/plugin-store";
import {
	normalizeProfile,
	parseOverlayProfileImport,
	pickOverlayProfileSettings,
} from "./profile-settings";
import type { OverlayProfile, OverlayProfileSettings } from "./types";

const PROFILE_STORE = "overlay-profiles.json";
const PROFILE_KEY = "profiles";

export async function loadOverlayProfiles(): Promise<OverlayProfile[]> {
	const store = await Store.load(PROFILE_STORE);
	const saved = await store.get<unknown>(PROFILE_KEY);
	if (!Array.isArray(saved)) return [];
	return saved
		.map(normalizeProfile)
		.filter((profile): profile is OverlayProfile => profile !== null)
		.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveOverlayProfiles(profiles: OverlayProfile[]): Promise<void> {
	const store = await Store.load(PROFILE_STORE);
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

export async function importOverlayProfile(text: string): Promise<OverlayProfile> {
	const profile = parseOverlayProfileImport(text);
	const profiles = await loadOverlayProfiles();
	await saveOverlayProfiles([profile, ...profiles]);
	return profile;
}
