import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NbCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { statusVariant } from "@/shared/helpers";
import { loadSettings, persistSettings } from "@/shared/settings";
import type { Settings, WsStatus } from "@/shared/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SetupFormProps {
	initialData: Settings;
	wsStatus: WsStatus;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SetupForm({ initialData, wsStatus }: SetupFormProps) {
	const queryClient = useQueryClient();
	const { t } = useTranslation();

	const [form, setForm] = useState<Pick<Settings, "guildId" | "token" | "wsUrl">>({
		guildId: initialData.guildId,
		token: initialData.token,
		wsUrl: initialData.wsUrl,
	});

	const { mutate: save, isPending } = useMutation({
		mutationFn: async (partial: Pick<Settings, "guildId" | "token" | "wsUrl">) => {
			const current = await queryClient.fetchQuery({
				queryKey: ["settings"],
				queryFn: loadSettings,
			});
			await persistSettings({ ...current, ...partial });
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["settings"] });
			toast.success(t("toast.connectionSaved"));
		},
	});

	// Toast once when WS transitions into error state
	const prevWsStatusRef = useRef<WsStatus>(wsStatus);
	useEffect(() => {
		if (wsStatus === "error" && prevWsStatusRef.current !== "error") {
			toast.error(t("toast.wsError"));
		}
		prevWsStatusRef.current = wsStatus;
	}, [wsStatus, t]);

	return (
		<div className="p-5">
			<div className="mx-auto max-w-xl space-y-5">
				{/* ── Header ── */}
				<div>
					<h1 className="font-display text-2xl tracking-wide">{t("app.title")}</h1>
					<p className="text-sm text-muted-foreground mt-0.5 font-text">{t("app.subtitle")}</p>
				</div>

				{/* ── WS error alert ── */}
				{wsStatus === "error" && (
					<Alert variant="destructive">
						<AlertDescription>{t("connection.error")}</AlertDescription>
					</Alert>
				)}

				{/* ── Connection Card ── */}
				<NbCard>
					<div className="space-y-5">
						<div className="flex items-center justify-between">
							<h2 className="font-display text-base tracking-wide">{t("connection.title")}</h2>
							<Badge
								variant={statusVariant(wsStatus)}
								className="border-2 border-foreground rounded-md font-display text-xs tracking-wide px-2 py-0.5"
							>
								{t(`status.${wsStatus}`)}
							</Badge>
						</div>

						<Separator />

						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="wsUrl" className="font-display tracking-wide text-xs">
									{t("connection.wsUrl")}
								</Label>
								<Input
									id="wsUrl"
									placeholder="ws://localhost:3001/ws"
									value={form.wsUrl}
									onChange={(e) => setForm((f) => ({ ...f, wsUrl: e.target.value }))}
									className="border-2 border-foreground/40 focus:border-foreground"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="guildId" className="font-display tracking-wide text-xs">
									{t("connection.guildId")}
								</Label>
								<Input
									id="guildId"
									placeholder="123456789012345678"
									value={form.guildId}
									onChange={(e) => setForm((f) => ({ ...f, guildId: e.target.value }))}
									className="border-2 border-foreground/40 focus:border-foreground"
								/>
								<p className="text-xs text-muted-foreground">{t("connection.guildId_hint")}</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="token" className="font-display tracking-wide text-xs">
									{t("connection.token")}
								</Label>
								<Input
									id="token"
									type="password"
									placeholder="••••••••••••••••"
									value={form.token}
									onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))}
									className="border-2 border-foreground/40 focus:border-foreground"
								/>
							</div>
						</div>

						<Button
							onClick={() => save(form)}
							disabled={isPending || !form.guildId || !form.token || !form.wsUrl}
							className="w-full border-2 border-foreground shadow-[3px_3px_0px_0px_var(--nb-shadow)] active:shadow-none active:translate-x-0.75 active:translate-y-0.75 transition-all font-display tracking-wide disabled:opacity-40 disabled:shadow-none"
						>
							{isPending ? t("connection.saving") : t("connection.save")}
						</Button>
					</div>
				</NbCard>
			</div>
		</div>
	);
}
