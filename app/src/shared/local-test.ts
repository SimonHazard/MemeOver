import type { MediaEvent } from "@memeover/shared";
export const LOCAL_TEST_PREFIX = "memeover-local-test-";
export function buildLocalTestEvent(guildId: string, now: number): MediaEvent {
	return {
		type: "MEDIA",
		guild_id: guildId,
		channel_id: "local-test",
		message_id: LOCAL_TEST_PREFIX + now,
		author_id: "memeover-test",
		author_username: "MemeOver",
		author_avatar_url: "",
		media_url: "/diagnostic-test.svg",
		media_type: "image",
		text: "MemeOver local rendering test",
		timestamp: now,
	};
}
export function isLocalTestItem(item: { message_id: string }): boolean {
	return item.message_id.startsWith(LOCAL_TEST_PREFIX);
}
