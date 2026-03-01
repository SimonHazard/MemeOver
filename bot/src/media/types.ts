// ─── Media-specific types ─────────────────────────────────────────────────────

import type { MediaType } from "@memeover/shared";
export type { MediaType };

export interface ExtractedMedia {
	url: string;
	media_type: MediaType;
}
