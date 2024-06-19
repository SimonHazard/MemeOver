import path from "node:path";
import {
	BrowserWindow,
	type BrowserWindowConstructorOptions,
	app,
} from "electron";

const browserWindowConstructorOptions: BrowserWindowConstructorOptions =
	app.isPackaged
		? {
				x: 50,
				y: 50,
				focusable: false,
				alwaysOnTop: true,
				frame: false,
				autoHideMenuBar: true,
				transparent: true,
			}
		: {};

export const createWindow = () => {
	// Create the browser window.
	const mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		useContentSize: true,
		...browserWindowConstructorOptions,
		webPreferences: {
			nodeIntegration: true,
			preload: path.join(__dirname, "preload.js"),
		},
	});

	if (app.isPackaged) {
		mainWindow.setIgnoreMouseEvents(true);
	}

	// and load the index.html of the app.
	if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
		mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
	} else {
		mainWindow.loadFile(
			path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
		);
	}

	// Open the DevTools.
	mainWindow.webContents.openDevTools();
};
