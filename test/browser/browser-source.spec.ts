import { expect, type Page, test, type WebSocketRoute } from "@playwright/test";

const guildId = "123456789012345678";
const token = "source-test-token";
const wsUrl = "ws://source.test/ws";
const videoUrl = "https://media.source.test/meme.mp4";
const clientId = "desktop-install-id";

function fragment(overrides: Record<string, string> = {}) {
	const params = { g: guildId, t: token, w: wsUrl, c: clientId, ...overrides };
	return Object.entries(params)
		.map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
		.join("&");
}

/** Decides the page's autoplay probe; `autoplay` attributes on real players are unaffected. */
async function stubAutoplay(page: Page, allowed: boolean) {
	await page.addInitScript((isAllowed) => {
		HTMLMediaElement.prototype.play = () =>
			isAllowed
				? Promise.resolve()
				: Promise.reject(new DOMException("Blocked by test", "NotAllowedError"));
	}, allowed);
}

/** Opens the real page with a mocked bot; the media request hangs so the video stays mounted. */
async function openSource(
	page: Page,
	{ autoplay = false, joinAccepted = true, overrides = {} as Record<string, string> } = {},
) {
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
	await stubAutoplay(page, autoplay);
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
			if (!joinAccepted) {
				// The bot refuses a stale token without closing the socket.
				ws.send(
					JSON.stringify({
						type: "JOIN_ACK",
						guild_id: message.guild_id,
						success: false,
						error: "Invalid token",
					}),
				);
				return;
			}
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
	await page.goto(`/browser-source.html#${fragment(overrides)}`);
	return { errors, requests, joins, sockets, closed };
}

test("an incomplete link is explained in a preview and draws nothing in a streaming source", async ({
	page,
}) => {
	await stubAutoplay(page, false);
	await page.goto(`/browser-source.html#${fragment({ t: "" })}`);
	await expect(page.getByText("This source link is incomplete")).toBeVisible();

	const streaming = await page.context().newPage();
	await stubAutoplay(streaming, true);
	await streaming.goto("/browser-source.html#g=nope");
	await expect.poll(() => streaming.locator("#root").innerHTML()).toBe("");
	await expect(streaming.getByText("This source link is incomplete")).toHaveCount(0);
	await streaming.close();
});

test("a browser preview joins with the link's credentials and stays muted until a gesture", async ({
	page,
}) => {
	const source = await openSource(page);
	await expect(page.getByRole("status")).toHaveText("MemeOver · connected");
	expect(source.joins).toEqual([
		expect.objectContaining({ type: "JOIN", guild_id: guildId, token }),
	]);

	const video = page.locator("video");
	await expect(video).toHaveCount(1);
	expect(await video.evaluate((el: HTMLVideoElement) => el.muted)).toBe(true);
	await page.getByRole("button", { name: "Click to enable sound" }).click();
	// The element keeps playing: the mute is lifted on the live element, not on a remount.
	await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.muted)).toBe(false);
	await expect(page.getByRole("button", { name: "Click to enable sound" })).toHaveCount(0);

	// The preview pill hides itself once connected.
	await expect(page.getByRole("status")).toHaveCount(0, { timeout: 5000 });
	expect(source.requests.filter((url) => url.includes(token))).toEqual([]);
	expect(source.errors).toEqual([]);
});

test("a source allowed to autoplay plays sound at once and draws no preview aid", async ({
	page,
}) => {
	const source = await openSource(page, { autoplay: true });
	const video = page.locator("video");
	await expect(video).toHaveCount(1);
	expect(await video.evaluate((el: HTMLVideoElement) => el.muted)).toBe(false);
	await expect(page.getByRole("status")).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Click to enable sound" })).toHaveCount(0);
	expect(source.errors).toEqual([]);
});

const credentialChanges: { name: string; values: Record<string, string> }[] = [
	{ name: "guild", values: { g: "223456789012345678" } },
	{ name: "token", values: { t: "replacement-test-token" } },
];
for (const change of credentialChanges) {
	test(`changing the link's ${change.name} starts a fresh session and discards old media`, async ({
		page,
	}) => {
		const source = await openSource(page, { autoplay: true });
		await expect(page.locator("video")).toHaveAttribute("src", `${videoUrl}?join=1`);
		source.sockets[source.sockets.length - 1]?.send(
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
		await expect.poll(() => source.joins.length).toBe(2);
		expect(source.joins[1]).toEqual(
			expect.objectContaining({
				guild_id: change.values.g ?? guildId,
				token: change.values.t ?? token,
			}),
		);
		await expect.poll(() => source.closed.size).toBe(1);
		await expect(page.locator("video")).toHaveAttribute("src", `${videoUrl}?join=2`);
		// End the replacement media: a queue left over from the old session would surface now.
		await page.locator("video").evaluate((element) => element.dispatchEvent(new Event("error")));
		await expect(page.locator("video")).toHaveCount(0);
		await expect(page.getByText("Queued by the old session", { exact: true })).toHaveCount(0);
	});
}

test("a source cannot join the bot before its local server is verified", async ({ page }) => {
	await page.route("**/browser-source.html", (route) =>
		route.request().method() === "HEAD"
			? route.fulfill({ status: 200, headers: { "Content-Type": "text/html" } })
			: route.continue(),
	);
	const source = await openSource(page);
	await expect(page.getByRole("status")).toHaveText(/source stopped/);
	expect(source.joins).toHaveLength(0);
	await expect(page.locator("video")).toHaveCount(0);
});

test("a link's moderation filters and install id apply, and no connection toast reaches the stream", async ({
	page,
}) => {
	const filters = Buffer.from(JSON.stringify({ m: ["2"], a: true })).toString("base64url");
	const source = await openSource(page, { autoplay: true, overrides: { f: filters } });
	await expect.poll(() => source.joins.length).toBe(1);
	expect(source.joins[0]).toEqual(expect.objectContaining({ client_id: clientId }));
	const socket = source.sockets[source.sockets.length - 1];
	const media = (values: Record<string, unknown>) =>
		socket?.send(
			JSON.stringify({
				type: "MEDIA",
				guild_id: guildId,
				channel_id: "1",
				message_id: String(values.author_id),
				author_username: "Author",
				author_avatar_url: "",
				media_type: "video",
				timestamp: Date.now(),
				...values,
			}),
		);
	// The join's media comes from muted author 2; an anonymous one must be dropped as well.
	media({ author_id: "secret", anonymous: true, media_url: `${videoUrl}?from=anonymous` });
	media({ author_id: "3", media_url: `${videoUrl}?from=3` });
	await expect(page.locator("video")).toHaveAttribute("src", `${videoUrl}?from=3`);

	for (const count of [1, 2]) {
		socket?.send(JSON.stringify({ type: "MEMBER_COUNT_UPDATE", guild_id: guildId, count }));
	}
	await page.waitForTimeout(300);
	await expect(page.getByText(/connected/i)).toHaveCount(0);
});

test("a preview says the bot refused the link instead of reconnecting forever", async ({
	page,
}) => {
	const source = await openSource(page, { joinAccepted: false });
	await expect(page.getByRole("status")).toHaveText(/link refused by the bot/);
	expect(source.joins).toHaveLength(1);
	await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("one failed liveness check neither stops the source nor reconnects it", async ({ page }) => {
	const source = await openSource(page, { autoplay: true });
	await expect(page.locator("video")).toHaveCount(1);
	let failures = 0;
	await page.route("**/browser-source.html", (route) => {
		if (route.request().method() !== "HEAD" || failures > 0) return route.continue();
		failures++;
		return route.abort();
	});
	await expect.poll(() => failures).toBe(1);
	await page.waitForTimeout(2500);
	await expect(page.locator("video")).toHaveCount(1);
	expect(source.joins).toHaveLength(1);
	expect(source.closed.size).toBe(0);
});

for (const failure of ["unreachable", "timeout"] as const) {
	test(`a ${failure} local server stops the source until MemeOver serves it again`, async ({
		page,
	}) => {
		const source = await openSource(page, { autoplay: true });
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
		await page.route("**/browser-source.html", (route) => {
			if (route.request().method() !== "HEAD") return route.continue();
			probes.push({
				url: route.request().url(),
				referrer: route.request().headers().referer,
			});
			return failure === "timeout" ? undefined : route.abort();
		});
		await expect.poll(() => source.closed.size, { timeout: 15000 }).toBe(1);
		await expect(page.locator("video")).toHaveCount(0);
		// A hanging server takes longer to declare than the unplayable media's safety timer.
		if (failure === "unreachable") {
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
		}
		await expect(page.getByRole("status")).toHaveCount(0);
		await expect(page.getByRole("button")).toHaveCount(0);
		expect(source.joins).toHaveLength(1);
		expect(probes).not.toHaveLength(0);
		for (const probe of probes) {
			expect(new URL(probe.url).pathname).toBe("/browser-source.html");
			expect(new URL(probe.url).hash).toBe("");
			expect(probe.referrer).toBeUndefined();
		}
		expect(source.requests.filter((url) => url.includes(token))).toEqual([]);

		// MemeOver serves the page again: a fresh session resumes without any click.
		await page.unroute("**/browser-source.html");
		await expect.poll(() => source.joins.length, { timeout: 8000 }).toBe(2);
		await expect(page.locator("video")).toHaveAttribute("src", `${videoUrl}?join=2`);
	});
}

test("a restarted MemeOver reloads the source into a fresh session", async ({ page }) => {
	const source = await openSource(page, { autoplay: true });
	await expect(page.locator("video")).toHaveAttribute("src", `${videoUrl}?join=1`);
	await page.route("**/browser-source.html", (route) =>
		route.request().method() === "HEAD"
			? route.fulfill({
					status: 200,
					headers: { "X-MemeOver-Source-Session": "another-app-instance" },
				})
			: route.continue(),
	);
	await expect.poll(() => source.joins.length, { timeout: 8000 }).toBe(2);
	await expect.poll(() => source.closed.size).toBe(1);
	await expect(page.locator("video")).toHaveAttribute("src", `${videoUrl}?join=2`);
});

test("another program answering on the port stops the source and is never followed", async ({
	page,
}) => {
	const source = await openSource(page, { autoplay: true });
	await expect(page.locator("video")).toHaveCount(1);
	await page.route("**/browser-source.html", (route) =>
		route.request().method() === "HEAD"
			? route.fulfill({ status: 200, headers: { "Content-Type": "text/html" } })
			: route.continue(),
	);
	await expect(page.locator("video")).toHaveCount(0, { timeout: 8000 });
	await page.waitForTimeout(1500);
	expect(source.joins).toHaveLength(1);
});

// The flag browser sources embedded in streaming software use: the real probe, without a stub.
test("with autoplay permission, the real probe grants sound and hides the preview aids", async ({
	playwright,
	baseURL,
	browserName,
}) => {
	test.skip(browserName !== "chromium", "The autoplay flag exists only in Chromium");
	const browser = await playwright.chromium.launch({
		channel: "chrome",
		args: ["--autoplay-policy=no-user-gesture-required"],
	});
	try {
		const page = await (await browser.newContext({ baseURL })).newPage();
		await page.route(`${videoUrl}*`, () => {});
		await page.routeWebSocket(wsUrl, (ws) => {
			ws.onMessage((raw) => {
				if (JSON.parse(String(raw)).type !== "JOIN") return;
				ws.send(JSON.stringify({ type: "JOIN_ACK", guild_id: guildId, success: true }));
				ws.send(
					JSON.stringify({
						type: "MEDIA",
						guild_id: guildId,
						channel_id: "1",
						message_id: "1",
						author_id: "2",
						author_username: "Streamer",
						author_avatar_url: "",
						media_url: videoUrl,
						media_type: "video",
						timestamp: Date.now(),
					}),
				);
			});
		});
		await page.goto(`/browser-source.html#${fragment()}`);
		const video = page.locator("video");
		await expect(video).toHaveCount(1);
		expect(await video.evaluate((el: HTMLVideoElement) => el.muted)).toBe(false);
		await expect(page.getByRole("status")).toHaveCount(0);
		await expect(page.getByRole("button")).toHaveCount(0);
	} finally {
		await browser.close();
	}
});
