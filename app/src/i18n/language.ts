/** Keep the existing preference order: saved choice, then the browser's supported language. */
export function getLanguage(): "en" | "fr" {
	const saved = localStorage.getItem("lang");
	if (saved === "en" || saved === "fr") return saved;
	return navigator.language.startsWith("en") ? "en" : "fr";
}
