import { expect, test } from "bun:test";
import {
	APP_CAPTURE_VERIFIED,
	guideAudioRoutes,
	OBS_APP_AUDIO_CAPTURE_GUIDE_URL,
	OBS_OVERLAY_WINDOW_TITLE,
	VB_CABLE_URL,
} from "./stream-guide";

test("the copied window title matches the overlay window built in Rust", async () => {
	const lib = await Bun.file(new URL("../../src-tauri/src/lib.rs", import.meta.url)).text();
	const overlayBuilder = lib.slice(lib.indexOf('WebviewWindowBuilder::new(app, "overlay"'));
	const title = /\.title\("([^"]+)"\)/.exec(overlayBuilder)?.[1];

	expect(title).toBe(OBS_OVERLAY_WINDOW_TITLE);
});

test("the simple Desktop Audio route always comes first", () => {
	expect(guideAudioRoutes(false)).toEqual(["desktop-audio", "virtual-cable"]);
	expect(guideAudioRoutes(true)).toEqual(["desktop-audio", "app-capture", "virtual-cable"]);
});

test("unverified Application Audio Capture is not offered", () => {
	expect(APP_CAPTURE_VERIFIED).toBe(false);
	expect(guideAudioRoutes(APP_CAPTURE_VERIFIED)).not.toContain("app-capture");
});

test("guide links open over HTTPS, which the default opener scope allows", () => {
	for (const url of [OBS_APP_AUDIO_CAPTURE_GUIDE_URL, VB_CABLE_URL]) {
		expect(new URL(url).protocol).toBe("https:");
	}
});
