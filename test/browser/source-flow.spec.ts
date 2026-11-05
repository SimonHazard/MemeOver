import { expect, type Page, test } from "@playwright/test";

// The whole feature as a streamer uses it, on the real pages: enable the source in the Stream tab,
// copy the link, load it like streaming software would, then act from the desktop. Only the native
// server and the bot are simulated, and the routed socket never reaches a real bot.

const SOURCE_CHECK = /\/browser-source\.html\?/;
const videoUrl = "https://media.flow.test/meme.mp4";

const send = (page: Page, event: string, payload?: unknown) =>
	page.evaluate(
		([name, data]) =>
			(window as unknown as { testEmit: (e: unknown, p: unknown) => Promise<void> }).testEmit(
				name,
				data,
			),
		[event, payload],
	);

/** The Stream tab with the source enabled; returns the link its copy button gives. */
async function copyLink(page: Page) {
	await page.goto("/test/browser/settings.html");
	await expect(page.getByRole("button", { name: "Stream", exact: true })).toBeVisible();
	// Saved before the link is built, so the test can see the profile travel with it.
	await page.evaluate(() => {
		const key = "test-store:settings.json";
		const data = JSON.parse(localStorage.getItem(key) ?? "{}");
		data.settings.duration = 30;
		data.settings.textSize = 48;
		localStorage.setItem(key, JSON.stringify(data));
	});
	await page.reload();
	await page.evaluate(() => {
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: { writeText: async (text: string) => localStorage.setItem("test-clipboard", text) },
		});
	});
	await page.getByRole("button", { name: "Stream", exact: true }).click();
	await page.getByRole("switch", { name: "Browser source" }).click();
	await page.getByRole("button", { name: "Copy source link" }).click();
	await expect
		.poll(() => page.evaluate(() => localStorage.getItem("test-clipboard")))
		.toContain("/browser-source.html#");
	return new URL((await page.evaluate(() => localStorage.getItem("test-clipboard"))) ?? "");
}

function mediaFrom(author: string) {
	return JSON.stringify({
		type: "MEDIA",
		guild_id: "123456789012345678",
		channel_id: "1",
		message_id: author,
		author_id: author,
		author_username: "Author",
		author_avatar_url: "",
		media_url: `${videoUrl}?from=${author}`,
		media_type: "video",
		timestamp: Date.now(),
	});
}

test("a copied link joins with the desktop's credentials and follows its actions", async ({
	context,
	baseURL,
}) => {
	const desktop = await context.newPage();
	const link = await copyLink(desktop);
	const wsUrl = new URLSearchParams(link.hash.slice(1)).get("w") ?? "";
	expect(wsUrl).toMatch(/^wss?:/);

	const source = await context.newPage();
	const joins: { guild_id: string; token: string; client_id?: string }[] = [];
	let send_to_source: (message: string) => void = () => {};
	await source.addInitScript(() => {
		HTMLMediaElement.prototype.play = () => Promise.resolve();
	});
	await source.route(`${videoUrl}*`, () => {});
	await source.routeWebSocket(wsUrl, (ws) => {
		ws.onMessage((raw) => {
			const message = JSON.parse(String(raw));
			if (message.type !== "JOIN") return;
			joins.push(message);
			send_to_source = (value) => ws.send(value);
			ws.send(JSON.stringify({ type: "JOIN_ACK", guild_id: message.guild_id, success: true }));
			ws.send(mediaFrom("2"));
		});
	});
	// What the local server does: answers checks with what the desktop window really published.
	await source.route(SOURCE_CHECK, async (route) => {
		const response = await route.fetch();
		const controls = await desktop.evaluate(() => localStorage.getItem("test-source-controls"));
		await route.fulfill({
			response,
			headers: { ...response.headers(), "x-memeover-source-controls": controls ?? "" },
		});
	});
	// Same page and fragment as the link; the origin is the test server's, not 127.0.0.1:4466.
	await source.goto(`${baseURL}${link.pathname}${link.hash}`);

	const video = source.locator("video");
	await expect(video).toHaveAttribute("src", `${videoUrl}?from=2`);
	expect(joins[0]).toMatchObject({
		guild_id: "123456789012345678",
		token: "test-only-token",
		client_id: "browser-test-client",
	});
	// Nothing but memes, and the profile came with the link.
	await expect(source.getByRole("status")).toHaveCount(0);
	await expect(source.getByRole("button")).toHaveCount(0);
	expect(await video.evaluate((el: HTMLVideoElement) => el.muted)).toBe(false);

	send_to_source(
		JSON.stringify({
			type: "TEXT",
			guild_id: "123456789012345678",
			channel_id: "1",
			message_id: "t",
			author_id: "7",
			author_username: "Author",
			author_avatar_url: "",
			text: "Next in line",
			timestamp: Date.now(),
		}),
	);

	// The real button must work even though the desktop overlay has nothing playing.
	await desktop.getByRole("button", { name: "Overlay", exact: true }).click();
	const skip = desktop.getByRole("button", { name: "Skip", exact: true });
	await expect(skip).toBeEnabled();
	await skip.click();
	await expect(video).toHaveCount(0);
	// TextDisplay renders a hidden copy to measure the text.
	const text = source.getByText("Next in line", { exact: true }).locator("visible=true");
	await expect(text).toBeVisible();
	const fontSize = await text.evaluate((el) => getComputedStyle(el).fontSize);
	expect(Number.parseFloat(fontSize)).toBeGreaterThan(20);
	// Closing the desktop overlay must not remove control of the stream's own player.
	await send(desktop, "overlay-health-changed", "closed");
	await expect(skip).toBeEnabled();

	// Mute from the desktop: the author on screen is cut, and stays out.
	await send(desktop, "settings-changed", {
		mutedAuthors: [{ id: "7", username: "Author", avatarUrl: "", mutedAt: 1 }],
		hideAnonymous: false,
	});
	await expect(text).toHaveCount(0);
	send_to_source(mediaFrom("7"));
	send_to_source(mediaFrom("8"));
	await expect(video).toHaveAttribute("src", `${videoUrl}?from=8`);

	// Clear from the desktop: what is queued never appears, the meme on screen stays.
	send_to_source(mediaFrom("9"));
	await desktop.getByRole("button", { name: "Clear queue", exact: true }).click();
	const checked = source.waitForRequest(SOURCE_CHECK);
	await checked;
	await source.waitForRequest(SOURCE_CHECK);
	await expect(video).toHaveAttribute("src", `${videoUrl}?from=8`);
	await skip.click();
	await expect(video).toHaveCount(0);

	expect(joins).toHaveLength(1);
	// A liveness check can still be in flight, with its route about to answer.
	await source.unrouteAll({ behavior: "ignoreErrors" });
});
