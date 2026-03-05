import { z } from "zod";

// ─── Validation schema ────────────────────────────────────────────────────────
// Message strings are i18n keys, translated at display time.
export const SetupSchema = z.object({
	wsUrl: z
		.string()
		.min(1, "validation.wsUrl_required")
		.refine((v) => v.startsWith("ws://") || v.startsWith("wss://"), "validation.wsUrl_invalid"),
	guildId: z.string().regex(/^\d{17,20}$/, "validation.guildId_invalid"),
	token: z.string().min(1, "validation.token_required"),
});

export type SetupValues = z.infer<typeof SetupSchema>;
