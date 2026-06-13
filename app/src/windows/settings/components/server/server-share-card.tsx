import { NbButton } from "@memeover/ui/components/branded/nb-button";
import { NbCard } from "@memeover/ui/components/branded/nb-card";
import { Separator } from "@memeover/ui/components/ui/separator";
import { Clipboard } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ServerShareCard({
	friendSetupCode,
	onCopySetupCode,
}: {
	friendSetupCode: string | null;
	onCopySetupCode: () => void;
}) {
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
				<NbButton disabled={!friendSetupCode} onClick={onCopySetupCode}>
					<Clipboard className="size-4" aria-hidden="true" />
					{t("server.share.copy")}
				</NbButton>
			</div>
		</NbCard>
	);
}
