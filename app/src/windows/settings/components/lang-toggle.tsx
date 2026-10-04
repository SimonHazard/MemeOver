import { ToggleGroup, ToggleGroupItem } from "@memeover/ui/components/ui/toggle-group";
import { NB_TOGGLE_ITEM } from "@memeover/ui/lib/nb-classes";
import { useTranslation } from "react-i18next";
import { syncTrayLabels } from "@/i18n/tray";

export function LangToggle() {
	const { i18n, t } = useTranslation();
	const currentLang = i18n.language.startsWith("fr") ? "fr" : "en";

	function handleChange([value]: string[]) {
		if (!value) return;
		localStorage.setItem("lang", value);
		void i18n.changeLanguage(value).then(() => syncTrayLabels());
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
