<div align="center">

# MemeOver

**Send memes to your friends' screen, live from Discord.**

MemeOver is a desktop overlay app and Discord bot that lets a group share images,
GIFs, videos, audio, reactions and text directly on each other's screens.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Latest Release](https://img.shields.io/github/v/release/SimonHazard/MemeOver)](https://github.com/SimonHazard/MemeOver/releases/latest)

[Website](https://memeover.simonhazard.com) · [Download](https://github.com/SimonHazard/MemeOver/releases/latest) · [Report a bug](https://github.com/SimonHazard/MemeOver/issues)

</div>

---

<details>
<summary><b>Version francaise</b></summary>

## Ce que fait MemeOver

- Affiche les medias envoyes depuis Discord directement en overlay.
- Prend en charge images, GIFs, videos, audio, stickers, textes et reactions.
- Permet de choisir position, taille, opacite, duree, son et ecran cible.
- Sauvegarde plusieurs profils d'affichage sans inclure les identifiants Discord.
- Conserve un historique local pour rejouer les derniers medias recus.
- Fournit un code `memeover://setup` pour connecter l'app en un copier-coller.
- Se met a jour automatiquement via les releases GitHub.
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
| `/memeover help` | Tous | Liste les commandes disponibles |

## Developpement

### Prerequis

- [Bun](https://bun.sh/)
- [Rust](https://www.rust-lang.org/)

### Installation

```bash
bun install
```

### Configuration locale

Copiez `bot/.env.example` vers `.env` a la racine du repo, puis renseignez :

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

GitHub Actions build et deploie l'app, le bot et le site :

- [Lint workflow](.github/workflows/lint.yml)
- [App workflow](.github/workflows/app.yml)
- [Bot workflow](.github/workflows/bot.yml)
- [Site workflow](.github/workflows/deploy-site.yml)

Le bot peut aussi etre lance avec Docker Compose :

```bash
docker compose up -d --build
```

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
| `/memeover help` | Everyone | List available commands |

## Development

### Prerequisites

- [Bun](https://bun.sh/)
- [Rust](https://www.rust-lang.org/)

### Install

```bash
bun install
```

### Local Configuration

Copy `bot/.env.example` to `.env` at the repository root, then fill in:

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

GitHub Actions build and deploy the app, bot and site:

- [Lint workflow](.github/workflows/lint.yml)
- [App workflow](.github/workflows/app.yml)
- [Bot workflow](.github/workflows/bot.yml)
- [Site workflow](.github/workflows/deploy-site.yml)

The bot can also run with Docker Compose:

```bash
docker compose up -d --build
```

## License

MemeOver is licensed under the MIT License. See [LICENSE](LICENSE).
