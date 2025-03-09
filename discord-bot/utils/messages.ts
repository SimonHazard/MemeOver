import { websocketConnectionsWithKey } from "../src/bot";
import type { MemeMessage } from "../types/message";

// Send message to a ServerWebSocket
export function sendMessageToWebSocket(
	connection: string,
	message: MemeMessage,
): void {
	const websocketConnection = websocketConnectionsWithKey.get(connection);
	if (websocketConnection) {
		try {
			const messageJSON = JSON.stringify(message);
			websocketConnection.send(messageJSON);
		} catch (err) {
			console.log("Error sending message:", err);
		}
	}
}
