import { expect, type Page, test, type WebSocketRoute } from "@playwright/test";

const guildId = "123456789012345678";
async function notifications(page: Page, query = "") {
	let socket: WebSocketRoute;
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.routeWebSocket("ws://notifications.test/ws", (ws) => {
		socket = ws;
		ws.onMessage((raw) => {
			if (JSON.parse(String(raw)).type === "JOIN") {
				ws.send(JSON.stringify({ type: "JOIN_ACK", guild_id: guildId, success: true }));
				ws.send(
					JSON.stringify({
						type: "MEMBER_COUNT_UPDATE",
						guild_id: guildId,
						count: 8,
					}),
				);
			}
		});
	});
	await page.goto(`/test/browser/overlay.html?notifications&${query}`);
	await expect(page.locator("#connection-state")).toContainText("connected:");
	return {
		errors,
		count(count: number, guild = guildId) {
			socket.send(JSON.stringify({ type: "MEMBER_COUNT_UPDATE", guild_id: guild, count }));
		},
		close: () => socket.close(),
	};
}

for (const corner of ["top-left", "top-right", "bottom-left", "bottom-right"]) {
	test(`connection toast uses the ${corner} corner and expires`, async ({ page }, testInfo) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		const connection = await notifications(page, `corner=${corner}`);
		const toast = page.locator("[data-sonner-toast]");
		await expect(toast).toHaveCount(0);
		const started = Date.now();
		connection.count(9);
		await expect(toast).toHaveText("A user connected");
		const [y, x] = corner.split("-");
		await expect(page.locator("[data-sonner-toaster]")).toHaveAttribute("data-x-position", x);
		await expect(page.locator("[data-sonner-toaster]")).toHaveAttribute("data-y-position", y);
		await expect
			.poll(async () => {
				const box = await toast.boundingBox();
				const viewport = page.viewportSize();
				if (!box || !viewport) return null;
				return {
					x: Math.round(x === "left" ? box.x : viewport.width - box.x - box.width),
					y: Math.round(y === "top" ? box.y : viewport.height - box.y - box.height),
				};
			})
			.toEqual({ x: 24, y: 24 });
		await page.screenshot({ path: `/tmp/memeover-toast-${testInfo.project.name}-${corner}.png` });
		expect(await toast.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
		expect(await toast.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");
		await expect(toast).toHaveCount(0, { timeout: 6000 });
		expect(Date.now() - started).toBeGreaterThanOrEqual(3800);
		expect(connection.errors).toEqual([]);
	});
}

test("connection notifications ignore snapshots, departures, duplicates and other guilds", async ({
	page,
}) => {
	const connection = await notifications(page, "lang=fr");
	const toast = page.locator("[data-sonner-toast]");
	await expect(toast).toHaveCount(0);
	connection.count(99, "other-guild");
	connection.count(8);
	connection.count(7);
	await expect(page.locator("#connection-state")).toHaveText("connected:7");
	await expect(toast).toHaveCount(0);
	connection.count(8);
	await expect(toast).toHaveText("Un utilisateur s’est connecté");
	connection.count(10);
	await expect(toast).toHaveCount(1);
	await expect(toast).toHaveText("2 utilisateurs se sont connectés");
	connection.close();
	await expect(toast).toHaveCount(0);
	await expect(page.locator("#connection-state")).toHaveText("connected:8", { timeout: 6000 });
	await expect(toast).toHaveCount(0);
	connection.count(9);
	await expect(toast).toHaveText("Un utilisateur s’est connecté");
	expect(connection.errors).toEqual([]);
});

test("disabling and hiding dismisses toasts without replaying missed arrivals", async ({
	page,
}) => {
	const connection = await notifications(page);
	const toast = page.locator("[data-sonner-toast]");
	connection.count(9);
	await expect(toast).toBeVisible();
	await page.getByRole("button", { name: "Toggle notifications" }).click();
	await expect(toast).toHaveCount(0);
	connection.count(10);
	await expect(page.locator("#connection-state")).toHaveText("connected:10");
	await page.getByRole("button", { name: "Toggle notifications" }).click();
	await expect(toast).toHaveCount(0);
	connection.count(11);
	await expect(toast).toBeVisible();
	await page.getByRole("button", { name: "Hide overlay" }).click();
	await expect(toast).toHaveCount(0);
	connection.count(12);
	await expect(page.locator("#connection-state")).toHaveText("connected:12");
	await page.getByRole("button", { name: "Show overlay" }).click();
	await expect(toast).toHaveCount(0);
	connection.count(13);
	await expect(toast).toBeVisible();
	expect(connection.errors).toEqual([]);
});

test("notification preferences save, reload and disable corner controls", async ({ page }) => {
	await page.goto("/test/browser/settings.html");
	await page.getByRole("button", { name: "Overlay", exact: true }).click();
	const enabled = page.getByRole("switch", { name: "Notify when a user connects" });
	await expect(enabled).toBeChecked();
	const corners = page.getByRole("group", { name: "Notification position", exact: true });
	await expect(corners.getByRole("button", { name: "Bottom right" })).toHaveAttribute(
		"aria-pressed",
		"true",
	);
	await corners.getByRole("button", { name: "Top left" }).click();
	await enabled.click();
	await expect(corners.getByRole("button", { name: "Top left" })).toBeDisabled();
	await page.getByRole("button", { name: "Save", exact: true }).first().click();
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					JSON.parse(localStorage.getItem("test-store:settings.json") ?? "{}").settings
						.connectionNotificationsEnabled,
			),
		)
		.toBe(false);
	await page.reload();
	await page.getByRole("button", { name: "Overlay", exact: true }).click();
	await expect(enabled).not.toBeChecked();
	await expect(corners.getByRole("button", { name: "Top left" })).toHaveAttribute(
		"aria-pressed",
		"true",
	);
});
