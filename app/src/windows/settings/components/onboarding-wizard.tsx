import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Variants } from "framer-motion";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type z from "zod";
import { Button } from "@/components/ui/button";
import { NbCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { loadSettings, persistSettings } from "@/shared/settings";
import { DEFAULT_SETTINGS } from "@/shared/types";
import { SetupSchema, type SetupValues } from "./setup-form/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardingWizardProps {
	onComplete: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 3;

const slideVariants: Variants = {
	enter: (d: number) => ({ x: d * 40, opacity: 0 }),
	center: { x: 0, opacity: 1 },
	exit: (d: number) => ({ x: d * -40, opacity: 0 }),
};

const fieldContainerVariants: Variants = {
	hidden: {},
	visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const fieldVariants: Variants = {
	hidden: { opacity: 0, y: 8 },
	visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

const BTN_NB =
	"border-2 border-foreground shadow-[2px_2px_0px_0px_var(--nb-shadow)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-[box-shadow,transform,opacity] font-display tracking-wide";

// ─── Wizard ───────────────────────────────────────────────────────────────────

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();

	const [step, setStep] = useState(0);
	const [direction, setDirection] = useState(1);

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

	const { mutateAsync: saveConnection, isPending } = useMutation({
		mutationFn: async (values: SetupValues) => {
			const current = await queryClient.fetchQuery({
				queryKey: ["settings"],
				queryFn: loadSettings,
			});
			await persistSettings({ ...current, ...values });
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["settings"] });
			toast.success(t("toast.connectionSaved"));
			advance();
		},
	});

	const form = useForm({
		defaultValues: {
			wsUrl: DEFAULT_SETTINGS.wsUrl,
			guildId: "",
			token: "",
		} satisfies SetupValues,
		onSubmit: async ({ value }) => {
			await saveConnection(value);
		},
	});

	const validateField = (schema: z.ZodType, value: string): string | undefined => {
		const result = schema.safeParse(value);
		return result.success ? undefined : t(result.error.issues[0]?.message ?? "");
	};

	const progress = ((step + 1) / TOTAL_STEPS) * 100;

	return (
		<div className="p-6 min-h-screen flex flex-col items-center justify-center">
			<div className="w-full max-w-xl space-y-6">
				{/* Progress header */}
				<div className="space-y-2">
					<div className="flex items-center justify-between text-sm text-muted-foreground">
						<span>{t("onboarding.step", { current: step + 1, total: TOTAL_STEPS })}</span>
						{step < TOTAL_STEPS - 1 && (
							<button
								type="button"
								onClick={dismiss}
								className="font-display text-xs tracking-wide hover:text-foreground transition-colors"
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

						{step === 1 && (
							<StepConnection>
								{/* ── WebSocket URL ── */}
								<form.Field
									name="wsUrl"
									validators={{
										onBlur: ({ value }) => validateField(SetupSchema.shape.wsUrl, value),
										onSubmit: ({ value }) => validateField(SetupSchema.shape.wsUrl, value),
									}}
								>
									{(field) => (
										<motion.div className="space-y-2" variants={fieldVariants}>
											<Label htmlFor={field.name} className="font-display tracking-wide text-xs">
												{t("connection.wsUrl")}
											</Label>
											<Input
												id={field.name}
												placeholder="ws://localhost:3001/ws"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												className="border-2 border-foreground/40 focus:border-foreground focus-visible:ring-2"
											/>
											{field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
												<p className="text-xs text-destructive font-text">
													{String(field.state.meta.errors[0])}
												</p>
											)}
										</motion.div>
									)}
								</form.Field>

								{/* ── Guild ID ── */}
								<form.Field
									name="guildId"
									validators={{
										onBlur: ({ value }) => validateField(SetupSchema.shape.guildId, value),
										onSubmit: ({ value }) => validateField(SetupSchema.shape.guildId, value),
									}}
								>
									{(field) => (
										<motion.div className="space-y-2" variants={fieldVariants}>
											<Label htmlFor={field.name} className="font-display tracking-wide text-xs">
												{t("connection.guildId")}
											</Label>
											<Input
												id={field.name}
												placeholder="123456789012345678"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												className="border-2 border-foreground/40 focus:border-foreground focus-visible:ring-2"
											/>
											<p className="text-xs text-muted-foreground">
												{t("connection.guildId_hint")}
											</p>
											{field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
												<p className="text-xs text-destructive font-text">
													{String(field.state.meta.errors[0])}
												</p>
											)}
										</motion.div>
									)}
								</form.Field>

								{/* ── Token ── */}
								<form.Field
									name="token"
									validators={{
										onBlur: ({ value }) => validateField(SetupSchema.shape.token, value),
										onSubmit: ({ value }) => validateField(SetupSchema.shape.token, value),
									}}
								>
									{(field) => (
										<motion.div className="space-y-2" variants={fieldVariants}>
											<Label htmlFor={field.name} className="font-display tracking-wide text-xs">
												{t("connection.token")}
											</Label>
											<Input
												id={field.name}
												type="password"
												placeholder="••••••••••••••••"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												className="border-2 border-foreground/40 focus:border-foreground focus-visible:ring-2"
											/>
											{field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
												<p className="text-xs text-destructive font-text">
													{String(field.state.meta.errors[0])}
												</p>
											)}
										</motion.div>
									)}
								</form.Field>
							</StepConnection>
						)}

						{step === 2 && <StepDone />}
					</motion.div>
				</AnimatePresence>

				{/* Navigation */}
				<div className="flex gap-3">
					{step === 1 && (
						<Button variant="outline" onClick={retreat} className={`flex-1 ${BTN_NB}`}>
							{t("onboarding.prev")}
						</Button>
					)}

					{step === 0 && (
						<Button onClick={advance} className={`w-full ${BTN_NB}`}>
							{t("onboarding.next")}
						</Button>
					)}

					{step === 1 && (
						<form.Subscribe selector={(s) => [s.isSubmitting, s.canSubmit] as const}>
							{([isSubmitting, canSubmit]) => (
								<Button
									onClick={() => void form.handleSubmit()}
									disabled={isSubmitting || !canSubmit}
									className={`flex-1 ${BTN_NB}`}
								>
									{isPending ? t("connection.saving") : t("onboarding.next")}
								</Button>
							)}
						</form.Subscribe>
					)}

					{step === 2 && (
						<Button onClick={dismiss} className={`w-full ${BTN_NB}`}>
							{t("onboarding.finish")}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}

// ─── Step components ──────────────────────────────────────────────────────────

// ── StepWelcome ───────────────────────────────────────────────────────────────

function StepWelcome() {
	const { t } = useTranslation();
	return (
		<NbCard>
			<div className="space-y-3">
				<motion.div
					initial={{ rotate: -12, scale: 0 }}
					animate={{ rotate: 0, scale: 1 }}
					transition={{ type: "spring", stiffness: 400, damping: 20 }}
					className="inline-block"
				>
					<Sparkles className="h-12 w-12 text-primary" aria-hidden="true" />
				</motion.div>

				<motion.h1
					initial={{ opacity: 0, x: -10 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.25, ease: "easeOut" }}
					className="font-display text-2xl tracking-wide"
				>
					{t("onboarding.step1_title")}
				</motion.h1>

				<motion.div
					initial={{ scaleX: 0 }}
					animate={{ scaleX: 1 }}
					transition={{ duration: 0.25, ease: "easeOut", delay: 0.05 }}
					style={{ originX: 0 }}
					className="bg-primary h-1.5 w-12 border border-foreground"
				/>

				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.25, ease: "easeOut", delay: 0.1 }}
					className="text-muted-foreground"
				>
					{t("onboarding.step1_desc")}
				</motion.p>
			</div>
		</NbCard>
	);
}

// ── StepConnection ────────────────────────────────────────────────────────────

function StepConnection({ children }: { children: React.ReactNode }) {
	const { t } = useTranslation();
	return (
		<NbCard>
			<div className="space-y-5">
				<div>
					<h2 className="text-xl font-display tracking-wide">{t("onboarding.step2_title")}</h2>
					<p className="text-sm text-muted-foreground mt-1">{t("onboarding.step2_desc")}</p>
				</div>
				<motion.div
					className="space-y-4"
					variants={fieldContainerVariants}
					initial="hidden"
					animate="visible"
				>
					{children}
				</motion.div>
			</div>
		</NbCard>
	);
}

// ── StepDone ──────────────────────────────────────────────────────────────────

const sparklePositions: { style: React.CSSProperties; delay: number }[] = [
	{ style: { position: "absolute", top: "-8px", right: "0px" }, delay: 0.15 },
	{ style: { position: "absolute", bottom: "0px", right: "-8px" }, delay: 0.25 },
	{ style: { position: "absolute", top: "0px", left: "-8px" }, delay: 0.35 },
];

function StepDone() {
	const { t } = useTranslation();
	return (
		<NbCard>
			<div className="text-center space-y-3">
				<div className="relative inline-block mx-auto">
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: [0, 1.1, 1] }}
						transition={{ type: "spring", stiffness: 500, damping: 20 }}
					>
						<CheckCircle className="h-12 w-12 text-primary" aria-hidden="true" />
					</motion.div>
					{sparklePositions.map(({ style, delay }, i) => {
						const key = `${delay}-${i}`;
						return (
							<motion.div
								key={key}
								style={style}
								initial={{ opacity: 0, scale: 0 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ delay, duration: 0.2 }}
							>
								<Sparkles className="h-3 w-3 text-primary" />
							</motion.div>
						);
					})}
				</div>

				<motion.h2
					initial={{ opacity: 0, x: -10 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.25, ease: "easeOut", delay: 0.1 }}
					className="text-xl font-display tracking-wide"
				>
					{t("onboarding.step3_title")}
				</motion.h2>

				<p className="text-muted-foreground">{t("onboarding.step3_desc")}</p>
			</div>
		</NbCard>
	);
}
