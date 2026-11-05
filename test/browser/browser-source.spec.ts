import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type Browser, expect, type Page, test, type WebSocketRoute } from "@playwright/test";

const guildId = "123456789012345678";
const token = "source-test-token";
const wsUrl = "ws://source.test/ws";
const videoUrl = "https://media.source.test/meme.mp4";
const clientId = "desktop-install-id";
/** The page's liveness checks: only they carry a query. */
const SOURCE_CHECK = /\/browser-source\.html\?/;

// A liveness check can still be in flight when a test ends, with its route about to answer.
test.afterEach(({ page }) => page.unrouteAll({ behavior: "ignoreErrors" }));

const base64Json = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

/** What the local server does: adds the desktop's published controls to each check's answer. */
async function publishControls(
	page: Page,
	controls: { s: number; c: number; m: string[]; a: boolean },
) {
	await page.unroute(SOURCE_CHECK);
	await page.route(SOURCE_CHECK, async (route) => {
		const response = await route.fetch();
		await route.fulfill({
			response,
			headers: { ...response.headers(), "x-memeover-source-controls": base64Json(controls) },
		});
	});
}

function fragment(overrides: Record<string, string> = {}) {
	const params = { g: guildId, t: token, w: wsUrl, c: clientId, ...overrides };
	return Object.entries(params)
		.map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
		.join("&");
}

/** Decides the page's autoplay probe; `autoplay` attributes on real players are unaffected. */
async function stubAutoplay(page: Page, allowed: boolean | "never-settles") {
	await page.addInitScript((behavior) => {
		HTMLMediaElement.prototype.play = () => {
			if (behavior === "never-settles") return new Promise(() => {});
			return behavior
				? Promise.resolve()
				: Promise.reject(new DOMException("Blocked by test", "NotAllowedError"));
		};
	}, allowed);
}

/** Opens the real page with a mocked bot; the media request hangs so the video stays mounted. */
async function openSource(
	page: Page,
	{
		autoplay = false as boolean | "never-settles",
		joinAccepted = true,
		overrides = {} as Record<string, string>,
		mediaUrl = null as string | null,
		mediaType = "video",
		mediaOnJoin = true,
	} = {},
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
			if (!mediaOnJoin) return;
			ws.send(
				JSON.stringify({
					type: "MEDIA",
					guild_id: message.guild_id,
					channel_id: "1",
					message_id: "1",
					author_id: "2",
					author_username: "Streamer",
					author_avatar_url: "",
					media_url: mediaUrl ?? `${videoUrl}?join=${joins.length}`,
					media_type: mediaType,
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

test("a busy machine whose autoplay probe never settles draws nothing on stream", async ({
	page,
}) => {
	const source = await openSource(page, { autoplay: "never-settles" });
	const video = page.locator("video");
	await expect(video).toHaveCount(1, { timeout: 8000 });
	expect(await video.evaluate((el: HTMLVideoElement) => el.muted)).toBe(false);
	await expect(page.getByRole("status")).toHaveCount(0);
	await expect(page.getByRole("button", { name: "Click to enable sound" })).toHaveCount(0);
	expect(source.errors).toEqual([]);
});

// The page runs in a plain browser: reading Tauri's internals would mean a native call slipped in.
test("the whole page runs without ever reaching a Tauri API", async ({ page }) => {
	await page.addInitScript(() => {
		const trap = window as unknown as { tauriAccesses: number };
		trap.tauriAccesses = 0;
		Object.defineProperty(window, "__TAURI_INTERNALS__", {
			get() {
				trap.tauriAccesses++;
				return undefined;
			},
		});
	});
	const source = await openSource(page, { autoplay: true });
	await expect(page.locator("video")).toHaveCount(1);
	const accesses = await page.evaluate(
		() => (window as unknown as { tauriAccesses: number }).tauriAccesses,
	);
	expect(accesses).toBe(0);
	expect(source.errors).toEqual([]);
});

// Imgur answers 403 to a 127.0.0.1 referrer, which would silently skip its memes on stream.
test("media requests carry no referrer", async ({ page }) => {
	const referrers: (string | undefined)[] = [];
	page.on("request", (request) => {
		if (request.url().startsWith(videoUrl)) referrers.push(request.headers().referer);
	});
	await openSource(page, { autoplay: true });
	await expect(page.locator("video")).toHaveCount(1);
	await expect.poll(() => referrers.length).toBeGreaterThan(0);
	expect(referrers.every((referrer) => referrer === undefined)).toBe(true);
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
	await page.route(SOURCE_CHECK, (route) =>
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
	await page.route(SOURCE_CHECK, (route) => {
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
		await page.route(SOURCE_CHECK, (route) => {
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
		await page.unroute(SOURCE_CHECK);
		await expect.poll(() => source.joins.length, { timeout: 8000 }).toBe(2);
		await expect(page.locator("video")).toHaveAttribute("src", `${videoUrl}?join=2`);
	});
}

test("a restarted MemeOver reloads the source into a fresh session", async ({ page }) => {
	const source = await openSource(page, { autoplay: true });
	await expect(page.locator("video")).toHaveAttribute("src", `${videoUrl}?join=1`);
	await page.route(SOURCE_CHECK, (route) =>
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
	await page.route(SOURCE_CHECK, (route) =>
		route.request().method() === "HEAD"
			? route.fulfill({ status: 200, headers: { "Content-Type": "text/html" } })
			: route.continue(),
	);
	await expect(page.locator("video")).toHaveCount(0, { timeout: 8000 });
	await page.waitForTimeout(1500);
	expect(source.joins).toHaveLength(1);
});

// Software refusing autoplay lands in preview mode, with nobody to dismiss the aids on air.
test("preview aids leave the picture after a while, and the sound can still be enabled", async ({
	page,
}) => {
	await page.clock.install();
	await openSource(page, { overrides: { p: base64Json({ duration: 60 }) } });
	const button = page.getByRole("button", { name: "Click to enable sound" });
	await expect(button).toBeVisible();

	await page.clock.fastForward(16_000);
	await expect(button).toHaveCount(0);
	await expect(page.getByRole("status")).toHaveCount(0);

	// A preview tab gets them back with the pointer.
	await page.mouse.move(20, 20);
	await expect(button).toBeVisible();
	await page.clock.fastForward(16_000);
	await expect(button).toHaveCount(0);

	await page.keyboard.press("Space");
	await expect
		.poll(() => page.locator("video").evaluate((el: HTMLVideoElement) => el.muted))
		.toBe(false);
});

test("the media volume applies to audio files", async ({ page }) => {
	const soundUrl = "https://media.source.test/sound.wav";
	const wav = Buffer.alloc(44 + 800, 128);
	wav.write("RIFF", 0);
	wav.writeUInt32LE(36 + 800, 4);
	wav.write("WAVEfmt ", 8);
	wav.writeUInt32LE(16, 16);
	wav.writeUInt16LE(1, 20);
	wav.writeUInt16LE(1, 22);
	wav.writeUInt32LE(8000, 24);
	wav.writeUInt32LE(8000, 28);
	wav.writeUInt16LE(1, 32);
	wav.writeUInt16LE(8, 34);
	wav.write("data", 36);
	wav.writeUInt32LE(800, 40);
	await page.route(soundUrl, (route) => route.fulfill({ contentType: "audio/wav", body: wav }));
	await openSource(page, {
		autoplay: true,
		mediaUrl: soundUrl,
		mediaType: "audio",
		overrides: { p: base64Json({ volume: 30, duration: 60 }) },
	});
	await expect
		.poll(() => page.locator("audio").evaluate((el: HTMLAudioElement) => el.volume))
		.toBeCloseTo(0.3);
});

test("a loaded source follows the desktop's skip, clear and mute without a new link", async ({
	page,
}) => {
	const source = await openSource(page, {
		autoplay: true,
		overrides: { p: base64Json({ duration: 60 }) },
	});
	const video = page.locator("video");
	await expect(video).toHaveAttribute("src", `${videoUrl}?join=1`);
	const media = (author: string) =>
		source.sockets[source.sockets.length - 1]?.send(
			JSON.stringify({
				type: "MEDIA",
				guild_id: guildId,
				channel_id: "1",
				message_id: author,
				author_id: author,
				author_username: "Author",
				author_avatar_url: "",
				media_url: `${videoUrl}?from=${author}`,
				media_type: "video",
				timestamp: Date.now(),
			}),
		);
	const nextCheck = () => page.waitForRequest(SOURCE_CHECK);

	// The first value is a baseline: actions from before this page loaded never replay.
	await publishControls(page, { s: 5, c: 5, m: [], a: false });
	await nextCheck();
	await nextCheck();
	await expect(video).toHaveAttribute("src", `${videoUrl}?join=1`);

	media("3");
	media("4");
	await publishControls(page, { s: 6, c: 5, m: [], a: false });
	await expect(video).toHaveAttribute("src", `${videoUrl}?from=3`);

	// Muting the author on screen cuts them, and what they send next stays out.
	await publishControls(page, { s: 6, c: 5, m: ["3"], a: false });
	await expect(video).toHaveAttribute("src", `${videoUrl}?from=4`);
	await page.setViewportSize({ width: 1000, height: 700 });
	media("3");

	media("5");
	media("6");
	await publishControls(page, { s: 6, c: 6, m: ["3"], a: false });
	await nextCheck();
	await nextCheck();
	await publishControls(page, { s: 7, c: 6, m: ["3"], a: false });
	await expect(video).toHaveCount(0);
	expect(source.joins).toHaveLength(1);
});

test("each check reports the page's state to the app, without credentials", async ({ page }) => {
	const reports: URLSearchParams[] = [];
	page.on("request", (request) => {
		if (SOURCE_CHECK.test(request.url())) {
			expect(request.url()).not.toContain(token);
			reports.push(new URL(request.url()).searchParams);
		}
	});
	const latest = (name: string) => reports[reports.length - 1]?.get(name);

	await openSource(page);
	await expect.poll(() => latest("bot")).toBe("connected");
	await expect.poll(() => latest("sound")).toBe("blocked");
	expect(latest("source")).toBe("1");
	await page.getByRole("button", { name: "Click to enable sound" }).click();
	await expect.poll(() => latest("sound")).toBe("on");
});

test("a refused link is reported to the app", async ({ page }) => {
	let bot: string | null = null;
	page.on("request", (request) => {
		if (SOURCE_CHECK.test(request.url())) bot = new URL(request.url()).searchParams.get("bot");
	});
	await openSource(page, { autoplay: true, joinAccepted: false });
	await expect.poll(() => bot).toBe("rejected");
});

// Nothing else sends this header: Vite's dev client needs inline scripts, and preview serves none.
test("the page works under the CSP the app really serves", async ({ page }) => {
	test.skip(process.env.BROWSER_PRODUCTION !== "1", "Needs the production bundle");
	const config = join(__dirname, "../../app/src-tauri/tauri.conf.json");
	const csp: string = JSON.parse(readFileSync(config, "utf8")).app.security.csp;
	const imageUrl = "https://i.imgur.com/csp-test.svg";
	await page.addInitScript(() => {
		const seen: { directive: string; blocked: string }[] = [];
		Object.assign(window, { cspViolations: seen });
		document.addEventListener("securitypolicyviolation", (event) => {
			seen.push({ directive: event.effectiveDirective, blocked: event.blockedURI });
		});
	});
	// Like Tauri's asset protocol: a nonce on each inline <style>, which voids 'unsafe-inline'.
	await page.route("**/browser-source.html", async (route) => {
		const response = await route.fetch();
		const nonce = "123456789";
		await route.fulfill({
			response,
			body: (await response.text()).replace(/<style>/g, `<style nonce="${nonce}">`),
			headers: {
				...response.headers(),
				"content-security-policy": csp.replace(
					"style-src 'self' 'unsafe-inline'",
					`style-src 'self' 'unsafe-inline' 'nonce-${nonce}'`,
				),
			},
		});
	});
	await page.route(imageUrl, (route) =>
		route.fulfill({
			contentType: "image/svg+xml",
			body: '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"/>',
		}),
	);
	const source = await openSource(page, {
		autoplay: true,
		mediaUrl: imageUrl,
		mediaType: "image",
		overrides: { p: base64Json({ duration: 60 }) },
	});

	const image = page.locator("img").first();
	await expect(image).toHaveAttribute("src", imageUrl);
	await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(64);
	expect(source.joins).toHaveLength(1);
	expect(
		await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor),
	).toBe("rgba(0, 0, 0, 0)");

	// Known and harmless: Sonner's runtime <style>, which the app bundles anyway (see 1.8.5), and
	// Zod's guarded `new Function` probe. The audio probe, checks, socket and media must all pass.
	const violations = await page.evaluate(
		() =>
			(window as unknown as { cspViolations: { directive: string; blocked: string }[] })
				.cspViolations,
	);
	expect(
		violations.filter(
			({ directive, blocked }) => !directive.startsWith("style-src") && blocked !== "eval",
		),
	).toEqual([]);
});

function mediaMessage(author: string, url = `${videoUrl}?from=${author}`, type = "video") {
	return JSON.stringify({
		type: "MEDIA",
		guild_id: guildId,
		channel_id: "1",
		message_id: author,
		author_id: author,
		author_username: "Author",
		author_avatar_url: "",
		media_url: url,
		media_type: type,
		timestamp: Date.now(),
	});
}

/** The promise of the feature: over any scene, only the memes themselves cover the picture. */
function countVisiblePixels(page: Page, screenshot: Buffer) {
	return page.evaluate(async (data) => {
		const image = new Image();
		image.src = `data:image/png;base64,${data}`;
		await image.decode();
		const canvas = document.createElement("canvas");
		canvas.width = image.naturalWidth;
		canvas.height = image.naturalHeight;
		const context = canvas.getContext("2d") as CanvasRenderingContext2D;
		context.drawImage(image, 0, 0);
		const { data: pixels } = context.getImageData(0, 0, canvas.width, canvas.height);
		let visible = 0;
		for (let alpha = 3; alpha < pixels.length; alpha += 4) {
			if ((pixels[alpha] ?? 0) > 0) visible++;
		}
		return visible;
	}, screenshot.toString("base64"));
}

test("the page is fully transparent until a meme shows, and again after", async ({ page }) => {
	const imageUrl = "https://media.source.test/meme.svg";
	await page.route(imageUrl, (route) =>
		route.fulfill({
			contentType: "image/svg+xml",
			body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#777"/></svg>',
		}),
	);
	const source = await openSource(page, {
		autoplay: true,
		mediaOnJoin: false,
		overrides: { p: base64Json({ duration: 1 }) },
	});
	await expect.poll(() => source.joins.length).toBe(1);
	const visible = async () =>
		countVisiblePixels(page, await page.screenshot({ omitBackground: true }));
	expect(await visible()).toBe(0);

	source.sockets[source.sockets.length - 1]?.send(mediaMessage("2", imageUrl, "image"));
	await expect(page.locator("img").first()).toBeVisible();
	await expect.poll(visible).toBeGreaterThan(1000);

	await expect(page.locator("img")).toHaveCount(0, { timeout: 8000 });
	await expect.poll(visible).toBe(0);
});

test("the link's display profile decides which messages show", async ({ page }) => {
	const enabledTypes = {
		image: true,
		gif: true,
		video: false,
		audio: true,
		text: true,
		sticker: true,
	};
	const source = await openSource(page, {
		autoplay: true,
		overrides: { p: base64Json({ duration: 30, enabledTypes }) },
	});
	await expect.poll(() => source.joins.length).toBe(1);
	source.sockets[source.sockets.length - 1]?.send(
		JSON.stringify({
			type: "TEXT",
			guild_id: guildId,
			channel_id: "1",
			message_id: "t",
			author_id: "3",
			author_username: "Author",
			author_avatar_url: "",
			text: "Text still shows",
			timestamp: Date.now(),
		}),
	);
	// TextDisplay renders a hidden copy to measure the text.
	await expect(
		page.getByText("Text still shows", { exact: true }).locator("visible=true"),
	).toBeVisible();
	await expect(page.locator("video")).toHaveCount(0);
});

for (const enabled of [true, false]) {
	test(`floating reactions ${enabled ? "reach" : "stay off"} the stream as the profile says`, async ({
		page,
	}) => {
		const source = await openSource(page, {
			autoplay: true,
			mediaOnJoin: false,
			overrides: { p: base64Json({ floatingReactionsEnabled: enabled }) },
		});
		await expect.poll(() => source.joins.length).toBe(1);
		source.sockets[source.sockets.length - 1]?.send(
			JSON.stringify({
				type: "REACTION",
				guild_id: guildId,
				channel_id: "1",
				message_id: "1",
				emoji: "🔥",
				user_id: "2",
				timestamp: Date.now(),
			}),
		);
		const reaction = page.getByText("🔥");
		if (enabled) await expect(reaction.first()).toBeAttached();
		else {
			await page.waitForTimeout(500);
			await expect(reaction).toHaveCount(0);
		}
	});
}

test("a guild pause holds memes on stream and lifting it lets them through", async ({ page }) => {
	const source = await openSource(page, { autoplay: true, mediaOnJoin: false });
	await expect.poll(() => source.joins.length).toBe(1);
	const socket = source.sockets[source.sockets.length - 1];
	const state = (pausedUntil: number | null) =>
		socket?.send(
			JSON.stringify({ type: "GUILD_STATE", guild_id: guildId, paused_until: pausedUntil }),
		);
	state(Date.now() + 60_000);
	await page.waitForTimeout(200);
	socket?.send(mediaMessage("3"));
	await page.waitForTimeout(500);
	await expect(page.locator("video")).toHaveCount(0);

	state(null);
	await page.waitForTimeout(200);
	socket?.send(mediaMessage("4"));
	await expect(page.locator("video")).toHaveAttribute("src", `${videoUrl}?from=4`);
});

test("a revoked link stays idle, says so in a preview and tells the app", async ({ page }) => {
	const reports: (string | null)[] = [];
	page.on("request", (request) => {
		if (SOURCE_CHECK.test(request.url())) {
			reports.push(new URL(request.url()).searchParams.get("bot"));
		}
	});
	const source = await openSource(page, { mediaOnJoin: false });
	await expect.poll(() => source.joins.length).toBe(1);
	const socket = source.sockets[source.sockets.length - 1];
	socket?.send(JSON.stringify({ type: "ERROR", code: "TOKEN_ROTATED", message: "Rotated" }));
	await expect(page.getByRole("status")).toHaveText(/link revoked/);
	await expect.poll(() => reports[reports.length - 1]).toBe("revoked");
	await socket?.close();
	await page.waitForTimeout(2500);
	expect(source.joins).toHaveLength(1);
});

test("a lost bot connection reconnects with the same link, without a click", async ({ page }) => {
	const source = await openSource(page, { autoplay: true, mediaOnJoin: false });
	await expect.poll(() => source.joins.length).toBe(1);
	await source.sockets[source.sockets.length - 1]?.close();
	await expect.poll(() => source.joins.length, { timeout: 15_000 }).toBe(2);
	expect(source.joins[1]).toEqual(source.joins[0]);
	source.sockets[source.sockets.length - 1]?.send(mediaMessage("3"));
	await expect(page.locator("video")).toHaveAttribute("src", `${videoUrl}?from=3`);
});

test("resizing the source keeps the desktop's live moderation", async ({ page }) => {
	const source = await openSource(page, {
		autoplay: true,
		overrides: { p: base64Json({ duration: 30 }) },
	});
	const video = page.locator("video");
	await expect(video).toHaveAttribute("src", `${videoUrl}?join=1`);
	await publishControls(page, { s: 0, c: 0, m: ["3"], a: false });
	await page.waitForRequest(SOURCE_CHECK);
	await page.waitForRequest(SOURCE_CHECK);

	await page.setViewportSize({ width: 1000, height: 700 });
	const socket = source.sockets[source.sockets.length - 1];
	socket?.send(mediaMessage("3"));
	socket?.send(mediaMessage("4"));
	await publishControls(page, { s: 1, c: 0, m: ["3"], a: false });
	await expect(video).toHaveAttribute("src", `${videoUrl}?from=4`);
});

test("an unreadable controls value changes nothing", async ({ page }) => {
	const source = await openSource(page, {
		autoplay: true,
		overrides: { p: base64Json({ duration: 30 }) },
	});
	const video = page.locator("video");
	await expect(video).toHaveAttribute("src", `${videoUrl}?join=1`);
	await page.route(SOURCE_CHECK, async (route) => {
		const response = await route.fetch();
		await route.fulfill({
			response,
			headers: { ...response.headers(), "x-memeover-source-controls": "not base64 json" },
		});
	});
	await page.waitForRequest(SOURCE_CHECK);
	await page.waitForRequest(SOURCE_CHECK);
	await expect(video).toHaveAttribute("src", `${videoUrl}?join=1`);
	expect(source.closed.size).toBe(0);
});

/** Opens the page in Chrome with a real autoplay policy: the real probe, without a stub. */
async function openWithAutoplayPolicy(
	browser: Browser,
	baseURL: string | undefined,
): Promise<Page> {
	const page = await (await browser.newContext({ baseURL })).newPage();
	await page.route(`${videoUrl}*`, () => {});
	await page.routeWebSocket(wsUrl, (ws) => {
		ws.onMessage((raw) => {
			if (JSON.parse(String(raw)).type !== "JOIN") return;
			ws.send(JSON.stringify({ type: "JOIN_ACK", guild_id: guildId, success: true }));
			ws.send(mediaMessage("2", videoUrl));
		});
	});
	await page.goto(`/browser-source.html#${fragment()}`);
	return page;
}

// The flag browser sources embedded in streaming software use.
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
		const page = await openWithAutoplayPolicy(browser, baseURL);
		const video = page.locator("video");
		await expect(video).toHaveCount(1);
		expect(await video.evaluate((el: HTMLVideoElement) => el.muted)).toBe(false);
		await expect(page.getByRole("status")).toHaveCount(0);
		await expect(page.getByRole("button")).toHaveCount(0);
	} finally {
		await browser.close();
	}
});

// A regular tab, or streaming software that refuses autoplay.
test("without autoplay permission, the real probe keeps the sound off and offers to enable it", async ({
	playwright,
	baseURL,
	browserName,
}) => {
	test.skip(browserName !== "chromium", "The autoplay flag exists only in Chromium");
	// Under Vite's dev server Chrome accepts this probe on every run; the bundle gets the refusal.
	test.skip(process.env.BROWSER_PRODUCTION !== "1", "Needs the production bundle");
	const browser = await playwright.chromium.launch({
		channel: "chrome",
		args: ["--autoplay-policy=document-user-activation-required"],
	});
	try {
		const page = await openWithAutoplayPolicy(browser, baseURL);
		const video = page.locator("video");
		await expect(video).toHaveCount(1);
		expect(await video.evaluate((el: HTMLVideoElement) => el.muted)).toBe(true);
		await page.getByRole("button", { name: "Click to enable sound" }).click();
		await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.muted)).toBe(false);
	} finally {
		await browser.close();
	}
});
