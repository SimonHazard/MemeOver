# Context: MemeOverlay (Tauri + Discord Bot)

## Vision
Application de bureau "Always-on-top" qui affiche des médias (images/GIFs/vidéos) envoyés depuis un serveur Discord spécifique. Le but est de créer un effet de surprise (pop-up) sur l'écran des utilisateurs de manière fluide et transparente.

## Stack Technique
- **Framework:** Tauri v2 (Rust + React)
- **Frontend:** React, Tailwind CSS, Framer Motion (pour les animations de pop-up)
- **Bot Discord:** Bun runtime, Discord.js, Elysia
- **Communication:** WebSockets (Elysia sur le bot, WebSocket API native côté React)

## Spécificités de l'Overlay & Windows
- **Fenêtre:** Transparente (`transparent: true`), sans bordures (`decorations: false`), toujours au-dessus (`alwaysOnTop: true`).
- **Interactivité:** Mode "Click-through" activé via Rust (`set_ignore_cursor_events(true)`). L'utilisateur ne doit pas pouvoir cliquer sur l'overlay, seulement voir le contenu.
- **Cycle de vie du média:** Apparition (Pop) -> Affichage (X sec) -> Disparition (Fade/Zoom out).

## Architecture des dossiers
- `/app`: Application Tauri, Frontend React (l'overlay et la logique WebSocket client), Code Rust et configuration native Tauri v2.
- `/bot`: Code du bot Discord sous Bun Elysia (serveur WebSocket + écouteur Discord).

## Règles de Développement
- **Langage:** Toujours utiliser **TypeScript** (mode strict) et **Rust**. Privilégie Tailwind CSS pour le style.
- **Gestionnaire de paquets:** Utiliser **Bun** exclusivement pour le JS (`bun add`, `bun run`).
- **Composants:** Séparer la logique de la file d'attente (queue) de l'affichage visuel. Nomme les composants en kebab-case
- **Sécurité:** Ne jamais commiter le `.env` (Discord Token). Utiliser des variables d'environnement.

## Commandes de référence
- **Initialisation:** `bun tauri init`
- **Lancer l'App:** `bun tauri dev`
- **Lancer le Bot:** `bun run bot/index.ts`
- **Build App:** `bun tauri build`

## Règles de Développement (Strict Mode)
- **Zéro "any" :** L'utilisation du type `any` est strictement interdite. Utiliser `unknown` si le type est réellement incertain, ou des `Generics` si nécessaire.
- **Typage des Payloads :** Chaque message WebSocket doit avoir une interface TypeScript dédiée (ex: `MemePayload`, `AuthMessage`).
- **Discriminated Unions :** Utiliser des unions discriminées pour la gestion des messages WebSocket afin de garantir un "type-safety" complet lors du switch sur le type de message.
- **Tauri Commands :** Typer explicitement les arguments et les retours des fonctions Rust invoquées via `invoke()`.