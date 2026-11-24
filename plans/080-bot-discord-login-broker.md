# 080 · Connexion Discord facultative côté bot

**Proposition en discussion.** Une personne qui rejoint MemeOver pourrait se connecter à Discord et choisir l’un de ses serveurs dans l’app. Le code de configuration actuel resterait utilisable, y compris sur un bot auto-hébergé dont le responsable choisit de désactiver la connexion Discord.

## Architecture proposée

- Le navigateur système ouvre le consentement Discord. Le bot effectue l’échange OAuth côté serveur et conserve son secret client. L’app reçoit le résultat via un retour local à usage unique lié à la demande qu’elle a initiée.
- Le bot utilise l’identité et la liste des serveurs Discord pour afficher les serveurs communs. La liste distingue un serveur prêt d’un serveur qui nécessite encore la configuration par un responsable.
- L’app utilise une session MemeOver révocable. Le bot conserve une empreinte du jeton dans un stockage distinct du registre des serveurs. Avant de remettre les paramètres de connexion à un overlay, il revérifie l’appartenance au serveur auprès de Discord.
- Le bot expose sa capacité de connexion facultative. Un ancien bot ou un bot sans configuration OAuth continue de prendre en charge le parcours actuel.

## Points à examiner

La proposition prévoit jusqu’à cinq sessions par personne et une expiration après trente jours d’inactivité. Valider ces choix de conservation, l’information à donner aux membres et la configuration de l’adresse publique pour les bots auto-hébergés. Confirmer que la vérification d’appartenance fonctionne avec les permissions Discord existantes avant d’arrêter le contrat utilisé par le [plan 081](081-app-discord-login-and-server-picker.md).

## Critères pour accepter une implémentation

- Avec un fournisseur Discord simulé et une base temporaire, couvrir la connexion désactivée, la connexion réussie, le refus d’accès, l’expiration, la réutilisation d’un retour déjà consommé, la déconnexion et le redémarrage du bot.
- Vérifier qu’un membre ayant quitté le serveur ne reçoit plus ses paramètres de connexion. Une indisponibilité temporaire de Discord doit permettre de réessayer.
- Vérifier que les journaux ne contiennent aucun code ou jeton de session. Exercer séparément l’aller-retour dans le navigateur avec un bot configuré et des identifiants de test.
