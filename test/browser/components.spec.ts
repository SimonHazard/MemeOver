import { expect, test } from "@playwright/test";

test("shared primitives work with pointer, keyboard, disabled states and focus", async ({
	page,
}) => {
	const errors: string[] = [];
	page.on("pageerror", (e) => errors.push(e.message));
	await page.goto("/test/browser/components.html");
	await page.getByRole("button", { name: "Action", exact: true }).click();
	await expect(page.locator("#clicks")).toHaveText("1");
	await expect(page.getByRole("button", { name: "Disabled action" })).toBeDisabled();
	await page.getByLabel("Name", { exact: true }).fill("Browser test");
	await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Browser test");
	await expect(page.getByLabel("Disabled input")).toBeDisabled();
	const sw = page.getByRole("switch", { name: "Enabled switch" });
	await sw.click();
	await expect(sw).toBeChecked();
	await sw.focus();
	await page.keyboard.press("Space");
	await expect(sw).not.toBeChecked();
	await expect(page.getByRole("switch", { name: "Disabled switch" })).toBeDisabled();
	const toggle = page.getByRole("button", { name: "Toggle", exact: true });
	await toggle.click();
	await expect(toggle).toHaveAttribute("aria-pressed", "true");
	await toggle.focus();
	await page.keyboard.press("Space");
	await expect(toggle).toHaveAttribute("aria-pressed", "false");
	await page.getByRole("button", { name: "Second", exact: true }).click();
	await expect(page.locator("#multi")).toHaveText("one,two");
	await expect(page.getByRole("button", { name: "Disabled toggle" })).toBeDisabled();
	const select = page.getByRole("combobox");
	await select.click();
	await expect(page.getByRole("option", { name: "Disabled option" })).toBeDisabled();
	await page.getByRole("option", { name: "Two", exact: true }).click();
	await expect(select).toHaveText("Two");
	await page.mouse.move(0, 0);
	await select.focus();
	await page.keyboard.press("ArrowDown");
	await expect(page.getByRole("option", { name: "Two", exact: true })).toBeFocused();
	await page.keyboard.press("Home");
	await expect(page.getByRole("option", { name: "One", exact: true })).toBeFocused();
	await page.keyboard.press("Enter");
	await expect(select).toHaveText("One");
	const range = page.locator('[data-slot="slider"]').first(),
		inputs = range.locator('input[type="range"]');
	await inputs.first().focus();
	await page.keyboard.press("ArrowRight");
	await expect(page.locator("#range")).toHaveText("21,80");
	await expect(page.locator('[data-slot="slider"]').nth(1).locator("input")).toBeDisabled();
	await page.getByRole("tab", { name: "Tab B" }).click();
	await expect(page.getByRole("tabpanel", { name: "Tab B" })).toHaveText("Panel B");
	await page.getByRole("tab", { name: "Tab B" }).focus();
	await page.keyboard.press("ArrowLeft");
	await expect(page.getByRole("tab", { name: "Tab A" })).toBeFocused();
	await page.keyboard.press("Enter");
	await expect(page.getByRole("tabpanel", { name: "Tab A" })).toHaveText("Panel A");
	await expect(page.getByRole("tab", { name: "Disabled tab" })).toBeDisabled();
	await page.getByRole("button", { name: "Accordion A" }).click();
	await expect(page.getByText("Content A", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Accordion B" }).click();
	await expect(page.getByText("Content A", { exact: true })).toBeVisible();
	await expect(page.getByText("Content B", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Accordion A" }).click();
	await expect(page.getByText("Content A", { exact: true })).toBeHidden();
	const trigger = page.getByRole("button", { name: "Open dialog" });
	await trigger.click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toBeVisible();
	await page.getByLabel("Dialog input").focus();
	await page.keyboard.press("Tab");
	await expect(page.getByRole("button", { name: "Done", exact: true })).toBeFocused();
	await page.keyboard.press("Escape");
	await expect(dialog).toBeHidden();
	await expect(trigger).toBeFocused();
	await trigger.click();
	await page.getByRole("button", { name: "Done", exact: true }).click();
	await expect(dialog).toBeHidden();
	await page.getByRole("button", { name: "Tooltip target" }).hover();
	await expect(page.locator('[data-slot="tooltip-content"]')).toContainText("Helpful information");
	await page.mouse.move(0, 0);
	await expect(page.locator('[data-slot="tooltip-content"]')).toBeHidden();
	await page.getByRole("button", { name: "Red", exact: true }).click();
	await expect(page.locator("#color")).toHaveText("#ef4444");
	await page.getByRole("button", { name: "Reset color" }).click();
	await expect(page.locator("#color")).toHaveText("#FFFFFF");
	const viewport = page.locator('[data-slot="scroll-area-viewport"]');
	await viewport.scrollIntoViewIfNeeded();
	await viewport.hover();
	await page.mouse.wheel(0, 250);
	await expect.poll(() => viewport.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
	const progress = page.getByRole("progressbar", { name: "Download progress" });
	await expect(progress).toHaveAttribute("aria-valuenow", "35");
	const ratio = await progress.evaluate((e) => {
		const indicator = e.querySelector('[data-slot="progress-indicator"]');
		if (!indicator) throw new Error("Progress indicator is missing");
		return indicator.getBoundingClientRect().width / e.getBoundingClientRect().width;
	});
	expect(ratio).toBeCloseTo(0.35, 2);
	await expect(page.locator('[data-slot="avatar-fallback"]')).toHaveText("AB");
	await page.getByRole("button", { name: "Show toast" }).click();
	await expect(page.getByText("Toast works", { exact: true })).toBeVisible();
	const hold = page.getByRole("button", { name: "Hold to Delete" });
	await hold.scrollIntoViewIfNeeded();
	await hold.focus();
	await page.keyboard.down("Space");
	await page.waitForTimeout(350);
	await page.keyboard.up("Space");
	await expect(page.locator("#clicks")).toHaveText("11");
	expect(errors).toEqual([]);
});

test("button hover lifts both sizes and respects reduced motion", async ({ page }) => {
	await page.goto("/test/browser/components.html");
	for (const name of ["Action", "Large action"]) {
		const button = page.getByRole("button", { name, exact: true });
		await page.mouse.move(0, 0);
		await page.emulateMedia({ reducedMotion: "no-preference" });
		await expect
			.poll(() => button.evaluate((e) => getComputedStyle(e).translate))
			.toMatch(/^(none|0px(?: 0px)?)$/);
		const baseline = await button.boundingBox();
		if (!baseline) throw new Error("Button has no bounding box");
		await button.hover();
		await expect
			.poll(async () => {
				const box = await button.boundingBox();
				return box ? Math.round(box.x - baseline.x) : null;
			})
			.toBe(-2);
		await expect
			.poll(async () => {
				const box = await button.boundingBox();
				return box ? Math.round(box.y - baseline.y) : null;
			})
			.toBe(-2);
		await page.emulateMedia({ reducedMotion: "reduce" });
		await expect
			.poll(async () => {
				const box = await button.boundingBox();
				return box ? Math.round(box.x - baseline.x) : null;
			})
			.toBe(0);
		await expect
			.poll(async () => {
				const box = await button.boundingBox();
				return box ? Math.round(box.y - baseline.y) : null;
			})
			.toBe(0);
	}
});
