import { type ClientMessage, supportsFeature } from "@memeover/shared";
export type SocketLike = { readyState: number; send(data: string): void };
const WS_OPEN = 1;
let socket: SocketLike | null = null;
let features: readonly string[] | undefined;
export function bindSocket(ws: SocketLike | null): void {
	socket = ws;
	features = undefined;
}
export function unbindSocket(ws: SocketLike): void {
	if (socket === ws) bindSocket(null);
}
export function setServerFeatures(next: readonly string[] | undefined): void {
	features = next ? [...next] : undefined;
}
export function serverSupports(feature: string): boolean {
	return supportsFeature(features, feature);
}
export function sendClientMessage(message: ClientMessage): boolean {
	if (!socket || socket.readyState !== WS_OPEN) return false;
	try {
		socket.send(JSON.stringify(message));
		return true;
	} catch (error) {
		console.warn("[WS] Could not send client message", error);
		return false;
	}
}
export function sendIfSupported(feature: string, message: ClientMessage): boolean {
	return serverSupports(feature) && sendClientMessage(message);
}
