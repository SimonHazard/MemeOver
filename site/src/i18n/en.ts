export const en = {
	meta: {
		title: "MemeOver — Send memes to your friends' screen, live from Discord",
		description:
			"MemeOver brings Discord images, GIFs, videos, audio, reactions and text directly onto your friends' screens with a customizable desktop overlay.",
		imageAlt: "MemeOver desktop overlay for Discord memes, GIFs, videos, audio and reactions.",
	},
	nav: {
		howItWorks: "How it works",
		useCases: "Use cases",
		features: "Features",
		download: "Download",
		github: "GitHub",
	},
	hero: {
		badge: "Open Source",
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
	useCases: {
		kicker: "Built for shared screens",
		title: "A Discord overlay for the moments your group already creates",
		description:
			"MemeOver keeps the joke inside Discord while making it visible on every connected desktop, with controls that keep the overlay fun instead of disruptive.",
		items: [
			{
				icon: "gamepad",
				title: "Game nights",
				description:
					"Drop reactions, GIFs and quick messages onto the match without asking everyone to alt-tab.",
			},
			{
				icon: "party",
				title: "Watch parties",
				description:
					"Let friends send memes, sound bites and comments that appear live while the group watches together.",
			},
			{
				icon: "broadcast",
				title: "Streaming setups",
				description:
					"Use a lightweight desktop overlay for Discord media without rebuilding your whole streaming scene.",
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
		description:
			"Download the MemeOver desktop app for your platform, then invite the Discord bot when your server is ready.",
		windows: "Windows",
		windowsFormats: ".exe / .msi",
		macos: "macOS",
		macosFormats: ".dmg",
		linux: "Linux",
		linuxFormats: ".AppImage / .deb",
		allReleases: "All releases →",
	},
	faq: {
		kicker: "Questions",
		title: "MemeOver FAQ",
		items: [
			{
				question: "What is MemeOver?",
				answer:
					"MemeOver is an open-source Discord overlay that sends images, GIFs, videos, audio clips, reactions and short text from a Discord channel to connected desktop screens.",
			},
			{
				question: "Do all friends need the desktop app?",
				answer:
					"Yes. Each friend who wants to see media on their screen installs the desktop app, while the shared Discord server uses the MemeOver bot to receive media.",
			},
			{
				question: "Can I control where media appears?",
				answer:
					"Yes. MemeOver includes placement, size, opacity, duration, sound, profiles, history and replay controls so each person can tune the overlay for their own setup.",
			},
		],
	},
	openSource: {
		title: "Open Source",
		description:
			"MemeOver is open source under the MIT license. You can inspect it, host it yourself, report issues and shape what comes next.",
		viewOnGithub: "View on GitHub",
		reportBug: "Report a bug",
		supportOnKofi: "Support on Ko-fi",
		contribute:
			"Fork the repo, open a PR — every contribution matters. Check out the issues for ideas!",
	},
	footer: {
		madeWith: "Made with ❤️ by",
		author: "Simon Hazard",
		license: "MIT License",
		legal: "Terms & privacy",
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
