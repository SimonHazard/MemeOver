import { MotionConfig } from "framer-motion";
import React from "react";
import ReactDOM from "react-dom/client";
import { parseObsSourceFragment } from "./shared/obs-source";
import { useAppStore } from "./shared/store";
import { DEFAULT_SETTINGS } from "./shared/types";
import { IncompleteLink } from "./windows/obs/incomplete-link";
import { ObsApp } from "./windows/obs/ObsApp";
import { IN_OBS } from "./windows/obs/obs-browser";
import "./App.css";
import "./i18n";

// OBS browser source entry. It runs in a plain browser (OBS's CEF or a preview tab):
// no Tauri store, events, invoke or window API. Everything comes from the URL fragment,
// which browsers never send to the local server.

const CLIENT_ID_KEY = "memeover-obs-client-id";
let memoryClientId: string | null = null;

/** One stable id per browser profile, so the bot counts this page as a single client. */
function obsClientId(): string {
	try {
		const saved = localStorage.getItem(CLIENT_ID_KEY);
		if (saved && saved.length >= 8) return saved;
		const created = crypto.randomUUID();
		localStorage.setItem(CLIENT_ID_KEY, created);
		return created;
	} catch {
		memoryClientId ??= crypto.randomUUID();
		return memoryClientId;
	}
}

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

function render() {
	const config = parseObsSourceFragment(window.location.hash);
	if (config) {
		useAppStore.getState().updateSettings({
			...DEFAULT_SETTINGS,
			...(config.profile ?? {}),
			guildId: config.guildId,
			token: config.token,
			wsUrl: config.wsUrl,
			clientId: obsClientId(),
			desktopOverlayMuted: false,
		});
	} else if (IN_OBS) {
		console.error("[OBS] Incomplete MemeOver link: copy it again from the Stream tab.");
	}

	root.render(
		<React.StrictMode>
			<MotionConfig reducedMotion="user">
				{config ? <ObsApp /> : IN_OBS ? null : <IncompleteLink />}
			</MotionConfig>
		</React.StrictMode>,
	);
}

window.addEventListener("hashchange", render);
render();
