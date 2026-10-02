export const RELEASE_FALLBACK_URL = "https://github.com/SimonHazard/MemeOver/releases/latest";
export interface ReleaseAsset {
	url: string;
	size: number;
}
export interface LatestRelease {
	version: string;
	assets: {
		windowsExe: ReleaseAsset;
		windowsMsi: ReleaseAsset;
		macDmg: ReleaseAsset;
		linuxAppImage: ReleaseAsset;
		linuxDeb: ReleaseAsset;
		linuxRpm: ReleaseAsset;
	};
}
const patterns = {
	windowsExe: /_x64-setup\.exe$/,
	windowsMsi: /_x64_en-US\.msi$/,
	macDmg: /_universal\.dmg$/,
	linuxAppImage: /_amd64\.AppImage$/,
	linuxDeb: /_amd64\.deb$/,
	linuxRpm: /-1\.x86_64\.rpm$/,
};
export function matchReleaseAssets(value: unknown): LatestRelease | null {
	if (!value || typeof value !== "object") return null;
	const release = value as Record<string, unknown>;
	if (
		release.draft ||
		release.prerelease ||
		typeof release.tag_name !== "string" ||
		!/^app-v\d+\.\d+\.\d+$/.test(release.tag_name) ||
		!Array.isArray(release.assets)
	)
		return null;
	const assets = {} as LatestRelease["assets"];
	for (const key of Object.keys(patterns) as (keyof typeof patterns)[]) {
		const asset = release.assets.find(
			(a: unknown) =>
				a &&
				typeof a === "object" &&
				"name" in a &&
				typeof a.name === "string" &&
				patterns[key].test(a.name),
		);
		if (
			!asset ||
			typeof asset.browser_download_url !== "string" ||
			!asset.browser_download_url.startsWith(
				"https://github.com/SimonHazard/MemeOver/releases/download/",
			) ||
			typeof asset.size !== "number" ||
			!Number.isFinite(asset.size) ||
			asset.size < 0
		)
			return null;
		assets[key] = { url: asset.browser_download_url, size: asset.size };
	}
	return { version: release.tag_name.slice(5), assets };
}
export async function fetchLatestRelease(
	fetcher: typeof fetch = fetch,
	token = process.env.GITHUB_TOKEN,
): Promise<LatestRelease | null> {
	try {
		const response = await fetcher(
			"https://api.github.com/repos/SimonHazard/MemeOver/releases/latest",
			{
				headers: {
					Accept: "application/vnd.github+json",
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				signal: AbortSignal.timeout(3000),
			},
		);
		return response.ok ? matchReleaseAssets(await response.json()) : null;
	} catch {
		return null;
	}
}
let release: Promise<LatestRelease | null> | undefined;
/** Shared across pages of a single static build, never included in a client island. */
export function latestRelease() {
	if (!release) release = fetchLatestRelease();
	return release;
}
export function formatAssetSize(bytes: number): string {
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
