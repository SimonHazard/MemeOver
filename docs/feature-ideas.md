# Idées produit en réserve

Décision du 22 octobre 2026 : les deux fonctionnalités ci-dessous restent des
idées. Elles ne font partie ni du produit livré, ni du périmètre de la prochaine
version, ni d'un plan d'implémentation actif. Ne pas les développer sans demande
explicite de l'utilisateur. Aucun code, protocole ou réglage ne doit être conservé
par anticipation.

## Aide au diagnostic d'un overlay sans contenu

**Besoin possible :** aider une personne dont l'application est connectée mais
n'affiche pas les médias attendus.

**Piste à réexaminer :** commencer par des erreurs compréhensibles et un test
d'affichage local. Des contrôles supplémentaires sur les permissions, les salons
ou les filtres ne seraient pertinents que si des problèmes récurrents le
justifient. Une checklist complète et un journal d'événements ne sont pas des
exigences acquises.

**Avant toute demande d'implémentation :** recueillir des cas concrets, identifier
ce que les états de connexion et `/memeover status` n'expliquent pas, puis choisir
la réponse la plus simple. L'acceptation devrait vérifier un vrai parcours
Discord dans l'application native et une action utile pour l'utilisateur.

## Préchargement du prochain média

**Besoin possible :** réduire une attente perceptible ou une entrée visuellement
vide entre deux médias.

**Piste à réexaminer :** préparer uniquement le prochain élément de la file si des
mesures dans l'application native montrent un gain utile. Cache, blobs et attente
avant affichage ne sont pas des choix techniques validés pour une future version.

**Avant toute demande d'implémentation :** mesurer le comportement actuel avec de
vrais médias et comparer le résultat sur les mêmes scénarios. Une proposition
devrait démontrer le gain, borner la mémoire et les téléchargements, et vérifier
la lecture audio/vidéo, les restrictions réseau et la libération des ressources.
