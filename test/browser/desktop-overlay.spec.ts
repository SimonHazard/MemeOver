import { expect, type Page, test, type WebSocketRoute } from "@playwright/test";
import { CURRENT_SCHEMA_VERSION, DEFAULT_SETTINGS } from "../../app/src/shared/types";
import { type DesktopStubWindow, installDesktopStub } from "./desktop-stub";

// The desktop side of the browser source feature, on the real overlay.html: what the stream's
// sound controls and failure notice do on the streamer's own screen.

const guildId = "123456789012345678";
const wsUrl = "ws://desktop.test/ws";
const videoUrl = "https://media.desktop.test/meme.mp4";

const media = {
	type: "MEDIA",
	guild_id: guildId,
	channel_id: "1",
	message_id: "1",
	author_id: "2",
	author_username: "Streamer",
	author_avatar_url: "",
	media_url: videoUrl,
	media_type: "video",
	timestamp: 1,
};

const savedSettings = (patch: object = {}) => ({
	...DEFAULT_SETTINGS,
	schemaVersion: CURRENT_SCHEMA_VERSION,
	guildId,
	token: "desktop-test-token",
	wsUrl,
	clientId: "desktop-install-id",
	duration: 30,
	...patch,
});

async function openOverlay(page: Page, patch: object = {}, message: unknown = media) {
	const sockets: WebSocketRoute[] = [];
	await page.route(`${videoUrl}*`, () => {});
	await page.routeWebSocket(wsUrl, (ws) => {
		ws.onMessage((raw) => {
			if (JSON.parse(String(raw)).type !== "JOIN") return;
			sockets.push(ws);
			ws.send(JSON.stringify({ type: "JOIN_ACK", guild_id: guildId, success: true }));
			if (message) ws.send(JSON.stringify(message));
		});
	});
	await installDesktopStub(page, savedSettings(patch));
	await page.goto("/overlay.html");
	return sockets;
}

const emit = (page: Page, event: string, payload?: unknown) =>
	page.evaluate(
		([name, data]) => (window as unknown as DesktopStubWindow).desktopEmit(String(name), data),
		[event, payload],
	);

const textMessage = (text: string) => ({
	type: "TEXT",
	guild_id: guildId,
	channel_id: "1",
	message_id: text,
	author_id: "2",
	author_username: "Streamer",
	author_avatar_url: "",
	text,
	timestamp: 1,
});
const reactionMessage = {
	type: "REACTION",
	guild_id: guildId,
	channel_id: "1",
	message_id: "1",
	user_id: "2",
	emoji: "🔥",
	timestamp: 1,
};

test("an unparsable bot URL does not blank the overlay", async ({ page }) => {
	const errors: Error[] = [];
	page.on("pageerror", (error) => errors.push(error));
	await page.routeWebSocket(wsUrl, (ws) => {
		ws.onMessage((raw) => {
			if (JSON.parse(String(raw)).type !== "JOIN") return;
			ws.send(JSON.stringify({ type: "JOIN_ACK", guild_id: guildId, success: true }));
			ws.send(JSON.stringify(textMessage("Recovered after correcting the URL")));
		});
	});
	await installDesktopStub(page, savedSettings({ wsUrl: "ws://" }));
	await page.goto("/overlay.html");
	await expect
		.poll(() =>
			page.evaluate(() =>
				(window as unknown as DesktopStubWindow).desktopInvoked.some(
					({ command, args }) =>
						command === "plugin:event|emit" &&
						args.event === "ws-status-changed" &&
						args.payload === "error",
				),
			),
		)
		.toBe(true);
	// An idle production overlay has no text; assert its rendered shell and recovery instead.
	await expect(page.locator("#root > div")).toBeAttached();
	await emit(page, "settings-changed", savedSettings());
	await expect(
		page.getByText("Recovered after correcting the URL", { exact: true }).locator("visible=true"),
	).toBeVisible();
	expect(errors).toEqual([]);
});

test("changing the server or token on the same bot URL joins with the new credentials", async ({
	page,
}) => {
	const joins: string[] = [];
	const tokens: string[] = [];
	await page.routeWebSocket(wsUrl, (ws) => {
		ws.onMessage((raw) => {
			const message = JSON.parse(String(raw));
			if (message.type !== "JOIN") return;
			joins.push(message.guild_id);
			tokens.push(message.token);
			ws.send(JSON.stringify({ type: "JOIN_ACK", guild_id: message.guild_id, success: true }));
		});
	});
	await installDesktopStub(page, savedSettings());
	await page.goto("/overlay.html");
	await expect.poll(() => joins).toEqual([guildId]);
	const secondGuildId = "223456789012345678";
	await emit(
		page,
		"settings-changed",
		savedSettings({ guildId: secondGuildId, token: "second-test-token" }),
	);
	await expect.poll(() => joins).toEqual([guildId, secondGuildId]);
	await emit(
		page,
		"settings-changed",
		savedSettings({ guildId: secondGuildId, token: "rotated-test-token" }),
	);
	await expect.poll(() => joins).toEqual([guildId, secondGuildId, secondGuildId]);
	expect(tokens).toEqual(["desktop-test-token", "second-test-token", "rotated-test-token"]);
});

test("a stalled synced video releases the queue after the normal display duration", async ({
	page,
}) => {
	const sockets = await openOverlay(page, { syncMediaDuration: true, duration: 1 });
	await expect.poll(() => sockets.length).toBe(1);
	sockets[0]?.send(JSON.stringify(textMessage("After the stalled video")));
	await expect(
		page.getByText("After the stalled video", { exact: true }).locator("visible=true"),
	).toBeVisible({ timeout: 8_000 });
});

test("stream-only cuts current desktop playback, drops queued and incoming content, and keeps the socket", async ({
	page,
}) => {
	const sockets = await openOverlay(page, { browserSourceEnabled: true });
	await expect(page.locator("video")).toHaveCount(1);
	await page.locator("video").evaluate((player: HTMLVideoElement) => {
		const pause = player.pause.bind(player);
		Object.assign(window, { destinationPauseCount: 0 });
		player.pause = () => {
			(window as unknown as { destinationPauseCount: number }).destinationPauseCount++;
			pause();
		};
	});
	const socket = sockets[0];
	if (!socket) throw new Error("The overlay never joined");
	socket.send(JSON.stringify(textMessage("Queued before stream-only")));
	socket.send(JSON.stringify(reactionMessage));
	await expect(page.getByText("🔥").first()).toBeVisible();
	await emit(
		page,
		"settings-changed",
		savedSettings({ browserSourceEnabled: true, streamDestination: "stream" }),
	);
	await expect(page.locator("video")).not.toBeVisible();
	await expect
		.poll(() =>
			page.evaluate(
				() => (window as unknown as { destinationPauseCount: number }).destinationPauseCount,
			),
		)
		.toBeGreaterThan(0);
	await expect(page.locator("video")).toHaveCount(0);
	await expect(page.getByText("🔥")).toHaveCount(0);
	socket.send(JSON.stringify(media));
	socket.send(JSON.stringify(textMessage("Sent while stream-only")));
	socket.send(JSON.stringify(reactionMessage));
	await emit(page, "replay-item", {
		...textMessage("Replayed while stream-only"),
		queueId: "replay",
	});
	// Native source failure cannot change the selected desktop destination.
	await emit(page, "browser-source-start-failed");
	await expect(page.getByText(/The browser source could not start/)).toBeVisible();
	await expect(page.locator("video")).toHaveCount(0);
	await expect(page.getByText("🔥")).toHaveCount(0);
	await emit(
		page,
		"settings-changed",
		savedSettings({
			browserSourceEnabled: false,
			streamDestination: "stream",
			desktopOverlayMuted: true,
		}),
	);
	socket.send(JSON.stringify({ ...media, media_url: `${videoUrl}?new` }));
	await expect(page.locator("video")).toHaveAttribute("src", `${videoUrl}?new`);
	expect(await page.locator("video").evaluate((player: HTMLVideoElement) => player.muted)).toBe(
		true,
	);
	await page.locator("video").evaluate((player) => player.dispatchEvent(new Event("error")));
	await expect(page.locator("video")).toHaveCount(0);
	await expect(
		page.getByText(/Queued before stream-only|Sent while stream-only|Replayed while stream-only/),
	).toHaveCount(0);
	expect(sockets).toHaveLength(1);
});

test("saved stream-only stays blank at launch and on reactivation, both restores playback", async ({
	page,
}) => {
	const sockets = await openOverlay(page, {
		browserSourceEnabled: true,
		streamDestination: "stream",
	});
	await expect.poll(() => sockets.length).toBe(1);
	await expect(page.locator("video")).toHaveCount(0);
	await emit(
		page,
		"settings-changed",
		savedSettings({ browserSourceEnabled: false, streamDestination: "stream" }),
	);
	sockets[0]?.send(JSON.stringify(media));
	await expect(page.locator("video")).toHaveCount(1);
	await emit(
		page,
		"settings-changed",
		savedSettings({ browserSourceEnabled: true, streamDestination: "stream" }),
	);
	await expect(page.locator("video")).toHaveCount(0);
	await emit(
		page,
		"settings-changed",
		savedSettings({ browserSourceEnabled: true, streamDestination: "both" }),
	);
	sockets[0]?.send(JSON.stringify(textMessage("Desktop restored")));
	await expect(
		page.getByText("Desktop restored", { exact: true }).locator("visible=true"),
	).toBeVisible();
	expect(sockets).toHaveLength(1);
});

test("the desktop mute cuts and restores the sound of the playing media, live", async ({
	page,
}) => {
	await openOverlay(page);
	const video = page.locator("video");
	await expect(video).toHaveCount(1);
	const muted = () => video.evaluate((el: HTMLVideoElement) => el.muted);
	expect(await muted()).toBe(false);
	await video.evaluate((el) => Object.assign(el, { sameElement: true }));

	await emit(page, "settings-changed", savedSettings({ desktopOverlayMuted: true }));
	await expect.poll(muted).toBe(true);
	await emit(page, "settings-changed", savedSettings({ desktopOverlayMuted: false }));
	await expect.poll(muted).toBe(false);

	// Not a remount: the meme keeps playing from where it was.
	expect(
		await video.evaluate((el) => (el as unknown as { sameElement?: boolean }).sameElement),
	).toBe(true);
});

test("a desktop overlay saved as muted starts muted", async ({ page }) => {
	await openOverlay(page, { desktopOverlayMuted: true });
	const video = page.locator("video");
	await expect(video).toHaveCount(1);
	expect(await video.evaluate((el: HTMLVideoElement) => el.muted)).toBe(true);
});

test("a source that cannot start is announced on the desktop, whatever the toast setting", async ({
	page,
}) => {
	await openOverlay(page, { connectionNotificationsEnabled: false }, null);
	const notice = page.getByText("The browser source could not start: see the Stream tab.");
	await expect(notice).toHaveCount(0);
	await expect(page.locator("#root")).toBeAttached();
	await expect
		.poll(async () => {
			await emit(page, "browser-source-start-failed");
			return notice.count();
		})
		.toBeGreaterThan(0);
	await expect(notice.first()).toBeVisible();
});

test("only the desktop overlay logs displayed memes to the history", async ({ page }) => {
	await openOverlay(page);
	await expect(page.locator("video")).toHaveCount(1);
	const historyWrites = () =>
		page.evaluate(() =>
			(window as unknown as DesktopStubWindow).desktopInvoked
				.filter((call) => call.command === "plugin:store|set" && call.args.key === "history")
				.map((call) => call.args.value as { media_url: string }[]),
		);
	await expect.poll(async () => (await historyWrites()).length).toBeGreaterThan(0);
	expect((await historyWrites())[0]?.[0]?.media_url).toBe(videoUrl);
});
