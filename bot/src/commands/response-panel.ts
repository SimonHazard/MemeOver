import {
	ActionRowBuilder,
	type ButtonBuilder,
	ContainerBuilder,
	type InteractionReplyOptions,
	type InteractionUpdateOptions,
	type MessageCreateOptions,
	MessageFlags,
	type MessageMentionOptions,
	SectionBuilder,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder,
} from "discord.js";
import pkg from "../../package.json";

const PALETTE = {
	success: 0x22c55e,
	error: 0xef4444,
	info: 0x3b82f6,
	warning: 0xf59e0b,
} as const;

const ICON = {
	success: "✅",
	error: "⛔",
	info: "ℹ️",
	warning: "⚠️",
} as const;

const NO_MENTIONS: MessageMentionOptions = { parse: [] };
const COMPONENTS_V2 = MessageFlags.IsComponentsV2;
const EPHEMERAL_COMPONENTS_V2 = MessageFlags.Ephemeral | MessageFlags.IsComponentsV2;

export type PanelTone = keyof typeof PALETTE;

export interface PanelField {
	name: string;
	value: string;
	inline?: boolean;
}

interface PanelOptions {
	tone: PanelTone;
	title: string;
	description?: string;
	fields?: PanelField[];
	blocks?: string[];
	button?: ButtonBuilder;
	actions?: ButtonBuilder[];
	ephemeral?: boolean;
	suppressNotifications?: boolean;
}

function text(content: string): TextDisplayBuilder {
	return new TextDisplayBuilder().setContent(content);
}

function separator(spacing: SeparatorSpacingSize = SeparatorSpacingSize.Small): SeparatorBuilder {
	return new SeparatorBuilder().setDivider(true).setSpacing(spacing);
}

function fieldBlock(field: PanelField): string {
	return `**${field.name}**\n${field.value}`;
}

function buildPanel(options: PanelOptions): ContainerBuilder {
	const container = new ContainerBuilder().setAccentColor(PALETTE[options.tone]);
	const title = `## ${ICON[options.tone]} ${options.title}`;

	if (options.button) {
		const section = new SectionBuilder().addTextDisplayComponents(text(title));
		if (options.description) {
			section.addTextDisplayComponents(text(options.description));
		}
		section.setButtonAccessory(options.button);
		container.addSectionComponents(section);
	} else {
		container.addTextDisplayComponents(text(title));
		if (options.description) {
			container.addTextDisplayComponents(text(options.description));
		}
	}

	if (options.fields?.length) {
		container.addSeparatorComponents(separator(SeparatorSpacingSize.Large));
		for (const field of options.fields) {
			container.addTextDisplayComponents(text(fieldBlock(field)));
		}
	}

	if (options.blocks?.length) {
		container.addSeparatorComponents(separator(SeparatorSpacingSize.Large));
		for (const block of options.blocks) {
			container.addTextDisplayComponents(text(block));
		}
	}

	if (options.actions?.length) {
		container.addSeparatorComponents(separator(SeparatorSpacingSize.Large));
		container.addActionRowComponents(
			new ActionRowBuilder<ButtonBuilder>().addComponents(...options.actions),
		);
	}

	container.addSeparatorComponents(new SeparatorBuilder().setDivider(false));
	container.addTextDisplayComponents(text(`-# MemeOver v${pkg.version}`));
	return container;
}

function flagsFor(options: Pick<PanelOptions, "ephemeral" | "suppressNotifications">): number {
	let flags = COMPONENTS_V2;
	if (options.ephemeral !== false) flags |= MessageFlags.Ephemeral;
	if (options.suppressNotifications) flags |= MessageFlags.SuppressNotifications;
	return flags;
}

export function panelResponse(options: PanelOptions): InteractionReplyOptions {
	return {
		allowedMentions: NO_MENTIONS,
		components: [buildPanel(options)],
		flags: flagsFor(options),
	};
}

export function publicPanelMessage(options: PanelOptions): MessageCreateOptions {
	return {
		allowedMentions: NO_MENTIONS,
		components: [buildPanel({ ...options, ephemeral: false })],
		flags: flagsFor({ ...options, ephemeral: false }),
	};
}

export function panelUpdate(options: PanelOptions): InteractionUpdateOptions {
	return {
		allowedMentions: NO_MENTIONS,
		components: [buildPanel({ ...options, ephemeral: false })],
		flags: COMPONENTS_V2,
	};
}

export function successResponse(
	title: string,
	description?: string,
	fields?: PanelField[],
): InteractionReplyOptions {
	return panelResponse({ tone: "success", title, description, fields });
}

export function errorResponse(title: string, description?: string): InteractionReplyOptions {
	return panelResponse({ tone: "error", title, description });
}

export function infoResponse(
	title: string,
	description?: string,
	fields?: PanelField[],
): InteractionReplyOptions {
	return panelResponse({ tone: "info", title, description, fields });
}

export function warningResponse(
	title: string,
	description?: string,
	fields?: PanelField[],
): InteractionReplyOptions {
	return panelResponse({ tone: "warning", title, description, fields });
}

export function componentsToJson(response: Pick<InteractionReplyOptions, "components">): unknown[] {
	return (
		response.components?.map((component) =>
			"toJSON" in component ? component.toJSON() : component,
		) ?? []
	);
}

export { EPHEMERAL_COMPONENTS_V2 };
