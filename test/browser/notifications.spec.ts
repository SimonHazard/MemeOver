import { expect, type Page, test, type WebSocketRoute } from "@playwright/test";

const guildId = "123456789012345678";
async function notifications(page: Page, query = "") {
	let socket: WebSocketRoute;
	let joins = 0;
	let closes = 0;
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.routeWebSocket("ws://notifications.test/ws", (ws) => {
		socket = ws;
		ws.onClose(() => closes++);
		ws.onMessage((raw) => {
			if (JSON.parse(String(raw)).type === "JOIN") {
				joins++;
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
		revoke: () =>
			socket.send(JSON.stringify({ type: "ERROR", code: "TOKEN_ROTATED", message: "Revoked" })),
		lifecycle: () => ({ joins, closes }),
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

test("notification preferences save, reload and disable duration and corner controls", async ({
	page,
}) => {
	await page.goto("/test/browser/settings.html");
	await page.getByRole("button", { name: "Overlay", exact: true }).click();
	const enabled = page.getByRole("switch", { name: "Notify when a user connects" });
	await expect(enabled).toBeChecked();
	const duration = page.getByRole("slider", { name: "Notification duration", exact: true });
	await expect(duration).toHaveValue("4");
	await duration.focus();
	await page.keyboard.press("Home");
	await expect(duration).toHaveValue("1");
	await page.keyboard.press("End");
	await expect(duration).toHaveValue("30");
	await page.keyboard.press("Home");
	for (let step = 0; step < 7; step++) await page.keyboard.press("ArrowRight");
	await expect(duration).toHaveValue("8");
	const position = page.getByRole("combobox", { name: "Notification position", exact: true });
	await expect(position).toHaveText("Bottom right");
	await position.click();
	await expect(page.getByRole("option")).toHaveCount(4);
	await page.getByRole("option", { name: "Top left", exact: true }).click();
	await expect(position).toHaveText("Top left");
	await enabled.click();
	await expect(position).toBeDisabled();
	await expect(duration).toBeDisabled();
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
	await expect(duration).toHaveValue("8");
	await expect(duration).toBeDisabled();
	await enabled.click();
	await expect(duration).toBeEnabled();
	await expect(position).toBeEnabled();
	await expect(position).toHaveText("Top left");
	await position.focus();
	await page.keyboard.press("ArrowDown");
	await expect(page.getByRole("listbox")).toBeVisible();
	await expect(page.getByRole("option", { name: "Top left", exact: true })).toBeFocused();
	await page.keyboard.press("End");
	await page.keyboard.press("Enter");
	await expect(position).toHaveText("Bottom right");
});

for (const duration of [1, 6]) {
	test(`connection toast expires after the configured ${duration} seconds`, async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		const connection = await notifications(page, `duration=${duration}`);
		const toast = page.locator("[data-sonner-toast]");
		const started = Date.now();
		connection.count(9);
		await expect(toast).toBeVisible();
		if (duration > 4) {
			await page.waitForTimeout(4200);
			await expect(toast).toBeVisible();
		}
		await expect(toast).toHaveCount(0, { timeout: duration * 1000 + 2000 });
		expect(Date.now() - started).toBeGreaterThanOrEqual(duration * 1000 - 100);
		expect(connection.errors).toEqual([]);
	});
}

for (const theme of ["light", "dark"] as const) {
	test(`connection toast follows the ${theme} system theme and app preference`, async ({
		page,
		context,
	}, testInfo) => {
		await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
		const connection = await notifications(page, "lang=fr");
		const toaster = page.locator("[data-sonner-toaster]");
		const toast = page.locator("[data-sonner-toast]");
		connection.count(9);
		await expect(toast).toHaveText("Un utilisateur s’est connecté");
		await expect(toaster).toHaveAttribute("data-sonner-theme", theme);
		await page.evaluate(() => document.fonts.ready);
		await expect(toast).toHaveCSS("border-radius", "0px");
		await expect(toast).toHaveCSS("border-top-width", "2px");
		const colors = await toast.evaluate((el) => {
			const style = getComputedStyle(el);
			return { background: style.backgroundColor, color: style.color, shadow: style.boxShadow };
		});
		for (const [count, label] of [
			[9, "singular"],
			[11, "plural"],
		] as const) {
			if (label === "plural") {
				connection.count(count);
				await expect(toast).toHaveText("2 utilisateurs se sont connectés");
			}
			const box = await toast.boundingBox();
			if (!box) throw new Error("Missing visible connection toast");
			await page.screenshot({
				path: `/tmp/memeover-toast-${testInfo.project.name}-${theme}-${label}.png`,
				omitBackground: true,
				clip: { x: box.x - 12, y: box.y - 12, width: box.width + 28, height: box.height + 28 },
			});
		}
		const otherTheme = theme === "light" ? "dark" : "light";
		const settings = await context.newPage();
		await settings.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
		await settings.goto("/test/browser/settings.html");
		await settings.getByRole("button", { name: /^(About|À propos)$/ }).click();
		await settings
			.getByRole("button", { name: /theme|thème/i })
			.first()
			.click();
		await expect(toaster).toHaveAttribute("data-sonner-theme", otherTheme);
		await expect(toast).not.toHaveCSS("background-color", colors.background);
		await expect(toast).not.toHaveCSS("color", colors.color);
		await expect(toast).not.toHaveCSS("box-shadow", colors.shadow);
		await page.emulateMedia({ colorScheme: otherTheme });
		await page.emulateMedia({ colorScheme: theme });
		await expect(toaster).toHaveAttribute("data-sonner-theme", otherTheme);
		await page.reload();
		await expect(page.locator("#connection-state")).toHaveText("connected:8");
		connection.count(9);
		await expect(toast).toHaveText("Un utilisateur s’est connecté");
		await expect(toaster).toHaveAttribute("data-sonner-theme", otherTheme);
		await settings.evaluate(() => localStorage.removeItem("theme"));
		await expect(toaster).toHaveAttribute("data-sonner-theme", theme);
		await page.emulateMedia({ colorScheme: otherTheme });
		await expect(toaster).toHaveAttribute("data-sonner-theme", otherTheme);
		expect(connection.errors).toEqual([]);
	});
}

test("changing language translates the active toast without restarting its lifetime and survives reloads", async ({
	page,
	context,
}) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	const settings = await context.newPage();
	await settings.goto("/test/browser/settings.html");
	await settings.getByRole("button", { name: "About", exact: true }).click();
	const connection = await notifications(page, "duration=3");
	const toast = page.locator("[data-sonner-toast]");
	connection.count(9);
	await expect(toast).toHaveText("A user connected");
	const originalToast = await toast.elementHandle();
	await page.waitForTimeout(1500);
	await settings.getByRole("button", { name: "Français", exact: true }).click();
	await expect(toast).toHaveText("Un utilisateur s’est connecté");
	await expect(page.locator("html")).toHaveAttribute("lang", "fr");
	expect(await toast.evaluate((element, original) => element === original, originalToast)).toBe(
		true,
	);
	await expect(toast).toHaveCount(0, { timeout: 2200 });
	connection.count(11);
	await expect(toast).toHaveText("2 utilisateurs se sont connectés");
	await settings.getByRole("button", { name: "English", exact: true }).click();
	await expect(toast).toHaveText("2 users connected");
	await expect(page.locator("html")).toHaveAttribute("lang", "en");
	await settings.getByRole("button", { name: "Français", exact: true }).click();
	await settings.reload();
	await expect(settings.getByRole("button", { name: "Historique", exact: true })).toBeVisible();
	await page.reload();
	await expect(page.locator("#connection-state")).toHaveText("connected:8");
	await expect(toast).toHaveCount(0);
	connection.count(9);
	await expect(toast).toHaveText("Un utilisateur s’est connecté");
	expect(connection.errors).toEqual([]);
});

test("unmount cancels a pending reconnect and remount starts with a fresh snapshot", async ({
	page,
}) => {
	const connection = await notifications(page);
	const toast = page.locator("[data-sonner-toast]");
	connection.count(9);
	await expect(toast).toBeVisible();
	connection.close();
	await expect(page.locator("#connection-state")).toHaveText("disconnected:9");
	await page.getByRole("button", { name: "Unmount notifications" }).click();
	await expect(toast).toHaveCount(0);
	const before = connection.lifecycle().joins;
	await page.waitForTimeout(3200);
	expect(connection.lifecycle().joins).toBe(before);
	await page.getByRole("button", { name: "Remount notifications" }).click();
	await expect(page.locator("#connection-state")).toHaveText("connected:8");
	await expect(toast).toHaveCount(0);
	connection.count(9);
	await expect(toast).toHaveCount(1);
	await page.getByRole("button", { name: "Unmount notifications" }).click();
	await expect(toast).toHaveCount(0);
	await expect.poll(() => connection.lifecycle().closes).toBeGreaterThan(0);
	expect(connection.errors).toEqual([]);
});

test("token revocation dismisses active toasts and prevents automatic reconnect", async ({
	page,
}) => {
	const connection = await notifications(page);
	const toast = page.locator("[data-sonner-toast]");
	connection.count(9);
	await expect(toast).toBeVisible();
	connection.revoke();
	await expect(page.locator("#connection-state")).toHaveText("error:9");
	await expect(toast).toHaveCount(0);
	const before = connection.lifecycle().joins;
	connection.close();
	await page.waitForTimeout(3200);
	expect(connection.lifecycle().joins).toBe(before);
	await expect(toast).toHaveCount(0);
	expect(connection.errors).toEqual([]);
});
