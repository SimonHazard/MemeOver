import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { loadSettings, persistSettings } from "@/shared/settings";
import { DEFAULT_SETTINGS } from "@/shared/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConnectionForm {
	guildId: string;
	token: string;
	wsUrl: string;
}

interface OnboardingWizardProps {
	onComplete: () => void;
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 3;

const slideVariants = {
	enter: (d: number) => ({ x: d * 40, opacity: 0 }),
	center: { x: 0, opacity: 1 },
	exit: (d: number) => ({ x: d * -40, opacity: 0 }),
};

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();

	const [step, setStep] = useState(0);
	const [direction, setDirection] = useState(1);
	const [form, setForm] = useState<ConnectionForm>({
		guildId: "",
		token: "",
		wsUrl: DEFAULT_SETTINGS.wsUrl,
	});

	const { mutate: saveConnection, isPending } = useMutation({
		mutationFn: async () => {
			const current = await queryClient.fetchQuery({
				queryKey: ["settings"],
				queryFn: loadSettings,
			});
			await persistSettings({ ...current, ...form });
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["settings"] });
			toast.success(t("toast.connectionSaved"));
			advance();
		},
	});

	function advance() {
		setDirection(1);
		setStep((s) => s + 1);
	}

	function retreat() {
		setDirection(-1);
		setStep((s) => s - 1);
	}

	function dismiss() {
		localStorage.setItem("onboarding-done", "1");
		onComplete();
	}

	const progress = ((step + 1) / TOTAL_STEPS) * 100;
	const canSaveStep1 = !!form.guildId && !!form.token && !!form.wsUrl;

	return (
		<div className="p-6 min-h-screen flex flex-col items-center justify-center">
			<div className="w-full max-w-md space-y-6">
				{/* Progress header */}
				<div className="space-y-2">
					<div className="flex items-center justify-between text-sm text-muted-foreground">
						<span>{t("onboarding.step", { current: step + 1, total: TOTAL_STEPS })}</span>
						{step < TOTAL_STEPS - 1 && (
							<button
								type="button"
								onClick={dismiss}
								className="hover:text-foreground transition-colors"
							>
								{t("onboarding.skip")}
							</button>
						)}
					</div>
					<Progress value={progress} />
				</div>

				{/* Animated step content */}
				<AnimatePresence mode="wait" custom={direction}>
					<motion.div
						key={step}
						custom={direction}
						variants={slideVariants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{ duration: 0.2, ease: "easeOut" }}
					>
						{step === 0 && <StepWelcome />}
						{step === 1 && <StepConnection form={form} setForm={setForm} />}
						{step === 2 && <StepDone />}
					</motion.div>
				</AnimatePresence>

				{/* Navigation */}
				<div className="flex gap-3">
					{step === 1 && (
						<Button variant="outline" onClick={retreat} className="flex-1">
							{t("onboarding.prev")}
						</Button>
					)}

					{step === 0 && (
						<Button onClick={advance} className="w-full">
							{t("onboarding.next")}
						</Button>
					)}

					{step === 1 && (
						<Button
							onClick={() => saveConnection()}
							disabled={isPending || !canSaveStep1}
							className="flex-1"
						>
							{t("onboarding.next")}
						</Button>
					)}

					{step === 2 && (
						<Button onClick={dismiss} className="w-full">
							{t("onboarding.finish")}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}

// ─── Step components ──────────────────────────────────────────────────────────

function StepWelcome() {
	const { t } = useTranslation();
	return (
		<Card className="p-8 text-center space-y-3">
			<div className="text-4xl" aria-hidden="true">
				🎉
			</div>
			<h1 className="text-2xl font-bold">{t("onboarding.step1_title")}</h1>
			<p className="text-muted-foreground">{t("onboarding.step1_desc")}</p>
		</Card>
	);
}

interface StepConnectionProps {
	form: ConnectionForm;
	setForm: React.Dispatch<React.SetStateAction<ConnectionForm>>;
}

function StepConnection({ form, setForm }: StepConnectionProps) {
	const { t } = useTranslation();
	return (
		<Card className="p-6 space-y-5">
			<div>
				<h2 className="text-xl font-semibold">{t("onboarding.step2_title")}</h2>
				<p className="text-sm text-muted-foreground mt-1">{t("onboarding.step2_desc")}</p>
			</div>
			<div className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="ob-wsUrl">{t("connection.wsUrl")}</Label>
					<Input
						id="ob-wsUrl"
						placeholder="ws://localhost:3001/ws"
						value={form.wsUrl}
						onChange={(e) => setForm((f) => ({ ...f, wsUrl: e.target.value }))}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="ob-guildId">{t("connection.guildId")}</Label>
					<Input
						id="ob-guildId"
						placeholder="123456789012345678"
						value={form.guildId}
						onChange={(e) => setForm((f) => ({ ...f, guildId: e.target.value }))}
					/>
					<p className="text-xs text-muted-foreground">{t("connection.guildId_hint")}</p>
				</div>
				<div className="space-y-2">
					<Label htmlFor="ob-token">{t("connection.token")}</Label>
					<Input
						id="ob-token"
						type="password"
						placeholder="••••••••••••••••"
						value={form.token}
						onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))}
					/>
				</div>
			</div>
		</Card>
	);
}

function StepDone() {
	const { t } = useTranslation();
	return (
		<Card className="p-8 text-center space-y-3">
			<div className="text-4xl" aria-hidden="true">
				✅
			</div>
			<h2 className="text-xl font-semibold">{t("onboarding.step3_title")}</h2>
			<p className="text-muted-foreground">{t("onboarding.step3_desc")}</p>
		</Card>
	);
}
