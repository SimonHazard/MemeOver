import { type APIEmbedField, EmbedBuilder } from "discord.js";
import pkg from "../../package.json";

// ─── Palette (Tailwind-aligned) ───────────────────────────────────────────────
const COLOR_SUCCESS = 0x22c55e;
const COLOR_ERROR = 0xef4444;
const COLOR_INFO = 0x3b82f6;
const COLOR_WARNING = 0xf59e0b;

const FOOTER_TEXT = `MemeOver • v${pkg.version}`;

function build(
	color: number,
	title: string,
	description?: string,
	fields?: APIEmbedField[],
): EmbedBuilder {
	const embed = new EmbedBuilder().setColor(color).setTitle(title).setFooter({ text: FOOTER_TEXT });
	if (description !== undefined) embed.setDescription(description);
	if (fields && fields.length > 0) embed.addFields(fields);
	return embed;
}

export function successEmbed(
	title: string,
	description?: string,
	fields?: APIEmbedField[],
): EmbedBuilder {
	return build(COLOR_SUCCESS, title, description, fields);
}

export function errorEmbed(title: string, description?: string): EmbedBuilder {
	return build(COLOR_ERROR, title, description);
}

export function infoEmbed(
	title: string,
	description?: string,
	fields?: APIEmbedField[],
): EmbedBuilder {
	return build(COLOR_INFO, title, description, fields);
}

export function warningEmbed(
	title: string,
	description?: string,
	fields?: APIEmbedField[],
): EmbedBuilder {
	return build(COLOR_WARNING, title, description, fields);
}
