<div align="center">

# MemeOver

**Send memes to your friends' screen, live from Discord.**

MemeOver is a desktop overlay app and Discord bot that lets a group share images,
GIFs, videos, audio, reactions and text directly on each other's screens. Inspired by
Cacabox's LiveChat, which ran through OBS for streamers, MemeOver is a standalone app
that works without streaming.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Latest Release](https://img.shields.io/github/v/release/SimonHazard/MemeOver)](https://github.com/SimonHazard/MemeOver/releases/latest)

[Website](https://memeover.simonhazard.com) · [Download](https://github.com/SimonHazard/MemeOver/releases/latest) · [Report a bug](https://github.com/SimonHazard/MemeOver/issues)

</div>

---

<details>
<summary><b>Version francaise</b></summary>

## Ce que fait MemeOver

Projet inspire du LiveChat de la Cacabox, qui fonctionnait avec OBS pour les streamers :
MemeOver est une application autonome qui fonctionne sans streamer.

- Affiche les medias envoyes depuis Discord directement en overlay.
- Prend en charge images, GIFs, videos, audio, stickers, textes et reactions.
- Permet de choisir position, taille, opacite, duree, son et ecran cible.
- Sauvegarde plusieurs profils d'affichage sans inclure les identifiants Discord.
- Conserve un historique local pour rejouer les derniers medias recus.
- Fournit un code `memeover://setup` pour connecter l'app en un copier-coller.
- Se met a jour automatiquement via les releases GitHub.
- Cree votre bot self-host depuis l'onglet Serveur de l'app.
- Envoie un media anonyme avec `/memeover secret` et affiche l'etat avec `/memeover status`.
- Demarre dans le tray a l'ouverture de session.
- Lit les GIF Discord au format video (gifv).
- Fonctionne sur Windows, macOS et Linux.

## Fonctionnement

1. Invitez le bot MemeOver sur votre serveur Discord.
2. Lancez `/memeover setup` pour enregistrer le serveur, ou `/memeover setup #salon` pour surveiller un salon precis.
3. Copiez le bloc `App setup code` dans l'app desktop.
4. Envoyez un media, un message ou une reaction dans un salon surveille.
5. Le contenu apparait sur les overlays connectes.

Par defaut, l'app utilise le bot heberge. Pour du self-host, activez le mode expert
dans l'app et fournissez votre propre URL WebSocket.

## Commandes Discord

| Commande | Permission | Description |
| --- | --- | --- |
| `/memeover setup [#salon]` | Gerer le serveur | Enregistre le serveur; sans salon, tous les salons sont surveilles |
| `/memeover token` | Tous | Affiche les identifiants et le setup code, visibles uniquement par vous |
| `/memeover rotate` | Gerer le serveur | Demande confirmation, regenere le token et invalide l'ancien |
| `/memeover remove` | Gerer le serveur | Demande confirmation puis desinscrit le serveur de MemeOver |
| `/memeover bots enabled:<true\|false>` | Gerer le serveur | Autorise ou masque les messages et reactions des bots/apps |
| `/memeover secret [media] [url] [text]` | Tous | Envoie un media anonyme aux overlays connectes |
| `/memeover status` | Gerer le serveur | Affiche configuration, salons surveilles, overlays actifs et uptime |
| `/memeover pause duration:<5m\|15m\|30m\|1h\|2h\|indefinite>` | Gerer le serveur | Met en pause la diffusion; les événements sont ignorés |
| `/memeover resume` | Gerer le serveur | Reprend la diffusion |
| `/memeover help` | Tous | Liste les commandes disponibles |

## Developpement

Les [idées produit](docs/feature-ideas.md) restent hors du périmètre à développer tant qu'elles ne font pas l'objet d'une demande explicite.

### Prerequis

- [Bun](https://bun.sh/) 1.4.2+ (CI et Docker utilisent 1.4.2 ; l’application vérifie ce minimum pour le bot local)
- [Rust](https://www.rust-lang.org/)

### Installation

```bash
bun install
```

### Configuration locale

Pour `bun run dev:bot`, copiez `bot/.env.example` vers `bot/.env`, puis renseignez :
Pour Docker Compose, utilisez un `.env` a la racine du repo.

```env
DISCORD_TOKEN=votre_token_bot
DISCORD_CLIENT_ID=votre_application_id
```

Dans le Discord Developer Portal, activez aussi `Bot > Privileged Gateway Intents > Message Content Intent`.
Sans cet intent, Discord refuse la connexion avec `Used disallowed intents`.

Variables optionnelles :

```env
WS_PORT=3001
PUBLIC_WS_URL=wss://bot-memeover.simonhazard.com/ws
LOGTAIL_TOKEN=
METRICS_TOKEN=
PUBLIC_BOT_CLIENT_ID=
```

`PUBLIC_WS_URL` est incluse dans les setup codes generes par le bot. Pour le site,
`PUBLIC_BOT_CLIENT_ID` sert a construire les liens d'invitation du bot.

### Scripts utiles

```bash
bun run dev:app       # App desktop Tauri
bun run dev:bot       # Bot Discord + serveur WebSocket
bun run dev:site      # Site Astro
bun run lint          # Biome lint read-only
bun run check         # Biome check read-only
bun run check:fix     # Biome check avec corrections
bun run typecheck     # TypeScript bot/app/shared/ui
bun run test          # Tests Bun cibles
```

## Structure du projet

```text
app/          App desktop Tauri
bot/          Bot Discord et serveur temps reel
shared/       Types, schemas et constantes partages
packages/ui/  Composants UI partages
site/         Site web Astro
```

## Deploiement

GitHub Actions vérifie le projet, prépare les releases de l’application et déploie le site :

- [CI](.github/workflows/ci.yml)
- [App release](.github/workflows/app-release.yml)
- [Site deploy](.github/workflows/site-deploy.yml)
- [Site refresh after an app release](.github/workflows/site-refresh.yml)

La CI vérifie le code, les typages et les tests rapides pour chaque PR. Elle construit
l’app et le site et lance les tests longs selon les fichiers modifiés. Le contrôle
`status` regroupe les résultats, y compris le build Docker du bot, et doit être configuré
comme obligatoire avant fusion. Le build Docker de validation ne publie aucune image.
Sur `main`, le job `bot-image` publie l’image GHCR seulement après la réussite de `status`.
Les runners Ubuntu de CI utilisent 24.04 et les actions JavaScript utilisent Node 24.
Les PR externes et Dependabot exécutent uniquement la CI, sans preview ni déploiement
Cloudflare. Les previews sont réservées aux PR internes au dépôt.

Publier une release `app-v*` déclenche automatiquement le build et le déploiement du site
depuis `main`, avec la version dans le nom du run. Créer un brouillon de release
ne déclenche pas ce rafraîchissement.

Après la réussite complète de `ci` pour un push sur `main`, `app-release` prépare une
release brouillon uniquement si la version n’existe pas déjà. Les builds et le tag
utilisent le commit exact validé par cette CI, même si `main` avance entre-temps.
Une CI en échec ou annulée et les CI de PR ne déclenchent aucun build de release.

Avant de préparer une release, `bun run check:versions` vérifie les versions app/Tauri/site
et les versions des workspaces dans les lockfiles. La distribution Linux est construite
sur Ubuntu 22.04 ; cette base fixe le minimum de compilation visé, sans garantir toutes
les distributions Linux.

Le bot peut aussi etre lance avec Docker Compose :

```bash
docker compose up -d --build
```

Le déploiement du bot reste manuel : `git pull --ff-only`, la commande Compose ci-dessus,
puis `docker compose ps` et `docker compose logs --tail=100 bot`. Le bot lancé depuis
l’onglet Serveur utilise les sources et une version stable de Bun 1.4.2 ou plus récente ;
« Installer Bun » installe 1.4.2 si aucune version compatible n’est trouvée.

## Licence

Ce projet est sous licence MIT. Voir [LICENSE](LICENSE).

</details>

---

## Highlights

- Live Discord-to-screen overlay for connected friends.
- Images, GIFs, videos, audio, stickers, text and reactions.
- Custom placement, size, opacity, duration, sound and target screen.
- Reusable overlay profiles that do not include Discord credentials.
- Local history and replay for recently displayed media.
- One-paste `memeover://setup` connection code from Discord.
- Automatic app updates through GitHub releases.
- Self-hosted server creator in the app's Server tab.
- Anonymous `/memeover secret` sends and `/memeover status` server information.
- Start on login in the tray.
- Discord video-backed GIF (gifv) playback.
- Windows, macOS and Linux builds.

## How It Works

1. Invite the MemeOver bot to your Discord server.
2. Run `/memeover setup` to register the server, or `/memeover setup #channel` to watch one channel.
3. Paste the `App setup code` into the desktop app.
4. Send media, text or reactions in a watched Discord channel.
5. The content appears as an overlay on connected screens.

The desktop app uses the hosted bot by default. For self-hosting, enable expert
mode in the app and provide your own WebSocket URL.

## Discord Commands

| Command | Permission | Description |
| --- | --- | --- |
| `/memeover setup [#channel]` | Manage Server | Register the server; omit channel to watch all channels |
| `/memeover token` | Everyone | Display credentials and setup code, visible only to you |
| `/memeover rotate` | Manage Server | Confirm, then regenerate the connection token and invalidate the previous one |
| `/memeover remove` | Manage Server | Confirm, then unregister the server from MemeOver |
| `/memeover bots enabled:<true\|false>` | Manage Server | Allow or mute messages and reactions from bots/apps |
| `/memeover secret [media] [url] [text]` | Everyone | Send an anonymous media item to connected overlays |
| `/memeover status` | Manage Server | Show configuration, watched channels, active overlays and uptime |
| `/memeover pause duration:<5m\|15m\|30m\|1h\|2h\|indefinite>` | Manage Server | Pause broadcasts; incoming events are dropped |
| `/memeover resume` | Manage Server | Resume broadcasts |
| `/memeover help` | Everyone | List available commands |

## Development

The [product ideas](docs/feature-ideas.md) remain outside the implementation scope until explicitly requested.

### Prerequisites

- [Bun](https://bun.sh/) 1.4.2+ (CI and Docker use 1.4.2; the app checks this minimum for the local bot)
- [Rust](https://www.rust-lang.org/)

### Install

```bash
bun install
```

### Local Configuration

For `bun run dev:bot`, copy `bot/.env.example` to `bot/.env`, then fill in:
For Docker Compose, use a `.env` at the repository root.

```env
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_application_id
```

In the Discord Developer Portal, also enable `Bot > Privileged Gateway Intents > Message Content Intent`.
Without this intent, Discord rejects the connection with `Used disallowed intents`.

Optional variables:

```env
WS_PORT=3001
PUBLIC_WS_URL=wss://bot-memeover.simonhazard.com/ws
LOGTAIL_TOKEN=
METRICS_TOKEN=
PUBLIC_BOT_CLIENT_ID=
```

`PUBLIC_WS_URL` is embedded in setup codes generated by the bot. For the website,
`PUBLIC_BOT_CLIENT_ID` builds the bot invite links.

### Useful Scripts

```bash
bun run dev:app       # Tauri desktop app
bun run dev:bot       # Discord bot + WebSocket server
bun run dev:site      # Astro website
bun run lint          # Biome lint, read-only
bun run check         # Biome check, read-only
bun run check:fix     # Biome check with fixes
bun run typecheck     # TypeScript bot/app/shared/ui
bun run test          # Targeted Bun tests
```

## Project Structure

```text
app/          Tauri desktop app
bot/          Discord bot and realtime server
shared/       Shared protocol types, schemas and constants
packages/ui/  Shared UI components
site/         Astro website
```

## Deployment

GitHub Actions checks the project, prepares app releases and deploys the site:

- [CI](.github/workflows/ci.yml)
- [App release](.github/workflows/app-release.yml)
- [Site deploy](.github/workflows/site-deploy.yml)
- [Site refresh after an app release](.github/workflows/site-refresh.yml)

CI checks formatting, types and fast tests for every PR. It builds the app and site
and runs longer tests according to the changed files. Configure the aggregate `status`
check, including the bot Docker build, as required before merging. The validation Docker
build does not publish an image. External and Dependabot PRs run CI only, without
Cloudflare previews or deployments. Previews are limited to PRs within this repository.
On `main`, `bot-image` publishes the GHCR image only after `status` succeeds.
Ubuntu CI runners use 24.04 and JavaScript actions use Node 24.

Publishing an `app-v*` release automatically builds and deploys the site from `main`,
with the version in the run name. Creating a release draft does not trigger this refresh.

After `ci` fully succeeds for a push to `main`, `app-release` prepares a draft release
only if the version does not already exist. Builds and the tag use the exact commit
validated by that CI, even if `main` advances in the meantime. Failed or cancelled CI
runs and pull request CI runs do not trigger release builds.

Before preparing a release, `bun run check:versions` checks app/Tauri/site versions and
workspace versions in the lockfiles. Linux releases are built on Ubuntu 22.04; this fixes
the intended build baseline without guaranteeing support for every Linux distribution.

The bot can also run with Docker Compose:

```bash
docker compose up -d --build
```

Bot deployment stays manual: `git pull --ff-only`, the Compose command above, then
`docker compose ps` and `docker compose logs --tail=100 bot`. The Server tab runs the bot
from source with a stable Bun 1.4.2 or newer; "Install Bun" installs 1.4.2 when no
compatible version is found.

## License

MemeOver is licensed under the MIT License. See [LICENSE](LICENSE).
