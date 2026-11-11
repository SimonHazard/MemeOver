import { z } from "zod";
import {
	CONNECTION_NOTIFICATION_POSITIONS,
	FLOATING_REACTION_PRESETS,
	OVERLAY_PROFILE_FIELDS,
	type Settings,
} from "@/shared/types";

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
	connectionNotificationsEnabled: z.boolean(),
	connectionNotificationPosition: z.enum(CONNECTION_NOTIFICATION_POSITIONS),
	connectionNotificationDuration: z.number().int().min(1).max(30),
	maxQueuedPerAuthor: z.number().int().min(0).max(10),
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

export function extractDefaults(settings: Settings): OverlaySettingsValues {
	return OVERLAY_PROFILE_FIELDS.reduce((values, key) => {
		values[key] = settings[key] as never;
		return values;
	}, {} as OverlaySettingsValues);
}
