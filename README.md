<div align="center">

# MemeOver

**Send memes to your friends' screen, live from Discord.**

A desktop overlay app that pops up images, GIFs, videos and text from a Discord channel — straight onto your friends' screens in real-time.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Latest Release](https://img.shields.io/github/v/release/SimonHazard/MemeOver)](https://github.com/SimonHazard/MemeOver/releases/latest)

[Website](https://memeover.simonhazard.com) · [Download](https://github.com/SimonHazard/MemeOver/releases/latest) · [Report a bug](https://github.com/SimonHazard/MemeOver/issues)

</div>

---

<details>
<summary>🇫🇷 <b>Version française</b></summary>

## Fonctionnement

1. **Invitez le bot** — Ajoutez le bot MemeOver à votre serveur Discord
2. **Configurez** — Lancez `/memeover setup` pour enregistrer votre serveur
3. **Téléchargez l'app** — Installez MemeOver et connectez-le avec vos identifiants
4. **Envoyez des médias** — Postez une image, un GIF, une vidéo ou du texte dans le salon dédié
5. **Surprise !** — Le média apparaît en overlay sur l'écran de vos amis

## Commandes Discord

| Commande | Permission | Description |
|----------|-----------|-------------|
| `/memeover setup [#salon]` | Gérer le serveur | Enregistre le serveur, optionnellement sur un salon spécifique |
| `/memeover token` | Tous | Affiche les identifiants de connexion |
| `/memeover rotate` | Gérer le serveur | Régénère le token de connexion |
| `/memeover remove` | Gérer le serveur | Désinscrit le serveur de MemeOver |

## Développement

### Prérequis

- [Bun](https://bun.sh/)
- [Rust](https://www.rust-lang.org/)

### App (Tauri)

```bash
bun install
bun tauri dev
```

### Bot Discord

```bash
bun install
bun run bot/index.ts
```

### Configuration

Copiez `bot/.env.example` vers `.env` à la racine et renseignez vos valeurs :

```env
DISCORD_TOKEN=votre_token_bot
DISCORD_CLIENT_ID=votre_application_id
```

Variables optionnelles : `WS_PORT`, `LOGTAIL_TOKEN`, `METRICS_TOKEN` (voir `.env.example`).

### Docker (bot uniquement)

```bash
docker-compose up -d --build
```

Ou directement :

```bash
docker run -e DISCORD_TOKEN=xxx -e DISCORD_CLIENT_ID=xxx -p 3001:3001 -d memeover-bot
```

### Structure du projet

```
app/          → Application Tauri (React 19 + Rust)
bot/          → Bot Discord (Bun + Elysia WebSocket)
shared/       → Types de protocole partagés (TypeScript/Zod)
packages/ui/  → Composants UI partagés (shadcn/ui)
site/         → Site web (Astro + Cloudflare Workers)
```

### Déploiement

Consultez les workflows GitHub Actions : [app](.github/workflows/app.yml), [bot](.github/workflows/bot.yml), [site](.github/workflows/deploy-site.yml).

## Discord

Invitez le bot avec les paramètres : `permissions=2147486720&integration_type=0&scope=bot+applications.commands`

## Contribuer

Forkez le repo, ouvrez une PR — toute contribution compte. Consultez les [issues](https://github.com/SimonHazard/MemeOver/issues) pour des idées !

## Licence

Ce projet est sous licence MIT — voir le fichier [LICENSE](LICENSE).

</details>

---

## How it works

1. **Invite the bot** — Add the MemeOver bot to your Discord server
2. **Set up** — Run `/memeover setup` to register your server
3. **Download the app** — Install MemeOver and connect it with your credentials
4. **Send media** — Drop an image, GIF, video, or text in the dedicated Discord channel
5. **Surprise!** — The media appears as an overlay on your friends' screen

## Discord commands

| Command | Permission | Description |
|---------|-----------|-------------|
| `/memeover setup [#channel]` | Manage Server | Register your server, optionally watch a specific channel |
| `/memeover token` | Everyone | Display connection credentials |
| `/memeover rotate` | Manage Server | Regenerate the connection token |
| `/memeover remove` | Manage Server | Unregister your server from MemeOver |

## Development

### Prerequisites

- [Bun](https://bun.sh/)
- [Rust](https://www.rust-lang.org/)

### App (Tauri)

```bash
bun install
bun tauri dev
```

### Discord Bot

```bash
bun install
bun run bot/index.ts
```

### Configuration

Copy `bot/.env.example` to `.env` at the repo root and fill in your values:

```env
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_application_id
```

Optional variables: `WS_PORT`, `LOGTAIL_TOKEN`, `METRICS_TOKEN` (see `.env.example`).

### Docker (bot only)

```bash
docker-compose up -d --build
```

Or directly:

```bash
docker run -e DISCORD_TOKEN=xxx -e DISCORD_CLIENT_ID=xxx -p 3001:3001 -d memeover-bot
```

### Project structure

```
app/          → Tauri desktop app (React 19 + Rust)
bot/          → Discord bot (Bun + Elysia WebSocket)
shared/       → Shared protocol types (TypeScript/Zod)
packages/ui/  → Shared UI components (shadcn/ui)
site/         → Website (Astro + Cloudflare Workers)
```

### Deployment

Check the GitHub Actions workflows: [app](.github/workflows/app.yml), [bot](.github/workflows/bot.yml), [site](.github/workflows/deploy-site.yml).

## Discord

Invite the bot with settings: `permissions=2147486720&integration_type=0&scope=bot+applications.commands`

## Contributing

Fork the repo, open a PR — every contribution matters. Check out the [issues](https://github.com/SimonHazard/MemeOver/issues) for ideas!

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
