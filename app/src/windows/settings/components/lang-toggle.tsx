import { ToggleGroup, ToggleGroupItem } from "@memeover/ui/components/ui/toggle-group";
import { NB_TOGGLE_ITEM } from "@memeover/ui/lib/nb-classes";
import { useTranslation } from "react-i18next";
import { syncTrayLabels } from "@/i18n/tray";
import { saveUiPreference } from "@/shared/ui-preferences";

export function LangToggle() {
	const { i18n, t } = useTranslation();
	const currentLang = i18n.language.startsWith("fr") ? "fr" : "en";

	function handleChange([value]: string[]) {
		if (value !== "en" && value !== "fr") return;
		void i18n
			.changeLanguage(value)
			.then(() => {
				saveUiPreference({ key: "lang", value });
				return syncTrayLabels();
			})
			.catch((error) => console.warn("[i18n] Could not apply language preference", error));
	}

	return (
		<ToggleGroup
			value={[currentLang]}
			onValueChange={handleChange}
			aria-label={t("about.language")}
		>
			<ToggleGroupItem value="fr" aria-label="Français" className={NB_TOGGLE_ITEM}>
				FR
			</ToggleGroupItem>
			<ToggleGroupItem value="en" aria-label="English" className={NB_TOGGLE_ITEM}>
				EN
			</ToggleGroupItem>
		</ToggleGroup>
	);
}
