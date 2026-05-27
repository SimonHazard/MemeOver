import type { Translations } from "./en";

export const fr: Translations = {
	meta: {
		title: "MemeOver — Envoie des mèmes sur l'écran de tes amis, en direct depuis Discord",
		description:
			"MemeOver affiche les images, GIFs, vidéos, sons, réactions et textes Discord directement sur l'écran de tes amis avec un overlay desktop personnalisable.",
		imageAlt: "Overlay desktop MemeOver pour mèmes, GIFs, vidéos, sons et réactions Discord.",
	},
	nav: {
		howItWorks: "Comment ça marche",
		useCases: "Usages",
		features: "Fonctionnalités",
		download: "Télécharger",
		github: "GitHub",
	},
	hero: {
		badge: "Version 1.1 · Open Source",
		title: "MemeOver",
		tagline: "Envoie des mèmes sur l'écran de tes amis, en direct depuis Discord.",
		description:
			"Transforme un salon Discord en overlay partagé pour images, GIFs, vidéos, sons, réactions et textes. MemeOver est pensé pour les soirées jeu, les watch parties et les groupes qui aiment le chaos bien réglé.",
		cta_download: "Télécharger",
		cta_invite: "Inviter le Bot",
	},
	howItWorks: {
		title: "Comment ça marche",
		steps: [
			{
				icon: "bot",
				title: "Installe le bot",
				description: "Ajoute MemeOver au serveur Discord où ton groupe se retrouve déjà.",
			},
			{
				icon: "download",
				title: "Télécharge l'app",
				description: "Chaque ami installe l'app desktop et rejoint l'overlay partagé.",
			},
			{
				icon: "send",
				title: "Envoie un média",
				description:
					"Balance une image, un GIF, une vidéo, un son, une réaction ou un message dans Discord.",
			},
			{
				icon: "sparkles",
				title: "Regarde l'effet",
				description:
					"Tout le monde le voit apparaître à l'écran, avec contrôle du timing, du placement et du replay.",
			},
		],
	},
	useCases: {
		kicker: "Pensé pour les écrans partagés",
		title: "Un overlay Discord pour les moments que ton groupe crée déjà",
		description:
			"MemeOver garde la blague dans Discord tout en l'affichant sur chaque app desktop connectée, avec des réglages pour rester fun sans devenir envahissant.",
		items: [
			{
				icon: "gamepad",
				title: "Soirées jeu",
				description:
					"Envoie réactions, GIFs et messages courts pendant la partie sans demander à tout le monde d'alt-tab.",
			},
			{
				icon: "party",
				title: "Watch parties",
				description:
					"Laisse tes amis envoyer mèmes, sons et commentaires qui apparaissent en direct pendant que le groupe regarde ensemble.",
			},
			{
				icon: "broadcast",
				title: "Setups streaming",
				description:
					"Utilise un overlay desktop léger pour les médias Discord sans reconstruire toute ta scène de stream.",
			},
		],
	},
	features: {
		title: "Fonctionnalités",
		items: [
			{
				icon: "zap",
				title: "Envoi Live Depuis Discord",
				description:
					"Ce qui arrive dans le salon Discord apparaît sur les écrans connectés juste après.",
			},
			{
				icon: "image",
				title: "Images, GIFs, Vidéos & Sons",
				description: "Envoie les formats que ton groupe utilise vraiment, sans changer d'outil.",
			},
			{
				icon: "message",
				title: "Textes & Réactions",
				description:
					"Les messages courts et réactions flottantes donnent plus de caractère à l'overlay.",
			},
			{
				icon: "sliders",
				title: "Placement Sur Mesure",
				description: "Choisis position, taille, opacité, durée et son pour ton propre écran.",
			},
			{
				icon: "layers",
				title: "Profils Réutilisables",
				description:
					"Sauvegarde plusieurs styles d'overlay pour jouer, regarder, streamer ou rester discret.",
			},
			{
				icon: "monitor",
				title: "Pensé Multi-Écran",
				description:
					"Choisis où l'overlay apparaît quand ta configuration utilise plusieurs écrans.",
			},
			{
				icon: "history",
				title: "Historique & Replay",
				description: "Tu as raté la blague ? Ouvre l'historique et rejoue un média reçu.",
			},
			{
				icon: "refresh",
				title: "Mises à Jour Automatiques",
				description: "Reste à jour sans chercher un nouvel installateur à chaque version.",
			},
		],
	},
	download: {
		title: "Télécharger",
		description:
			"Télécharge l'app desktop MemeOver pour ta plateforme, puis invite le bot Discord quand ton serveur est prêt.",
		windows: "Windows",
		windowsFormats: ".exe / .msi",
		macos: "macOS",
		macosFormats: ".dmg",
		linux: "Linux",
		linuxFormats: ".AppImage / .deb",
		allReleases: "Toutes les versions →",
	},
	faq: {
		kicker: "Questions",
		title: "FAQ MemeOver",
		items: [
			{
				question: "C'est quoi MemeOver ?",
				answer:
					"MemeOver est un overlay Discord open source qui envoie images, GIFs, vidéos, sons, réactions et textes courts depuis un salon Discord vers les écrans desktop connectés.",
			},
			{
				question: "Est-ce que chaque ami doit installer l'app desktop ?",
				answer:
					"Oui. Chaque ami qui veut voir les médias sur son écran installe l'app desktop, tandis que le serveur Discord partagé utilise le bot MemeOver pour recevoir les médias.",
			},
			{
				question: "Est-ce que je peux contrôler où les médias apparaissent ?",
				answer:
					"Oui. MemeOver propose placement, taille, opacité, durée, son, profils, historique et replay pour adapter l'overlay à chaque configuration.",
			},
		],
	},
	openSource: {
		title: "Open Source",
		description:
			"MemeOver est open source sous licence MIT. Tu peux l'inspecter, l'auto-héberger, signaler des problèmes et aider à choisir la suite.",
		viewOnGithub: "Voir sur GitHub",
		reportBug: "Signaler un bug",
		contribute:
			"Fork le repo, ouvre une PR — chaque contribution compte. Jette un œil aux issues pour des idées !",
	},
	footer: {
		madeWith: "Fait avec ❤️ par",
		author: "Simon Hazard",
		license: "Licence MIT",
		legal: "Conditions & confidentialité",
	},
	notFound: {
		title: "404",
		description: "Cette page n'existe pas. Elle est probablement partie chercher des mèmes.",
		backHome: "Retour à l'accueil",
	},
} as const;
