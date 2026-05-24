import { createHash } from "node:crypto";

const HASH_LENGTH = 12;

export function logHash(value: string | null | undefined): string | undefined {
	if (!value) return undefined;
	return createHash("sha256").update(value).digest("hex").slice(0, HASH_LENGTH);
}

export function mediaUrlLogFields(rawUrl: string): {
	media_host: string;
	media_path_hash: string | undefined;
} {
	try {
		const parsed = new URL(rawUrl);
		return {
			media_host: parsed.hostname,
			media_path_hash: logHash(parsed.pathname),
		};
	} catch {
		return {
			media_host: "invalid-url",
			media_path_hash: logHash(rawUrl),
		};
	}
}

export function discordRefLogFields(refs: {
	guildId?: string | null;
	channelId?: string | null;
	messageId?: string | null;
	userId?: string | null;
	wsId?: string | null;
}): Record<string, string> {
	const out: Record<string, string> = {};
	const guildHash = logHash(refs.guildId);
	const channelHash = logHash(refs.channelId);
	const messageHash = logHash(refs.messageId);
	const userHash = logHash(refs.userId);
	const wsHash = logHash(refs.wsId);

	if (guildHash) out.guild_hash = guildHash;
	if (channelHash) out.channel_hash = channelHash;
	if (messageHash) out.message_hash = messageHash;
	if (userHash) out.user_hash = userHash;
	if (wsHash) out.ws_hash = wsHash;

	return out;
}
