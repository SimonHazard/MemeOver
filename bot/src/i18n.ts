export type BotLocale = "en" | "fr";

const translations = {
	en: {
		"commands.memeover.description": "Manage MemeOver for this server",
		"commands.setup.name": "setup",
		"commands.setup.description":
			"Register this server. Omit #channel to watch all channels; specify one to add it to the list.",
		"commands.setup.channel.name": "channel",
		"commands.setup.channel.description":
			"Add a specific channel to watch (omit to watch all channels)",
		"commands.token.name": "token",
		"commands.token.description": "Show your connection credentials (only visible to you)",
		"commands.rotate.name": "rotate",
		"commands.rotate.description": "Generate a new connection token, invalidating the current one",
		"commands.remove.name": "remove",
		"commands.remove.description": "Unregister this server from MemeOver",
		"commands.bots.name": "bots",
		"commands.bots.description": "Allow or mute messages and reactions from bots and apps",
		"commands.bots.enabled.name": "enabled",
		"commands.bots.enabled.description": "Enable to listen to bots/apps; disable to mute them",
		"commands.secret.name": "secret",
		"commands.secret.description": "Send an anonymous meme with optional caption text",
		"commands.secret.media.name": "media",
		"commands.secret.media.description": "Image, GIF, video or audio file to send anonymously",
		"commands.secret.url.name": "url",
		"commands.secret.url.description": "Direct media link (Discord CDN, Tenor, Giphy, Imgur)",
		"commands.secret.text.name": "text",
		"commands.secret.text.description": "Optional caption displayed with the secret meme",
		"commands.status.name": "status",
		"commands.status.description": "Show bot configuration, watched channels, and uptime",
		"commands.help.name": "help",
		"commands.help.description": "List all MemeOver commands and what they do",

		"common.allChannels": "All channels",
		"common.appSetupCode": "⚡ App setup code",
		"common.cancel": "Cancel",
		"common.botAppSources": "🤖 Bots & apps",
		"common.controlOwnerOnlyDescription": "Run the command yourself to use this action.",
		"common.controlOwnerOnlyTitle": "This control is not yours",
		"common.enabled": "Enabled",
		"common.manageServer": "Manage Server",
		"common.muted": "Muted",
		"common.notConfiguredDescription":
			"This server has not been set up yet. Run `/memeover setup` first.",
		"common.notConfiguredTitle": "Not configured",
		"common.openMemeOver": "Open MemeOver",
		"common.permissionDeniedDescription":
			"You need the **Manage Server** permission to use this command.",
		"common.permissionDeniedTitle": "Permission denied",
		"common.serverId": "🏠 Server ID",
		"common.serverOnlyDescription": "This command can only be used in a server.",
		"common.serverOnlyTitle": "Server only",
		"common.token": "🔑 Token",
		"common.watching": "📺 Watching",

		"bot.genericError": "An error occurred.",

		"cleanup.notice":
			"Due to inactivity, MemeOver is no longer watching the configured channels. To configure MemeOver again, use `/memeover setup` in this server.",
		"cleanup.noticeTitle": "MemeOver paused",
		"cleanup.wsMessage":
			"This server was removed from MemeOver due to inactivity. Run /memeover setup to configure it again.",
		"cleanup.wsCloseReason": "Guild removed",

		"help.description":
			"MemeOver streams the media posted in your Discord channels to a desktop overlay. Configure the bot below, then enter your credentials in the MemeOver app.",
		"help.remove":
			"Open a confirmation before unregistering this server from MemeOver. Requires **Manage Server**.",
		"help.rotate":
			"Open a confirmation before generating a new connection token. Connected overlays must reconnect after confirmation. Requires **Manage Server**.",
		"help.secret":
			"Send an anonymous media item to every connected overlay. Use either an uploaded file or direct URL, with optional caption text.",
		"help.bots":
			"Allow or mute media, text, and reactions posted by Discord bots, apps, and webhooks. Requires **Manage Server**.",
		"help.setup":
			"Register this server and get an app setup code. Omit `#channel` to watch all channels, or specify one to add it. Requires **Manage Server**.",
		"help.status": "Show bot configuration, watched channels, active overlays, and uptime.",
		"help.title": "MemeOver — commands",
		"help.token":
			"Display your connection credentials and one-line app setup code (ephemeral, visible only to you).",
		"help.help": "Show this help message.",

		"remove.notConfiguredDescription": "This server is not registered with MemeOver.",
		"remove.cancelledDescription": "No configuration was changed.",
		"remove.cancelledTitle": "Removal cancelled",
		"remove.confirmButton": "Remove server",
		"remove.confirmDescription":
			"This will unregister the server from MemeOver. Connected overlays will be rejected on their next reconnect.",
		"remove.confirmTitle": "Confirm server removal",
		"remove.successDescription":
			"This server has been removed from MemeOver. All active sessions will be rejected on next reconnect.",
		"remove.successTitle": "Server removed",

		"rotate.cancelledDescription": "The current connection token is still valid.",
		"rotate.cancelledTitle": "Rotation cancelled",
		"rotate.confirmButton": "Generate token",
		"rotate.confirmDescription":
			"This will invalidate the current connection token. Connected overlays must reconnect with the new token.",
		"rotate.confirmTitle": "Confirm token rotation",
		"rotate.newToken": "🔑 New token",
		"rotate.description":
			"Your previous token is now invalid. Update the MemeOver app with the new token below.\n\n⚠️ Any connected overlay will disconnect and must reconnect with this new token.",
		"rotate.title": "Token rotated",

		"secret.alreadySentDescription":
			"This exact URL was just pushed. Wait a moment before resending.",
		"secret.alreadySentTitle": "Already sent",
		"secret.attachmentExpiredDescription":
			"This Discord attachment link has expired. Upload the file again and retry `/memeover secret`.",
		"secret.attachmentExpiredTitle": "Attachment expired",
		"secret.channelNotWatchedDescription":
			"This channel is not in the MemeOver watch list. Ask a server manager to add it via `/memeover setup #channel`.",
		"secret.channelNotWatchedTitle": "Channel not watched",
		"secret.channelRequiredDescription": "This command must be used inside a text channel.",
		"secret.channelRequiredTitle": "Channel required",
		"secret.mediaRequiredDescription":
			"Attach a media file or provide a direct URL, then optionally add `text` as the caption.",
		"secret.mediaRequiredTitle": "Media required",
		"secret.successDescription":
			"Your anonymous meme was pushed to every connected overlay in this server. Nobody sees your name.",
		"secret.successDescriptionWithText":
			"Your anonymous meme and caption were pushed to every connected overlay. Nobody sees your name.",
		"secret.successTitle": "Secret meme sent",
		"secret.unsupportedTypeDescription":
			"The media must be an image, GIF, video, or audio file (`.png`, `.jpg`, `.gif`, `.mp4`, `.webm`, `.mp3`, …).",
		"secret.unsupportedTypeTitle": "Unsupported media type",
		"secret.urlNotAllowedDescription":
			"Only links from Discord CDN, Tenor, Giphy, or Imgur are accepted. Paste a direct image/GIF/video URL from one of these hosts.",
		"secret.urlNotAllowedTitle": "URL not allowed",

		"setup.configuredTitle": "MemeOver configured",
		"setup.description":
			"Paste the setup code below into the MemeOver app to connect in one step.\n\n_Tip: run `/memeover setup #channel` to add a channel to the watch list._",
		"setup.updatedTitle": "MemeOver updated",

		"bots.enabledTitle": "Bots & apps enabled",
		"bots.enabledDescription":
			"MemeOver now listens to media, text, and reactions from Discord bots, apps, and webhooks in watched channels.",
		"bots.mutedTitle": "Bots & apps muted",
		"bots.mutedDescription":
			"MemeOver now ignores media, text, and reactions from Discord bots, apps, and webhooks.",

		"status.activeOverlays": "🖥️ Active overlays",
		"status.notConfigured": "❌ Not configured — run `/memeover setup`",
		"status.registered": "🔌 Registered",
		"status.registeredYes": "✅ Yes",
		"status.title": "MemeOver status",
		"status.uptime": "⏱️ Uptime",

		"token.title": "Your MemeOver connection credentials",
	},
	fr: {
		"commands.memeover.description": "Gérer MemeOver sur ce serveur",
		"commands.setup.name": "setup",
		"commands.setup.description":
			"Configurer ce serveur. Omettez #salon pour écouter tous les salons; indiquez-en un pour l'ajouter.",
		"commands.setup.channel.name": "channel",
		"commands.setup.channel.description": "Ajouter un salon précis à écouter",
		"commands.token.name": "token",
		"commands.token.description": "Afficher vos identifiants de connexion",
		"commands.rotate.name": "rotate",
		"commands.rotate.description": "Générer un nouveau jeton de connexion",
		"commands.remove.name": "remove",
		"commands.remove.description": "Retirer ce serveur de MemeOver",
		"commands.bots.name": "bots",
		"commands.bots.description": "Autoriser ou masquer les messages et réactions des bots et apps",
		"commands.bots.enabled.name": "enabled",
		"commands.bots.enabled.description":
			"Active pour écouter les bots/apps; désactive pour les masquer",
		"commands.secret.name": "secret",
		"commands.secret.description": "Envoyer un meme anonyme avec une légende optionnelle",
		"commands.secret.media.name": "media",
		"commands.secret.media.description": "Image, GIF, vidéo ou audio à envoyer anonymement",
		"commands.secret.url.name": "url",
		"commands.secret.url.description": "Lien direct vers un média",
		"commands.secret.text.name": "text",
		"commands.secret.text.description": "Légende optionnelle affichée avec le meme",
		"commands.status.name": "status",
		"commands.status.description": "Afficher la configuration, les salons et l'uptime",
		"commands.help.name": "help",
		"commands.help.description": "Lister les commandes MemeOver",

		"common.allChannels": "Tous les salons",
		"common.appSetupCode": "⚡ Code de configuration app",
		"common.cancel": "Annuler",
		"common.botAppSources": "🤖 Bots & apps",
		"common.controlOwnerOnlyDescription":
			"Lancez la commande vous-même pour utiliser cette action.",
		"common.controlOwnerOnlyTitle": "Ce contrôle ne vous appartient pas",
		"common.enabled": "Activé",
		"common.manageServer": "Gérer le serveur",
		"common.muted": "Masqué",
		"common.notConfiguredDescription":
			"Ce serveur n'est pas encore configuré. Lancez `/memeover setup` d'abord.",
		"common.notConfiguredTitle": "Non configuré",
		"common.openMemeOver": "Ouvrir MemeOver",
		"common.permissionDeniedDescription":
			"Vous avez besoin de la permission **Gérer le serveur** pour utiliser cette commande.",
		"common.permissionDeniedTitle": "Permission refusée",
		"common.serverId": "🏠 Server ID",
		"common.serverOnlyDescription": "Cette commande ne peut être utilisée que dans un serveur.",
		"common.serverOnlyTitle": "Serveur uniquement",
		"common.token": "🔑 Jeton",
		"common.watching": "📺 Écoute",

		"bot.genericError": "Une erreur est survenue.",

		"cleanup.notice":
			"Suite à une période d'inactivité, les canaux configurés ne sont plus écoutés par MemeOver. Pour reconfigurer MemeOver, utilisez `/memeover setup` dans ce serveur.",
		"cleanup.noticeTitle": "MemeOver en pause",
		"cleanup.wsMessage":
			"Ce serveur a été retiré de MemeOver pour inactivité. Lancez /memeover setup pour le configurer à nouveau.",
		"cleanup.wsCloseReason": "Serveur retiré",

		"help.description":
			"MemeOver envoie les médias postés dans vos salons Discord vers un overlay desktop. Configurez le bot ci-dessous, puis entrez vos identifiants dans l'app MemeOver.",
		"help.remove":
			"Ouvre une confirmation avant de retirer ce serveur de MemeOver. Requiert **Gérer le serveur**.",
		"help.rotate":
			"Ouvre une confirmation avant de générer un nouveau jeton de connexion. Les overlays connectés devront se reconnecter après confirmation. Requiert **Gérer le serveur**.",
		"help.secret":
			"Envoie un média anonyme à tous les overlays connectés. Utilisez un fichier uploadé ou une URL directe, avec une légende optionnelle.",
		"help.bots":
			"Autorise ou masque les médias, textes et réactions publiés par des bots Discord, apps et webhooks. Requiert **Gérer le serveur**.",
		"help.setup":
			"Enregistre ce serveur et fournit un code de configuration app. Omettez `#salon` pour écouter tous les salons, ou indiquez-en un pour l'ajouter. Requiert **Gérer le serveur**.",
		"help.status":
			"Affiche la configuration du bot, les salons écoutés, les overlays actifs et l'uptime.",
		"help.title": "MemeOver — commandes",
		"help.token":
			"Affiche vos identifiants et un code de configuration app en une ligne (éphémère, visible uniquement par vous).",
		"help.help": "Affiche ce message d'aide.",

		"remove.notConfiguredDescription": "Ce serveur n'est pas enregistré dans MemeOver.",
		"remove.cancelledDescription": "Aucune configuration n'a été modifiée.",
		"remove.cancelledTitle": "Retrait annulé",
		"remove.confirmButton": "Retirer le serveur",
		"remove.confirmDescription":
			"Cette action désinscrit le serveur de MemeOver. Les overlays connectés seront rejetés à leur prochaine reconnexion.",
		"remove.confirmTitle": "Confirmer le retrait du serveur",
		"remove.successDescription":
			"Ce serveur a été retiré de MemeOver. Les sessions actives seront rejetées à la prochaine reconnexion.",
		"remove.successTitle": "Serveur retiré",

		"rotate.cancelledDescription": "Le jeton de connexion actuel reste valide.",
		"rotate.cancelledTitle": "Renouvellement annulé",
		"rotate.confirmButton": "Générer un jeton",
		"rotate.confirmDescription":
			"Cette action invalide le jeton de connexion actuel. Les overlays connectés devront se reconnecter avec le nouveau jeton.",
		"rotate.confirmTitle": "Confirmer le renouvellement du jeton",
		"rotate.newToken": "🔑 Nouveau jeton",
		"rotate.description":
			"Votre ancien jeton est maintenant invalide. Mettez à jour l'app MemeOver avec le nouveau jeton ci-dessous.\n\n⚠️ Les overlays connectés seront déconnectés et devront se reconnecter avec ce nouveau jeton.",
		"rotate.title": "Jeton renouvelé",

		"secret.alreadySentDescription":
			"Cette URL vient déjà d'être envoyée. Attendez un moment avant de la renvoyer.",
		"secret.alreadySentTitle": "Déjà envoyé",
		"secret.attachmentExpiredDescription":
			"Ce lien de pièce jointe Discord a expiré. Uploadez le fichier à nouveau puis relancez `/memeover secret`.",
		"secret.attachmentExpiredTitle": "Pièce jointe expirée",
		"secret.channelNotWatchedDescription":
			"Ce salon n'est pas dans la liste MemeOver. Demandez à un gestionnaire du serveur de l'ajouter avec `/memeover setup #salon`.",
		"secret.channelNotWatchedTitle": "Salon non écouté",
		"secret.channelRequiredDescription": "Cette commande doit être utilisée dans un salon texte.",
		"secret.channelRequiredTitle": "Salon requis",
		"secret.mediaRequiredDescription":
			"Ajoutez un fichier média ou fournissez une URL directe, puis ajoutez éventuellement `text` comme légende.",
		"secret.mediaRequiredTitle": "Média requis",
		"secret.successDescription":
			"Votre meme anonyme a été envoyé à tous les overlays connectés de ce serveur. Personne ne voit votre nom.",
		"secret.successDescriptionWithText":
			"Votre meme anonyme et sa légende ont été envoyés à tous les overlays connectés. Personne ne voit votre nom.",
		"secret.successTitle": "Meme secret envoyé",
		"secret.unsupportedTypeDescription":
			"Le média doit être une image, un GIF, une vidéo ou un fichier audio (`.png`, `.jpg`, `.gif`, `.mp4`, `.webm`, `.mp3`, …).",
		"secret.unsupportedTypeTitle": "Type de média non pris en charge",
		"secret.urlNotAllowedDescription":
			"Seuls les liens Discord CDN, Tenor, Giphy ou Imgur sont acceptés. Collez une URL directe image/GIF/vidéo depuis l'un de ces services.",
		"secret.urlNotAllowedTitle": "URL non autorisée",

		"setup.configuredTitle": "MemeOver configuré",
		"setup.description":
			"Collez le code de configuration ci-dessous dans l'app MemeOver pour vous connecter en une étape.\n\n_Astuce : lancez `/memeover setup #salon` pour ajouter un salon à écouter._",
		"setup.updatedTitle": "MemeOver mis à jour",

		"bots.enabledTitle": "Bots & apps activés",
		"bots.enabledDescription":
			"MemeOver écoute maintenant les médias, textes et réactions des bots Discord, apps et webhooks dans les salons surveillés.",
		"bots.mutedTitle": "Bots & apps masqués",
		"bots.mutedDescription":
			"MemeOver ignore maintenant les médias, textes et réactions des bots Discord, apps et webhooks.",

		"status.activeOverlays": "🖥️ Overlays actifs",
		"status.notConfigured": "❌ Non configuré — lancez `/memeover setup`",
		"status.registered": "🔌 Enregistré",
		"status.registeredYes": "✅ Oui",
		"status.title": "Statut MemeOver",
		"status.uptime": "⏱️ Temps en ligne",

		"token.title": "Vos identifiants de connexion MemeOver",
	},
} as const;

export type BotTranslationKey = keyof typeof translations.en;

export function resolveBotLocale(locale: string | null | undefined): BotLocale {
	return locale?.toLowerCase().startsWith("fr") ? "fr" : "en";
}

export function interactionLocale(source: {
	locale?: string | null;
	guildLocale?: string | null;
}): BotLocale {
	return resolveBotLocale(source.locale ?? source.guildLocale);
}

export function t(locale: BotLocale, key: BotTranslationKey): string {
	return translations[locale][key] ?? translations.en[key];
}

export function frLocalization(key: BotTranslationKey): { fr: string } {
	return { fr: t("fr", key) };
}
