import { Toggle } from "@memeover/ui/components/ui/toggle";
import { NB_TOGGLE } from "@memeover/ui/lib/nb-classes";
import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/components/theme";

export function ThemeToggle() {
	const { t } = useTranslation();
	const { theme, toggleTheme } = useTheme();
	return (
		<Toggle
			pressed={theme === "dark"}
			onClick={(event) => {
				const bounds = event.currentTarget.getBoundingClientRect();
				toggleTheme({ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 });
			}}
			aria-label={t("motion.toggleTheme")}
			className={NB_TOGGLE}
		>
			{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
		</Toggle>
	);
}
