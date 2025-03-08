import "./src/bot";

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
			console.log("WebSocket connection opened");
		},
		message(ws, message) {
			// Keep alive the connection
			if (message === "ping") {
				ws.send("pong");
			}
		},
		close(ws, code, message) {
			console.log(`WebSocket closed: ${code} ${message}`);
		},
	},
});

console.log(`Listening on ${server.hostname}:${server.port}`);
