import { createDiscordInviteUrl } from "@memeover/shared";

const botClientId = import.meta.env.PUBLIC_BOT_CLIENT_ID;

/** Invite URL for the hosted bot; null when the build has no client ID (local builds, forks). */
export const botInviteHref = botClientId
	? createDiscordInviteUrl(botClientId, false, { integrationType: 0 })
	: null;
