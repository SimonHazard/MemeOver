import type { Translations } from "./en";

export const fr: Translations = {
	meta: {
		title: "MemeOver",
		description:
			"Vos mèmes, GIFs, vidéos et sons Discord s'affichent en direct sur l'écran de vos amis grâce à une application desktop autonome. Gratuit et open source.",
		imageAlt: "Bannière MemeOver : images, GIFs, vidéos, sons, réactions et texte depuis Discord.",
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
		tagline: "Envoyez des mèmes sur l'écran de vos amis, en direct depuis Discord.",
		description:
			"Transformez un salon Discord en LiveChat : images, GIFs, vidéos, sons, réactions et textes s'affichent en overlay sur l'écran de chaque ami connecté. Pensé pour les soirées jeu, les watch parties et les groupes qui aiment le chaos bien réglé.",
		cta_download: "Télécharger l'application",
		cta_invite: "Ajouter le bot à Discord",
	},
	howItWorks: {
		title: "Comment ça marche",
		steps: [
			{
				icon: "bot",
				title: "Installez le bot",
				description:
					"Un administrateur ajoute MemeOver au serveur Discord et lance une fois /memeover setup pour l'enregistrer.",
			},
			{
				icon: "download",
				title: "Téléchargez l'app",
				description:
					"Chaque participant installe l'app desktop et la connecte avec le code obtenu via /memeover token.",
			},
			{
				icon: "send",
				title: "Envoyez un média",
				description:
					"Envoyez une image, un GIF, une vidéo, un son, une réaction ou un message dans un salon surveillé par le bot.",
			},
			{
				icon: "sparkles",
				title: "Regardez l'effet",
				description:
					"Tout le monde le voit apparaître à l'écran, avec contrôle du timing, du placement et du replay.",
			},
		],
	},
	useCases: {
		kicker: "Pensé pour les écrans partagés",
		title: "Un overlay Discord pour les moments que votre groupe crée déjà",
		description:
			"MemeOver garde la blague dans Discord tout en l'affichant sur chaque app desktop connectée, avec des réglages pour rester fun sans devenir envahissant.",
		items: [
			{
				icon: "gamepad",
				title: "Soirées jeu",
				description:
					"Envoyez réactions, GIFs et messages courts pendant la partie sans demander à tout le monde d'alt-tab.",
			},
			{
				icon: "party",
				title: "Watch parties",
				description:
					"Laissez vos amis envoyer mèmes, sons et commentaires qui apparaissent en direct pendant que le groupe regarde ensemble.",
			},
			{
				icon: "broadcast",
				title: "Setups streaming",
				description:
					"Utilisez un overlay desktop léger pour les médias Discord sans reconstruire toute votre scène de stream.",
			},
		],
	},
	features: {
		title: "Fonctionnalités",
		items: [
			{
				icon: "zap",
				title: "Un code à coller",
				description:
					"Les gestionnaires lancent /memeover setup, les autres membres lancent /memeover token, puis chacun colle le code de configuration dans l’application.",
			},
			{
				icon: "image",
				title: "Images, GIFs et stickers",
				description:
					"Les stickers Discord et GIFs, y compris les gifv vidéo, rejoignent images, vidéos et audios.",
			},
			{
				icon: "message",
				title: "Mèmes anonymes",
				description:
					"Utilisez /memeover secret pour envoyer un mème sans afficher votre badge auteur.",
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
				description: "Choisissez position, taille, opacité, durée et son pour votre écran.",
			},
			{
				icon: "layers",
				title: "Profils réutilisables",
				description:
					"Enregistrez et partagez vos styles d’overlay sans partager les identifiants de connexion.",
			},
			{
				icon: "monitor",
				title: "Tray et multi-écrans",
				description:
					"Démarrez dans la zone de notification et choisissez l’écran de votre overlay.",
			},
			{
				icon: "history",
				title: "Historique et replay",
				description:
					"Retrouvez les 50 derniers éléments affichés et rejouez les médias encore disponibles.",
			},
			{
				icon: "layers",
				title: "Votre propre bot",
				description:
					"L’onglet Serveur de l’application aide à installer, configurer et lancer votre instance de bot.",
			},
			{
				icon: "refresh",
				title: "Mises à jour automatiques",
				description:
					"Les versions Windows, macOS et AppImage se mettent à jour automatiquement ; pour les paquets .deb et .rpm, téléchargez la nouvelle version.",
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
			"Chaque participant installe l'application pour son système, lance /memeover token dans Discord et colle le code de configuration.",
		detected: "Votre système",
		otherFormats: "Autres formats :",
		windows: "Windows",
		windowsFormats: ".exe / .msi",
		macos: "macOS",
		macosFormats: ".dmg",
		linux: "Linux",
		linuxFormats: ".AppImage / .deb / .rpm",
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
					"Oui. Utilisez l’onglet Serveur de l’application pour installer et lancer votre instance, ou suivez la section Docker de la page Héberger votre propre bot.",
			},
			{
				question: "Puis-je envoyer un mème anonymement ?",
				answer:
					"Utilisez /memeover secret. L’overlay masque le badge auteur ; cela ne garantit pas l’anonymat auprès de Discord ou de l’opérateur du bot.",
			},
			{
				question: "Qui peut voir le token de connexion ?",
				answer:
					"Chaque serveur possède un seul token partagé. N'importe quel membre peut l'afficher avec /memeover token pour connecter son application. En cas de fuite, un membre ayant Gérer le serveur lance /memeover rotate : tous les overlays connectés sont déconnectés et doivent coller le nouveau code de configuration.",
			},
			{
				question:
					"Mon système affiche un avertissement à l’installation de MemeOver. Est-ce normal ?",
				answer:
					"Oui. Les installateurs ne sont pas encore signés avec un certificat Apple ou Microsoft : macOS Gatekeeper et Windows SmartScreen affichent donc un avertissement au premier lancement. Sur macOS, essayez d’abord d’ouvrir l’application, puis allez dans Réglages système → Confidentialité et sécurité → Ouvrir quand même ; sur Windows, choisissez Informations complémentaires, puis Exécuter quand même. Le système de mise à jour vérifie chaque version avec la clé de signature de MemeOver.",
			},
			{
				question: "L’overlay n’apparaît pas au-dessus de mon jeu.",
				answer:
					"Certains jeux en plein écran exclusif bloquent tous les overlays. Passez le jeu en mode plein écran fenêtré ou sans bordure.",
			},
			{
				question: "Quels liens puis-je publier ?",
				answer:
					"Dans les salons surveillés, MemeOver prend en charge les fichiers envoyés sur Discord, les stickers Discord, les aperçus de médias intégrés par Discord (dont Tenor) et les liens directs vers des médias du CDN Discord, de Tenor, Giphy, KLIPY et Imgur. L’option url de /memeover secret exige un lien direct vers un fichier média (par exemple .gif, .png, .jpg, .webp, .mp4, .webm, .mp3, .ogg), pas vers une page.",
			},
			{
				question: "Y a-t-il des limites ?",
				answer:
					"Les légendes et les textes sont limités à 140 caractères. Au maximum 10 réactions par seconde et par serveur atteignent les overlays. Le bot hébergé désinscrit un serveur uniquement si aucun overlay n’est connecté et si, soit aucune activité d’overlay n’a eu lieu depuis 48 heures, soit la configuration a au moins 48 heures et au plus une installation de l’application s’est connectée depuis sa création. Relancez /memeover setup pour le reconfigurer.",
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
			"MemeOver est open source sous licence MIT. Vous pouvez l'inspecter, l'auto-héberger, signaler des problèmes et aider à choisir la suite.",
		viewOnGithub: "Voir sur GitHub",
		joinDiscord: "Rejoignez le Discord",
		reportBug: "Signaler un bug",
		supportOnKofi: "Soutenir sur Ko-fi",
		contribute:
			"Forkez le dépôt, ouvrez une PR — chaque contribution compte. Jetez un œil aux issues pour des idées !",
	},
	footer: {
		community: "Discord",
		madeWith: "Fait avec ❤️ par",
		author: "Simon Hazard",
		license: "Licence MIT",
		legal: "Conditions & confidentialité",
	},
	commands: {
		title: "Commandes Discord",
		description:
			"Configurez votre serveur et envoyez des mèmes depuis Discord. Les commandes de gestion nécessitent Gérer le serveur.",
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
				name: "/memeover pause",
				description: "Met la diffusion en pause.",
				access: "Gérer le serveur",
				published: true,
			},
			{
				name: "/memeover resume",
				description: "Reprend la diffusion.",
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
		title: "Héberger votre propre bot",
		description: "Choisissez l’assistant intégré ou lancez le dépôt avec Docker.",
		appTitle: "Depuis l’application",
		appSteps: [
			"Ouvrez l’onglet Serveur et choisissez un dossier d’installation.",
			"Installez le bot et Bun si nécessaire.",
			"Créez une application Discord, renseignez son ID et le token du bot, puis activez Message Content Intent dans le portail développeur.",
			"Invitez le bot, enregistrez la configuration, lancez-le et vérifiez son état.",
			"Lancez /memeover setup dans Discord et utilisez le code de configuration pour connecter vos amis.",
		],
		dockerTitle: "Avec Docker",
		dockerNote:
			"Clonez le dépôt. Copiez bot/.env.example vers .env à la racine, renseignez DISCORD_TOKEN et DISCORD_CLIENT_ID et activez Message Content Intent. Configurez PUBLIC_WS_URL avec une adresse accessible à vos amis. Gardez les tokens privés.",
		guideLabel: "Guide complet",
	},
	changelog: {
		title: "Notes de version",
		description: "Historique des versions du dépôt. Les notes de version sont rédigées en anglais.",
	},
	menu: {
		toggle: "Ouvrir ou fermer le menu",
		label: "Navigation principale",
		footerLabel: "Navigation du pied de page",
	},
	notFound: {
		title: "404",
		description: "Cette page n'existe pas. Elle est probablement partie chercher des mèmes.",
		backHome: "Retour à l'accueil",
	},
} as const;
