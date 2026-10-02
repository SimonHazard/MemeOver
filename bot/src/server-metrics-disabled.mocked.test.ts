import { expect, test } from "bun:test";
import { startServer } from "./test-utils/ws-harness";

const { createServer } = await import("./server");
test("metrics disabled without a configured token", async () => {
	const server = startServer(createServer);
	try {
		const response = await fetch(`${server.baseUrl}/metrics`);
		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({ error: "Forbidden" });
	} finally {
		await server.stop();
	}
});
