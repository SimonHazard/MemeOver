import { createContext, type ReactNode, useContext, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Theme = "light" | "dark";

interface ThemeCtx {
	theme: Theme;
	toggleTheme: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeCtx>({
	theme: "dark",
	toggleTheme: () => {},
});

/** Read the current theme and toggle function. */
export const useTheme = () => useContext(ThemeContext);

// ─── Provider ─────────────────────────────────────────────────────────────────

function getInitialTheme(): Theme {
	return localStorage.getItem("theme") === "light" ? "light" : "dark";
}

/**
 * Wraps children with a theme context.
 * The initial class on `<html>` is applied by main-settings.tsx before React mounts;
 * toggleTheme synchronously updates the DOM class + localStorage.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setTheme] = useState<Theme>(getInitialTheme);

	const toggleTheme = () => {
		setTheme((t) => {
			const next = t === "dark" ? "light" : "dark";
			document.documentElement.classList.toggle("dark", next === "dark");
			localStorage.setItem("theme", next);
			return next;
		});
	};

	return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}
