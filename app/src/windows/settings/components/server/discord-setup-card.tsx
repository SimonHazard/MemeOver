import { NbButton } from "@memeover/ui/components/branded/nb-button";
import { NbCard } from "@memeover/ui/components/branded/nb-card";
import { Alert, AlertDescription } from "@memeover/ui/components/ui/alert";
import { Input } from "@memeover/ui/components/ui/input";
import { Separator } from "@memeover/ui/components/ui/separator";
import { Switch } from "@memeover/ui/components/ui/switch";
import { Clipboard, ExternalLink, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FieldShell } from "./field-shell";

export function DiscordSetupCard({
	discordClientId,
	discordToken,
	administratorInvite,
	inviteUrl,
	onDiscordClientIdChange,
	onDiscordTokenChange,
	onAdministratorInviteChange,
	onOpenPortal,
	onOpenInvite,
	onCopyInvite,
}: {
	discordClientId: string;
	discordToken: string;
	administratorInvite: boolean;
	inviteUrl: string | null;
	onDiscordClientIdChange: (value: string) => void;
	onDiscordTokenChange: (value: string) => void;
	onAdministratorInviteChange: (value: boolean) => void;
	onOpenPortal: () => void;
	onOpenInvite: () => void;
	onCopyInvite: () => void;
}) {
	const { t } = useTranslation();

	return (
		<NbCard>
			<div className="flex flex-col gap-4">
				<div className="flex items-start justify-between gap-3">
					<div>
						<h2 className="font-display text-base tracking-wide">{t("server.discord.title")}</h2>
						<p className="mt-1 font-text text-sm text-muted-foreground">
							{t("server.discord.desc")}
						</p>
					</div>
					<NbButton size="sm" variant="outline" onClick={onOpenPortal}>
						<ExternalLink className="size-3.5" aria-hidden="true" />
						{t("server.discord.portal")}
					</NbButton>
				</div>

				<Separator />

				<div className="grid gap-3 md:grid-cols-2">
					<FieldShell label={t("server.fields.clientId")}>
						<Input
							value={discordClientId}
							onChange={(event) => onDiscordClientIdChange(event.target.value)}
							placeholder="123456789012345678"
						/>
					</FieldShell>
					<FieldShell label={t("server.fields.botToken")}>
						<Input
							type="password"
							value={discordToken}
							onChange={(event) => onDiscordTokenChange(event.target.value)}
							placeholder="xxxxxxxxxxxxxxxx"
						/>
					</FieldShell>
				</div>

				<div className="flex items-center justify-between gap-3 rounded-lg border-2 border-border p-3">
					<div className="flex flex-col gap-1">
						<span className="font-display text-xs tracking-wide">
							{t("server.discord.adminInvite")}
						</span>
						<span className="font-text text-xs text-muted-foreground">
							{t("server.discord.adminInviteHint")}
						</span>
					</div>
					<Switch checked={administratorInvite} onCheckedChange={onAdministratorInviteChange} />
				</div>

				<div className="flex flex-wrap gap-2">
					<NbButton disabled={!inviteUrl} onClick={onOpenInvite}>
						<ShieldCheck className="size-4" aria-hidden="true" />
						{t("server.discord.invite")}
					</NbButton>
					<NbButton variant="outline" disabled={!inviteUrl} onClick={onCopyInvite}>
						<Clipboard className="size-4" aria-hidden="true" />
						{t("server.copy")}
					</NbButton>
				</div>

				<Alert>
					<AlertDescription>{t("server.discord.instructions")}</AlertDescription>
				</Alert>
			</div>
		</NbCard>
	);
}
