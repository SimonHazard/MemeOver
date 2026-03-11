import { Toggle } from "@memeover/ui/components/ui/toggle";
import { NB_TOGGLE } from "@memeover/ui/lib/nb-classes";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme";

export function ThemeToggle() {
	const { theme, toggleTheme } = useTheme();
	return (
		<Toggle
			pressed={theme === "dark"}
			onPressedChange={toggleTheme}
			aria-label="Toggle theme"
			className={NB_TOGGLE}
		>
			{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
		</Toggle>
	);
}
