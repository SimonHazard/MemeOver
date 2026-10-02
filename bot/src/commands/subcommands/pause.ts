import type { ChatInputCommandInteraction } from "discord.js";
import { interactionLocale, t } from "../../i18n";
import {
	PAUSE_CHOICES,
	PAUSE_INDEFINITE,
	type PauseChoice,
	resolvePausedUntil,
} from "../../utils/guild-pause";
import { applyGuildPause } from "../../utils/guild-pause-timers";
import { notConfiguredResponse } from "../connection";
import { successResponse } from "../response-panel";
export async function handlePause(
	interaction: ChatInputCommandInteraction,
	guildId: string,
): Promise<void> {
	const locale = interactionLocale(interaction);
	const choice = interaction.options.getString("duration", true);
	// biome-ignore lint/suspicious/noPrototypeBuiltins: the project targets ES2020, before Object.hasOwn.
	if (!Object.prototype.hasOwnProperty.call(PAUSE_CHOICES, choice)) return;
	const until = resolvePausedUntil(choice as PauseChoice, Date.now());
	if (!applyGuildPause(guildId, until)) {
		await interaction.reply(notConfiguredResponse(locale));
		return;
	}
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
