import { z } from "zod";
import { FLOATING_REACTION_PRESETS, type Settings } from "@/shared/types";

const OVERLAY_POSITIONS = [
	"center",
	"top-left",
	"top",
	"top-right",
	"left",
	"right",
	"bottom-left",
	"bottom",
	"bottom-right",
] as const;

const TEXT_POSITIONS = [
	"above",
	"below",
	"overlay-top",
	"overlay-middle",
	"overlay-bottom",
] as const;

export const OverlaySettingsSchema = z.object({
	mediaSize: z.number().min(10).max(90),
	duration: z.number().min(1).max(30),
	syncMediaDuration: z.boolean(),
	volume: z.number().min(0).max(100),
	position: z.enum(OVERLAY_POSITIONS),
	positionOffsetX: z.number().min(-20).max(20),
	positionOffsetY: z.number().min(-20).max(20),
	enabledTypes: z.object({
		image: z.boolean(),
		gif: z.boolean(),
		video: z.boolean(),
		audio: z.boolean(),
		text: z.boolean(),
		sticker: z.boolean(),
	}),
	showBotAppSources: z.boolean(),
	textSize: z.number().min(12).max(96),
	textPosition: z.enum(TEXT_POSITIONS),
	textColor: z.string(),
	mediaOpacity: z.number().min(0).max(100),
	bgEnabled: z.boolean(),
	bgColor: z.string(),
	bgOpacity: z.number().min(0).max(100),
	bgBorderColor: z.string(),
	bgBorderOpacity: z.number().min(0).max(100),
	bgBorderWidth: z.number().min(0).max(20),
	bgBorderRadius: z.number().min(0).max(30),
	bgPadding: z.number().min(0).max(100),
	floatingReactionsEnabled: z.boolean(),
	floatingReactionPreset: z.enum(FLOATING_REACTION_PRESETS),
	floatingReactionDuration: z.number().min(2).max(10),
	floatingReactionOpacity: z.number().min(20).max(100),
	floatingReactionSize: z.number().min(3).max(12),
});

export type OverlaySettingsValues = z.infer<typeof OverlaySettingsSchema>;

export function extractDefaults(s: Settings): OverlaySettingsValues {
	return {
		mediaSize: s.mediaSize,
		duration: s.duration,
		syncMediaDuration: s.syncMediaDuration,
		volume: s.volume,
		position: s.position,
		positionOffsetX: s.positionOffsetX,
		positionOffsetY: s.positionOffsetY,
		enabledTypes: s.enabledTypes,
		showBotAppSources: s.showBotAppSources,
		textSize: s.textSize,
		textPosition: s.textPosition,
		textColor: s.textColor,
		mediaOpacity: s.mediaOpacity,
		bgEnabled: s.bgEnabled,
		bgColor: s.bgColor,
		bgOpacity: s.bgOpacity,
		bgBorderColor: s.bgBorderColor,
		bgBorderOpacity: s.bgBorderOpacity,
		bgBorderWidth: s.bgBorderWidth,
		bgBorderRadius: s.bgBorderRadius,
		bgPadding: s.bgPadding,
		floatingReactionsEnabled: s.floatingReactionsEnabled,
		floatingReactionPreset: s.floatingReactionPreset,
		floatingReactionDuration: s.floatingReactionDuration,
		floatingReactionOpacity: s.floatingReactionOpacity,
		floatingReactionSize: s.floatingReactionSize,
	};
}
