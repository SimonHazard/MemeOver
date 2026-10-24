# Tester l’overlay en développement local

Lancer uniquement l’application avec `bun run dev:app`. Aucun bot n’est nécessaire.

Dans **Overlay → Banc de test local de l’overlay**, cliquer sur **Démarrer la simulation**.
Le transport WebSocket et la file de médias réels sont alors remplacés temporairement.

- **Connecter un utilisateur** : ajoute un utilisateur simulé et déclenche le vrai toast de
  connexion, avec le thème, la langue, la durée, la position et l’activation enregistrés.
- **Déconnecter un utilisateur** : retire un utilisateur simulé et affiche un toast de
  déconnexion réservé au test local. En fonctionnement réel, seuls les nouveaux arrivants
  déclenchent une notification.
  Une arrivée immédiatement après un départ doit toujours afficher son toast.
- **Image fixe / Texte fixe** : laisse un exemple local affiché sans expiration.
  Modifier les réglages habituels puis **Enregistrer** pour voir leur application.
- **Masquer l’exemple** : retire le média tout en conservant les connexions simulées.
- **Arrêter la simulation** : supprime les exemples et reprend le fonctionnement normal.

Chaque événement crée sa propre notification, avec jusqu’à trois toasts lisibles à la fois.
Ils conservent chacun leur durée ; arrêter la simulation ou désactiver les notifications
les efface tous. À zéro utilisateur, le bouton de déconnexion est désactivé.

Le thème et la langue restent synchronisés lorsque l’on change d’onglet. Les exemples
ne sont jamais ajoutés à l’historique et l’état du simulateur n’est pas sauvegardé.
Recharger l’overlay réinitialise le banc de test.

Le panneau et les abonnements de simulation sont chargés uniquement derrière
`import.meta.env.DEV`. Le build de production ne contient pas ces modules.
Ces tests locaux ne valident pas les connexions Discord ni le transport du bot.
