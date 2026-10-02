import { ServerMessageSchema } from "@memeover/shared";
import type { DropReason } from "@/windows/overlay/hooks/route-server-message";
import { isLocalTestItem } from "./local-test";
export type TraceDecision = "displayed" | "queued" | "reaction_shown" | "dropped";
export type TraceReason =
	| DropReason
	| "queue_full"
	| "author_limit"
	| "load_failed"
	| "expired_url"
	| "join_rejected"
	| "session_revoked"
	| "guild_paused";
export interface OverlayTraceEntry {
	id: string;
	at: number;
	kind: "MEDIA" | "TEXT" | "REACTION" | "TEST" | "SYSTEM";
	mediaType?: string;
	author?: string;
	decision: TraceDecision;
	reason?: TraceReason;
	detail?: string;
}
export const TRACE_CAP = 50;
export function pushTrace(
	buffer: OverlayTraceEntry[],
	entry: OverlayTraceEntry,
	cap = TRACE_CAP,
): OverlayTraceEntry[] {
	return [{ ...entry, author: entry.author?.slice(0, 32) }, ...buffer].slice(0, Math.max(0, cap));
}
export function traceMetadata(
	raw: string,
): Pick<OverlayTraceEntry, "kind" | "mediaType" | "author"> {
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return { kind: "SYSTEM" };
	}
	const result = ServerMessageSchema.safeParse(parsed);
	if (!result.success) return { kind: "SYSTEM" };
	const msg = result.data;
	if (msg.type === "MEDIA" || msg.type === "TEXT")
		return {
			kind: isLocalTestItem(msg) ? "TEST" : msg.type,
			mediaType: msg.type === "MEDIA" ? msg.media_type : undefined,
			author:
				msg.type === "MEDIA" && msg.anonymous
					? undefined
					: (msg.author_display_name ?? msg.author_username).slice(0, 32),
		};
	return { kind: msg.type === "REACTION" ? "REACTION" : "SYSTEM" };
}
