import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

const TOGGLE_CLASS = cn(
	"border-2 border-foreground/30",
	"data-[state=on]:bg-primary-400 data-[state=on]:text-black",
	"data-[state=on]:border-foreground data-[state=on]:shadow-[2px_2px_0px_0px_var(--nb-shadow)]",
	"hover:bg-primary-400/15 hover:border-foreground/60",
	"transition-all",
);

export function ThemeToggle() {
	const { theme, toggleTheme } = useTheme();
	return (
		<Toggle
			pressed={theme === "dark"}
			onPressedChange={toggleTheme}
			aria-label="Toggle theme"
			className={TOGGLE_CLASS}
		>
			{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
		</Toggle>
	);
}
