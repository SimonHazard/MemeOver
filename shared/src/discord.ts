/** View Channel + Send Messages + Read Message History. */
export const DISCORD_INVITE_PERMISSIONS = 68608;
export function createDiscordInviteUrl(
	clientId: string,
	administrator = false,
	options: { integrationType?: 0 } = {},
): string | null {
	const id = clientId.trim();
	if (!/^\d{17,20}$/.test(id)) return null;
	const params = new URLSearchParams({
		client_id: id,
		scope: "bot applications.commands",
		permissions: String(administrator ? 8 : DISCORD_INVITE_PERMISSIONS),
	});
	if (options.integrationType !== undefined)
		params.set("integration_type", String(options.integrationType));
	return `https://discord.com/oauth2/authorize?${params.toString()}`;
}
