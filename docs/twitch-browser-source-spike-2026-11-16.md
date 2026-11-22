# Événements Twitch dans la source navigateur : décision du spike 113

Mesures initiales le 16 novembre 2026, actualisées le 18 novembre après la PR #129. **Recommandation : option C, un journal JSON lu toutes les 250 ms sur le même serveur loopback. Effort estimé : M.** Ce rapport ne livre aucun relais Twitch : sa réalisation demandera un nouveau plan et une demande explicite.

L’intégration Twitch du bureau est en **alpha** et peut être retirée à tout moment. La proposition pour OBS dépend de son maintien.

## Périmètre et état constaté

Les mesures HTTP ont été effectuées sur le serveur de `89d4618`. Le rebase sur `8084cf7` conserve exactement le même fichier `browser_source.rs`. La PR #129 ajoute toutefois le profil d’affichage courant aux contrôles publiés. Les mesures d’encodage ci-dessous tiennent compte de cette évolution. Le raccordement Twitch du plan 112 est lu dans la même livraison : `eventsub-runtime.ts` possède la session, et `useTwitchEvents.ts` route les notifications puis applique les actions au store du desktop.

Le plan original citait `tauri-plugin-localhost`. Depuis le plan 070, ce plugin a disparu de `Cargo.lock` : `tiny_http 0.12.0` est une dépendance directe. Le code de `browser_source.rs` choisit déjà le statut, le corps et les en-têtes HTTP. Cette évolution rend C nettement moins coûteuse que ne le supposait le plan.

Contraintes conservées : une seule session et un seul renouvellement Twitch, dans l’overlay natif ; aucun jeton Twitch dans une URL, une page ou une réponse loopback ; aucun changement du bot ni de son protocole ; mêmes décisions de modération pour les deux surfaces ; fonctionnement en « Stream uniquement ».

## Mesure des charges de l’option A

Mesures exécutées avec Bun 1.4.2. La base est le résultat du vrai `encodeSourceControls` : JSON compact encodé en UTF-8 puis base64url sans padding. La base sans filtres ni commandes pèse 50 octets. Le prototype ajoute un objet `twitch` avec un UUID d’époque et `entries: [{seq, action}]`.

Chaque MEDIA contient les champs réels d’un `DisplayQueueItem`, un UUID de file et de message, un identifiant utilisateur de 20 chiffres, un login et un nom de 25 caractères, une URL de **120 caractères** et une légende ASCII de **140 caractères**. TEXT utilise les mêmes identifiants et 140 caractères de texte. Une réaction contient `Kappa` et une URL d’emote avec un identifiant de 32 caractères. « Mixte » répète MEDIA, TEXT, réaction. Les tailles incluent toute l’enveloppe de contrôles, sans le nom de l’en-tête HTTP ni les autres en-têtes.

| Actions retenues | MEDIA seuls, octets | TEXT seuls, octets | Réactions seules, octets | Mixte, octets |
|---:|---:|---:|---:|---:|
| 1 | 1 118 | 908 | 358 | 1 118 |
| 5 | 5 016 | 3 970 | 1 216 | 3 838 |
| 10 | 9 891 | 7 798 | 2 291 | 6 983 |
| 20 | 19 651 | 15 464 | 4 451 | 13 626 |
| 50 | 48 931 | 38 464 | 10 931 | 33 212 |

Après la PR #129, le vrai encodeur ajoute le profil courant au même en-tête. Avec les réglages par défaut, j’ai mesuré **1 095 octets**, contre **50 octets** sans profil. Le champ JSON `p` représente **784 octets** supplémentaires avant encodage. L’aller-retour d’encodage et de décodage a conservé les 30 champs d’affichage, et les options Twitch sont absentes du profil publié. Le tableau suivant recalcule les charges initiales avec ces 784 octets, puis applique la taille base64url sans padding.

| Actions retenues | MEDIA seuls, octets | TEXT seuls, octets | Réactions seules, octets | Mixte, octets |
|---:|---:|---:|---:|---:|
| 1 | 2 163 | 1 954 | 1 403 | 2 163 |
| 5 | 6 062 | 5 015 | 2 262 | 4 883 |
| 10 | 10 936 | 8 843 | 3 336 | 8 028 |
| 20 | 20 696 | 16 510 | 5 496 | 14 671 |
| 50 | 49 976 | 39 510 | 11 976 | 34 258 |

Ce sont des charges synthétiques bornées, pas le maximum possible : Unicode, noms, URL et filtres existants peuvent coûter davantage. L’index de séquence passe aussi à deux chiffres dans les grandes séries. À 1 Hz, un journal de 50 MEDIA répète environ 50 ko par seconde et par page, même sans nouvel événement ; un curseur dans un corps JSON évite cette répétition.

## En-têtes : résultats du serveur réel

Un harnais Rust hors dépôt importe directement le fichier de production `browser_source.rs` via `#[path]`, crée les mêmes assets de test Tauri et appelle les fonctions publiques `set_browser_source_controls` puis `start`. Il exécute donc le vrai `PageLink`, `respond` et le vrai serveur `tiny_http`, sans reconstitution en Python. Chaque valeur est une chaîne ASCII de la longueur indiquée. Les requêtes ciblent la vraie route `/browser-source.html?source=1`, avec le Host loopback attendu.

Clients : curl 8.7.1, Chrome headless **157.0.8103.51** via Playwright. Chrome est testé par navigation GET, puis par `fetch` HEAD de même origine. « Accepté » signifie HTTP 200 et lecture du nombre exact d’octets de `X-MemeOver-Source-Controls`. Les serveurs temporaires ont été arrêtés après la mesure.

| Valeur du header | curl HEAD | Chrome GET et HEAD | OBS/CEF réel |
|---:|---|---|---|
| 4 096 octets (4 Kio) | Accepté | Accepté | Non testé |
| 8 192 octets (8 Kio) | Accepté | Accepté | Non testé |
| 16 384 octets (16 Kio) | Accepté | Accepté | Non testé |
| 65 536 octets (64 Kio) | Accepté | Accepté | Non testé |
| 131 072 octets (128 Kio) | Refus client, code 100 | Accepté | Non testé |
| 262 144 octets (256 Kio) | Refus client, code 100 | Refus : `ERR_RESPONSE_HEADERS_TOO_BIG` | Non testé |
| 524 288 octets (512 Kio) | Refus client, code 100 | Refus : `ERR_RESPONSE_HEADERS_TOO_BIG` | Non testé |

64 Kio est le plus grand point testé accepté par les deux clients ; Chrome accepte encore le point 128 Kio. Ce tableau borne des observations, **pas une limite universelle ou un seuil exact**. Le rejet de curl indique `A value or data field grew larger than allowed`. OBS n’est pas installé dans l’environnement standard inspecté : sa version CEF, Windows/WebView2 et les limites d’autres clients ne sont pas validés. Les 64 Kio ne constituent donc pas un budget produit recommandé.

## Ce que le serveur peut réellement servir

Sources du dépôt, à `89d4618` :

- `app/src-tauri/src/browser_source.rs:66` : `PageLink::on_request(&self, session: &str, query: Option<&str>) -> Vec<(String, String)>` ajoute les contrôles et recueille le heartbeat.
- `browser_source.rs:109` : `respond<R: Runtime>(resolver, page, session, port, method, url, host) -> Answer`. `Answer` contient déjà `status: u16`, `headers` et `body: Vec<u8>`. Le contrôle Host, GET/HEAD, et la restriction des pages HTML sont explicites.
- `browser_source.rs:282` et `:297` : bind `127.0.0.1`, puis une boucle séquentielle `server.incoming_requests()`.
- `browser_source.rs:312` : `Response::from_data(answer.body).with_status_code(answer.status)` ; `:320`, `request.respond(response)` est appelé dans la boucle.
- `browser_source.rs:352` : le setter de contrôles ne stocke qu’une chaîne opaque. Il ne doit pas devenir une voie de stockage des jetons Twitch.

Sources installées de `tiny_http-0.12.0` :

```rust
// src/response.rs:196 ; impl<R: Read> Response<R>
pub fn new(status_code: StatusCode, headers: Vec<Header>, data: R,
    data_length: Option<usize>, additional_headers: Option<Receiver<Header>>) -> Response<R>

// src/request.rs:432
pub fn respond<R>(mut self, response: Response<R>) -> Result<(), IoError>
where R: Read
```

La [documentation de `Response` 0.12.0](https://docs.rs/tiny_http/0.12.0/tiny_http/struct.Response.html#method.new) confirme le corps fourni par un `Read` et la taille optionnelle. Un flux SSE est donc techniquement possible sans nouvelle crate réseau. En revanche, il bloquerait la boucle actuelle pendant sa réponse : il faut un worker borné par client, des annulations, des heartbeats et une politique pour les lecteurs lents. SSE n’est pas un remplacement direct de `Vec<u8>` dans le code actuel.

Le lockfile contient aussi `hyper 1.11.1` et `tokio 1.53.2` comme dépendances transitives ; ils ne sont pas déclarés dans le manifeste de l’app. Les employer directement nécessiterait de déclarer et vérifier leurs features. Une variante SSE sur le **même port** avec `tiny_http` évite une nouvelle origine et le CORS. Un second port demanderait découverte, vérifications d’origine et CORS supplémentaires ; aucun gain identifié ne le justifie ici. Un WebSocket ajouterait la gestion d’upgrade et une bibliothèque adaptée ; il n’apporte pas d’avantage nécessaire à ce flux unidirectionnel.

## Comparaison et sémantique

| Option | Ordre et modération | Page suspendue / entrées perdues | Doublons et deux surfaces | Coût et limites |
|---|---|---|---|---|
| A — journal dans le header à 1 Hz | Un seul journal numéroté doit mêler affichages et purges ; ne jamais transporter les purges sur un canal indépendant. | Époque + séquence ; sur trou, vider uniquement le contenu Twitch et repartir au curseur courant. Ne pas rejouer un vieux journal au premier chargement. | Chaque page mémorise sa séquence ; le desktop garde sa file indépendante et ne consomme pas son propre relais. | S à M ; réutilise les contrôles mais retard nominal jusqu’à 1 s, répétition de données et budget d’en-tête fragile. |
| B — SSE sur le port existant | Même journal ordonné, un seul flux par page ; les identifiants d’événement servent de curseur. | Reconnexion avec curseur ; si trop ancien ou autre époque, événement de réinitialisation Twitch avant reprise. | Une séquence appliquée une fois par page ; pas de rediffusion de la page vers l’overlay ni vers le bot. | M à L ; latence basse, mais workers/concurrence, lecteurs lents, limites de connexions et extinction à construire. Estimation : 200–350 lignes de Rust de production, hors tests, sans nouvelle crate si `tiny_http` suffit. |
| **C — GET JSON à 4 Hz** | **Même journal** ; chaque réponse contient un intervalle contigu d’actions, affichages et purges dans leur ordre d’admission. | Curseur par page, époque de serveur, fenêtre bornée en nombre **et en octets**. Sur trou/expiration : purger Twitch puis prendre le dernier curseur ; ne pas rejouer des actions anciennes. | Déduplication par `(époque, séquence)` sur chaque page. Deux pages jouent indépendamment une fois ; aucune seconde connexion EventSub. | **M** ; route dynamique déjà faisable, réponse courte, budget explicite. Attente nominale 0–250 ms hors réseau/traitement/throttling ; pas de promesse de latence mesurée. Estimation : 120–220 lignes de Rust de production, hors tests. |

Le comportement de rattrapage reprend le principe de `source-controls.ts:34` : une page qui manque plus que le journal conservé abandonne le contenu périmé. Il faut une réinitialisation **Twitch seule**, qui préserve Discord et son item courant. Le décodeur actuel (`decodeSourceControls` dans `browser-source.ts`) ignore les champs inconnus ; une valeur illisible conserve sa baseline. Cette compatibilité aiderait A, sans résoudre son budget de taille.

## Contrat proposé pour C

1. L’overlay conserve la session EventSub et son renouvellement. Après validation de chaque notification, il produit des DTO publics explicitement sélectionnés : `enqueue` Twitch, réaction, purges. Aucun objet auth, dépendance runtime, payload OAuth ou événement Twitch brut n’est sérialisé vers Rust.
2. Point d’attention du plan 112 : `useTwitchEvents` passe actuellement `overlayHealth: "closed"` quand le desktop ne joue pas. Le futur relais doit établir **deux contextes de décision à partir de la même notification validée** : desktop selon sa lecture, source selon son activation. Copier seulement les actions déjà filtrées pour le desktop ferait échouer « Stream uniquement ». Les purges sont admises avant les gates d’affichage.
3. Publier les DTO directement de l’overlay vers une commande Tauri strictement dédiée à cette fenêtre. Ne pas faire dépendre la réception Twitch de l’existence de la fenêtre des paramètres. La commande valide schéma, taille, origine Twitch, URL et limite du lot ; Rust ne reçoit jamais les credentials. Le journal reste en mémoire, borné et éphémère : aucun stockage disque ni log de contenu.
4. Ajouter une route exacte telle que `/twitch-events.json?after=<sequence>&epoch=<id>` sur le port actuel. Conserver les garde-fous Host/méthode du serveur, `Cache-Control: no-store` et un corps JSON avec un schéma versionné. Ne pas élargir les routes HTML. Le serveur reste lié à `127.0.0.1` ; pas de CORS ouvert.
5. Le corps contient `epoch`, bornes de séquence, `reset` et des entrées contiguës. Une réponse ne dépasse jamais son plafond d’octets. Éviter de tronquer silencieusement un lot ; si plusieurs réponses sont nécessaires, donner le prochain curseur. Les plafonds et la durée de rétention seront des constantes testées, à fixer dans le plan de réalisation.
6. La page effectue une seule requête en vol, avec timeout et annulation. Le délai de 250 ms repart après la fin de la précédente, évitant l’empilement ; les requêtes de heartbeat actuelles à 1 Hz restent petites et indépendantes. Si la liveness devient inactive, la page cesse d’afficher Twitch et applique les mêmes règles de silence que les autres players.
7. Une purge et l’enqueue qu’elle vise utilisent le même ordre. En rattrapage, **ne pas afficher un enqueue déjà suivi de sa purge dans le lot** : réduire le lot avant de l’appliquer au store, pour éviter un flash d’un contenu supprimé. Les emotes déjà lancées demandent aussi une identité Twitch/message/auteur si leur retrait est attendu.
8. Reconnexion de compte, changement de chaîne, désactivation de Twitch ou redémarrage créent une nouvelle époque/réinitialisation : aucun affichage de la chaîne précédente. En « Desktop et stream », les deux files gardent leur lecture indépendante et partagent seulement les décisions et la modération.

Le relais par le bot est écarté : il ferait sortir le chat de la machine et demanderait un protocole supplémentaire. Une seconde session Twitch dans la page est écartée : elle exige de transmettre un jeton et introduit un second propriétaire potentiel du refresh. Ces deux options n’ont pas été prototypées.

## Travail et validation du futur plan

Fichiers attendus : `browser_source.rs` (état/journal/route/tests), une permission Tauri réservée à l’overlay et l’enregistrement de sa commande, un contrat public TS pour les actions relayées, `useTwitchEvents.ts` (publication indépendante du playback), `store.ts`/purges/réactions, un hook de lecture dans `windows/browser-source`, les informations du Stream tab, les deux traductions et la copie légale. Ne jamais monter l’auth ou le hook EventSub sous `OverlayStage`.

Tests nécessaires :

- Rust : refus Host/méthodes/chemins, aucun élargissement de la surface HTML, curseurs/époques, bornes en octets, lot invalide, concurrent HEAD/assets/lecture, timeout d’un client lent, absence de champs credentials.
- Bun : validation DTO, réduction d’un lot enqueue→purge, purges message/auteur/tout Twitch préservant Discord, déduplication, trou de journal et changement de compte, admission indépendante du desktop.
- `test/browser/browser-source.spec.ts` et `source-flow.spec.ts` : deux pages, Stream uniquement, desktop masqué, suppression avant affichage et pendant lecture, suspension/reprise, fermeture de l’app, zéro API Tauri et zéro jeton dans page/URL/réponse ; vérifier les anciennes pages avec le même serveur.
- Acceptation native Windows + OBS/CEF réel : lecture sans double son, réaction/modération, charge de chat et reprise. Mesurer latence et coût CPU avant de fixer un SLO. Ni C ni B n’a été implémenté ou benchmarké dans ce spike.

La validation du spike couvre l’encodage des charges, le harnais Rust et les mesures HTTP avec curl et Chrome. Après le rebase, j’ai revérifié l’encodage du profil courant et l’identité du serveur Rust avec celui du harnais initial. Le rapport propose un contrat de relais pour la suite. Les mesures concernent les contrôles HTTP existants.

## Questions pour l’opérateur

- Le délai nominal de 0–250 ms de C convient-il, ou faut-il justifier le coût supplémentaire de SSE par une mesure de latence ?
- Une page suspendue doit-elle abandonner tous ses anciens éléments Twitch lors d’un trou de journal, comme recommandé, plutôt que rattraper du contenu possiblement déjà modéré ?
- Faut-il retirer aussi les emotes déjà en mouvement lors d’une suppression, ce qui exige d’ajouter leur origine et leur identité au modèle de réactions ?
- Quelles versions Windows/OBS doivent former la cible d’acceptation du futur relais ?
