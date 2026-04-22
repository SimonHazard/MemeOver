import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { isAllowedAndFresh } from "../../media/allowlist";
import { shouldDispatch } from "../../media/dedup";
import { detectMediaType, urlPathname } from "../../media/extractor";
import { broadcastToGuild } from "../../server";
import { logger } from "../../utils/logger";
import { guildRegistry } from "../../utils/registry";
import type { MediaEvent } from "../../utils/types";
import { errorEmbed, successEmbed } from "../embeds";

const log = logger.child({ module: "secret" });

/** Sentinel author_id for anonymous memes — surfaced in logs, ignored by the overlay (which checks `anonymous`). */
const ANONYMOUS_AUTHOR_ID = "secret";

export async function handleSecret(
	interaction: ChatInputCommandInteraction,
	guildId: string,
): Promise<void> {
	if (!guildRegistry.isRegistered(guildId)) {
		const embed = errorEmbed(
			"Not configured",
			"This server has not been set up yet. Run `/memeover setup` first.",
		);
		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
		return;
	}

	const rawUrl = interaction.options.getString("url", true).trim();

	if (!isAllowedAndFresh(rawUrl)) {
		const embed = errorEmbed(
			"URL not allowed",
			"Only links from Discord CDN, Tenor, Giphy, or Imgur are accepted. Paste a direct image/GIF/video URL from one of these hosts.",
		);
		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
		return;
	}

	const media_type = detectMediaType(rawUrl);
	if (!media_type) {
		const embed = errorEmbed(
			"Unsupported media type",
			"The URL must point to an image, GIF, video, or audio file (`.png`, `.jpg`, `.gif`, `.mp4`, `.webm`, `.mp3`, …).",
		);
		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
		return;
	}

	const channelId = interaction.channelId;
	if (!channelId) {
		const embed = errorEmbed(
			"Channel required",
			"This command must be used inside a text channel.",
		);
		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
		return;
	}

	if (!guildRegistry.isChannelAllowed(guildId, channelId)) {
		const embed = errorEmbed(
			"Channel not watched",
			"This channel is not in the MemeOver watch list. Ask a server manager to add it via `/memeover setup #channel`.",
		);
		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
		return;
	}

	// URL-only dedup key: each interaction has a unique id, so pairing id+url would
	// never collide. Keying on the URL alone is what gates anti-spam when the same
	// meme is resubmitted within the TTL window.
	if (!shouldDispatch(`secret:${urlPathname(rawUrl)}`)) {
		const embed = errorEmbed(
			"Already sent",
			"This exact URL was just pushed. Wait a moment before resending.",
		);
		await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
		return;
	}

	const event: MediaEvent = {
		type: "MEDIA",
		guild_id: guildId,
		channel_id: channelId,
		message_id: interaction.id,
		author_id: ANONYMOUS_AUTHOR_ID,
		author_username: "",
		author_avatar_url: "",
		media_url: rawUrl,
		media_type,
		timestamp: Date.now(),
		anonymous: true,
	};

	broadcastToGuild(guildId, event);
	log.info(
		{ event: "secret_broadcast", guildId, channelId, media_type, media_url: rawUrl },
		"Anonymous meme broadcast",
	);

	const embed = successEmbed(
		"Secret meme sent",
		"Your anonymous meme was pushed to every connected overlay in this server. Nobody sees your name.",
	);
	await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
