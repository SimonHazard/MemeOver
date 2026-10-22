import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLanguage } from "./language";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

// ─── Determine initial language ───────────────────────────────────────────────
// Priority: persisted user choice → browser language → fallback "fr"

// ─── Synchronous init (no await — safe at module level) ──────────────────────

i18n.use(initReactI18next).init({
	resources: {
		en: { translation: en },
		fr: { translation: fr },
	},
	lng: getLanguage(),
	fallbackLng: "fr",
	interpolation: {
		// React already escapes values, so no double-escaping needed
		escapeValue: false,
	},
});

export default i18n;
