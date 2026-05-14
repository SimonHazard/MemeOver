import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
	const [dark, setDark] = useState(false);

	useEffect(() => {
		setDark(document.documentElement.classList.contains("dark"));
	}, []);

	function toggle() {
		const next = !dark;
		setDark(next);
		document.documentElement.classList.toggle("dark", next);
		localStorage.setItem("theme", next ? "dark" : "light");
	}

	return (
		<button
			type="button"
			onClick={toggle}
			aria-label="Toggle dark mode"
			className="inline-flex size-10 cursor-pointer items-center justify-center rounded-lg border-2 border-foreground bg-background shadow-[2px_2px_0px_0px_var(--nb-shadow)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-accent active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
		>
			{dark ? (
				<Sun className="size-5" aria-hidden="true" />
			) : (
				<Moon className="size-5" aria-hidden="true" />
			)}
		</button>
	);
}
