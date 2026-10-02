import { expect, test } from "bun:test";
import { fetchLatestRelease, matchReleaseAssets } from "./latest-release";

const names = [
	"memeover_1.4.4_x64-setup.exe",
	"memeover_1.4.4_x64_en-US.msi",
	"memeover_1.4.4_universal.dmg",
	"memeover_1.4.4_amd64.AppImage",
	"memeover_1.4.4_amd64.deb",
	"memeover-1.4.4-1.x86_64.rpm",
];
const release = {
	tag_name: "app-v1.4.4",
	draft: false,
	prerelease: false,
	assets: names.map((name) => ({
		name,
		size: 1024,
		browser_download_url: `https://github.com/SimonHazard/MemeOver/releases/download/app-v1.4.4/${name}`,
	})),
};
test("matches the six published installer formats, excluding updater files", () => {
	expect(matchReleaseAssets(release)?.version).toBe("1.4.4");
	expect(matchReleaseAssets(release)?.assets.windowsExe.url).toEndWith("x64-setup.exe");
	expect(matchReleaseAssets(release)?.assets.linuxRpm.url).toEndWith("x86_64.rpm");
	expect(matchReleaseAssets({ ...release, assets: release.assets.slice(1) })).toBeNull();
});
test("malformed, draft and non-app releases safely fall back", () => {
	for (const value of [
		null,
		{},
		{ ...release, draft: true },
		{ ...release, tag_name: "bot-v1.0.0" },
		{
			...release,
			assets: release.assets.map((a) => ({
				...a,
				browser_download_url: "https://evil.test/download",
			})),
		},
	])
		expect(matchReleaseAssets(value)).toBeNull();
});
test("network and API errors safely fall back", async () => {
	const offline = (() => Promise.reject(new Error("offline"))) as typeof fetch;
	const limited = (() =>
		Promise.resolve(new Response("rate limited", { status: 403 }))) as typeof fetch;
	expect(await fetchLatestRelease(offline, undefined)).toBeNull();
	expect(await fetchLatestRelease(limited, undefined)).toBeNull();
});
