import { expect, type Page, test } from "@playwright/test";
import { CURRENT_SCHEMA_VERSION } from "../../app/src/shared/types";
import { installDesktopStub } from "./desktop-stub";

// The desktop overlay and the browser source must look the same. This opens both real pages,
// sends them the same message with the same display settings and compares what they rendered.

const guildId = "123456789012345678";
const token = "parity-test-token";
const wsUrl = "ws://parity.test/ws";
const imageUrl = "https://media.parity.test/meme.svg";
const image =
	'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#777"/></svg>';

const styled = {
	duration: 30,
	mediaSize: 60,
	mediaOpacity: 90,
	textSize: 28,
	textColor: "#ffcc00",
	bgEnabled: true,
	bgColor: "#112233",
	bgOpacity: 80,
	bgBorderColor: "#ff00aa",
	bgBorderOpacity: 90,
	bgBorderWidth: 3,
	bgBorderRadius: 12,
	bgPadding: 10,
	connectionNotificationsEnabled: false,
};
const author = {
	guild_id: guildId,
	channel_id: "1",
	message_id: "1",
	author_id: "2",
	author_username: "Streamer",
	author_avatar_url: "",
	timestamp: 1,
};
const media = { ...author, type: "MEDIA", media_url: imageUrl, media_type: "image" };

const cases = [
	{ name: "default settings", profile: { duration: 30 }, message: media },
	{
		name: "a media smaller than its box, shown at its natural size",
		profile: { duration: 30, mediaSize: 90 },
		message: media,
	},
	{
		name: "a media with a background and a caption below it",
		profile: { ...styled, textPosition: "below" },
		message: { ...media, text: "Example caption" },
	},
	{
		name: "a media with a caption over it",
		profile: { ...styled, textPosition: "overlay-bottom" },
		message: { ...media, text: "Example caption" },
	},
	{
		name: "a text message",
		profile: styled,
		message: { ...author, type: "TEXT", text: "Example message" },
	},
];

async function serveBotAndMedia(page: Page, message: unknown) {
	await page.route(imageUrl, (route) =>
		route.fulfill({ contentType: "image/svg+xml", body: image }),
	);
	await page.routeWebSocket(wsUrl, (ws) => {
		ws.onMessage((raw) => {
			if (JSON.parse(String(raw)).type !== "JOIN") return;
			ws.send(JSON.stringify({ type: "JOIN_ACK", guild_id: guildId, success: true }));
			ws.send(JSON.stringify(message));
		});
	});
}

async function openDesktopOverlay(page: Page, profile: object, message: unknown) {
	await serveBotAndMedia(page, message);
	await installDesktopStub(page, {
		...profile,
		schemaVersion: CURRENT_SCHEMA_VERSION,
		guildId,
		token,
		wsUrl,
		clientId: "parity-install-id",
	});
	await page.goto("/overlay.html");
}

async function openBrowserSource(
	page: Page,
	profile: object,
	message: unknown,
	referenceSize: number,
) {
	await serveBotAndMedia(page, message);
	await page.addInitScript(() => {
		HTMLMediaElement.prototype.play = () => Promise.resolve();
	});
	const encodedProfile = Buffer.from(JSON.stringify(profile)).toString("base64url");
	const params = new URLSearchParams({
		g: guildId,
		t: token,
		w: wsUrl,
		p: encodedProfile,
		r: String(referenceSize),
	});
	await page.goto(`/browser-source.html#${params}`);
}

interface Rendered {
	tag: string;
	className: string;
	text: string;
	box: number[];
	styles: Record<string, string>;
}

/** Every computed property and box of the page shell and the stage, minus the dev-only badge. */
function readRendering(page: Page): Promise<Rendered[]> {
	return page.evaluate(() => {
		const root = document.querySelector("#root") as Element;
		const shell = [document.documentElement, document.body, root];
		const stage = [...root.querySelectorAll("*")].filter(
			(element) => !element.textContent?.startsWith("DEV") || element.children.length > 0,
		);
		return [...shell, ...stage].map((element) => {
			const computed = getComputedStyle(element);
			const box = element.getBoundingClientRect();
			return {
				tag: element.tagName,
				className: element === document.documentElement ? "" : String(element.className),
				text: element.children.length === 0 ? (element.textContent ?? "") : "",
				box: [box.x, box.y, box.width, box.height],
				styles: Object.fromEntries(
					[...computed].map((property) => [property, computed.getPropertyValue(property)]),
				),
			};
		});
	});
}

/** Waits for entrance animations and fonts: two readings in a row must agree. */
async function settledRendering(page: Page) {
	await page.evaluate(() => document.fonts.ready.then(() => undefined));
	let previous = "";
	await expect
		.poll(
			async () => {
				const current = JSON.stringify(await readRendering(page));
				const stable = current === previous;
				previous = current;
				return stable;
			},
			{ intervals: [300], timeout: 10_000 },
		)
		.toBe(true);
	return JSON.parse(previous) as Rendered[];
}

function describeDifferences(desktop: Rendered[], source: Rendered[]) {
	const differences: string[] = [];
	if (desktop.length !== source.length) {
		differences.push(`${desktop.length} elements on desktop, ${source.length} on stream`);
	}
	desktop.slice(0, source.length).forEach((element, index) => {
		const other = source[index];
		const name = `#${index} <${element.tag}>`;
		for (const key of ["tag", "className", "text"] as const) {
			if (element[key] !== other[key]) {
				differences.push(`${name} ${key}: ${element[key]} / ${other[key]}`);
			}
		}
		if (String(element.box) !== String(other.box)) {
			differences.push(`${name} box: ${element.box} / ${other.box}`);
		}
		for (const [property, value] of Object.entries(element.styles)) {
			if (other.styles[property] !== value) {
				differences.push(`${name} ${property}: ${value} / ${other.styles[property]}`);
			}
		}
	});
	return differences;
}

function readStylesheets(page: Page) {
	return page.evaluate(() =>
		[...document.styleSheets]
			.flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText))
			.join("\n"),
	);
}

async function waitForMessage(page: Page, message: { type: string }) {
	const onPage = message.type === "TEXT" ? "Example message" : "Streamer";
	await expect(page.getByText(onPage).locator("visible=true").first()).toBeVisible();
}

for (const { name, profile, message } of cases) {
	test(`the stream renders ${name} exactly like the desktop overlay`, async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
		try {
			const desktop = await context.newPage();
			const source = await context.newPage();
			await openDesktopOverlay(desktop, profile, message);
			await openBrowserSource(source, profile, message, 1080);
			await waitForMessage(desktop, message);
			await waitForMessage(source, message);

			expect(await readStylesheets(source)).toBe(await readStylesheets(desktop));
			expect(
				describeDifferences(await settledRendering(desktop), await settledRendering(source)),
			).toEqual([]);
		} finally {
			await context.close();
		}
	});

	// A 1080p screen at 125 % gives the desktop 1536 × 864 CSS pixels; a 1440p one at 100 % gives 2560 × 1440.
	for (const { width, height, scale } of [
		{ width: 1536, height: 864, scale: 1.25 },
		{ width: 2560, height: 1440, scale: 0.75 },
	]) {
		test(`a 1080p stream keeps the proportions of a ${width} × ${height} desktop for ${name}`, async ({
			browser,
		}) => {
			const desktopContext = await browser.newContext({ viewport: { width, height } });
			const sourceContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
			try {
				const desktop = await desktopContext.newPage();
				const source = await sourceContext.newPage();
				await openDesktopOverlay(desktop, profile, message);
				await openBrowserSource(source, profile, message, height);
				await waitForMessage(desktop, message);
				await waitForMessage(source, message);

				const desktopElements = await settledRendering(desktop);
				const sourceElements = await settledRendering(source);
				expect(sourceElements.length).toBe(desktopElements.length);
				// Shadows and rounding may move a box slightly; a visible drift may not.
				const TOLERANCE_PX = 2;
				const drifts = desktopElements.flatMap((element, index) =>
					element.box
						.map((value, side) => Math.abs(value * scale - sourceElements[index].box[side]))
						.filter((drift) => drift > TOLERANCE_PX)
						.map((drift) => `#${index} <${element.tag}> "${element.text}" is off by ${drift}px`),
				);
				expect(drifts).toEqual([]);
				const fontSizes = (elements: Rendered[]) =>
					elements
						.filter((element) => element.text.length > 0)
						.map((element) => Number.parseFloat(element.styles["font-size"]));
				const expected = fontSizes(desktopElements).map((size) => size * scale);
				fontSizes(sourceElements).forEach((size, index) => {
					expect(Math.abs(size - expected[index])).toBeLessThan(1);
				});
			} finally {
				await desktopContext.close();
				await sourceContext.close();
			}
		});
	}
}

test("a resized source adapts its fixed sizes", async ({ browser }) => {
	const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
	try {
		const source = await context.newPage();
		await openBrowserSource(source, styled, media, 864);
		await waitForMessage(source, media);
		const rootFontSize = () =>
			source.evaluate(() => getComputedStyle(document.documentElement).fontSize);
		await expect.poll(rootFontSize).toBe("20px");
		await source.setViewportSize({ width: 1536, height: 864 });
		await expect.poll(rootFontSize).toBe("16px");
	} finally {
		await context.close();
	}
});
