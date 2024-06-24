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
