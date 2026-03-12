import { en, type Translations } from "./en";
import { fr } from "./fr";

const translations: Record<string, Translations> = { en, fr };

type NestedKeyOf<T> = T extends string
	? ""
	: {
			[K in keyof T & string]: T[K] extends string
				? K
				: T[K] extends ReadonlyArray<unknown>
					? K
					: `${K}.${NestedKeyOf<T[K]>}`;
		}[keyof T & string];

type LeafKeys = NestedKeyOf<Translations>;

function getNestedValue(obj: unknown, path: string): string {
	const parts = path.split(".");
	let current: unknown = obj;
	for (const part of parts) {
		if (current === null || current === undefined) return path;
		current = (current as Record<string, unknown>)[part];
	}
	return typeof current === "string" ? current : path;
}

export function t(lang: string, key: LeafKeys): string {
	const dict = translations[lang] ?? en;
	return getNestedValue(dict, key);
}

export function getTranslations(lang: string): Translations {
	return translations[lang] ?? en;
}

export type { Translations };
export type Locale = "en" | "fr";

export function getLangFromUrl(url: URL): Locale {
	const [, lang] = url.pathname.split("/");
	if (lang === "fr") return "fr";
	return "en";
}

export function getLocalizedPath(lang: Locale, path: string): string {
	if (lang === "en") return path;
	return `/${lang}${path}`;
}
