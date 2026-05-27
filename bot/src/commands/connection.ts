import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { config } from "../utils/config";

const MEMEOVER_SITE_URL = "https://memeover.simonhazard.com";

export function buildConnectionCode(guildId: string, token: string): string {
	const params = new URLSearchParams({
		guild_id: guildId,
		token,
		ws_url: config.publicWsUrl,
	});
	return `memeover://setup?${params.toString()}`;
}

export function connectionActionRows(): ActionRowBuilder<ButtonBuilder>[] {
	return [
		new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setStyle(ButtonStyle.Link)
				.setURL(MEMEOVER_SITE_URL)
				.setLabel("Open MemeOver"),
		),
	];
}
