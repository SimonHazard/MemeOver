import { type Client, PermissionFlagsBits } from "discord.js";
import { config } from "../utils/config";
import { guildRegistry } from "../utils/registry";
import { store } from "../utils/store";
import type { GuildDiagFacts } from "./diag";

let client: Client | null = null;
export function attachDiagClient(value: Client): void {
	client = value;
}
export async function collectGuildDiagFacts(guildId: string): Promise<GuildDiagFacts> {
	const active = client;
	if (!active) throw new Error("Diagnostics unavailable");
	const collect = async (): Promise<GuildDiagFacts> => {
		const cfg = guildRegistry.getConfig(guildId),
			guild = await active.guilds.fetch(guildId),
			me = await guild.members.fetchMe();
		const channels = await Promise.all(
			(cfg?.channel_ids ?? []).slice(0, 25).map(async (id) => {
				const channel = await guild.channels.fetch(id).catch(() => null);
				const perms = channel?.permissionsFor(me);
				return {
					id,
					name: channel?.name ?? null,
					view: perms?.has(PermissionFlagsBits.ViewChannel) ?? false,
					history: perms?.has(PermissionFlagsBits.ReadMessageHistory) ?? false,
				};
			}),
		);
		let intent: boolean | null = null;
		try {
			const app = await active.application?.fetch();
			const flags = app?.flags;
			intent = flags
				? flags.has("GatewayMessageContent") || flags.has("GatewayMessageContentLimited")
				: null;
		} catch {
			/* unknown intent is advisory */
		}
		const unviewableCount =
			cfg?.channel_ids.length === 0
				? guild.channels.cache.filter(
						(c) =>
							c.isTextBased() &&
							!(c.permissionsFor(me)?.has(PermissionFlagsBits.ViewChannel) ?? false),
					).size
				: null;
		return {
			guildId,
			cfg,
			overlaysConnected: store.getGuildMembers(guildId).size,
			clientId: config.discordClientId,
			intent,
			channels,
			unviewableCount,
		};
	};
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			collect(),
			new Promise<never>((_, reject) => {
				timer = setTimeout(() => reject(new Error("Diagnostics timed out")), 4000);
			}),
		]);
	} finally {
		if (timer !== undefined) clearTimeout(timer);
	}
}
