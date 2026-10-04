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
				title: "One-paste setup",
				description: "Run /memeover setup and paste the connection code into the app.",
			},
			{
				icon: "image",
				title: "Images, GIFs & stickers",
				description:
					"Discord stickers and GIFs, including video-backed gifv, land alongside images, video and audio.",
			},
			{
				icon: "message",
				title: "Anonymous memes",
				description: "Use /memeover secret to send a meme without displaying your author badge.",
			},
			{
				icon: "message",
				title: "Text & reactions",
				description: "Short messages and floating reactions keep the conversation on screen.",
			},
			{
				icon: "sliders",
				title: "Placement that fits",
				description: "Choose position, size, opacity, duration and sound for your screen.",
			},
			{
				icon: "layers",
				title: "Reusable profiles",
				description: "Save and share overlay styles without sharing connection credentials.",
			},
			{
				icon: "monitor",
				title: "Tray & multi-screen",
				description: "Start in the tray on login and choose the display for your overlay.",
			},
			{
				icon: "history",
				title: "History & replay",
				description:
					"Find the last 50 displayed items and replay them while their media is available.",
			},
			{
				icon: "layers",
				title: "Your own bot",
				description:
					"The in-app Server tab helps you install, configure and run your bot instance.",
			},
			{
				icon: "refresh",
				title: "Automatic updates",
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
			{
				question: "Can I host the bot myself?",
				answer:
					"Yes. Use the desktop app’s Server tab to install and run your own instance, or follow the Docker guide.",
			},
			{
				question: "Can I send a meme anonymously?",
				answer:
					"Use /memeover secret. The overlay hides the author badge; this is not anonymity from Discord or the bot operator.",
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
	commands: {
		title: "Discord commands",
		description:
			"Configure your server and send memes from Discord. Server management commands require Manage Server.",
		commandLabel: "Command",
		accessLabel: "Who can use it",
		descriptionLabel: "What it does",
		items: [
			{
				name: "/memeover setup",
				description: "Register the server; omit the channel to watch all channels.",
				access: "Manage Server",
				published: true,
			},
			{
				name: "/memeover token",
				description: "Show credentials and a setup code privately.",
				access: "Everyone",
				published: true,
			},
			{
				name: "/memeover rotate",
				description: "Confirm and regenerate the connection token.",
				access: "Manage Server",
				published: true,
			},
			{
				name: "/memeover remove",
				description: "Confirm and unregister the server.",
				access: "Manage Server",
				published: true,
			},
			{
				name: "/memeover bots",
				description: "Allow or mute messages and reactions from bots and apps.",
				access: "Manage Server",
				published: true,
			},
			{
				name: "/memeover secret",
				description: "Send media anonymously to connected overlays.",
				access: "Everyone",
				published: true,
			},
			{
				name: "/memeover status",
				description: "Show configuration, watched channels and connected overlays.",
				access: "Manage Server",
				published: true,
			},
			{
				name: "/memeover pause",
				description: "Pause broadcasts.",
				access: "Manage Server",
				published: false,
			},
			{
				name: "/memeover resume",
				description: "Resume broadcasts.",
				access: "Manage Server",
				published: false,
			},
			{
				name: "/memeover help",
				description: "List available commands.",
				access: "Everyone",
				published: true,
			},
		],
	},
	selfHost: {
		title: "Run your own bot",
		description: "Choose the in-app assistant or run the repository with Docker.",
		appTitle: "From the desktop app",
		appSteps: [
			"Open the Server tab and choose an installation folder.",
			"Install the bot and Bun if needed.",
			"Create a Discord application, paste its application ID and bot token, and enable Message Content Intent in the Developer Portal.",
			"Invite the bot, save the configuration, start it and check its status.",
			"Run /memeover setup in Discord and use the connection code to connect your friends.",
		],
		dockerTitle: "With Docker",
		dockerNote:
			"Clone the repository. Copy bot/.env.example to .env at the repository root, fill in DISCORD_TOKEN and DISCORD_CLIENT_ID, and enable Message Content Intent. Configure PUBLIC_WS_URL with an address your friends can reach. Keep tokens private.",
		guideLabel: "Full setup guide",
	},
	changelog: {
		title: "Changelog",
		description:
			"Release history from the project repository. Release entries are maintained in English.",
	},
	menu: { toggle: "Toggle menu", label: "Main navigation" },
	notFound: {
		title: "404",
		description: "This page doesn't exist. It probably wandered off to find some memes.",
		backHome: "Back to home",
	},
} as const;

// DeepString<T> : remplace tous les types littéraux string par string.
// Nécessaire pour que fr.ts puisse satisfaire le type sans reproduire
// les valeurs anglaises exactes (ce que as const forcerait sinon).
type DeepString<T> = T extends string
	? string
	: T extends ReadonlyArray<infer U>
		? ReadonlyArray<DeepString<U>>
		: T extends object
			? { [K in keyof T]: DeepString<T[K]> }
			: T;

export type Translations = DeepString<typeof en>;
