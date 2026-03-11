import { ToggleGroup, ToggleGroupItem } from "@memeover/ui/components/ui/toggle-group";
import { NB_TOGGLE_ITEM } from "@memeover/ui/lib/nb-classes";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";

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
			<ToggleGroupItem value="fr" aria-label="Français" className={NB_TOGGLE_ITEM}>
				FR
			</ToggleGroupItem>
			<ToggleGroupItem value="en" aria-label="English" className={NB_TOGGLE_ITEM}>
				EN
			</ToggleGroupItem>
		</ToggleGroup>
	);
}
