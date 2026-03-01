import { Moon, Sun } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { useTheme } from "@/shared/theme";

export function ThemeToggle() {
	const { theme, toggleTheme } = useTheme();
	return (
		<Toggle pressed={theme === "dark"} onPressedChange={toggleTheme} aria-label="Changer le thème">
			{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
		</Toggle>
	);
}
