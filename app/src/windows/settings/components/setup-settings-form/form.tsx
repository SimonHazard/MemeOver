import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
	clearQueue,
	overlayHealthVariant,
	quitOverlay,
	reloadOverlay,
	showOverlay,
	statusVariant,
} from "@/shared/helpers";
import { loadSettings, persistSettings } from "@/shared/settings";
import { useAppStore } from "@/shared/store";
import type { Settings, WsStatus } from "@/shared/types";
import { LangToggle } from "@/windows/settings/components/lang-toggle";
import { ThemeToggle } from "@/windows/settings/components/theme-toggle";
import { UpdateChecker } from "@/windows/settings/components/update-checker";

interface SetupFormProps {
	initialData: Settings;
	wsStatus: WsStatus;
	onOpenDisplay: () => void;
}

export function SetupForm({ initialData, wsStatus, onOpenDisplay }: SetupFormProps) {
	const queryClient = useQueryClient();
	const { t } = useTranslation();
	const navigate = useNavigate();

	const overlayHealth = useAppStore((s) => s.overlayHealth);
	const queueSize = useAppStore((s) => s.queueSize);

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

	const overlayAlive = overlayHealth === "alive";

	return (
		<div className="p-6">
			<div className="mx-auto max-w-2xl space-y-6">
				<div className="flex items-start justify-between">
					<div>
						<h1 className="text-2xl font-bold tracking-tight">{t("app.title")}</h1>
						<p className="text-sm text-muted-foreground mt-1">{t("app.subtitle")}</p>
					</div>
					<div className="flex items-center gap-2">
						<LangToggle />
						<ThemeToggle />
					</div>
				</div>

				{wsStatus === "error" && (
					<Alert variant="destructive">
						<AlertDescription>{t("connection.error")}</AlertDescription>
					</Alert>
				)}

				{/* ── Connexion ── */}
				<Card className="p-6">
					<div className="space-y-6">
						<div className="flex items-center justify-between">
							<h2 className="text-lg font-semibold">{t("connection.title")}</h2>
							<Badge variant={statusVariant(wsStatus)}>{t(`status.${wsStatus}`)}</Badge>
						</div>

						<Separator />

						<div className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="wsUrl">{t("connection.wsUrl")}</Label>
								<Input
									id="wsUrl"
									placeholder="ws://localhost:3001/ws"
									value={form.wsUrl}
									onChange={(e) => setForm((f) => ({ ...f, wsUrl: e.target.value }))}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="guildId">{t("connection.guildId")}</Label>
								<Input
									id="guildId"
									placeholder="123456789012345678"
									value={form.guildId}
									onChange={(e) => setForm((f) => ({ ...f, guildId: e.target.value }))}
								/>
								<p className="text-xs text-muted-foreground">{t("connection.guildId_hint")}</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="token">{t("connection.token")}</Label>
								<Input
									id="token"
									type="password"
									placeholder="••••••••••••••••"
									value={form.token}
									onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))}
								/>
							</div>
						</div>

						<Button
							onClick={() => save(form)}
							disabled={isPending || !form.guildId || !form.token || !form.wsUrl}
							className="w-full"
						>
							{isPending ? t("connection.saving") : t("connection.save")}
						</Button>
					</div>
				</Card>

				{/* ── Contrôles overlay ── */}
				<Card className="p-6">
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<h2 className="text-lg font-semibold">{t("overlay.controls")}</h2>
							<Badge variant={overlayHealthVariant(overlayHealth)}>
								{t(`health.${overlayHealth}`)}
							</Badge>
						</div>

						<Separator />

						<div className="grid grid-cols-3 gap-2">
							<Button variant="outline" className="w-full" onClick={() => void showOverlay()}>
								{t("overlay.show")}
							</Button>
							<Button
								variant="outline"
								className="w-full"
								disabled={!overlayAlive}
								onClick={() => void reloadOverlay()}
							>
								{t("overlay.reload")}
							</Button>
							<Button
								variant="destructive"
								className="w-full"
								disabled={!overlayAlive}
								onClick={() => void quitOverlay()}
							>
								{t("overlay.close")}
							</Button>
						</div>
					</div>
				</Card>

				{/* ── File d'attente + Navigation ── */}
				<Card className="p-6">
					<div className="space-y-4">
						<div className="flex items-center gap-2">
							<h2 className="text-lg font-semibold">{t("actions.title")}</h2>
							{queueSize > 0 && (
								<Badge variant="secondary">{t("actions.queueSize", { count: queueSize })}</Badge>
							)}
						</div>

						<Separator />

						<div className="grid grid-cols-2 gap-3">
							<Button variant="outline" className="w-full" onClick={() => void clearQueue()}>
								{t("actions.clearQueue")}
							</Button>
							<Button variant="secondary" className="w-full gap-1.5" onClick={onOpenDisplay}>
								{t("actions.displaySettings")}
								<ChevronRight className="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								className="w-full col-span-2 gap-1.5"
								onClick={() => void navigate({ to: "/history" })}
							>
								{t("actions.history")}
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</Card>

				{/* ── Mises à jour ── */}
				<UpdateChecker />
			</div>
		</div>
	);
}
