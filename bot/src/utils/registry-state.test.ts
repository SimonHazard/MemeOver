import { describe, expect, test } from "bun:test";
import { normalizeRegistry } from "./registry-state";

describe("registry normalization", () => {
	test("migrates legacy guild configs with bot/app sources muted", () => {
		const normalized = normalizeRegistry(
			{
				"guild-1": {
					token: "token-1",
					channel_ids: ["channel-1"],
					registered_at: 1_700_000_000_000,
					last_active_at: null,
					unique_client_ids: ["client-a"],
				},
			},
			1_800_000_000_000,
		);

		expect(normalized.changed).toBe(true);
		expect(normalized.value["guild-1"]).toEqual({
			token: "token-1",
			channel_ids: ["channel-1"],
			allow_bot_app_sources: false,
			registered_at: 1_700_000_000_000,
			last_active_at: null,
			unique_client_ids: ["client-a"],
		});
	});

	test("preserves explicit bot/app source settings", () => {
		const normalized = normalizeRegistry({
			"guild-1": {
				token: "token-1",
				channel_ids: [],
				allow_bot_app_sources: true,
				registered_at: 1_700_000_000_000,
				last_active_at: 1_700_000_001_000,
				unique_client_ids: ["client-a", "client-b"],
			},
			"guild-2": {
				token: "token-2",
				channel_ids: ["channel-2"],
				allow_bot_app_sources: false,
				registered_at: 1_700_000_002_000,
				last_active_at: null,
				unique_client_ids: [],
			},
		});

		expect(normalized.changed).toBe(false);
		expect(normalized.value["guild-1"]?.allow_bot_app_sources).toBe(true);
		expect(normalized.value["guild-2"]?.allow_bot_app_sources).toBe(false);
	});
});
