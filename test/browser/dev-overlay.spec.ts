import { expect, test } from "@playwright/test";

const production = process.env.BROWSER_PRODUCTION === "1";

test("production settings have no local test bench", async ({ page }) => {
	test.skip(!production, "Production build exclusion");
	await page.goto("/test/browser/settings.html");
	await page.getByRole("button", { name: "Overlay", exact: true }).click();
	await expect(page.getByRole("heading", { name: "Local overlay test bench" })).toHaveCount(0);
});

test.describe("local development overlay", () => {
	test.skip(production, "Local dev controls are removed from production");
	test("simulates arrivals and departures through real toasts without a bot", async ({ page }) => {
		const sockets: string[] = [];
		const errors: string[] = [];
		page.on("websocket", (socket) => {
			if (!socket.url().includes("vite")) sockets.push(socket.url());
		});
		page.on("pageerror", (error) => errors.push(error.message));
		page.on("console", (message) => {
			if (message.text().includes("Couldn't find callback")) errors.push(message.text());
		});
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/test/browser/dev-overlay.html");
		await page.getByRole("button", { name: "Start simulation" }).click();
		const toast = page.locator("[data-sonner-toast]");
		await expect(toast).toHaveCount(0);
		await page.getByRole("button", { name: "Connect a user", exact: true }).click();
		await expect(toast).toHaveText("A user connected");
		await expect(page.getByText("1 simulated user", { exact: true })).toBeVisible();
		await page.getByRole("button", { name: "Use dark theme" }).click();
		await expect(page.locator("[data-sonner-toaster]")).toHaveAttribute(
			"data-sonner-theme",
			"dark",
		);
		await expect(toast).toHaveCount(0, { timeout: 6000 });
		await page.getByRole("button", { name: "Disconnect a user", exact: true }).click();
		await expect(page.getByText("0 simulated users", { exact: true })).toBeVisible();
		await expect(toast).toHaveText("A user disconnected");
		await expect(
			page.getByRole("button", { name: "Disconnect a user", exact: true }),
		).toBeDisabled();
		await page.getByRole("button", { name: "Connect a user", exact: true }).click();
		await expect(toast).toHaveText(["A user connected", "A user disconnected"]);
		await page.getByRole("button", { name: "Disable notifications" }).click();
		await expect(toast).toHaveCount(0);
		await page.getByRole("button", { name: "Connect a user", exact: true }).click();
		await expect(page.getByText("2 simulated users", { exact: true })).toBeVisible();
		await expect(toast).toHaveCount(0);
		await page.getByRole("button", { name: "Disconnect a user", exact: true }).click();
		await expect(page.getByText("1 simulated user", { exact: true })).toBeVisible();
		await expect(toast).toHaveCount(0);
		await page.getByRole("button", { name: "Stop simulation" }).click();
		await expect(page.locator("[data-dev-overlay-sample]")).toHaveCount(0);
		expect(errors).toEqual([]);
		// Vite's own HMR socket is the only permitted development connection.
		expect(sockets.filter((url) => !url.includes("127.0.0.1:1429"))).toEqual([]);
	});

	test("rapid arrivals keep separate readable toasts and stopping clears them all", async ({
		page,
	}) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/test/browser/dev-overlay.html");
		await page.getByRole("button", { name: "Start simulation" }).click();
		const join = page.getByRole("button", { name: "Connect a user", exact: true });
		for (let index = 0; index < 3; index++) await join.click();
		const toasts = page.locator('[data-sonner-toast][data-visible="true"]');
		await expect(toasts).toHaveText(["A user connected", "A user connected", "A user connected"]);
		await expect(page.getByText("3 simulated users", { exact: true })).toBeVisible();
		await expect
			.poll(() =>
				toasts.evaluateAll((elements) => {
					const boxes = elements
						.map((element) => element.getBoundingClientRect())
						.sort((a, b) => a.y - b.y);
					return boxes.every((box, index) => index === 0 || box.y >= boxes[index - 1].bottom);
				}),
			)
			.toBe(true);
		await page.getByRole("button", { name: "Stop simulation" }).click();
		await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
		await page.getByRole("button", { name: "Start simulation" }).click();
		await expect(page.getByText("0 simulated users", { exact: true })).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Disconnect a user", exact: true }),
		).toBeDisabled();
	});

	test("fixed media survives its duration and applies settings without history writes", async ({
		page,
	}, testInfo) => {
		const errors: string[] = [];
		page.on("pageerror", (error) => errors.push(error.message));
		page.on("console", (message) => {
			if (message.text().includes("Couldn't find callback")) errors.push(message.text());
		});
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/test/browser/dev-overlay.html");
		await page.getByRole("button", { name: "Start simulation" }).click();
		const image = page.locator('[data-dev-overlay-sample="image"] img').last();
		await expect(image).toBeVisible();
		const before = await image.boundingBox();
		await page.waitForTimeout(2200);
		await expect(image).toBeVisible();
		await page.getByRole("button", { name: "Apply display settings" }).click();
		await expect(image).toHaveCSS("opacity", "0.35");
		expect((await image.boundingBox())?.width).toBeGreaterThan(before?.width ?? 0);
		await page.getByRole("button", { name: "Fixed text", exact: true }).click();
		await expect(page.locator('[data-dev-overlay-sample="text"]')).toContainText(
			"This text stays on screen.",
		);
		await page.waitForTimeout(1600);
		await expect(page.locator('[data-dev-overlay-sample="text"]')).toContainText(
			"This text stays on screen.",
		);
		await page.screenshot({ path: testInfo.outputPath("local-overlay-test-bench.png") });
		await page.getByRole("button", { name: "Hide sample", exact: true }).click();
		await expect(page.locator("[data-dev-overlay-sample]")).toBeEmpty();
		await page.getByRole("button", { name: "Stop simulation" }).click();
		await page.getByRole("button", { name: "Start simulation" }).click();
		await expect(image).toBeVisible();
		await expect(page.getByText("0 simulated users", { exact: true })).toBeVisible();
		expect(errors).toEqual([]);
	});

	test("French controls and dark toasts fit a small development window", async ({
		page,
	}, testInfo) => {
		await page.setViewportSize({ width: 800, height: 600 });
		await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
		await page.goto("/test/browser/dev-overlay.html?lang=fr");
		await page.getByRole("button", { name: "Démarrer la simulation" }).click();
		await expect(page.locator('[data-dev-overlay-sample="image"] img').last()).toBeVisible();
		await page.getByRole("button", { name: "Connecter un utilisateur", exact: true }).click();
		await expect(page.locator("[data-sonner-toast]")).toHaveText("Un utilisateur s’est connecté");
		await page.getByRole("button", { name: "Déconnecter un utilisateur", exact: true }).click();
		await expect(page.locator("[data-sonner-toast]")).toHaveText([
			"Un utilisateur s’est déconnecté",
			"Un utilisateur s’est connecté",
		]);
		await expect(page.locator("[data-sonner-toaster]")).toHaveAttribute(
			"data-sonner-theme",
			"dark",
		);
		await page.locator("#fixture-actions").evaluate((element) => {
			element.style.display = "none";
		});
		await page.screenshot({ path: testInfo.outputPath("banc-test-local-fr.png") });
		await expect(page.getByRole("button", { name: "Arrêter la simulation" })).toBeInViewport();
	});
});
