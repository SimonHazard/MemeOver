import { expect, type Page, test } from "@playwright/test";

async function overlay(page: Page) {
	await page.goto("/test/browser/settings.html");
	await page.getByRole("button", { name: "Overlay", exact: true }).click();
	await expect(page.locator('[data-slot="slider"]').first()).toBeVisible();
}
async function settings(page: Page) {
	return page.evaluate(
		() => JSON.parse(localStorage.getItem("test-store:settings.json") ?? "{}").settings,
	);
}
test.beforeEach(async ({ page }) => {
	const errors: string[] = [];
	page.on("pageerror", (e) => errors.push(e.message));
	await page.exposeFunction("assertNoUiErrors", () => expect(errors).toEqual([]));
});
test.afterEach(async ({ page }) => {
	await page.evaluate(() =>
		(window as unknown as { assertNoUiErrors: () => Promise<void> }).assertNoUiErrors(),
	);
});

test("all settings sliders support pointer, keyboard, bounds and persistence", async ({ page }) => {
	await overlay(page);
	// Enable the background controls and unfold their accordions.
	const switches = page.getByRole("switch");
	for (const sw of await switches.all())
		if ((await sw.getAttribute("aria-checked")) === "false") await sw.click();
	for (const trigger of await page.locator('[data-slot="accordion-trigger"]').all())
		await trigger.click();
	const sliders = page.locator('[data-slot="slider"]');
	await expect(sliders).toHaveCount(16);
	for (const slider of await sliders.all()) {
		const input = slider.locator('input[type="range"]');
		await slider.scrollIntoViewIfNeeded();
		const min = Number(await input.getAttribute("min")),
			max = Number(await input.getAttribute("max")),
			step = Number(await input.getAttribute("step"));
		await input.focus();
		await page.keyboard.press("Home");
		await expect(input).toHaveValue(String(min));
		const box = await slider.locator("[data-base-ui-slider-control]").boundingBox();
		if (!box) throw new Error("Slider control has no bounding box");
		await page.mouse.click(box.x + box.width * 0.7, box.y + box.height / 2);
		const clicked = Number(await input.inputValue());
		expect(clicked).toBeGreaterThan(min);
		const thumb = await slider.locator('[data-slot="slider-thumb"]').boundingBox();
		if (!thumb) throw new Error("Slider thumb has no bounding box");
		await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2, { steps: 8 });
		await page.mouse.up();
		const dragged = Number(await input.inputValue());
		expect(dragged).toBeLessThan(clicked);
		await input.focus();
		await page.keyboard.press("ArrowRight");
		await expect(input).toHaveValue(String(Math.min(max, dragged + step)));
		await page.keyboard.press("End");
		await expect(input).toHaveValue(String(max));
	}
	await page.getByRole("button", { name: "Save", exact: true }).first().click();
	await expect.poll(async () => (await settings(page)).mediaSize).toBe(90);
	await page.reload();
	await page.getByRole("button", { name: "Overlay", exact: true }).click();
	await expect(page.locator('[data-slot="slider"] input').first()).toHaveValue("90");
});

test("switches, select, text inputs, toggles, color controls and save", async ({ page }) => {
	await overlay(page);
	for (const sw of await page.getByRole("switch").all()) {
		const old = await sw.getAttribute("aria-checked");
		await sw.click();
		await expect(sw).toHaveAttribute("aria-checked", old === "true" ? "false" : "true");
		await sw.focus();
		await page.keyboard.press("Space");
		await expect(sw).toHaveAttribute("aria-checked", old ?? "");
	}
	const select = page.locator('[data-slot="select-trigger"]').first();
	await select.click();
	const options = page.getByRole("option");
	await expect(options.first()).toBeVisible();
	const label = await options.nth(1).innerText();
	await options.nth(1).click();
	await expect(select).toContainText(label.trim());
	await select.focus();
	await page.keyboard.press("ArrowDown");
	await page.keyboard.press("End");
	await page.keyboard.press("Enter");
	for (const name of ["Bottom right", "Overlay middle", "Square (1:1)"]) {
		const item = page.getByRole("button", { name, exact: true }).first();
		await item.click();
		await expect(item).toHaveAttribute("aria-pressed", "true");
	}
	const sticker = page.getByRole("button", { name: "Stickers", exact: true });
	await sticker.click();
	await expect(sticker).toHaveAttribute("aria-pressed", "false");
	const textSize = page.locator('input[type="number"]').last();
	await textSize.fill("32");
	await textSize.blur();
	await page.getByRole("button", { name: "Red", exact: true }).last().click();
	await page.getByRole("button", { name: "Save", exact: true }).first().click();
	await expect.poll(async () => (await settings(page)).textColor).toBe("#ef4444");
	expect((await settings(page)).textSize).toBe(32);
});

test("unsaved dialog supports stay, escape, discard, save and failed save", async ({ page }) => {
	await overlay(page);
	const slider = page.locator('[data-slot="slider"] input').first();
	await slider.focus();
	await page.keyboard.press("ArrowLeft");
	await page.getByRole("button", { name: "History", exact: true }).click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(dialog).toBeHidden();
	await page.getByRole("button", { name: "History", exact: true }).click();
	await dialog.getByRole("button", { name: "Keep editing" }).click();
	await expect(dialog).toBeHidden();
	await page.getByRole("button", { name: "History", exact: true }).click();
	await dialog.getByRole("button", { name: /discard/i }).click();
	await expect(dialog).toBeHidden();
	await page.getByRole("button", { name: "Overlay", exact: true }).click();
	await slider.focus();
	await page.keyboard.press("ArrowLeft");
	await page.getByRole("button", { name: "History", exact: true }).click();
	await page.evaluate(() => localStorage.setItem("test-fail-save", "1"));
	await dialog.getByRole("button", { name: "Save and continue" }).click();
	await expect(dialog).toBeVisible();
	await page.evaluate(() => localStorage.removeItem("test-fail-save"));
	await dialog.getByRole("button", { name: "Save and continue" }).click();
	await expect(dialog).toBeHidden();
});

test("navigation, language, theme, history and dashboard controls", async ({ page }) => {
	await page.goto("/test/browser/settings.html");
	for (const tab of ["Overlay", "Server", "History", "About", "Dashboard"]) {
		await page.getByRole("button", { name: tab, exact: true }).click();
		await expect(page.locator("main")).toBeVisible();
	}
	await page.getByRole("button", { name: "About", exact: true }).click();
	await page.getByRole("button", { name: "Français", exact: true }).click();
	await expect(page.getByRole("button", { name: "Historique", exact: true })).toBeVisible();
	await page.getByRole("button", { name: "English", exact: true }).click();
	await expect(page.getByRole("button", { name: "History", exact: true })).toBeVisible();
	const theme = page.getByRole("button", { name: /theme/i }).first();
	const before = await page.locator("html").getAttribute("class");
	await theme.click();
	await expect.poll(() => page.locator("html").getAttribute("class")).not.toBe(before);
});

test("profiles create, replace, apply, export, import and hold-to-delete", async ({ page }) => {
	await overlay(page);
	await page.getByLabel("Profile Name", { exact: true }).fill("Browser profile");
	await page.getByRole("button", { name: "Create", exact: true }).click();
	await expect(page.getByText("Browser profile", { exact: true })).toBeVisible();
	const input = page.getByRole("slider", { name: "Media size", exact: true });
	await input.focus();
	await page.keyboard.press("Home");
	await page.getByRole("button", { name: "Replace", exact: true }).click();
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					JSON.parse(localStorage.getItem("test-store:overlay-profiles.json") ?? "{}").profiles[0]
						.settings.mediaSize,
			),
		)
		.toBe(10);
	await input.focus();
	await page.keyboard.press("End");
	await page.getByRole("button", { name: "Apply", exact: true }).click();
	await expect(input).toHaveValue("10");
	await expect.poll(async () => (await settings(page)).mediaSize).toBe(10);
	const download = page.waitForEvent("download");
	await page.getByRole("button", { name: "Export", exact: true }).click();
	expect((await download).suggestedFilename()).toBe("memeover-profile-browser-profile.json");
	await page.locator('input[type="file"]').setInputFiles({
		name: "profile.json",
		mimeType: "application/json",
		buffer: Buffer.from(JSON.stringify({ name: "Imported profile", settings: { mediaSize: 55 } })),
	});
	await expect(page.getByText("Imported profile", { exact: true })).toBeVisible();
	const remove = page.getByRole("button", { name: "Hold to Delete profile Imported profile" });
	await remove.scrollIntoViewIfNeeded();
	await remove.focus();
	await page.keyboard.down("Space");
	await page.waitForTimeout(1350);
	await page.keyboard.up("Space");
	await expect(page.getByText("Imported profile", { exact: true })).toBeHidden();
});

test("history replay, author mute/unmute, switches and hold-to-clear", async ({ page }) => {
	await page.goto("/test/browser/settings.html");
	await page.evaluate(() =>
		localStorage.setItem(
			"test-store:history.json",
			JSON.stringify({
				history: [
					{
						type: "TEXT",
						queueId: "browser-item",
						text: "Test history message",
						author_id: "123456789012345678",
						author_username: "Test Author",
						author_avatar_url: "",
						timestamp: Date.now(),
						recordedAt: Date.now(),
					},
				],
			}),
		),
	);
	await page.getByRole("button", { name: "History", exact: true }).click();
	await expect(page.getByText("Test history message", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Replay", exact: true }).click();
	await expect(page.getByText("Media added to queue").first()).toBeVisible();
	await page.getByRole("button", { name: "Hide this author", exact: true }).click();
	await expect.poll(async () => (await settings(page)).mutedAuthors.length).toBe(1);
	await page.getByRole("button", { name: "Show again", exact: true }).click();
	await expect.poll(async () => (await settings(page)).mutedAuthors.length).toBe(0);
	const purge = page.getByRole("switch", { name: "Remove expired media automatically" });
	await purge.click();
	await expect.poll(async () => (await settings(page)).historyAutoPurge).toBe(false);
	const clear = page.getByRole("button", { name: "Hold to Clear all" });
	await clear.scrollIntoViewIfNeeded();
	await clear.focus();
	await page.keyboard.down("Space");
	await page.waitForTimeout(1350);
	await page.keyboard.up("Space");
	await expect(page.getByText("Test history message", { exact: true })).toBeHidden();
});

test("small window, dark theme and reduced motion keep controls and dialogs usable", async ({
	page,
}) => {
	await page.setViewportSize({ width: 800, height: 600 });
	await page.emulateMedia({ reducedMotion: "reduce" });
	await overlay(page);
	await expect(page.locator("html")).toHaveClass(/dark/);
	await page.getByRole("slider", { name: "Media size", exact: true }).focus();
	await page.keyboard.press("ArrowLeft");
	await page.getByRole("button", { name: "History", exact: true }).click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	const box = await dialog.boundingBox();
	if (!box) throw new Error("Dialog has no bounding box");
	expect(box.x).toBeGreaterThanOrEqual(0);
	expect(box.x + box.width).toBeLessThanOrEqual(800);
	await dialog.getByRole("button", { name: "Keep editing" }).click();
	await page.getByRole("button", { name: "Save", exact: true }).first().click();
});

test("invalid profile import and failed creation show errors without crashing", async ({
	page,
}) => {
	await overlay(page);
	await page.locator('input[type="file"]').setInputFiles({
		name: "invalid.json",
		mimeType: "application/json",
		buffer: Buffer.from("{invalid"),
	});
	await expect(
		page.getByText("Import failed. Check that the file is a valid MemeOver profile.", {
			exact: true,
		}),
	).toBeVisible();
	await page.evaluate(() => localStorage.setItem("test-fail-save", "1"));
	await page.getByLabel("Profile Name", { exact: true }).fill("Failed profile");
	await page.getByRole("button", { name: "Create", exact: true }).click();
	await expect(page.getByText("Could not create this profile", { exact: true })).toBeVisible();
});

test("dashboard connection validation, expert mode and autostart", async ({ page }) => {
	await page.goto("/test/browser/settings.html");
	await page.getByRole("switch", { name: "Expert mode", exact: true }).click();
	await expect(page.getByLabel("WebSocket server URL", { exact: true })).toBeVisible();
	await page.getByLabel("WebSocket server URL", { exact: true }).fill("invalid-url");
	await page.getByLabel("WebSocket server URL", { exact: true }).blur();
	await page.getByRole("button", { name: "Save & connect", exact: true }).click();
	expect((await settings(page)).wsUrl).not.toBe("invalid-url");
	await page.getByLabel("WebSocket server URL", { exact: true }).fill("ws://127.0.0.1:3001/ws");
	await page.getByRole("button", { name: "Save & connect", exact: true }).click();
	await expect.poll(async () => (await settings(page)).wsUrl).toBe("ws://127.0.0.1:3001/ws");
	await page.getByRole("switch", { name: "Launch at startup", exact: true }).click();
	await expect.poll(() => page.evaluate(() => localStorage.getItem("test-autostart"))).toBe("true");
});

test("monitor selection and failed connection saves stay usable", async ({ page }) => {
	await overlay(page);
	await page.evaluate(() => localStorage.setItem("test-fail-save", "1"));
	await page.getByRole("button", { name: /Second display/ }).click();
	await expect(
		page.getByText("Failed to move overlay to this screen", { exact: true }),
	).toBeVisible();
	await page.evaluate(() => localStorage.removeItem("test-fail-save"));
	await page.getByRole("button", { name: /Second display/ }).click();
	await expect(page.getByText("Overlay moved to Second display", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: /Test display/ }).click();
	await expect.poll(async () => (await settings(page)).overlayMonitor?.x).toBe(0);
	await page.getByRole("button", { name: "Dashboard", exact: true }).click();
	await page.evaluate(() => localStorage.setItem("test-fail-save", "1"));
	await page.getByRole("button", { name: "Save & connect", exact: true }).click();
	await expect(page.getByText("Failed to save settings", { exact: true })).toBeVisible();
});

test("onboarding advances, handles save errors, returns and finishes", async ({ page }) => {
	await page.goto("/test/browser/settings.html?onboarding");
	await expect(page.getByRole("heading", { name: "Welcome to MemeOver" })).toBeVisible();
	await page.getByRole("button", { name: "Next", exact: true }).click();
	await page.getByLabel("Server ID", { exact: true }).fill("123456789012345678");
	await page.getByLabel("Token", { exact: true }).fill("test-only-token");
	await page.evaluate(() => localStorage.setItem("test-fail-save", "1"));
	await page.getByRole("button", { name: "Next", exact: true }).click();
	await expect(page.getByText("Failed to save settings", { exact: true })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Configure the connection" })).toBeVisible();
	await page.evaluate(() => localStorage.removeItem("test-fail-save"));
	await page.getByRole("button", { name: "Back", exact: true }).click();
	await expect(page.getByRole("heading", { name: "Welcome to MemeOver" })).toBeVisible();
	await page.getByRole("button", { name: "Next", exact: true }).click();
	await page.getByRole("button", { name: "Next", exact: true }).click();
	await page.getByRole("button", { name: "Get started", exact: true }).click();
	await expect(page.getByRole("button", { name: "Save & connect", exact: true })).toBeVisible();
});

test("about compatibility dialog and update check", async ({ page }) => {
	await page.goto("/test/browser/settings.html");
	await page.getByRole("button", { name: "About", exact: true }).click();
	const trigger = page.getByRole("button", { name: "Learn more", exact: true });
	await trigger.click();
	await expect(page.getByRole("dialog")).toBeVisible();
	await page.getByRole("button", { name: "Got it, dismiss", exact: true }).click();
	await expect(page.getByRole("dialog")).toBeHidden();
	await expect(trigger).toBeFocused();
	await page.getByRole("button", { name: "Check for updates", exact: true }).click();
	await expect(page.getByText("You have the latest version", { exact: true })).toBeVisible();
});
