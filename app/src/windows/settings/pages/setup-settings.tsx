import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { loadSettings } from "@/shared/settings";
import { useAppStore } from "@/shared/store";
import { DEFAULT_SETTINGS } from "@/shared/types";
import { OnboardingWizard } from "@/windows/settings/components/onboarding-wizard";
import { SetupForm } from "@/windows/settings/components/setup-settings-form/form";

interface SetupSettingsProps {
	onOpenDisplay: () => void;
}

export function SetupSettings({ onOpenDisplay }: SetupSettingsProps) {
	const { data: saved, isLoading } = useQuery({
		queryKey: ["settings"],
		queryFn: loadSettings,
	});

	const wsStatus = useAppStore((s) => s.wsStatus);

	// Show the onboarding wizard when no guild is configured yet.
	// Once dismissed (skip or finish), localStorage prevents re-showing.
	const [wizardDismissed, setWizardDismissed] = useState(
		() => !!localStorage.getItem("onboarding-done"),
	);

	if (isLoading) {
		return (
			<div className="p-6">
				<div className="mx-auto max-w-2xl space-y-6">
					<div className="space-y-1">
						<Skeleton className="h-8 w-36" />
						<Skeleton className="h-4 w-64" />
					</div>
					<Card className="p-6 space-y-6">
						<div className="flex items-center justify-between">
							<Skeleton className="h-6 w-36" />
							<Skeleton className="h-5 w-20 rounded-full" />
						</div>
						<div className="h-px bg-muted" />
						<div className="space-y-4">
							{[1, 2, 3].map((i) => (
								<div key={i} className="space-y-2">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-9 w-full" />
								</div>
							))}
						</div>
						<div className="flex gap-3">
							<Skeleton className="h-9 flex-1" />
							<Skeleton className="h-9 flex-1" />
						</div>
					</Card>
				</div>
			</div>
		);
	}

	const showWizard = !saved?.guildId && !wizardDismissed;

	if (showWizard) {
		return <OnboardingWizard onComplete={() => setWizardDismissed(true)} />;
	}

	return (
		<SetupForm
			initialData={saved ?? DEFAULT_SETTINGS}
			wsStatus={wsStatus}
			onOpenDisplay={onOpenDisplay}
		/>
	);
}
