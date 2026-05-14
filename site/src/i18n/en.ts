export const en = {
	meta: {
		title: "MemeOver — Send memes to your friends' screen, live from Discord",
		description:
			"MemeOver brings Discord images, GIFs, videos, audio, reactions and text directly onto your friends' screens with a customizable desktop overlay.",
		keywords:
			"MemeOver, Discord overlay, meme overlay, Discord memes, desktop overlay, Tauri app, stream overlay, gaming overlay",
	},
	nav: {
		features: "Features",
		download: "Download",
		github: "GitHub",
	},
	hero: {
		badge: "Version 1.0 · Open Source",
		title: "MemeOver",
		tagline: "Send memes to your friends' screen, live from Discord.",
		description:
			"Turn a Discord channel into a shared live overlay for images, GIFs, videos, audio, reactions and text. MemeOver is built for game nights, watch parties and friend groups that like a little controlled chaos.",
		cta_download: "Download",
		cta_invite: "Invite Bot",
	},
	howItWorks: {
		title: "How it works",
		steps: [
			{
				icon: "bot",
				title: "Install the bot",
				description: "Add MemeOver to the Discord server where your group already hangs out.",
			},
			{
				icon: "download",
				title: "Get the app",
				description: "Each friend installs the desktop app and joins the shared overlay.",
			},
			{
				icon: "send",
				title: "Send media",
				description: "Drop an image, GIF, video, audio clip, reaction or message in Discord.",
			},
			{
				icon: "sparkles",
				title: "Watch it land",
				description:
					"Everyone sees it appear on screen with timing, placement and replay controls.",
			},
		],
	},
	features: {
		title: "Features",
		items: [
			{
				icon: "zap",
				title: "Live Discord Delivery",
				description:
					"What lands in the Discord channel shows up on connected screens moments later.",
			},
			{
				icon: "image",
				title: "Images, GIFs, Video & Audio",
				description: "Send the formats your group actually uses without switching tools.",
			},
			{
				icon: "message",
				title: "Text & Reactions",
				description: "Short messages and floating reactions give the overlay more personality.",
			},
			{
				icon: "sliders",
				title: "Placement That Fits",
				description: "Choose position, size, opacity, duration and sound for your own screen.",
			},
			{
				icon: "layers",
				title: "Reusable Profiles",
				description:
					"Save different overlay styles for gaming, watching, streaming or quiet sessions.",
			},
			{
				icon: "monitor",
				title: "Multi-Screen Friendly",
				description: "Pick where the overlay appears when your setup has more than one display.",
			},
			{
				icon: "history",
				title: "History & Replay",
				description: "Missed the joke? Open the history and replay a previous media drop.",
			},
			{
				icon: "refresh",
				title: "Automatic Updates",
				description: "Stay current without hunting for installers after every release.",
			},
		],
	},
	download: {
		title: "Download",
		description: "Get MemeOver 1.0 for your platform and invite the bot when your server is ready.",
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
			"MemeOver is open source under the MIT license. You can inspect it, host it yourself, report issues and shape what comes next.",
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
