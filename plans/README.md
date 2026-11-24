# Plans de contribution

| Plan | État | Prochaine étape |
| --- | --- | --- |
| [073 · Médias intégrés par Discord](073-broadcast-discord-resolved-embeds-through-media-proxy.md) | À valider | Réunir neuf exemples anonymisés et vérifier que les liens proxy restent lisibles après plus d’une heure avant de modifier l’extraction. |
| [080 · Connexion Discord côté bot](080-bot-discord-login-broker.md) | Proposition en discussion | Examiner le modèle de session et la vérification des droits avec les responsables de bots auto-hébergés. |
| [081 · Choix du serveur dans l’app](081-app-discord-login-and-server-picker.md) | Proposition dépendante de 080 | Confirmer le contrat du bot avant d’implémenter le parcours sur ordinateur. |
| 082 · Associer un overlay à un compte Discord | Piste | Reprendre après 080 et 081 si une fonctionnalité concrète nécessite de cibler l’overlay d’un membre. |

Les fiches numérotées décrivent le travail ouvert à la contribution. Le [contexte produit](../CONTEXT.md) décrit le comportement livré. À la reprise d’une fiche, indiquer la révision de départ et le critère à vérifier. À la clôture, reporter les décisions durables dans la documentation concernée et retirer la fiche de cet index.

Placer les brouillons et captures de travail dans `plans/local/`, ignoré par Git. Anonymiser les exemples avant de les joindre à une contribution publique.
