import { NbButton } from "@memeover/ui/components/branded/nb-button";
import { NbCard } from "@memeover/ui/components/branded/nb-card";
import { Input } from "@memeover/ui/components/ui/input";
import { Separator } from "@memeover/ui/components/ui/separator";
import { KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FieldShell } from "./field-shell";

export function ServerConnectCard({
	setupCode,
	onSetupCodeChange,
	onApplySetupCode,
}: {
	setupCode: string;
	onSetupCodeChange: (value: string) => void;
	onApplySetupCode: () => void;
}) {
	const { t } = useTranslation();

	return (
		<NbCard>
			<div className="flex flex-col gap-4">
				<div>
					<h2 className="font-display text-base tracking-wide">{t("server.connect.title")}</h2>
					<p className="mt-1 font-text text-sm text-muted-foreground">{t("server.connect.desc")}</p>
				</div>
				<Separator />
				<FieldShell label={t("server.fields.setupCode")}>
					<Input
						value={setupCode}
						onChange={(event) => onSetupCodeChange(event.target.value)}
						placeholder="memeover://setup?guild_id=..."
					/>
				</FieldShell>
				<NbButton disabled={!setupCode} onClick={onApplySetupCode}>
					<KeyRound className="size-4" aria-hidden="true" />
					{t("server.connect.apply")}
				</NbButton>
			</div>
		</NbCard>
	);
}
