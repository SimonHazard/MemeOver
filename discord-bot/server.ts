import "./src/bot";

import { websocketConnectionsWithKey } from "./src/bot";
import type { MessageCode } from "./types/message";
import { getUniqueID } from "./utils/id";
import { removeFromUsersByGuildId } from "./utils/users";

const server = Bun.serve({
	fetch(req, server) {
		const success = server.upgrade(req);
		if (success) {
			// Bun automatically returns a 101 Switching Protocols
			// if the upgrade succeeds
			return undefined;
		}

		// handle HTTP request normally
		return new Response("Hello world!");
	},
	websocket: {
		open(ws) {
			const uniqueID = getUniqueID();
			websocketConnectionsWithKey.set(uniqueID, ws);

			// Send unique code to client
			const messageToSend: MessageCode = {
				code: uniqueID,
			};

			console.log(
				"WebSocket connection opened with key:",
				JSON.stringify(messageToSend),
			);
			ws.send(JSON.stringify(messageToSend));
		},
		message(ws, message) {
			// Keep alive the connection
			if (message === "ping") {
				ws.send("pong");
			}
		},
		close(ws, code, message) {
			console.log(`WebSocket closed: ${code} ${message}`);
			for (const [key, wss] of websocketConnectionsWithKey.entries()) {
				if (wss === ws) {
					websocketConnectionsWithKey.delete(key);
					removeFromUsersByGuildId(key);
					console.log("WebSocket connection closed with key:", key);
					break;
				}
			}
		},
	},
});

console.log(`Listening on ${server.hostname}:${server.port}`);
