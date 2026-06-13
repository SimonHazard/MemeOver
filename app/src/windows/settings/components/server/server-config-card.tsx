import { NbCard } from "@memeover/ui/components/branded/nb-card";
import { Alert, AlertDescription } from "@memeover/ui/components/ui/alert";
import { Button } from "@memeover/ui/components/ui/button";
import { Input } from "@memeover/ui/components/ui/input";
import { Separator } from "@memeover/ui/components/ui/separator";
import { FolderOpen, Globe2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FieldShell } from "./field-shell";

export function ServerConfigCard({
	installDir,
	port,
	publicWsUrl,
	detectIpPending,
	onInstallDirChange,
	onPortChange,
	onPublicWsUrlChange,
	onChooseInstallDir,
	onDetectIp,
}: {
	installDir: string;
	port: string;
	publicWsUrl: string;
	detectIpPending: boolean;
	onInstallDirChange: (value: string) => void;
	onPortChange: (value: string) => void;
	onPublicWsUrlChange: (value: string) => void;
	onChooseInstallDir: () => void;
	onDetectIp: () => void;
}) {
	const { t } = useTranslation();

	return (
		<NbCard>
			<div className="flex flex-col gap-4">
				<div>
					<h2 className="font-display text-base tracking-wide">{t("server.config.title")}</h2>
					<p className="mt-1 font-text text-sm text-muted-foreground">{t("server.config.desc")}</p>
				</div>
				<Separator />
				<FieldShell label={t("server.fields.installDir")}>
					<div className="flex gap-2">
						<Input
							value={installDir}
							onChange={(event) => onInstallDirChange(event.target.value)}
						/>
						<Button
							type="button"
							variant="outline"
							aria-label={t("server.fields.installDir")}
							onClick={onChooseInstallDir}
						>
							<FolderOpen className="size-4" aria-hidden="true" />
						</Button>
					</div>
				</FieldShell>
				<div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)]">
					<FieldShell label={t("server.fields.port")}>
						<Input value={port} onChange={(event) => onPortChange(event.target.value)} />
					</FieldShell>
					<FieldShell label={t("server.fields.publicWs")}>
						<div className="flex gap-2">
							<Input
								value={publicWsUrl}
								onChange={(event) => onPublicWsUrlChange(event.target.value)}
							/>
							<Button
								type="button"
								variant="outline"
								aria-label={t("server.toast.ipDetected")}
								disabled={detectIpPending}
								onClick={onDetectIp}
							>
								<Globe2 className="size-4" aria-hidden="true" />
							</Button>
						</div>
					</FieldShell>
				</div>
				<Alert>
					<AlertDescription>{t("server.config.networkHint")}</AlertDescription>
				</Alert>
			</div>
		</NbCard>
	);
}
