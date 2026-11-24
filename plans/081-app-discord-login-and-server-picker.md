# 081 · Choisir un serveur Discord dans l’app

**Proposition dépendante du [plan 080](080-bot-discord-login-broker.md).** Une personne qui utilise MemeOver pour la première fois ou qui change de serveur pourrait sélectionner un serveur Discord depuis le tableau de bord ou l’assistant de configuration. Commencer l’implémentation une fois le contrat HTTP du bot intégré et vérifié.

## Parcours proposé

1. L’app vérifie si le bot configuré propose la connexion Discord. Le code de configuration et les champs manuels restent utilisables avec un ancien bot, un bot hors ligne ou un bot sans connexion Discord.
2. La personne ouvre Discord dans son navigateur. Elle peut annuler l’attente dans l’app. Une connexion réussie affiche son compte et ses serveurs communs avec le bot.
3. Les serveurs prêts peuvent être sélectionnés. Pour un serveur qui nécessite une configuration, l’app explique la prochaine action selon les droits du membre. Prévoir une liste vide, l’actualisation, la déconnexion et une erreur avec possibilité de réessayer.
4. Le choix remplit les mêmes champs qu’un code de configuration. Seule l’action existante d’enregistrement applique le choix et reconnecte l’overlay.

## Critères d’acceptation

- Exercer le parcours dans le formulaire réel, en français et en anglais, avec les composants et les actions existants. Vérifier que changer de serveur ou annuler préserve les autres modifications du formulaire.
- Conserver la session sur la machine, associée au bot choisi. Exclure les identifiants des profils exportés, des liens de source navigateur et des journaux. Une réponse tardive de l’ancien bot doit laisser la nouvelle session intacte.
- Couvrir les cas d’annulation, d’expiration, de changement de bot et de renouvellement d’un code de serveur. Maintenir les permissions du parcours natif dans la fenêtre des réglages.
- Tester le formulaire avec les événements natifs simulés, puis vérifier le retour réel de Discord vers l’app sur Windows et macOS. Documenter en français et en anglais la conservation et la révocation de la session avec la fonctionnalité.
