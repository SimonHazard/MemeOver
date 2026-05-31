export interface GuildConfig {
	token: string;
	/** Empty channel_ids = all channels allowed */
	channel_ids: string[];
	/** When true, messages/reactions from bots, apps, and webhooks are broadcast. */
	allow_bot_app_sources: boolean;
	registered_at: number;
	last_active_at: number | null;
	/** At most two opaque app install ids; two is enough to prove the guild is not single-user. */
	unique_client_ids: string[];
}

export type Registry = Record<string, GuildConfig>;

export const UNIQUE_CLIENT_ID_LIMIT = 2;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberOrNull(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeConfig(raw: unknown, now: number): GuildConfig | null {
	if (!isRecord(raw) || typeof raw.token !== "string") return null;

	const channel_ids = Array.isArray(raw.channel_ids)
		? raw.channel_ids.filter((id): id is string => typeof id === "string")
		: [];
	const unique_client_ids = Array.isArray(raw.unique_client_ids)
		? raw.unique_client_ids
				.filter((id): id is string => typeof id === "string" && id.length > 0)
				.slice(0, UNIQUE_CLIENT_ID_LIMIT)
		: [];

	return {
		token: raw.token,
		channel_ids,
		allow_bot_app_sources:
			typeof raw.allow_bot_app_sources === "boolean" ? raw.allow_bot_app_sources : false,
		registered_at: numberOrNull(raw.registered_at) ?? now,
		last_active_at: numberOrNull(raw.last_active_at),
		unique_client_ids,
	};
}

export function normalizeRegistry(
	raw: unknown,
	now = Date.now(),
): {
	value: Registry;
	changed: boolean;
} {
	if (!isRecord(raw)) return { value: {}, changed: true };

	const value: Registry = {};
	let changed = false;

	for (const [guildId, rawConfig] of Object.entries(raw)) {
		const config = normalizeConfig(rawConfig, now);
		if (!config) {
			changed = true;
			continue;
		}
		value[guildId] = config;

		if (
			!isRecord(rawConfig) ||
			!Array.isArray(rawConfig.channel_ids) ||
			rawConfig.channel_ids.some((id) => typeof id !== "string") ||
			typeof rawConfig.allow_bot_app_sources !== "boolean" ||
			numberOrNull(rawConfig.registered_at) === null ||
			!("last_active_at" in rawConfig) ||
			(rawConfig.last_active_at !== null && numberOrNull(rawConfig.last_active_at) === null) ||
			!Array.isArray(rawConfig.unique_client_ids) ||
			rawConfig.unique_client_ids.length > UNIQUE_CLIENT_ID_LIMIT ||
			rawConfig.unique_client_ids.some((id) => typeof id !== "string" || id.length === 0)
		) {
			changed = true;
		}
	}

	return { value, changed };
}
