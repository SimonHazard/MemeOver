import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type UpdateState =
	| { status: "idle" }
	| { status: "checking" }
	| { status: "available"; version: string; update: Update }
	| { status: "up-to-date" }
	| { status: "installing" }
	| { status: "error"; message: string };

export function UpdateChecker() {
	const { t } = useTranslation();
	const [state, setState] = useState<UpdateState>({ status: "idle" });

	async function handleCheck() {
		setState({ status: "checking" });
		try {
			const update = await check();
			if (update) {
				setState({ status: "available", version: update.version, update });
			} else {
				setState({ status: "up-to-date" });
			}
		} catch (err) {
			setState({
				status: "error",
				message: err instanceof Error ? err.message : String(err),
			});
		}
	}

	async function handleInstall(update: Update) {
		setState({ status: "installing" });
		try {
			await update.downloadAndInstall();
			await relaunch();
		} catch (err) {
			setState({
				status: "error",
				message: err instanceof Error ? err.message : String(err),
			});
		}
	}

	const isBusy = state.status === "checking" || state.status === "installing";

	return (
		<Card className="p-6">
			<div className="space-y-4">
				<h2 className="text-lg font-semibold">{t("updater.title")}</h2>

				<Separator />

				<div className="flex items-center gap-3">
					<Button
						variant="outline"
						className="flex-1"
						onClick={() => void handleCheck()}
						disabled={isBusy}
					>
						{state.status === "checking" ? t("updater.checking") : t("updater.check")}
					</Button>

					{state.status === "available" && (
						<Button
							className="flex-1"
							disabled={isBusy}
							onClick={() => void handleInstall(state.update)}
						>
							{t("updater.install")}
						</Button>
					)}

					{state.status === "installing" && (
						<Button className="flex-1" disabled>
							{t("updater.installing")}
						</Button>
					)}
				</div>

				{state.status === "available" && (
					<p className="text-sm text-muted-foreground">
						{t("updater.available", { version: state.version })}
					</p>
				)}
				{state.status === "up-to-date" && (
					<p className="text-sm text-muted-foreground">{t("updater.upToDate")}</p>
				)}
				{state.status === "error" && (
					<p className="text-sm text-destructive">{t("updater.error")}</p>
				)}
			</div>
		</Card>
	);
}
