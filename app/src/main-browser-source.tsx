import { MotionConfig } from "framer-motion";
import React from "react";
import ReactDOM from "react-dom/client";
import i18n from "./i18n";
import {
	type BrowserSourceConfig,
	browserSourceDisplayScale,
	parseBrowserSourceFragment,
	scalePixelSettings,
} from "./shared/browser-source";
import { useAppStore } from "./shared/store";
import { DEFAULT_SETTINGS, type Settings } from "./shared/types";
import { detectSourceMode, type SourceMode } from "./windows/browser-source/autoplay";
import { BrowserSourceApp } from "./windows/browser-source/BrowserSourceApp";
import { IncompleteLink } from "./windows/browser-source/incomplete-link";
import { NATURAL_SIZE_ZOOM_VAR } from "./windows/overlay/components/media-display";
import "./App.css";

// Browser source entry. It runs in a plain browser (streaming software or a preview tab):
// no Tauri store, events, invoke or window API. Everything comes from the URL fragment,
// which browsers never send to the local server.

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

/** Seeds the store from the link, with fixed sizes matching this source's size. */
function applyLink(
	config: BrowserSourceConfig,
	moderation: Pick<Settings, "mutedAuthors" | "hideAnonymous">,
) {
	const scale = browserSourceDisplayScale(
		config.referenceSize,
		window.innerWidth,
		window.innerHeight,
	);
	// Tailwind's spacing is in rem: the root font size scales it all at once.
	document.documentElement.style.fontSize = scale === 1 ? "" : `${scale * 100}%`;
	document.documentElement.style.setProperty(NATURAL_SIZE_ZOOM_VAR, String(scale));
	useAppStore.getState().updateSettings(
		scalePixelSettings(
			{
				...DEFAULT_SETTINGS,
				...(config.profile ?? {}),
				guildId: config.guildId,
				token: config.token,
				wsUrl: config.wsUrl,
				// The desktop's install id: the bot counts this page and the overlay as one streamer.
				clientId: config.clientId ?? "",
				mutedAuthors: moderation.mutedAuthors,
				hideAnonymous: moderation.hideAnonymous,
				// These toasts are for the streamer's own screen, never for the stream.
				connectionNotificationsEnabled: false,
			},
			scale,
		),
	);
}

function render(mode: SourceMode) {
	const config = parseBrowserSourceFragment(window.location.hash);
	// The preview aids speak the app's language, not the streaming software's.
	if (config?.language) void i18n.changeLanguage(config.language);
	document.documentElement.lang = i18n.language;
	if (config) {
		applyLink(config, config);
		// Keep the live moderation state: it may be newer than the link's copy.
		window.addEventListener("resize", () => applyLink(config, useAppStore.getState().settings));
	} else if (mode === "stream") {
		console.error("[Browser source] Incomplete MemeOver link: copy it again from the Stream tab.");
	}

	root.render(
		<React.StrictMode>
			<MotionConfig reducedMotion="user">
				{config ? <BrowserSourceApp mode={mode} /> : mode === "preview" ? <IncompleteLink /> : null}
			</MotionConfig>
		</React.StrictMode>,
	);
}

// A new link starts a fresh session: close the previous socket and discard its
// current media, queued items, reactions and revocation state before joining again.
window.addEventListener("hashchange", () => window.location.reload());
void detectSourceMode().then(render);
