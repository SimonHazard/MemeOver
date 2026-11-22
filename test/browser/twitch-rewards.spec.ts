import { expect, test, type WebSocketRoute } from "@playwright/test";
import { TWITCH_CLIENT_ID, TWITCH_SCOPES } from "../../app/src/shared/twitch/config";
import { installDesktopStub } from "./desktop-stub";

test("a streamer selects a reward and its redemption displays on the desktop", async ({
	page,
	context,
}) => {
	const sessionId = "00000000-0000-4000-8000-000000000000";
	const account = {
		sessionId,
		[`auth:${sessionId}`]: {
			login: "streamer",
			userId: "123",
			accessToken: "test-access",
			refreshToken: "test-refresh",
			expiresAt: Date.now() + 3600000,
			scopes: TWITCH_SCOPES,
		},
	};
	await page.addInitScript(
		(auth) => localStorage.setItem("test-store:twitch.json", JSON.stringify(auth)),
		account,
	);
	let requests = 0;
	await page.route("https://api.twitch.tv/helix/channel_points/custom_rewards?*", (route) => {
		requests++;
		return requests === 1
			? route.fulfill({ status: 503 })
			: route.fulfill({
					json: {
						data: [
							{
								id: "reward-a",
								title: "Show my message",
								is_enabled: true,
								is_user_input_required: true,
							},
							{
								id: "reward-b",
								title: "No input",
								is_enabled: true,
								is_user_input_required: false,
							},
						],
					},
				});
	});
	await page.goto("/test/browser/settings.html");
	await page.getByRole("button", { name: "Stream", exact: true }).click();
	await expect(page.getByText("Could not load Twitch rewards.", { exact: false })).toBeVisible();
	await page.getByRole("button", { name: "Open Twitch reward settings" }).click();
	expect(await page.evaluate(() => localStorage.getItem("test-opened-url"))).toBe(
		"https://dashboard.twitch.tv/u/streamer/viewer-rewards/channel-points/rewards",
	);
	await page.getByRole("button", { name: "Refresh rewards" }).click();
	await page.getByRole("combobox", { name: "Custom reward for the desktop overlay" }).click();
	await expect(page.getByRole("option", { name: "No input" })).toHaveCount(0);
	await page.getByRole("option", { name: "Show my message" }).click();
	const saved = () =>
		page.evaluate(
			() => JSON.parse(localStorage.getItem("test-store:settings.json") ?? "{}").settings,
		);
	await expect.poll(async () => (await saved()).twitch.rewardId).toBe("reward-a");
	const toggle = page.getByRole("switch", { name: "Show Twitch events on the overlay" });
	await expect(toggle).not.toBeChecked();
	await toggle.click();
	await expect.poll(async () => (await saved()).twitch.enabled).toBe(true);
	const overlay = await context.newPage();
	await installDesktopStub(overlay, await saved(), { "twitch.json": account });
	await overlay.route("https://id.twitch.tv/oauth2/validate", (route) =>
		route.fulfill({
			json: {
				client_id: TWITCH_CLIENT_ID,
				user_id: "123",
				login: "streamer",
				scopes: TWITCH_SCOPES,
				expires_in: 3600,
			},
		}),
	);
	const type = "channel.channel_points_custom_reward_redemption.add";
	let subscribed = false;
	await overlay.route("https://api.twitch.tv/helix/eventsub/subscriptions", (route) => {
		if (route.request().postDataJSON().type === type) subscribed = true;
		return route.fulfill({ status: 202, json: {} });
	});
	let socket: WebSocketRoute;
	await overlay.routeWebSocket("wss://eventsub.wss.twitch.tv/**", (ws) => {
		socket = ws;
		ws.send(
			JSON.stringify({
				metadata: { message_id: "welcome", message_type: "session_welcome" },
				payload: { session: { id: "session", keepalive_timeout_seconds: 30 } },
			}),
		);
	});
	await overlay.goto("/overlay.html");
	await expect.poll(() => subscribed).toBe(true);
	function redeem(id: string, text: string) {
		socket.send(
			JSON.stringify({
				metadata: {
					message_id: crypto.randomUUID(),
					message_type: "notification",
					subscription_type: type,
				},
				payload: {
					event: {
						id: crypto.randomUUID(),
						broadcaster_user_id: "123",
						user_id: "42",
						user_login: "viewer",
						user_name: "Viewer",
						user_input: text,
						reward: { id, title: "Reward" },
					},
				},
			}),
		);
	}
	redeem("reward-b", "Unselected reward");
	redeem("reward-a", "Redeemed with points");
	await expect(
		overlay.getByRole("paragraph").getByText("Redeemed with points", { exact: true }),
	).toBeVisible();
	await expect(overlay.getByText("Unselected reward", { exact: true })).toHaveCount(0);
});
