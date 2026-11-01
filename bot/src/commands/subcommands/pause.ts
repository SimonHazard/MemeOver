import type { ChatInputCommandInteraction } from "discord.js";
import { interactionLocale, t } from "../../i18n";
import {
	PAUSE_CHOICES,
	PAUSE_INDEFINITE,
	type PauseChoice,
	resolvePausedUntil,
} from "../../utils/guild-pause";
import { applyGuildPause } from "../../utils/guild-pause-timers";
import { discordRefLogFields, logHash } from "../../utils/log-privacy";
import { logger } from "../../utils/logger";
import { notConfiguredResponse } from "../connection";
import { errorResponse, successResponse } from "../response-panel";

const log = logger.child({ module: "pause" });

export async function handlePause(
	interaction: ChatInputCommandInteraction,
	guildId: string,
): Promise<void> {
	const locale = interactionLocale(interaction);
	const choice = interaction.options.getString("duration", true);
	// biome-ignore lint/suspicious/noPrototypeBuiltins: the project targets ES2020, before Object.hasOwn.
	if (!Object.prototype.hasOwnProperty.call(PAUSE_CHOICES, choice)) {
		// Discord enforces registered choices; a stale command definition must still get an answer.
		await interaction.reply(
			errorResponse(
				t(locale, "pause.invalidDurationTitle"),
				t(locale, "pause.invalidDurationDescription"),
			),
		);
		return;
	}
	const until = resolvePausedUntil(choice as PauseChoice, Date.now());
	if (!applyGuildPause(guildId, until)) {
		await interaction.reply(notConfiguredResponse(locale));
		return;
	}
	log.info(
		{
			event: "admin_pause",
			...discordRefLogFields({ guildId }),
			actor: logHash(interaction.user?.id),
			choice,
		},
		"Guild broadcast paused",
	);
	const time = Math.floor(until / 1000);
	await interaction.reply(
		successResponse(
			t(locale, "pause.successTitle"),
			until === PAUSE_INDEFINITE
				? t(locale, "pause.successIndefinite")
				: `${t(locale, "pause.successUntil")} <t:${time}:t> (<t:${time}:R>)`,
		),
	);
}
