type TestServer = ReturnType<typeof import("../server").createServer>;

export function startServer(createServer: () => TestServer) {
	const app = createServer().listen({ port: 0, hostname: "127.0.0.1" });
	const port = app.server?.port;
	if (!port) throw new Error("Missing ephemeral server port");
	return {
		app,
		port,
		baseUrl: `http://127.0.0.1:${port}`,
		wsUrl: `ws://127.0.0.1:${port}/ws`,
		stop: () => app.stop(true),
	};
}

type Message = Record<string, unknown>;
type Waiter = { predicate: (message: Message) => boolean; resolve: (message: Message) => void };
export async function connect(url: string) {
	const socket = new WebSocket(url);
	const messages: Message[] = [];
	const waiters: Waiter[] = [];
	const closed = new Promise<{ code: number; reason: string }>((resolve) => {
		socket.addEventListener("close", (event) =>
			resolve({ code: event.code, reason: event.reason }),
		);
	});
	socket.addEventListener("message", (event) => {
		const message = JSON.parse(String(event.data)) as Message;
		const index = waiters.findIndex((waiter) => waiter.predicate(message));
		if (index >= 0) waiters.splice(index, 1)[0].resolve(message);
		else messages.push(message);
	});
	await new Promise<void>((resolve, reject) => {
		socket.addEventListener("open", () => resolve(), { once: true });
		socket.addEventListener("error", () => reject(new Error("WS connection failed")), {
			once: true,
		});
	});
	return {
		socket,
		closed,
		send: (message: unknown) =>
			socket.send(typeof message === "string" ? message : JSON.stringify(message)),
		next(
			predicate: (message: Message) => boolean = () => true,
			timeoutMs = 1000,
		): Promise<Message> {
			const index = messages.findIndex(predicate);
			if (index >= 0) return Promise.resolve(messages.splice(index, 1)[0]);
			return new Promise((resolve, reject) => {
				const waiter: Waiter = {
					predicate,
					resolve: (message) => {
						clearTimeout(timer);
						resolve(message);
					},
				};
				const timer = setTimeout(() => {
					const i = waiters.indexOf(waiter);
					if (i >= 0) waiters.splice(i, 1);
					reject(new Error("Timed out waiting for WS message"));
				}, timeoutMs);
				waiters.push(waiter);
			});
		},
		close: () => {
			if (socket.readyState === WebSocket.OPEN) socket.close();
		},
	};
}
export type TestClient = Awaited<ReturnType<typeof connect>>;
export async function joinGuild(client: TestClient, guildId: string, token: string) {
	client.send({ type: "JOIN", guild_id: guildId, token });
	const ack = await client.next((message) => message.type === "JOIN_ACK");
	if (ack.success && Array.isArray(ack.features) && ack.features.includes("guild_state")) {
		const state = await client.next(
			(message) => message.type === "GUILD_STATE" && message.guild_id === guildId,
		);
		if (state.paused_until !== null && typeof state.paused_until !== "number")
			throw new Error("Invalid guild state");
	}
	return ack;
}
