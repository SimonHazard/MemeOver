import { expect, type Page, test, type WebSocketRoute } from "@playwright/test";

const guildId = "123456789012345678";
const token = "obs-test-token";
const wsUrl = "ws://obs.test/ws";
const videoUrl = "https://media.obs.test/meme.mp4";

function fragment(overrides: Record<string, string> = {}) {
	const params = { g: guildId, t: token, w: wsUrl, ...overrides };
	return Object.entries(params)
		.map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
		.join("&");
}

/** Opens the real OBS entry with a mocked bot; the media request hangs so the video stays mounted. */
async function openObs(page: Page, { inObs = false } = {}) {
	const errors: string[] = [];
	const requests: string[] = [];
	const joins: unknown[] = [];
	const sockets: WebSocketRoute[] = [];
	const closed = new Set<WebSocketRoute>();
	page.on("pageerror", (error) => errors.push(error.message));
	page.on("console", (message) => {
		if (message.type() === "error") errors.push(message.text());
	});
	page.on("request", (request) => requests.push(request.url()));
	if (inObs) await page.addInitScript(() => Object.assign(window, { obsstudio: {} }));
	await page.route(`${videoUrl}*`, () => {});
	await page.routeWebSocket(wsUrl, (ws) => {
		sockets.push(ws);
		let joined = false;
		// React StrictMode can retire a socket before JOIN; count authenticated sessions only.
		ws.onClose(() => {
			if (joined) closed.add(ws);
		});
		ws.onMessage((raw) => {
			const message = JSON.parse(String(raw));
			if (message.type !== "JOIN") return;
			joined = true;
			joins.push(message);
			ws.send(JSON.stringify({ type: "JOIN_ACK", guild_id: message.guild_id, success: true }));
			ws.send(
				JSON.stringify({
					type: "MEDIA",
					guild_id: message.guild_id,
					channel_id: "1",
					message_id: "1",
					author_id: "2",
					author_username: "Streamer",
					author_avatar_url: "",
					media_url: `${videoUrl}?join=${joins.length}`,
					media_type: "video",
					timestamp: Date.now(),
				}),
			);
		});
	});
	await page.goto(`/obs.html#${fragment()}`);
	return { errors, requests, joins, sockets, closed };
}

test("an incomplete link explains how to get a new one, outside OBS only", async ({ page }) => {
	await page.goto(`/obs.html#${fragment({ t: "" })}`);
	await expect(page.getByText("This OBS link is incomplete")).toBeVisible();

	const inObs = await page.context().newPage();
	await inObs.addInitScript(() => Object.assign(window, { obsstudio: {} }));
	await inObs.goto("/obs.html#g=nope");
	await expect(inObs.locator("#root")).toBeEmpty();
	await inObs.close();
});

test("a browser preview joins with the link's credentials and stays muted until a gesture", async ({
	page,
}) => {
	const obs = await openObs(page);
	await expect(page.getByRole("status")).toHaveText("MemeOver · connected");
	expect(obs.joins).toEqual([expect.objectContaining({ type: "JOIN", guild_id: guildId, token })]);

	const video = page.locator("video");
	await expect(video).toHaveCount(1);
	expect(await video.evaluate((el: HTMLVideoElement) => el.muted)).toBe(true);
	await page.getByRole("button", { name: "Click to enable sound" }).click();
	// The element keeps playing: the mute is lifted on the live element, not on a remount.
	await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.muted)).toBe(false);
	await expect(page.getByRole("button", { name: "Click to enable sound" })).toHaveCount(0);

	// The preview pill hides itself once connected.
	await expect(page.getByRole("status")).toHaveCount(0, { timeout: 5000 });
	expect(obs.requests.filter((url) => url.includes(token))).toEqual([]);
	expect(obs.errors).toEqual([]);
});

test("inside OBS the source plays sound at once and draws no preview aid", async ({ page }) => {
	const obs = await openObs(page, { inObs: true });
	const video = page.locator("video");
	await expect(video).toHaveCount(1);
	expect(await video.evaluate((el: HTMLVideoElement) => el.muted)).toBe(false);
	await expect(page.getByRole("status")).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Click to enable sound" })).toHaveCount(0);
	expect(obs.errors).toEqual([]);
});

const credentialChanges: { name: string; values: Record<string, string> }[] = [
	{ name: "guild", values: { g: "223456789012345678" } },
	{ name: "token", values: { t: "replacement-test-token" } },
];
for (const change of credentialChanges) {
	test(`changing the link's ${change.name} starts a fresh session and discards old media`, async ({
		page,
	}) => {
		const obs = await openObs(page, { inObs: true });
		await expect(page.locator("video")).toHaveAttribute("src", `${videoUrl}?join=1`);
		obs.sockets[obs.sockets.length - 1]?.send(
			JSON.stringify({
				type: "TEXT",
				guild_id: guildId,
				channel_id: "1",
				message_id: "queued-old-session",
				author_id: "2",
				author_username: "Streamer",
				author_avatar_url: "",
				text: "Queued by the old session",
				timestamp: Date.now(),
			}),
		);
		await page.evaluate((hash) => {
			window.location.hash = hash;
		}, fragment(change.values));
		await expect.poll(() => obs.joins.length).toBe(2);
		expect(obs.joins[1]).toEqual(
			expect.objectContaining({
				guild_id: change.values.g ?? guildId,
				token: change.values.t ?? token,
			}),
		);
		await expect.poll(() => obs.closed.size).toBe(1);
		await expect(page.locator("video")).toHaveAttribute("src", `${videoUrl}?join=2`);
		// End the replacement media: a queue left over from the old session would surface now.
		await page.locator("video").evaluate((element) => element.dispatchEvent(new Event("error")));
		await expect(page.locator("video")).toHaveCount(0);
		await expect(page.getByText("Queued by the old session", { exact: true })).toHaveCount(0);
	});
}

test("a source cannot join the bot before its local server is verified", async ({ page }) => {
	await page.route("**/obs.html", (route) =>
		route.request().method() === "HEAD"
			? route.fulfill({ status: 200, headers: { "Content-Type": "text/html" } })
			: route.continue(),
	);
	const obs = await openObs(page);
	await expect(page.getByRole("status")).toHaveText(/source stopped/);
	expect(obs.joins).toHaveLength(0);
	await expect(page.locator("video")).toHaveCount(0);
});

for (const failure of ["unreachable", "timeout", "restarted"] as const) {
	test(`a ${failure} local server stops an already loaded OBS source`, async ({ page }) => {
		const obs = await openObs(page, { inObs: true });
		await expect(page.locator("video")).toHaveCount(1);
		await page.locator("video").evaluate((player) => {
			const video = player as HTMLVideoElement;
			const observation = { player: video, pauseCalls: 0 };
			const pause = video.pause.bind(video);
			video.pause = () => {
				observation.pauseCalls++;
				pause();
			};
			Object.assign(window, { stoppedPlayer: observation });
		});
		const probes: { url: string; referrer: string | undefined }[] = [];
		await page.route("**/obs.html", (route) => {
			if (route.request().method() !== "HEAD") return route.continue();
			probes.push({
				url: route.request().url(),
				referrer: route.request().headers().referer,
			});
			if (failure === "timeout") return;
			return failure === "unreachable"
				? route.abort()
				: route.fulfill({
						status: 200,
						headers: { "X-MemeOver-OBS-Session": "another-app-instance" },
					});
		});
		await expect(page.locator("video")).toHaveCount(0, { timeout: 8000 });
		expect(
			await page.evaluate(() => {
				const { player, pauseCalls } = (
					window as unknown as {
						stoppedPlayer: { player: HTMLVideoElement; pauseCalls: number };
					}
				).stoppedPlayer;
				return { muted: player.muted, pauseCalls };
			}),
		).toEqual({ muted: true, pauseCalls: 1 });
		await expect.poll(() => obs.closed.size).toBe(1);
		await expect(page.getByRole("status")).toHaveCount(0);
		await expect(page.getByRole("button")).toHaveCount(0);
		// A recovered server must not reconnect this stale page: refresh is required.
		await page.unroute("**/obs.html");
		await page.waitForTimeout(1500);
		expect(obs.joins).toHaveLength(1);
		expect(probes).not.toHaveLength(0);
		for (const probe of probes) {
			expect(new URL(probe.url).pathname).toBe("/obs.html");
			expect(new URL(probe.url).hash).toBe("");
			expect(probe.referrer).toBeUndefined();
		}
		expect(obs.requests.filter((url) => url.includes(token))).toEqual([]);
	});
}
