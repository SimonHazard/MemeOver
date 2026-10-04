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
	const red = page.getByRole("button", { name: "Red", exact: true }).last();
	await red.click();
	await expect(red).toHaveAttribute("aria-pressed", "true");
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

test("profiles create, replace, apply, export, import and confirmed delete", async ({ page }) => {
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
	await page.getByRole("button", { name: "Delete profile Imported profile", exact: true }).click();
	const dialog = page.getByRole("alertdialog", { name: "Delete this profile?" });
	await expect(dialog).toContainText("“Imported profile” will be removed");
	await dialog.getByRole("button", { name: "Delete", exact: true }).click();
	await expect(page.getByText("Imported profile", { exact: true })).toBeHidden();
});

test("history replay, author mute/unmute, switches and confirmed clear", async ({ page }) => {
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
	await page.getByRole("button", { name: "Clear all", exact: true }).click();
	const dialog = page.getByRole("alertdialog", { name: "Clear local history?" });
	await dialog.getByRole("button", { name: "Clear all", exact: true }).click();
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
	await page.getByRole("button", { name: "Clear local history", exact: true }).click();
	const confirm = page.getByRole("alertdialog", { name: "Clear local history?" });
	await expect(confirm.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
	await confirm.getByRole("button", { name: "Cancel", exact: true }).click();
	await expect(confirm).toBeHidden();
});

test("toggle groups keep the Radix keyboard model: pressed tab stop and vertical arrows", async ({
	page,
}) => {
	await overlay(page);
	const grid = page
		.getByRole("group")
		.filter({ has: page.getByLabel("Top left", { exact: true }) });
	await expect(grid.getByLabel("Center", { exact: true })).toHaveAttribute("aria-pressed", "true");
	// Enter the grid from the element before it: focus lands on the saved position.
	await grid.getByLabel("Top left", { exact: true }).focus();
	await page.keyboard.press("Shift+Tab");
	await page.keyboard.press("Tab");
	await expect(grid.getByLabel("Center", { exact: true })).toBeFocused();
	// Space on the entry tab stop must not change the saved position.
	await page.keyboard.press("Space");
	await expect(grid.getByLabel("Center", { exact: true })).toHaveAttribute("aria-pressed", "true");
	await page.keyboard.press("ArrowDown");
	await expect(grid.getByLabel("Middle right", { exact: true })).toBeFocused();
	// Base UI's own navigation continues from the item focused by ArrowDown.
	await page.keyboard.press("ArrowRight");
	await expect(grid.getByLabel("Bottom left", { exact: true })).toBeFocused();
	await page.keyboard.press("ArrowUp");
	await page.keyboard.press("ArrowUp");
	await expect(grid.getByLabel("Center", { exact: true })).toBeFocused();
	// Wraps like the horizontal arrows.
	await page.keyboard.press("End");
	await page.keyboard.press("ArrowDown");
	await expect(grid.getByLabel("Top left", { exact: true })).toBeFocused();
});

test("tray labels follow the interface language from startup", async ({ page }) => {
	await page.goto("/test/browser/settings.html");
	const tray = () =>
		page.evaluate(() => JSON.parse(localStorage.getItem("test-tray-labels") ?? "null"));
	await expect.poll(tray).toEqual({
		showLabel: "Show settings",
		hideLabel: "Hide settings",
		quitLabel: "Quit",
	});
	await page.getByRole("button", { name: "About", exact: true }).click();
	await page.getByRole("button", { name: "Français" }).click();
	await expect.poll(tray).toEqual({
		showLabel: "Afficher les paramètres",
		hideLabel: "Masquer les paramètres",
		quitLabel: "Quitter",
	});
});

test("custom text color is announced with its value", async ({ page }) => {
	await overlay(page);
	await page.locator('input[type="color"]').last().fill("#123abc");
	const custom = page.getByRole("button", { name: "Custom color #123ABC", exact: true });
	await expect(custom).toHaveAttribute("aria-pressed", "true");
});

test("expired replay explains itself to screen readers", async ({ page }) => {
	// Seed before the app starts: the startup purge is asynchronous and would race a later
	// write. Missing settings fields are filled by normalizeSettings, like an older file.
	await page.addInitScript(() => {
		localStorage.setItem(
			"test-store:settings.json",
			JSON.stringify({
				settings: {
					clientId: "browser-test-client",
					guildId: "123456789012345678",
					token: "test-only-token",
					historyAutoPurge: false,
				},
			}),
		);
		localStorage.setItem(
			"test-store:history.json",
			JSON.stringify({
				history: [
					{
						type: "MEDIA",
						queueId: "expired-item",
						guild_id: "123456789012345678",
						channel_id: "1",
						message_id: "1",
						author_id: "123456789012345678",
						author_username: "Test Author",
						author_avatar_url: "",
						media_type: "image",
						// `ex` is the Discord signature expiry (hex seconds): long past.
						media_url: "https://cdn.discordapp.com/attachments/1/2/old.png?ex=00000001&is=0&hm=0",
						timestamp: Date.now(),
						recordedAt: Date.now(),
					},
				],
			}),
		);
	});
	await page.goto("/test/browser/settings.html");
	await page.getByRole("button", { name: "History", exact: true }).click();
	await expect(page.getByRole("button", { name: "Replay", exact: true })).toBeDisabled();
	const wrapper = page.locator("span[tabindex='0'][aria-describedby]");
	await expect(wrapper).toHaveCount(1);
	await expect(wrapper).toHaveAccessibleDescription(
		"This Discord link has expired. Discord media links last about 24 hours.",
	);
});

test("member count badge exposes its state to assistive technology", async ({ page }) => {
	await page.goto("/test/browser/settings.html");
	// The visible badge parts are aria-hidden; the state is read from screen-reader text.
	await expect(page.getByText("Not connected to the bot", { exact: true })).toHaveCount(1);
	await expect(page.getByText("offline", { exact: true })).toHaveAttribute("aria-hidden", "true");
});

test("multiple-choice toggle groups keep the toolbar tab stop", async ({ page }) => {
	await overlay(page);
	const images = page.getByRole("button", { name: "Images", exact: true });
	const gifs = page.getByRole("button", { name: "GIFs", exact: true });
	await images.click();
	await expect(images).toHaveAttribute("aria-pressed", "false");
	await expect(gifs).toHaveAttribute("aria-pressed", "true");
	// Leave the group from the item just used, then come back with the keyboard: the tab
	// stop stays on that item (APG toolbar) instead of jumping to the first pressed one.
	await page.keyboard.press("Shift+Tab");
	await page.keyboard.press("Tab");
	await expect(images).toBeFocused();
});

test("toggle groups wrapped in tooltips keep the same keyboard model", async ({ page }) => {
	await overlay(page);
	const bottom = page.getByRole("button", { name: "Overlay bottom", exact: true });
	const middle = page.getByRole("button", { name: "Overlay middle", exact: true });
	await expect(bottom).toHaveAttribute("aria-pressed", "true");
	// Enter the text position group from the element before it.
	await page.getByRole("button", { name: "Above", exact: true }).focus();
	await page.keyboard.press("Shift+Tab");
	await page.keyboard.press("Tab");
	await expect(bottom).toBeFocused();
	await page.keyboard.press("ArrowUp");
	await expect(middle).toBeFocused();
	await page.keyboard.press("ArrowDown");
	await expect(bottom).toBeFocused();
});

test("Enter on a slider does not submit the overlay form", async ({ page }) => {
	await overlay(page);
	const slider = page.locator('[data-slot="slider"] input[type="range"]').first();
	await slider.focus();
	await page.keyboard.press("ArrowRight");
	const save = page.getByRole("button", { name: "Save", exact: true }).first();
	await expect(save).toBeEnabled();
	await page.keyboard.press("Enter");
	await expect(save).toBeEnabled();
	expect((await settings(page)).mediaSize).toBe(60);
	// Saving stays an explicit action.
	await save.click();
	await expect.poll(async () => (await settings(page)).mediaSize).toBe(61);
});
