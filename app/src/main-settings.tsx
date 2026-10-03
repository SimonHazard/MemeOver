import { MotionConfig } from "framer-motion";
import React from "react";
import ReactDOM from "react-dom/client";
import { startHistoryAutoPurge } from "./shared/history";
import { initSettingsStore } from "./shared/store";
import { checkForUpdatesInBackground } from "./windows/settings/hooks/useUpdater";
import { SettingsApp } from "./windows/settings/SettingsApp";
import "./App.css";
import "./i18n";

const storedTheme = localStorage.getItem("theme") ?? "dark";
document.documentElement.classList.toggle("dark", storedTheme !== "light");

// Subscribe to ws-status-changed events emitted by the overlay
void initSettingsStore();
startHistoryAutoPurge();

// Ping GitHub for a newer release — flips `updateAvailable` in the store,
// which the TabNav uses to pulse a badge on the "À propos" tab.
void checkForUpdatesInBackground();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<MotionConfig reducedMotion="user">
			<SettingsApp />
		</MotionConfig>
	</React.StrictMode>,
);
