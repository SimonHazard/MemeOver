import { MotionConfig } from "framer-motion";
import React from "react";
import ReactDOM from "react-dom/client";
import i18n from "./i18n";
import { parseBrowserSourceFragment } from "./shared/browser-source";
import { useAppStore } from "./shared/store";
import { DEFAULT_SETTINGS } from "./shared/types";
import { BrowserSourceApp } from "./windows/browser-source/BrowserSourceApp";
import { IncompleteLink } from "./windows/browser-source/incomplete-link";
import { canAutoplayWithSound } from "./windows/browser-source/source-environment";
import "./App.css";

// Browser source entry. It runs in a plain browser (streaming software or a preview tab):
// no Tauri store, events, invoke or window API. Everything comes from the URL fragment,
// which browsers never send to the local server.

document.documentElement.lang = i18n.language;

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

function render(autoplayAllowed: boolean) {
	const config = parseBrowserSourceFragment(window.location.hash);
	if (config) {
		useAppStore.getState().updateSettings({
			...DEFAULT_SETTINGS,
			...(config.profile ?? {}),
			guildId: config.guildId,
			token: config.token,
			wsUrl: config.wsUrl,
			// The desktop's install id: the bot counts this page and the overlay as one streamer.
			clientId: config.clientId ?? "",
			mutedAuthors: config.mutedAuthors,
			hideAnonymous: config.hideAnonymous,
			// These toasts are for the streamer's own screen, never for the stream.
			connectionNotificationsEnabled: false,
			desktopOverlayMuted: false,
		});
	} else if (autoplayAllowed) {
		console.error("[Browser source] Incomplete MemeOver link: copy it again from the Stream tab.");
	}

	root.render(
		<React.StrictMode>
			<MotionConfig reducedMotion="user">
				{config ? (
					<BrowserSourceApp autoplayAllowed={autoplayAllowed} />
				) : autoplayAllowed ? null : (
					<IncompleteLink />
				)}
			</MotionConfig>
		</React.StrictMode>,
	);
}

// A new link starts a fresh session: close the previous socket and discard its
// current media, queued items, reactions and revocation state before joining again.
window.addEventListener("hashchange", () => window.location.reload());
void canAutoplayWithSound().then(render);
