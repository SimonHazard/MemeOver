import { expect, test } from "@playwright/test";

for (const text of [false, true]) {
	for (const background of [false, true]) {
		test(`author badge is centered with one background (${text ? "text" : "media"}, background ${background})`, async ({
			page,
		}) => {
			await page.emulateMedia({ reducedMotion: "reduce" });
			await page.goto(
				`/test/browser/overlay.html?${text ? "text&" : ""}${background ? "background" : ""}`,
			);
			const badge = page.getByText("iXeDay SimoHz", { exact: true }).locator("..");
			await expect(badge).toBeVisible();
			await expect.poll(() => badge.evaluate((e) => getComputedStyle(e).opacity)).toBe("1");
			const geometry = await badge.evaluate((e) => {
				const rect = e.getBoundingClientRect();
				const content = e.nextElementSibling;
				if (!content || !e.parentElement) throw new Error("Missing content");
				const box = content.getBoundingClientRect();
				return {
					centerDelta: Math.abs(rect.x + rect.width / 2 - box.x - box.width / 2),
					gap: box.y - rect.bottom,
					parentBackground: getComputedStyle(e.parentElement).backgroundColor,
					badgeBackground: getComputedStyle(e).backgroundColor,
					badgeShadow: getComputedStyle(e).boxShadow,
					badgeBackdrop: getComputedStyle(e).backdropFilter,
					contentBackground: getComputedStyle(content).backgroundColor,
				};
			});
			expect(geometry.centerDelta).toBeLessThan(1);
			expect(geometry.gap).toBeGreaterThanOrEqual(7);
			expect(geometry.parentBackground).toBe("rgba(0, 0, 0, 0)");
			expect(geometry.badgeBackground).not.toBe("rgba(0, 0, 0, 0)");
			expect(geometry.badgeShadow).toBe("none");
			expect(geometry.badgeBackdrop).toBe("none");
			if (background) expect(geometry.contentBackground).toBe("rgba(51, 102, 153, 0.8)");
		});
	}
}

test("long author names stay inside the content width and anonymous media hides the badge", async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.setViewportSize({ width: 800, height: 600 });
	await page.goto("/test/browser/overlay.html?background&long");
	const badge = page.getByText(/A very long author name/).locator("..");
	await expect(badge).toBeVisible();
	const widths = await badge.evaluate((e) => {
		const name = e.lastElementChild;
		if (!name) throw new Error("Missing author name");
		return {
			badge: e.getBoundingClientRect().width,
			available: 0.6 * Math.min(innerWidth, innerHeight),
			truncated: name.scrollWidth > name.clientWidth,
		};
	});
	expect(widths.badge).toBeLessThanOrEqual(widths.available);
	expect(widths.truncated).toBe(true);
	await page.goto("/test/browser/overlay.html?background&anonymous");
	await expect(page.locator("#display img")).toBeVisible();
	await expect(page.getByText("iXeDay SimoHz", { exact: true })).toHaveCount(0);
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
	test(`popup badge appears on every item and exits without blocking (${reducedMotion})`, async ({
		page,
	}) => {
		const errors: string[] = [];
		page.on("pageerror", (error) => errors.push(error.message));
		await page.emulateMedia({ reducedMotion });
		await page.goto("/test/browser/overlay.html?popup");
		const badge = page.getByText("iXeDay SimoHz", { exact: true }).locator("..");
		for (let index = 0; index < 3; index++) {
			await expect(badge).toBeVisible();
			await expect.poll(() => badge.evaluate((e) => getComputedStyle(e).opacity)).toBe("1");
			await expect(badge.locator('[data-slot="avatar-image"]')).toBeVisible();
			await page.getByRole("button", { name: "Hide media" }).click();
			await expect(badge).toHaveCount(0);
			await expect(page.locator("#exits")).toHaveText(String(index + 1));
			await page.getByRole("button", { name: "Show next media" }).click();
		}
		// Replace an item while the previous entrance is still running.
		await page.getByRole("button", { name: "Show next media" }).click();
		await page.getByRole("button", { name: "Show next media" }).click();
		await expect(badge).toHaveCount(1);
		await expect.poll(() => badge.evaluate((e) => getComputedStyle(e).opacity)).toBe("1");
		expect(errors).toEqual([]);
	});
}

test("attribution stays readable when its entrance is cancelled or disabled", async ({ page }) => {
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.goto("/test/browser/overlay.html");
	const badge = page.getByText("iXeDay SimoHz", { exact: true }).locator("..");
	await badge.evaluate((e) => {
		for (const animation of e.getAnimations()) animation.cancel();
	});
	await expect.poll(() => badge.evaluate((e) => getComputedStyle(e).opacity)).toBe("1");
	await page.addStyleTag({ content: ".overlay-author-badge { animation: none !important; }" });
	await page.reload();
	await page.addStyleTag({ content: ".overlay-author-badge { animation: none !important; }" });
	await expect.poll(() => badge.evaluate((e) => getComputedStyle(e).opacity)).toBe("1");
});

for (const reducedMotion of ["no-preference", "reduce"] as const) {
	test(`every reaction renders and completes at fade bounds (${reducedMotion})`, async ({
		page,
	}) => {
		const errors: string[] = [];
		page.on("pageerror", (error) => errors.push(error.message));
		await page.emulateMedia({ reducedMotion });
		await page.goto("/test/browser/overlay.html?reactions");
		const reactions = page.locator("#root > .fixed > .absolute");
		await expect(reactions).toHaveCount(6);
		await expect
			.poll(() =>
				reactions.evaluateAll(
					(nodes) => nodes.filter((e) => Number(getComputedStyle(e).opacity) > 0).length,
				),
			)
			.toBe(6);
		await expect(reactions).toHaveCount(0);
		expect(errors).toEqual([]);
	});
}

for (const position of ["center", "top", "bottom", "bottom-left"]) {
	for (const viewport of [
		{ width: 1920, height: 1080 },
		{ width: 1440, height: 900 },
	]) {
		test(`tall media keeps the author badge on screen (${position}, ${viewport.width}×${viewport.height})`, async ({
			page,
		}) => {
			await page.emulateMedia({ reducedMotion: "reduce" });
			await page.setViewportSize(viewport);
			await page.goto(`/test/browser/overlay.html?portrait&background&position=${position}`);
			const badge = page.getByText("iXeDay SimoHz", { exact: true }).locator("..");
			await expect(badge).toBeVisible();
			// The avatar is an <img> too: the media is the last one.
			const media = page.locator("#display img").last();
			await expect(media).toBeVisible();
			await expect.poll(() => media.evaluate((e) => (e as HTMLImageElement).complete)).toBe(true);
			const bounds = await badge.evaluate((e) => {
				const images = document.querySelectorAll("#display img");
				const content = images[images.length - 1];
				if (!content) throw new Error("Missing media");
				const probe = document.getElementById("badge-height-probe");
				if (!probe) throw new Error("Missing badge height probe");
				return {
					badgeTop: e.getBoundingClientRect().top,
					badgeHeight: e.getBoundingClientRect().height,
					reservedBadgeHeight: probe.getBoundingClientRect().height,
					mediaBottom: content.getBoundingClientRect().bottom,
					height: innerHeight,
				};
			});
			// The height cap must reserve what the badge really renders.
			expect(Math.abs(bounds.badgeHeight - bounds.reservedBadgeHeight)).toBeLessThanOrEqual(1);
			expect(bounds.badgeTop).toBeGreaterThanOrEqual(0);
			expect(bounds.mediaBottom).toBeLessThanOrEqual(bounds.height);
		});
	}
}
