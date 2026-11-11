/** True for a parsable ws: or wss: URL. The WebSocket constructor can reject invalid URLs. */
export function isWebSocketUrl(value: string): boolean {
	try {
		const protocol = new URL(value).protocol;
		return protocol === "ws:" || protocol === "wss:";
	} catch {
		return false;
	}
}
