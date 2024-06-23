# MemeOver

An overlay application that shares images from a Discord channel and displays them in real-time on your overlay.

## Getting Started

Follow these steps to get the project up and running on your local machine for development and testing purposes.

### Prerequisites

Make sure you have the following software installed:

- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io/)
- [Air](https://github.com/cosmtrek/air) (for hot reloading in Go applications)

### Overlay

The overlay electron-js is responsible for displaying the images received from the Discord channel.

1. **Install dependencies**:

    ```bash
    pnpm install
    ```

2. **Start the development**:

    ```bash
    pnpm tauri dev
    ```

### Bot

The bot component listens to a Discord channel and sends the images to the overlay.

1. **Start the bot**:

    ```bash
    air
    ```

Invite the bot to your Discord

`https://discord.com/oauth2/authorize?client_id=1246897287351894158&permissions=2147486720&integration_type=0&scope=bot+applications.commands`

## Configuration

Make sure to configure your Discord bot token and channel ID in the appropriate configuration files.

```env
BOT_TOKEN=my_bot_token
APPLICATION_ID=my_discord_application_id
```

## Contributing

If you would like to contribute to MemeOver, please fork the repository and create a pull request with your changes.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
