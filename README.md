# MemeOver

An overlay application that lets friends send memes to each other in real time from a Discord text channel. With the MemeOver repository, you can create your own Discord bot and connect it to this open-source solution.

## Development

Follow these steps to get the project up and running on your local machine for development and testing purposes.

### Prerequisites

Make sure you have the following software installed:

- [Bun](https://bun.sh/)
- [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/)

### Overlay

The overlay [Tauri](https://v2.tauri.app/) is responsible for displaying the messages received from the Discord channel.

1. **Install dependencies**:

    ```bash
    pnpm install
    ```

2. **Start the development**:

    ```bash
    pnpm tauri dev
    ```

### Bot

The bot [Bun](https://bun.sh/) service listens to a Discord channel and sends the messages to the overlay.

1. **Install dependencies**:

    ```bash
    bun install
    ```

1. **Start the bot**:

    ```bash
    bun dev
    ```

### Deployment

If you wanna see a deploy example, please check the [overlay](.github/workflows/overlay.yml) and the [bot](.github/workflows/bot.yml) workflows

### Configuration

Make sure to configure your container discord bot with correct env :

#### Local

```env
BOT_TOKEN=my_bot_token
APPLICATION_ID=my_discord_application_id
```

#### Docker

`docker run -e BOT_TOKEN=my-bot-token -e APPLICATION_ID=my-application-id -d --name memeover-container -p <port>:<port> <my-image>`

## Discord

Invite your bot to your Discord with the settings `permissions=2147486720&integration_type=0&scope=bot+applications.commands`

## Contributing

If you would like to contribute to MemeOver, please fork the repository and create a pull request with your changes.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
