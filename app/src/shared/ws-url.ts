import { tryParseUrl } from "@memeover/shared";

/** True for a parsable ws: or wss: URL. The WebSocket constructor can reject invalid URLs. */
export function isWebSocketUrl(value: string): boolean {
	const parsed = tryParseUrl(value);
	if (!parsed) return false;
	return parsed.protocol === "ws:" || parsed.protocol === "wss:";
}
