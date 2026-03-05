import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { NbCard } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// ─── Types ────────────────────────────────────────────────────────────────────

type UpdateState =
	| { status: "idle" }
	| { status: "checking" }
	| { status: "available"; version: string; releaseUrl: string }
	| { status: "up-to-date" }
	| { status: "error" };

// ─── GitHub API response (minimal) ───────────────────────────────────────────

interface GitHubRelease {
	tag_name: string;
	html_url: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isNewerVersion(latest: string, current: string): boolean {
	const parse = (v: string): [number, number, number] => {
		const parts = v.split(".").map(Number);
		return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
	};
	const [lMaj, lMin, lPatch] = parse(latest);
	const [cMaj, cMin, cPatch] = parse(current);
	if (lMaj !== cMaj) return lMaj > cMaj;
	if (lMin !== cMin) return lMin > cMin;
	return lPatch > cPatch;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UpdateChecker() {
	const { t } = useTranslation();
	const [state, setState] = useState<UpdateState>({ status: "idle" });

	async function handleCheck() {
		setState({ status: "checking" });
		try {
			const [currentVersion, res] = await Promise.all([
				getVersion(),
				fetch("https://api.github.com/repos/SimonHazard/MemeOver/releases/latest"),
			]);

			if (!res.ok) throw new Error(`GitHub API responded with ${res.status}`);

			const data = (await res.json()) as GitHubRelease;
			// Tag format: "app-vX.Y.Z" → "X.Y.Z"
			const latestVersion = data.tag_name.replace(/^app-v/, "");

			if (isNewerVersion(latestVersion, currentVersion)) {
				setState({ status: "available", version: latestVersion, releaseUrl: data.html_url });
			} else {
				setState({ status: "up-to-date" });
			}
		} catch {
			setState({ status: "error" });
		}
	}

	return (
		<NbCard>
			<div className="space-y-4">
				<h2 className="font-display text-base tracking-wide">{t("updater.title")}</h2>

				<Separator />

				<div className="flex items-center gap-3">
					{/* Check / Checking button */}
					<Button
						variant="outline"
						className="flex-1 border-2 border-foreground shadow-[2px_2px_0px_0px_var(--nb-shadow)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all font-display tracking-wide text-xs disabled:opacity-40 disabled:shadow-none"
						onClick={() => void handleCheck()}
						disabled={state.status === "checking"}
					>
						{state.status === "checking" ? t("updater.checking") : t("updater.check")}
					</Button>

					{/* Download button when update is available */}
					{state.status === "available" && (
						<Button
							className="flex-1 border-2 border-foreground shadow-[2px_2px_0px_0px_var(--nb-shadow)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all font-display tracking-wide text-xs"
							onClick={() => void openUrl(state.releaseUrl)}
						>
							{t("updater.download", { version: state.version })}
						</Button>
					)}
				</div>

				{/* Status messages */}
				{state.status === "available" && (
					<p className="text-sm text-muted-foreground font-text">
						{t("updater.available", { version: state.version })}
					</p>
				)}
				{state.status === "up-to-date" && (
					<p className="text-sm text-muted-foreground font-text">{t("updater.upToDate")}</p>
				)}
				{state.status === "error" && (
					<p className="text-sm text-destructive font-text">{t("updater.error")}</p>
				)}
			</div>
		</NbCard>
	);
}
