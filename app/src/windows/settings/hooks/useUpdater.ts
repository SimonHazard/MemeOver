import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { useCallback, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UpdateMeta {
	version: string;
	currentVersion: string;
	body: string | null;
	date: string | null;
}

export type UpdaterState =
	| { status: "idle" }
	| { status: "checking" }
	| ({ status: "available" } & UpdateMeta)
	| ({ status: "downloading"; progress: number } & UpdateMeta)
	| ({ status: "ready-to-install" } & UpdateMeta)
	| { status: "up-to-date" }
	| { status: "error"; message: string };

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useUpdater() {
	const [state, setState] = useState<UpdaterState>({ status: "idle" });
	const updateRef = useRef<Update | null>(null);

	/**
	 * Checks GitHub for a newer version using the endpoint in tauri.conf.json.
	 * Returns true + the version string if an update is available.
	 */
	const checkForUpdates = useCallback(async (): Promise<
		{ found: true; version: string } | { found: false }
	> => {
		setState({ status: "checking" });
		try {
			const update = await check();
			if (update) {
				updateRef.current = update;
				setState({
					status: "available",
					version: update.version,
					currentVersion: update.currentVersion,
					body: update.body ?? null,
					date: update.date ?? null,
				});
				return { found: true, version: update.version };
			}
			setState({ status: "up-to-date" });
			return { found: false };
		} catch (err) {
			setState({
				status: "error",
				message: err instanceof Error ? err.message : "Unknown error",
			});
			return { found: false };
		}
	}, []);

	/**
	 * Downloads the update binary, streaming progress events.
	 * Transitions: downloading (0–100%) → ready-to-install.
	 */
	const startDownload = useCallback(async (meta: UpdateMeta): Promise<void> => {
		const update = updateRef.current;
		if (!update) return;

		let downloaded = 0;
		let total = 0;

		setState({ status: "downloading", progress: 0, ...meta });

		try {
			await update.download((event) => {
				switch (event.event) {
					case "Started":
						total = event.data.contentLength ?? 0;
						break;
					case "Progress":
						downloaded += event.data.chunkLength;
						setState((prev) =>
							prev.status === "downloading"
								? {
										...prev,
										progress: total > 0 ? Math.round((downloaded / total) * 100) : 0,
									}
								: prev,
						);
						break;
					case "Finished":
						setState({ status: "ready-to-install", ...meta });
						break;
				}
			});
		} catch (err) {
			setState({
				status: "error",
				message: err instanceof Error ? err.message : "Download failed",
			});
		}
	}, []);

	/** Installs the downloaded update and relaunches the app. */
	const installAndRelaunch = useCallback(async (): Promise<void> => {
		try {
			await updateRef.current?.install();
			await relaunch();
		} catch (err) {
			setState({
				status: "error",
				message: err instanceof Error ? err.message : "Install failed",
			});
		}
	}, []);

	const reset = useCallback(() => {
		updateRef.current = null;
		setState({ status: "idle" });
	}, []);

	return { state, checkForUpdates, startDownload, installAndRelaunch, reset };
}
