import type { Translations } from "./en";

export const fr: Translations = {
	meta: {
		title: "MemeOver — Envoie des mèmes sur l'écran de tes amis, en direct depuis Discord",
		description:
			"MemeOver est une app desktop overlay qui affiche des images, GIFs, vidéos et texte envoyés depuis Discord directement sur l'écran de tes amis. Open source, auto-hébergeable, multi-plateforme.",
	},
	nav: {
		features: "Fonctionnalités",
		download: "Télécharger",
		github: "GitHub",
	},
	hero: {
		badge: "Beta · Open Source",
		title: "MemeOver",
		tagline: "Envoie des mèmes sur l'écran de tes amis, en direct depuis Discord.",
		description:
			"Une app desktop overlay qui affiche images, GIFs, vidéos et texte envoyés depuis un canal Discord — directement sur l'écran de tes amis en temps réel.",
		cta_download: "Télécharger",
		cta_invite: "Inviter le Bot",
	},
	howItWorks: {
		title: "Comment ça marche",
		steps: [
			{
				icon: "bot",
				title: "Installe le bot",
				description: "Ajoute le bot MemeOver sur ton serveur Discord en un clic.",
			},
			{
				icon: "download",
				title: "Télécharge l'app",
				description: "Télécharge MemeOver et connecte-le à ton serveur Discord.",
			},
			{
				icon: "send",
				title: "Envoie un média",
				description:
					"Balance une image, un GIF, une vidéo ou du texte dans le canal Discord dédié.",
			},
			{
				icon: "sparkles",
				title: "Surprise !",
				description:
					"Le média apparaît en overlay sur l'écran de tes amis — réactions instantanées garanties !",
			},
		],
	},
	features: {
		title: "Fonctionnalités",
		items: [
			{
				icon: "image",
				title: "Tous les formats",
				description: "Images, GIFs, vidéos, audio et texte — tout passe.",
			},
			{
				icon: "move",
				title: "Position libre",
				description: "Place l'overlay où tu veux sur ton écran.",
			},
			{
				icon: "timer",
				title: "Durée d'affichage",
				description: "Configure la durée d'affichage de chaque média.",
			},
			{
				icon: "moon",
				title: "Mode sombre & clair",
				description: "L'app suit ton thème système — ou choisis le tien.",
			},
			{
				icon: "refresh",
				title: "Mise à jour auto",
				description: "Toujours à jour grâce aux mises à jour automatiques.",
			},
			{
				icon: "code",
				title: "Open source",
				description: "Licence MIT, auto-hébergeable, développé par la communauté.",
			},
			{
				icon: "monitor",
				title: "Multi-plateforme",
				description: "Disponible sur Windows, macOS et Linux.",
			},
		],
	},
	download: {
		title: "Télécharger",
		description:
			"MemeOver est disponible sur Windows, macOS et Linux. Télécharge la dernière version depuis GitHub.",
		windows: "Windows",
		windowsFormats: ".exe / .msi",
		macos: "macOS",
		macosFormats: ".dmg",
		linux: "Linux",
		linuxFormats: ".AppImage / .deb",
		allReleases: "Toutes les versions →",
	},
	openSource: {
		title: "Open Source",
		description:
			"MemeOver est entièrement open source sous licence MIT. Les contributions, rapports de bugs et demandes de fonctionnalités sont les bienvenus !",
		viewOnGithub: "Voir sur GitHub",
		reportBug: "Signaler un bug",
		contribute:
			"Fork le repo, ouvre une PR — chaque contribution compte. Jette un œil aux issues pour des idées !",
	},
	footer: {
		madeWith: "Fait avec ❤️ par",
		author: "Simon Hazard",
		license: "Licence MIT",
	},
	notFound: {
		title: "404",
		description: "Cette page n'existe pas. Elle est probablement partie chercher des mèmes.",
		backHome: "Retour à l'accueil",
	},
} as const;
