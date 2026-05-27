import { NbBadge } from "@memeover/ui/components/branded/nb-badge";
import { NbCard } from "@memeover/ui/components/branded/nb-card";
import { Alert, AlertDescription } from "@memeover/ui/components/ui/alert";
import { Button } from "@memeover/ui/components/ui/button";
import { Label } from "@memeover/ui/components/ui/label";
import { Separator } from "@memeover/ui/components/ui/separator";
import { Switch } from "@memeover/ui/components/ui/switch";
import { NB_BTN_DISABLED, NB_BTN_LG } from "@memeover/ui/lib/nb-classes";
import { cn } from "@memeover/ui/lib/utils";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { reloadOverlay, statusVariant } from "@/shared/helpers";
import { loadSettings, persistSettings } from "@/shared/settings";
import { DEFAULT_WS_URL, type Settings, type WsStatus } from "@/shared/types";
import { UserCountIndicator } from "@/windows/settings/components/user-count-indicator";
import { ConnectionCredentialsFields } from "./connection-fields";
import type { SetupValues } from "./schema";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SetupFormProps {
	initialData: Settings;
	wsStatus: WsStatus;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SetupForm({ initialData, wsStatus }: SetupFormProps) {
	const queryClient = useQueryClient();
	const { t } = useTranslation();

	// ── Autostart ─────────────────────────────────────────────────────────────

	const [autostart, setAutostart] = useState<boolean>(false);
	useEffect(() => {
		void isEnabled().then(setAutostart);
	}, []);

	const handleAutostartChange = async (checked: boolean) => {
		try {
			if (checked) {
				await enable();
			} else {
				await disable();
			}
			setAutostart(checked);
		} catch {
			toast.error(t("toast.autostartError"));
		}
	};

	// ── Mutation ──────────────────────────────────────────────────────────────

	const { mutateAsync: save } = useMutation({
		mutationFn: async (values: SetupValues) => {
			const current = await queryClient.fetchQuery({
				queryKey: ["settings"],
				queryFn: loadSettings,
			});
			await persistSettings({ ...current, ...values });
		},
		onSuccess: async () => {
			void queryClient.invalidateQueries({ queryKey: ["settings"] });
			try {
				await reloadOverlay();
			} catch {} // best-effort: overlay may not be open yet
			toast.success(t("toast.connectionSaved"));
		},
		onError: () => {
			toast.error(t("toast.settingsError"));
		},
	});

	// ── Form ──────────────────────────────────────────────────────────────────

	const form = useForm({
		defaultValues: {
			wsUrl: initialData.wsUrl,
			expertMode: initialData.expertMode,
			guildId: initialData.guildId,
			token: initialData.token,
		} satisfies SetupValues,
		onSubmit: async ({ value }) => {
			await save(value);
		},
	});

	return (
		<div className="p-5">
			<div className="mx-auto max-w-2xl space-y-5">
				{/* ── Header ── */}
				<div className="flex items-start justify-between gap-3">
					<div>
						<h1 className="font-display text-2xl tracking-wide">{t("app.title")}</h1>
						<p className="text-sm text-muted-foreground mt-0.5 font-text">{t("app.subtitle")}</p>
					</div>
					<UserCountIndicator wsStatus={wsStatus} />
				</div>

				{/* ── WS error alert ── */}
				{wsStatus === "error" && (
					<Alert variant="destructive">
						<AlertDescription>{t("connection.error")}</AlertDescription>
					</Alert>
				)}

				{/* ── Connection Card ── */}
				<NbCard>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							void form.handleSubmit();
						}}
					>
						<div className="space-y-5">
							<div className="flex items-center justify-between">
								<h2 className="font-display text-base tracking-wide">{t("connection.title")}</h2>
								<NbBadge variant={statusVariant(wsStatus)} className="px-2 py-0.5">
									{t(`status.${wsStatus}`)}
								</NbBadge>
							</div>

							<Separator />

							<div className="space-y-4">
								<ConnectionCredentialsFields
									form={form}
									defaultWsUrl={DEFAULT_WS_URL}
									inputClassName="border-2 border-input focus:border-foreground"
									showExpertToggle
								/>
							</div>

							{/* ── Submit ── */}
							<form.Subscribe selector={(s) => [s.isSubmitting, s.values] as const}>
								{([isSubmitting, values]) => (
									<Button
										type="submit"
										disabled={isSubmitting || !values.wsUrl || !values.guildId || !values.token}
										className={cn(NB_BTN_LG, NB_BTN_DISABLED, "w-full")}
									>
										{isSubmitting ? t("connection.saving") : t("connection.save")}
									</Button>
								)}
							</form.Subscribe>
						</div>
					</form>
				</NbCard>
				{/* ── Autostart Card ── */}
				{/* Le toggle ne passe pas par le TanStack Form intentionnellement : l'autostart est une action système immédiate (write dans le registre/LaunchAgent), pas une valeur à valider et soumettre en batch avec d'autres champs — d'où le useState + useEffect direct.  */}
				<NbCard>
					<div className="flex items-center justify-between gap-4">
						<div className="space-y-0.5">
							<Label
								className="font-display tracking-wide text-sm cursor-pointer"
								htmlFor="autostart"
							>
								{t("settings.autostart")}
							</Label>
							<p className="text-xs text-muted-foreground font-text">
								{t("settings.autostart_hint")}
							</p>
						</div>
						<Switch
							id="autostart"
							checked={autostart}
							onCheckedChange={(checked) => void handleAutostartChange(checked)}
							className="border-2 border-foreground shrink-0"
						/>
					</div>
				</NbCard>
			</div>
		</div>
	);
}
