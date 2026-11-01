import { expect, type Page, test } from "@playwright/test";

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
	page.on("pageerror", (error) => errors.push(error.message));
	page.on("console", (message) => {
		if (message.type() === "error") errors.push(message.text());
	});
	page.on("request", (request) => requests.push(request.url()));
	if (inObs) await page.addInitScript(() => Object.assign(window, { obsstudio: {} }));
	await page.route(videoUrl, () => {});
	await page.routeWebSocket(wsUrl, (ws) => {
		ws.onMessage((raw) => {
			const message = JSON.parse(String(raw));
			if (message.type !== "JOIN") return;
			joins.push(message);
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
	await page.goto(`/obs.html#${fragment()}`);
	return { errors, requests, joins };
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
