import { useEffect } from "react";
import { subscribeUiPreference } from "@/shared/ui-preferences";
import i18n from "./index";
import { getLanguage } from "./language";

/** Mount once per window. Hiding a window keeps synchronization; unmounting releases it. */
export function useLanguageSync() {
	useEffect(() => {
		const sync = () => {
			const language = getLanguage();
			document.documentElement.lang = language;
			if (i18n.language !== language) {
				void i18n
					.changeLanguage(language)
					.catch((error) => console.warn("[i18n] Could not synchronize language", error));
			}
		};
		const stop = subscribeUiPreference("lang", sync);
		sync();
		return stop;
	}, []);
}
