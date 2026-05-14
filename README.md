<div align="center">

# MemeOver

**Send memes to your friends' screen, live from Discord.**

MemeOver 1.0 is a desktop overlay app and Discord bot that lets a group share images, GIFs, videos, audio, reactions and text directly on each other's screens.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Latest Release](https://img.shields.io/github/v/release/SimonHazard/MemeOver)](https://github.com/SimonHazard/MemeOver/releases/latest)

[Website](https://memeover.simonhazard.com) · [Download](https://github.com/SimonHazard/MemeOver/releases/latest) · [Report a bug](https://github.com/SimonHazard/MemeOver/issues)

</div>

---

<details>
<summary><b>Version francaise</b></summary>

## Ce que fait MemeOver

- Affiche les medias envoyes depuis Discord directement en overlay.
- Prend en charge images, GIFs, videos, audio, textes et reactions.
- Permet de choisir position, taille, opacite, duree et son.
- Sauvegarde plusieurs profils d'affichage selon le contexte.
- Gere les configurations multi-ecrans.
- Conserve un historique pour rejouer un media recu.
- Se met a jour automatiquement via les releases GitHub.
- Fonctionne sur Windows, macOS et Linux.

## Fonctionnement

1. Invitez le bot MemeOver sur votre serveur Discord.
2. Lancez `/memeover setup` pour enregistrer le serveur et le salon a surveiller.
3. Installez l'app desktop et connectez-la avec les identifiants fournis par le bot.
4. Envoyez un media ou un message dans le salon dedie.
5. Le contenu apparait en overlay sur les ecrans connectes.

## Commandes Discord

| Commande | Permission | Description |
| --- | --- | --- |
| `/memeover setup [#salon]` | Gerer le serveur | Enregistre le serveur, optionnellement sur un salon specifique |
| `/memeover token` | Tous | Affiche les identifiants de connexion |
| `/memeover rotate` | Gerer le serveur | Regenere le token de connexion |
| `/memeover remove` | Gerer le serveur | Desinscrit le serveur de MemeOver |

## Developpement

### Prerequis

- [Bun](https://bun.sh/)
- [Rust](https://www.rust-lang.org/)

### Installer les dependances

```bash
bun install
```

### App desktop

```bash
cd app
bun run tauri dev
```

### Site web

```bash
cd site
bun run dev
```

### Bot Discord

```bash
cd bot
bun run dev
```

### Configuration

Copiez `bot/.env.example` vers `.env` a la racine et renseignez vos valeurs :

```env
DISCORD_TOKEN=votre_token_bot
DISCORD_CLIENT_ID=votre_application_id
```

Variables optionnelles : `WS_PORT`, `LOGTAIL_TOKEN`, `METRICS_TOKEN`.

## Structure du projet

```text
app/          App desktop Tauri
bot/          Bot Discord et serveur temps reel
shared/       Types de protocole partages
packages/ui/  Composants UI partages
site/         Site web Astro
```

## Licence

Ce projet est sous licence MIT. Voir [LICENSE](LICENSE).

</details>

---

## Highlights

- Live Discord-to-screen overlay for connected friends.
- Images, GIFs, videos, audio, text and reactions.
- Custom placement, size, opacity, duration and sound.
- Reusable overlay profiles for different sessions.
- Multi-monitor selection.
- History and replay for received media.
- Automatic app updates through GitHub releases.
- Windows, macOS and Linux builds.

## How It Works

1. Invite the MemeOver bot to your Discord server.
2. Run `/memeover setup` to register the server and watched channel.
3. Install the desktop app and connect it with the credentials from the bot.
4. Send media or text in the dedicated Discord channel.
5. The content appears as an overlay on connected screens.

## Discord Commands

| Command | Permission | Description |
| --- | --- | --- |
| `/memeover setup [#channel]` | Manage Server | Register the server, optionally watching a specific channel |
| `/memeover token` | Everyone | Display connection credentials |
| `/memeover rotate` | Manage Server | Regenerate the connection token |
| `/memeover remove` | Manage Server | Unregister the server from MemeOver |

## Development

### Prerequisites

- [Bun](https://bun.sh/)
- [Rust](https://www.rust-lang.org/)

### Install Dependencies

```bash
bun install
```

### Desktop App

```bash
cd app
bun run tauri dev
```

### Website

```bash
cd site
bun run dev
```

### Discord Bot

```bash
cd bot
bun run dev
```

### Configuration

Copy `bot/.env.example` to `.env` at the repo root and fill in your values:

```env
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_application_id
```

Optional variables: `WS_PORT`, `LOGTAIL_TOKEN`, `METRICS_TOKEN`.

## Project Structure

```text
app/          Tauri desktop app
bot/          Discord bot and realtime server
shared/       Shared protocol types
packages/ui/  Shared UI components
site/         Astro website
```

## Deployment

GitHub Actions build and deploy the app, bot and site:

- [App workflow](.github/workflows/app.yml)
- [Bot workflow](.github/workflows/bot.yml)
- [Site workflow](.github/workflows/deploy-site.yml)

## License

MemeOver is licensed under the MIT License. See [LICENSE](LICENSE).
