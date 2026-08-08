import { NbButton } from "@memeover/ui/components/branded/nb-button";
import { NbCard } from "@memeover/ui/components/branded/nb-card";
import { Progress } from "@memeover/ui/components/ui/progress";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Transition, Variants } from "framer-motion";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { loadSettings, persistSettings } from "@/shared/settings";
import { DEFAULT_SETTINGS } from "@/shared/types";
import { ConnectionCredentialsFields } from "@/windows/settings/components/setup-form/connection-fields";
import type { SetupValues } from "./setup-form/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardingWizardProps {
	onComplete: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 3;

const normalSlideVariants: Variants = {
	enter: (d: number) => ({ x: d * 40, opacity: 0 }),
	center: { x: 0, opacity: 1 },
	exit: (d: number) => ({ x: d * -40, opacity: 0 }),
};

const reducedSlideVariants: Variants = {
	enter: { opacity: 0 },
	center: { opacity: 1 },
	exit: { opacity: 0 },
};

const normalFieldContainerVariants: Variants = {
	hidden: {},
	visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const reducedFieldContainerVariants: Variants = {
	hidden: {},
	visible: {},
};

const normalFieldVariants: Variants = {
	hidden: { opacity: 0, y: 8 },
	visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

const reducedFieldVariants: Variants = {
	hidden: { opacity: 0 },
	visible: { opacity: 1, transition: { duration: 0.12, ease: [0.23, 1, 0.32, 1] } },
};

const reducedFadeTransition: Transition = {
	duration: 0.12,
	ease: [0.23, 1, 0.32, 1],
};

// ─── Wizard ───────────────────────────────────────────────────────────────────

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const reduceMotion = useReducedMotion() === true;

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
			expertMode: DEFAULT_SETTINGS.expertMode,
			guildId: "",
			token: "",
		} satisfies SetupValues,
		onSubmit: async ({ value }) => {
			await saveConnection(value);
		},
	});

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
						variants={reduceMotion ? reducedSlideVariants : normalSlideVariants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={reduceMotion ? reducedFadeTransition : { duration: 0.2, ease: "easeOut" }}
					>
						{step === 0 && <StepWelcome reduceMotion={reduceMotion} />}

						{step === 1 && (
							<StepConnection reduceMotion={reduceMotion}>
								<ConnectionCredentialsFields
									form={form}
									defaultWsUrl={DEFAULT_SETTINGS.wsUrl}
									inputClassName="border-2 border-foreground/40 focus:border-foreground focus-visible:ring-2"
									forceWsUrlVisible
									renderFieldShell={(children) => (
										<motion.div
											className="flex flex-col gap-2"
											variants={reduceMotion ? reducedFieldVariants : normalFieldVariants}
										>
											{children}
										</motion.div>
									)}
								/>
							</StepConnection>
						)}

						{step === 2 && <StepDone reduceMotion={reduceMotion} />}
					</motion.div>
				</AnimatePresence>

				{/* Navigation */}
				<div className="flex gap-3">
					{step === 1 && (
						<NbButton variant="outline" className="flex-1" onClick={retreat}>
							{t("onboarding.prev")}
						</NbButton>
					)}

					{step === 0 && (
						<NbButton className="w-full" onClick={advance}>
							{t("onboarding.next")}
						</NbButton>
					)}

					{step === 1 && (
						<form.Subscribe selector={(s) => [s.isSubmitting, s.canSubmit] as const}>
							{([isSubmitting, canSubmit]) => (
								<NbButton
									className="flex-1"
									onClick={() => void form.handleSubmit()}
									disabled={isSubmitting || !canSubmit}
								>
									{isPending ? t("connection.saving") : t("onboarding.next")}
								</NbButton>
							)}
						</form.Subscribe>
					)}

					{step === 2 && (
						<NbButton className="w-full" onClick={dismiss}>
							{t("onboarding.finish")}
						</NbButton>
					)}
				</div>
			</div>
		</div>
	);
}

// ─── Step components ──────────────────────────────────────────────────────────

// ── StepWelcome ───────────────────────────────────────────────────────────────

function StepWelcome({ reduceMotion }: { reduceMotion: boolean }) {
	const { t } = useTranslation();
	return (
		<NbCard>
			<div className="space-y-3">
				<motion.div
					initial={reduceMotion ? { opacity: 0 } : { opacity: 0, rotate: -12, scale: 0.72 }}
					animate={reduceMotion ? { opacity: 1 } : { opacity: 1, rotate: 0, scale: 1 }}
					exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
					transition={
						reduceMotion ? reducedFadeTransition : { type: "spring", duration: 0.3, bounce: 0.18 }
					}
					className="inline-block"
				>
					<Sparkles className="h-12 w-12 text-primary" aria-hidden="true" />
				</motion.div>

				<motion.h1
					initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -10 }}
					animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
					transition={reduceMotion ? reducedFadeTransition : { duration: 0.25, ease: "easeOut" }}
					className="font-display text-2xl tracking-wide"
				>
					{t("onboarding.step1_title")}
				</motion.h1>

				<motion.div
					initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scaleX: 0.75 }}
					animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scaleX: 1 }}
					exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scaleX: 0.8 }}
					transition={
						reduceMotion ? reducedFadeTransition : { duration: 0.25, ease: "easeOut", delay: 0.05 }
					}
					style={{ originX: 0 }}
					className="bg-primary h-1.5 w-12 border border-foreground"
				/>

				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={
						reduceMotion ? reducedFadeTransition : { duration: 0.25, ease: "easeOut", delay: 0.1 }
					}
					className="text-muted-foreground"
				>
					{t("onboarding.step1_desc")}
				</motion.p>
			</div>
		</NbCard>
	);
}

// ── StepConnection ────────────────────────────────────────────────────────────

function StepConnection({
	children,
	reduceMotion,
}: {
	children: React.ReactNode;
	reduceMotion: boolean;
}) {
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
					variants={reduceMotion ? reducedFieldContainerVariants : normalFieldContainerVariants}
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

function StepDone({ reduceMotion }: { reduceMotion: boolean }) {
	const { t } = useTranslation();
	return (
		<NbCard>
			<div className="text-center space-y-3">
				<div className="relative inline-block mx-auto">
					<motion.div
						initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.72 }}
						animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
						exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
						transition={
							reduceMotion
								? reducedFadeTransition
								: { type: "spring", duration: 0.36, bounce: 0.22 }
						}
					>
						<CheckCircle className="h-12 w-12 text-primary" aria-hidden="true" />
					</motion.div>
					{sparklePositions.map(({ style, delay }, i) => {
						const key = `${delay}-${i}`;
						return (
							<motion.div
								key={key}
								style={style}
								initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
								animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
								exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
								transition={reduceMotion ? reducedFadeTransition : { delay, duration: 0.2 }}
							>
								<Sparkles className="h-3 w-3 text-primary" />
							</motion.div>
						);
					})}
				</div>

				<motion.h2
					initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -10 }}
					animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
					transition={
						reduceMotion ? reducedFadeTransition : { duration: 0.25, ease: "easeOut", delay: 0.1 }
					}
					className="text-xl font-display tracking-wide"
				>
					{t("onboarding.step3_title")}
				</motion.h2>

				<p className="text-muted-foreground">{t("onboarding.step3_desc")}</p>
			</div>
		</NbCard>
	);
}
