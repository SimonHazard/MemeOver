import { expect, type Page, test } from "@playwright/test";
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
	await page.route(`${videoUrl}*`, () => {});
	await page.routeWebSocket(wsUrl, (ws) => {
		ws.onMessage((raw) => {
			if (JSON.parse(String(raw)).type !== "JOIN") return;
			ws.send(JSON.stringify({ type: "JOIN_ACK", guild_id: guildId, success: true }));
			if (message) ws.send(JSON.stringify(message));
		});
	});
	await installDesktopStub(page, savedSettings(patch));
	await page.goto("/overlay.html");
}

const emit = (page: Page, event: string, payload?: unknown) =>
	page.evaluate(
		([name, data]) => (window as unknown as DesktopStubWindow).desktopEmit(String(name), data),
		[event, payload],
	);

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
