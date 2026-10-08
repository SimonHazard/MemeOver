import type { Translations } from "./en";

export const fr: Translations = {
	meta: {
		title: "MemeOver",
		description:
			"Tes mèmes, GIFs, vidéos et sons Discord s'affichent en direct sur l'écran de tes amis grâce à une application desktop autonome. Gratuit et open source.",
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
		badge: "Gratuit et open source",
		title: "MemeOver",
		subtitle: "Overlay inspiré du LiveChat de la Cacabox",
		tagline: "Envoie des mèmes sur l'écran de tes amis, en direct depuis Discord.",
		description:
			"Transforme un salon Discord en LiveChat : images, GIFs, vidéos, sons, réactions et textes s'affichent en overlay sur l'écran de chaque ami connecté. Pensé pour les soirées jeu, les watch parties et les groupes qui aiment le chaos bien réglé.",
		cta_download: "Télécharger l'application",
		cta_invite: "Ajouter le bot à Discord",
	},
	howItWorks: {
		title: "Comment ça marche",
		steps: [
			{
				icon: "bot",
				title: "Installe le bot",
				description:
					"Un administrateur ajoute MemeOver au serveur Discord et lance une fois /memeover setup pour l'enregistrer.",
			},
			{
				icon: "download",
				title: "Télécharge l'app",
				description:
					"Chaque participant installe l'app desktop et la connecte avec le code obtenu via /memeover token.",
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
				title: "Un code à coller",
				description: "Lance /memeover setup puis colle le code de connexion dans l’application.",
			},
			{
				icon: "image",
				title: "Images, GIFs et stickers",
				description:
					"Les stickers Discord et GIFs, y compris les gifv vidéo, rejoignent images, vidéos et audios.",
			},
			{
				icon: "message",
				title: "Memes anonymes",
				description:
					"Utilise /memeover secret pour envoyer un meme sans afficher ton badge auteur.",
			},
			{
				icon: "message",
				title: "Textes et réactions",
				description:
					"Les messages courts et réactions flottantes gardent la conversation à l’écran.",
			},
			{
				icon: "sliders",
				title: "Un placement adapté",
				description: "Choisis position, taille, opacité, durée et son pour ton écran.",
			},
			{
				icon: "layers",
				title: "Profils réutilisables",
				description:
					"Enregistre et partage tes styles d’overlay sans partager les identifiants de connexion.",
			},
			{
				icon: "monitor",
				title: "Tray et multi-écrans",
				description: "Démarre dans la zone de notification et choisis l’écran de ton overlay.",
			},
			{
				icon: "history",
				title: "Historique et replay",
				description:
					"Retrouve les 50 derniers éléments affichés et rejoue les médias encore disponibles.",
			},
			{
				icon: "layers",
				title: "Ton propre bot",
				description:
					"L’onglet Serveur de l’application aide à installer, configurer et lancer ton instance de bot.",
			},
			{
				icon: "refresh",
				title: "Mises à jour automatiques",
				description: "Reste à jour sans chercher un nouvel installateur à chaque version.",
			},
		],
	},
	download: {
		title: "Télécharger",
		description:
			"MemeOver s'installe en deux étapes : le bot est ajouté une fois au serveur Discord, puis chaque participant installe l'application desktop.",
		botStepTitle: "Ajouter le bot au serveur",
		botStepDescription:
			"À faire une seule fois par un membre ayant la permission Gérer le serveur, qui lance ensuite /memeover setup.",
		botStepCta: "Ajouter le bot à Discord",
		commandsLink: "Voir toutes les commandes",
		appStepTitle: "Installer l'application",
		appStepDescription:
			"Chaque participant installe l'application pour son système, lance /memeover token dans Discord et colle le code de connexion.",
		detected: "Ton système",
		otherFormats: "Autres formats :",
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
				question: "MemeOver est-il inspiré du LiveChat de la Cacabox ?",
				answer:
					"Oui, MemeOver est un projet indépendant inspiré de leur LiveChat. Le LiveChat d'origine fonctionnait avec OBS et s'adressait aux streamers ; MemeOver est une application autonome : pas besoin de streamer, l'overlay s'affiche directement sur l'écran de chaque participant.",
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
			{
				question: "Puis-je héberger le bot moi-même ?",
				answer:
					"Oui. Utilise l’onglet Serveur de l’application pour installer et lancer ton instance, ou suis le guide Docker.",
			},
			{
				question: "Puis-je envoyer un meme anonymement ?",
				answer:
					"Utilise /memeover secret. L’overlay masque le badge auteur ; cela ne garantit pas l’anonymat auprès de Discord ou de l’opérateur du bot.",
			},
			{
				question: "MemeOver est-il développé avec l'IA ?",
				answer:
					"En partie. Le projet a démarré en juin 2024, sans IA, et il est passé par beaucoup de solutions différentes : un bot en Go, un overlay en Electron puis en Tauri, et enfin un bot réécrit en TypeScript avec Bun. Le produit existait déjà quand j'ai commencé à utiliser l'IA. Elle m'a simplement permis d'ajouter de nouvelles fonctionnalités et de consolider le produit.",
			},
		],
	},
	openSource: {
		title: "Open Source",
		description:
			"MemeOver est open source sous licence MIT. Tu peux l'inspecter, l'auto-héberger, signaler des problèmes et aider à choisir la suite.",
		viewOnGithub: "Voir sur GitHub",
		reportBug: "Signaler un bug",
		supportOnKofi: "Soutenir sur Ko-fi",
		contribute:
			"Fork le repo, ouvre une PR — chaque contribution compte. Jette un œil aux issues pour des idées !",
	},
	footer: {
		madeWith: "Fait avec ❤️ par",
		author: "Simon Hazard",
		license: "Licence MIT",
		legal: "Conditions & confidentialité",
	},
	commands: {
		title: "Commandes Discord",
		description:
			"Configure ton serveur et envoie des memes depuis Discord. Les commandes de gestion nécessitent Gérer le serveur.",
		commandLabel: "Commande",
		accessLabel: "Accès",
		descriptionLabel: "Action",
		items: [
			{
				name: "/memeover setup",
				description: "Enregistre le serveur ; sans salon, tous les salons sont surveillés.",
				access: "Gérer le serveur",
				published: true,
			},
			{
				name: "/memeover token",
				description: "Affiche les identifiants et le code de configuration en privé.",
				access: "Tous",
				published: true,
			},
			{
				name: "/memeover rotate",
				description: "Demande confirmation puis renouvelle le token.",
				access: "Gérer le serveur",
				published: true,
			},
			{
				name: "/memeover remove",
				description: "Demande confirmation puis désinscrit le serveur.",
				access: "Gérer le serveur",
				published: true,
			},
			{
				name: "/memeover bots",
				description: "Autorise ou masque les messages et réactions des bots et applications.",
				access: "Gérer le serveur",
				published: true,
			},
			{
				name: "/memeover secret",
				description: "Envoie un média anonyme aux overlays connectés.",
				access: "Tous",
				published: true,
			},
			{
				name: "/memeover status",
				description: "Affiche la configuration, les salons et les overlays connectés.",
				access: "Gérer le serveur",
				published: true,
			},
			{
				name: "/memeover help",
				description: "Liste les commandes disponibles.",
				access: "Tous",
				published: true,
			},
		],
	},
	selfHost: {
		title: "Héberger ton propre bot",
		description: "Choisis l’assistant intégré ou lance le dépôt avec Docker.",
		appTitle: "Depuis l’application",
		appSteps: [
			"Ouvre l’onglet Serveur et choisis un dossier d’installation.",
			"Installe le bot et Bun si nécessaire.",
			"Crée une application Discord, renseigne son ID et le token du bot, puis active Message Content Intent dans le portail développeur.",
			"Invite le bot, enregistre la configuration, lance-le et vérifie son état.",
			"Lance /memeover setup dans Discord et utilise le code de connexion pour connecter tes amis.",
		],
		dockerTitle: "Avec Docker",
		dockerNote:
			"Clone le dépôt. Copie bot/.env.example vers .env à la racine, renseigne DISCORD_TOKEN et DISCORD_CLIENT_ID et active Message Content Intent. Configure PUBLIC_WS_URL avec une adresse accessible à tes amis. Garde les tokens privés.",
		guideLabel: "Guide complet",
	},
	changelog: {
		title: "Notes de version",
		description: "Historique des versions du dépôt. Les notes de version sont rédigées en anglais.",
	},
	menu: { toggle: "Ouvrir ou fermer le menu", label: "Navigation principale" },
	notFound: {
		title: "404",
		description: "Cette page n'existe pas. Elle est probablement partie chercher des mèmes.",
		backHome: "Retour à l'accueil",
	},
} as const;
