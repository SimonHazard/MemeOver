import { useSyncExternalStore } from "react";
import { saveUiPreference, subscribeUiPreference } from "./ui-preferences";

export type Theme = "light" | "dark";

export function getTheme(): Theme {
	const stored = localStorage.getItem("theme");
	if (stored === "light" || stored === "dark") return stored;
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(onChange: () => void) {
	const media = window.matchMedia("(prefers-color-scheme: dark)");
	const stop = subscribeUiPreference("theme", onChange);
	media.addEventListener("change", onChange);
	return () => {
		stop();
		media.removeEventListener("change", onChange);
	};
}

/** Subscribe in either window; an explicit app preference overrides the system theme. */
export function useResolvedTheme() {
	return useSyncExternalStore(subscribe, getTheme);
}

export function saveTheme(theme: Theme) {
	saveUiPreference({ key: "theme", value: theme });
}
