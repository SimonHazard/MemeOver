import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

// ─── Determine initial language ───────────────────────────────────────────────
// Priority: persisted user choice → browser language → fallback "fr"

const saved = localStorage.getItem("lang");
const browser = navigator.language.startsWith("en") ? "en" : "fr";

// ─── Synchronous init (no await — safe at module level) ──────────────────────

i18n.use(initReactI18next).init({
	resources: {
		en: { translation: en },
		fr: { translation: fr },
	},
	lng: saved ?? browser,
	fallbackLng: "fr",
	interpolation: {
		// React already escapes values, so no double-escaping needed
		escapeValue: false,
	},
});

export default i18n;
