import { EASE_OUT } from "@memeover/ui/lib/motion";
import { createContext, type ReactNode, useContext, useState } from "react";
import { flushSync } from "react-dom";

// ─── Types ────────────────────────────────────────────────────────────────────

type Theme = "light" | "dark";

interface ThemeCtx {
	theme: Theme;
	toggleTheme: (origin?: { x: number; y: number }) => void;
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

	const toggleTheme = (origin?: { x: number; y: number }) => {
		const next = theme === "dark" ? "light" : "dark",
			root = document.documentElement;
		let applied = false;
		const applyTheme = () => {
			applied = true;
			root.classList.add("theme-switching");
			root.classList.toggle("dark", next === "dark");
			localStorage.setItem("theme", next);
			setTheme(next);
			requestAnimationFrame(() =>
				requestAnimationFrame(() => root.classList.remove("theme-switching")),
			);
		};
		if (
			!document.startViewTransition ||
			window.matchMedia("(prefers-reduced-motion: reduce)").matches
		) {
			applyTheme();
			return;
		}
		const x = origin?.x ?? window.innerWidth / 2,
			y = origin?.y ?? window.innerHeight / 2;
		const radius = Math.hypot(
			Math.max(x, window.innerWidth - x),
			Math.max(y, window.innerHeight - y),
		);
		try {
			const transition = document.startViewTransition(() => flushSync(applyTheme));
			void transition.ready
				.then(() => {
					root.animate(
						{ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
						{
							duration: 360,
							easing: `cubic-bezier(${EASE_OUT.join(",")})`,
							pseudoElement: "::view-transition-new(root)",
						},
					);
				})
				.catch(() => {
					if (!applied) applyTheme();
				});
			void transition.finished.catch(() => {});
		} catch {
			if (!applied) applyTheme();
		}
	};

	return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}
