import { expect, test } from "bun:test";
import { requestSettingsClose, settingsCloseRequests } from "./settings-close";

test("native close hides the window when no form blocks it", async () => {
	let hidden = false;
	await requestSettingsClose(async () => {
		hidden = true;
	});
	expect(hidden).toBe(true);
});

test("unsaved edits intercept closure; removing the guard restores closure", async () => {
	let hides = 0;
	const guard = (event: Event) => event.preventDefault();
	settingsCloseRequests.addEventListener("close", guard);
	try {
		await requestSettingsClose(async () => {
			hides++;
		});
		expect(hides).toBe(0);
	} finally {
		settingsCloseRequests.removeEventListener("close", guard);
	}
	await requestSettingsClose(async () => {
		hides++;
	});
	expect(hides).toBe(1);
});

test("close completion waits for the native hide operation", async () => {
	let finish!: () => void;
	let completed = false;
	const pending = requestSettingsClose(
		() =>
			new Promise<void>((resolve) => {
				finish = resolve;
			}),
	).then(() => {
		completed = true;
	});
	expect(completed).toBe(false);
	finish();
	await pending;
	expect(completed).toBe(true);
});
