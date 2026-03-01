import React from "react";
import ReactDOM from "react-dom/client";
import { initSettingsStore } from "./shared/store";
import { SettingsApp } from "./windows/settings/SettingsApp";
import "./App.css";
// i18n must be imported before any component that uses useTranslation()
import "./i18n";

const storedTheme = localStorage.getItem("theme") ?? "dark";
document.documentElement.classList.toggle("dark", storedTheme !== "light");

// Subscribe to ws-status-changed events emitted by the overlay
void initSettingsStore();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<SettingsApp />
	</React.StrictMode>,
);
