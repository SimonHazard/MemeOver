import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { isValidBrowserSourcePort } from "@/shared/browser-source-port";
import { loadSettings, patchSettings } from "@/shared/settings";
import { useAppStore } from "@/shared/store";
import { refreshBrowserSourceStatus, startBrowserSource } from "@/shared/stream-controls";
import type { Settings } from "@/shared/types";

/** The browser source card's state and actions: the settings, the server and the port draft. */
export function useBrowserSourceControls() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	// Always refetch on mount: the link must reflect a mute made in another tab just before.
	const { data: settings } = useQuery({
		queryKey: ["settings"],
		queryFn: loadSettings,
		staleTime: 0,
	});
	const runningPort = useAppStore((s) => s.browserSourceRunningPort);
	const startError = useAppStore((s) => s.browserSourceError);
	const [portDraft, setPortDraft] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		void refreshBrowserSourceStatus().catch((error) =>
			console.warn("[Browser source] Could not read status:", error),
		);
	}, []);

	const portText = portDraft ?? String(settings?.browserSourcePort ?? "");
	const draftPort = Number(portText);
	const portValid = isValidBrowserSourcePort(draftPort);

	async function save(patch: Partial<Settings>): Promise<Settings | null> {
		try {
			const updated = await patchSettings((s) => ({ ...s, ...patch }));
			await queryClient.invalidateQueries({ queryKey: ["settings"] });
			return updated;
		} catch {
			toast.error(t("toast.settingsError"));
			return null;
		}
	}

	async function toggle(next: boolean) {
		setBusy(true);
		try {
			const updated = await save({ browserSourceEnabled: next });
			if (updated && next) await startBrowserSource(updated.browserSourcePort);
			else useAppStore.setState({ browserSourceError: null });
		} finally {
			setBusy(false);
		}
	}

	async function commitPort() {
		if (!portValid || draftPort === settings?.browserSourcePort) {
			if (portValid) setPortDraft(null);
			return;
		}
		setBusy(true);
		try {
			const updated = await save({ browserSourcePort: draftPort });
			setPortDraft(null);
			if (updated?.browserSourceEnabled && runningPort === null) {
				await startBrowserSource(updated.browserSourcePort);
			}
		} finally {
			setBusy(false);
		}
	}

	async function setDestination(streamDestination: Settings["streamDestination"]) {
		setBusy(true);
		try {
			await save({ streamDestination });
		} finally {
			setBusy(false);
		}
	}

	return {
		settings,
		runningPort,
		startError,
		busy,
		portText,
		portValid,
		setPortDraft,
		toggle,
		commitPort,
		setDestination,
	};
}
