import { invoke } from "@tauri-apps/api/core";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import i18n from "@/i18n";

export function LangToggle() {
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
			<ToggleGroupItem value="fr" aria-label="Français">
				FR
			</ToggleGroupItem>
			<ToggleGroupItem value="en" aria-label="English">
				EN
			</ToggleGroupItem>
		</ToggleGroup>
	);
}
