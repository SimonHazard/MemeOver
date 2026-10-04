import { invoke } from "@tauri-apps/api/core";
import i18n from "./index";

/** Rust builds the tray menu in English; mirror the interface language onto it. */
export function syncTrayLabels(): Promise<void> {
	return invoke("update_tray_labels", {
		showLabel: i18n.t("tray.show"),
		hideLabel: i18n.t("tray.hide"),
		quitLabel: i18n.t("tray.quit"),
	});
}
