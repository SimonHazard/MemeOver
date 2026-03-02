import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const ITEM_CLASS = [
	"border-2 border-foreground/30",
	"data-[state=on]:bg-primary-400 data-[state=on]:text-black",
	"data-[state=on]:border-foreground data-[state=on]:shadow-[2px_2px_0px_0px_var(--nb-shadow)]",
	"hover:bg-primary-400/15 hover:border-foreground/60",
	"transition-all font-display text-xs tracking-wide",
].join(" ");

export function LangToggle() {
	const { i18n } = useTranslation();
	const currentLang = i18n.language.startsWith("fr") ? "fr" : "en";

	function handleChange(value: string) {
		if (!value) return;
		localStorage.setItem("lang", value);
		void i18n.changeLanguage(value).then(() => {
			void invoke("update_tray_labels", {
				showLabel: i18n.t("tray.show"),
				quitLabel: i18n.t("tray.quit"),
			});
		});
	}

	return (
		<ToggleGroup type="single" value={currentLang} onValueChange={handleChange} aria-label="Langue">
			<ToggleGroupItem value="fr" aria-label="Français" className={ITEM_CLASS}>
				FR
			</ToggleGroupItem>
			<ToggleGroupItem value="en" aria-label="English" className={ITEM_CLASS}>
				EN
			</ToggleGroupItem>
		</ToggleGroup>
	);
}
