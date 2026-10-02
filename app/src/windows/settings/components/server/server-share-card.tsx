import { NbCard } from "@memeover/ui/components/branded/nb-card";
import { Separator } from "@memeover/ui/components/ui/separator";
import { useTranslation } from "react-i18next";
import { CopyButton } from "@/components/motion/copy-button";

export function ServerShareCard({ friendSetupCode }: { friendSetupCode: string | null }) {
	const { t } = useTranslation();

	return (
		<NbCard>
			<div className="flex flex-col gap-4">
				<div>
					<h2 className="font-display text-base tracking-wide">{t("server.share.title")}</h2>
					<p className="mt-1 font-text text-sm text-muted-foreground">{t("server.share.desc")}</p>
				</div>
				<Separator />
				<div className="rounded-md border-2 border-foreground bg-muted p-3">
					<pre className="whitespace-pre-wrap break-all font-mono text-xs">
						{friendSetupCode ?? t("server.share.empty")}
					</pre>
				</div>
				<CopyButton
					value={friendSetupCode ?? ""}
					label={t("server.share.copy")}
					disabled={!friendSetupCode}
				/>
			</div>
		</NbCard>
	);
}
