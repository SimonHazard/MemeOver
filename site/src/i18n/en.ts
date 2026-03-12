export const en = {
	meta: {
		title: "MemeOver — Send memes to your friends' screen, live from Discord",
		description:
			"MemeOver is a desktop overlay app that displays images, GIFs, videos and text sent from Discord directly on your friends' screens. Open source, self-hostable, multi-platform.",
	},
	nav: {
		features: "Features",
		download: "Download",
		github: "GitHub",
	},
	hero: {
		badge: "Beta · Open Source",
		title: "MemeOver",
		tagline: "Send memes to your friends' screen, live from Discord.",
		description:
			"A desktop overlay app that pops up images, GIFs, videos and text from a Discord channel — straight onto your friends' screens in real-time.",
		cta_download: "Download",
		cta_invite: "Invite Bot",
	},
	howItWorks: {
		title: "How it works",
		steps: [
			{
				icon: "bot",
				title: "Install the bot",
				description: "Add the MemeOver bot to your Discord server with one click.",
			},
			{
				icon: "download",
				title: "Get the app",
				description: "Download MemeOver and connect it to your Discord server.",
			},
			{
				icon: "send",
				title: "Send media",
				description: "Drop an image, GIF, video, or text in the dedicated Discord channel.",
			},
			{
				icon: "sparkles",
				title: "Surprise!",
				description:
					"The media appears as an overlay on your friends' screen — instant reactions guaranteed!",
			},
		],
	},
	features: {
		title: "Features",
		items: [
			{
				icon: "image",
				title: "All media types",
				description: "Images, GIFs, videos, audio, and text — everything goes through.",
			},
			{
				icon: "move",
				title: "Custom position",
				description: "Place the overlay wherever you want on screen.",
			},
			{
				icon: "timer",
				title: "Display duration",
				description: "Configure how long each media stays on screen.",
			},
			{
				icon: "moon",
				title: "Dark & Light mode",
				description: "The app follows your system theme — or pick your own.",
			},
			{
				icon: "refresh",
				title: "Auto-update",
				description: "Always up to date with built-in automatic updates.",
			},
			{
				icon: "code",
				title: "Open source",
				description: "MIT licensed, self-hostable, and community-driven.",
			},
			{
				icon: "monitor",
				title: "Multi-platform",
				description: "Available on Windows, macOS, and Linux.",
			},
		],
	},
	download: {
		title: "Download",
		description:
			"MemeOver is available for Windows, macOS, and Linux. Grab the latest release from GitHub.",
		windows: "Windows",
		windowsFormats: ".exe / .msi",
		macos: "macOS",
		macosFormats: ".dmg",
		linux: "Linux",
		linuxFormats: ".AppImage / .deb",
		allReleases: "All releases →",
	},
	openSource: {
		title: "Open Source",
		description:
			"MemeOver is fully open source under the MIT license. Contributions, bug reports, and feature requests are welcome!",
		viewOnGithub: "View on GitHub",
		reportBug: "Report a bug",
		contribute:
			"Fork the repo, open a PR — every contribution matters. Check out the issues for ideas!",
	},
	footer: {
		madeWith: "Made with ❤️ by",
		author: "Simon Hazard",
		license: "MIT License",
	},
	notFound: {
		title: "404",
		description: "This page doesn't exist. It probably wandered off to find some memes.",
		backHome: "Back to home",
	},
} as const;

// DeepString<T> : remplace tous les types littéraux string par string.
// Nécessaire pour que fr.ts puisse satisfaire le type sans reproduire
// les valeurs anglaises exactes (ce que as const forcerait sinon).
type DeepString<T> = {
	[K in keyof T]: T[K] extends string
		? string
		: T[K] extends ReadonlyArray<infer U>
			? ReadonlyArray<DeepString<U>>
			: DeepString<T[K]>;
};

export type Translations = DeepString<typeof en>;
