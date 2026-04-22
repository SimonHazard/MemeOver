import { z } from "zod";

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
});

export type OverlaySettingsValues = z.infer<typeof OverlaySettingsSchema>;
