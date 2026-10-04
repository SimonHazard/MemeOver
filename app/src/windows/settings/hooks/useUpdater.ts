import { invoke } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { useCallback, useRef, useState } from "react";
import { loadSettings } from "@/shared/settings";
import { useAppStore } from "@/shared/store";
import type { StagedUpdate } from "@/shared/types";

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
	/** Downloaded in the background by the auto-updater, applied on the next launch. */
	| ({ status: "staged" } & UpdateMeta)
	| { status: "up-to-date" }
	| { status: "error"; message: string };

// ─── Hook ────────────────────────────────────────────────────────────────────

function stagedMeta(staged: StagedUpdate): UpdateMeta {
	return { ...staged, date: null };
}

export function useUpdater() {
	const [state, setState] = useState<UpdaterState>({ status: "idle" });
	const updateRef = useRef<Update | null>(null);
	const staged = useAppStore((s) => s.stagedUpdate);

	/**
	 * Checks GitHub for a newer version using the endpoint in tauri.conf.json.
	 * Returns true + the version string if an update is available.
	 */
	const checkForUpdates = useCallback(async (): Promise<
		{ found: true; version: string } | { found: false }
	> => {
		const alreadyStaged = useAppStore.getState().stagedUpdate;
		if (alreadyStaged) {
			setState({ status: "staged", ...stagedMeta(alreadyStaged) });
			return { found: false };
		}
		setState({ status: "checking" });
		try {
			const update = await check();
			if (update) {
				updateRef.current = update;
				useAppStore.getState().setUpdateAvailable(true);
				setState({
					status: "available",
					version: update.version,
					currentVersion: update.currentVersion,
					body: update.body ?? null,
					date: update.date ?? null,
				});
				return { found: true, version: update.version };
			}
			useAppStore.getState().setUpdateAvailable(false);
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

	/** Applies the background-staged update now instead of waiting for the next launch. */
	const restartWithStaged = useCallback(async (): Promise<void> => {
		try {
			await invoke("auto_update_restart_now");
		} catch (err) {
			setState({
				status: "error",
				message: err instanceof Error ? err.message : String(err),
			});
		}
	}, []);

	const reset = useCallback(() => {
		updateRef.current = null;
		setState({ status: "idle" });
	}, []);

	// A background stage can finish while this hook is idle (About page already open).
	const effectiveState: UpdaterState =
		staged && (state.status === "idle" || state.status === "up-to-date")
			? { status: "staged", ...stagedMeta(staged) }
			: state;

	return {
		state: effectiveState,
		checkForUpdates,
		startDownload,
		installAndRelaunch,
		restartWithStaged,
		reset,
	};
}

// ─── Background check ────────────────────────────────────────────────────────

/** Re-check cadence for long-running sessions (the app mostly lives in the tray). */
export const BACKGROUND_UPDATE_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Downloads and verifies the latest release in Rust without interrupting the
 * overlay. It is applied on the next launch (on quit for Windows).
 * Returns false when staging failed so callers can fall back to a plain check.
 */
export async function stageUpdateInBackground(): Promise<boolean> {
	try {
		const staged = await invoke<StagedUpdate | null>("auto_update_stage");
		if (staged) useAppStore.getState().setStagedUpdate(staged);
		return true;
	} catch (err) {
		console.warn("[Updater] Background download failed:", err);
		return false;
	}
}

/**
 * Runs an update check outside of any React component (called from
 * main-settings.tsx on launch and periodically). With automatic updates on,
 * the release is staged for the next launch; otherwise only the shared
 * `updateAvailable` flag flips so the TabNav pulses a dot on "À propos".
 */
export async function checkForUpdatesInBackground(): Promise<void> {
	const autoUpdate = await loadSettings()
		.then((settings) => settings.autoUpdate)
		.catch(() => false);
	if (useAppStore.getState().stagedUpdate) return;
	// Dev builds keep the manual flow: staging is a no-op in Rust there.
	if (autoUpdate && import.meta.env.PROD && (await stageUpdateInBackground())) return;
	try {
		const update = await check();
		useAppStore.getState().setUpdateAvailable(update !== null);
	} catch (err) {
		console.warn("[Updater] Background check failed:", err);
	}
}
