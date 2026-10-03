import { NbButton } from "@memeover/ui/components/branded/nb-button";
import { NbCard } from "@memeover/ui/components/branded/nb-card";
import { NbSwitch } from "@memeover/ui/components/branded/nb-switch";
import { Avatar, AvatarFallback, AvatarImage } from "@memeover/ui/components/ui/avatar";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { formatDate } from "@/shared/helpers";
import { removeMutedAuthor } from "@/shared/muted-authors";
import { loadSettings, patchSettings } from "@/shared/settings";
export function MutedAuthorsCard() {
	const { t } = useTranslation(),
		queryClient = useQueryClient();
	const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: loadSettings });
	const { mutate: unmute, isPending } = useMutation({
		mutationFn: (id: string) =>
			patchSettings((s) => ({ ...s, mutedAuthors: removeMutedAuthor(s.mutedAuthors, id) })),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["settings"] });
			toast.success(t("toast.authorUnmuted"));
		},
		onError: () => toast.error(t("toast.settingsError")),
	});
	const { mutate: hideAnonymous, isPending: isSaving } = useMutation({
		mutationFn: (hideAnonymous: boolean) => patchSettings((s) => ({ ...s, hideAnonymous })),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["settings"] });
		},
		onError: () => toast.error(t("toast.settingsError")),
	});
	if (!settings) return null;
	return (
		<NbCard className="space-y-3">
			<div>
				<h2 className="font-display text-sm">{t("history.mutedAuthorsTitle")}</h2>
				<p className="text-xs text-muted-foreground">{t("history.mutedAuthorsHint")}</p>
			</div>
			{settings.mutedAuthors.map((a) => (
				<div key={a.id} className="flex items-center gap-3">
					<Avatar className="h-8 w-8">
						<AvatarImage src={a.avatarUrl} alt="" />
						<AvatarFallback>{a.username.charAt(0)}</AvatarFallback>
					</Avatar>
					<div className="flex-1 min-w-0">
						<p className="font-display text-sm truncate">{a.username || a.id}</p>
						<p className="text-xs text-muted-foreground">
							{t("history.mutedOn", { date: formatDate(a.mutedAt) })}
						</p>
					</div>
					<NbButton variant="outline" size="sm" disabled={isPending} onClick={() => unmute(a.id)}>
						{t("history.unmute")}
					</NbButton>
				</div>
			))}
			<div className="flex items-center justify-between gap-3">
				<div>
					<label htmlFor="hide-anonymous" className="font-display text-sm">
						{t("history.hideAnonymous")}
					</label>
					<p className="text-xs text-muted-foreground">{t("history.hideAnonymousHint")}</p>
				</div>
				<NbSwitch
					id="hide-anonymous"
					checked={settings.hideAnonymous}
					disabled={isSaving}
					onCheckedChange={(checked) => hideAnonymous(checked)}
				/>
			</div>
		</NbCard>
	);
}
