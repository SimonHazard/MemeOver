import { Skeleton } from "@memeover/ui/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { loadSettings } from "@/shared/settings";
import { useAppStore } from "@/shared/store";
import { DEFAULT_SETTINGS } from "@/shared/types";
import { OnboardingWizard } from "@/windows/settings/components/onboarding-wizard";
import { SetupForm } from "@/windows/settings/components/setup-form/setup-form";

export function SetupPage() {
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
			<div className="p-5">
				<div className="mx-auto max-w-2xl space-y-5">
					<div className="space-y-1">
						<Skeleton className="h-8 w-36" />
						<Skeleton className="h-4 w-64" />
					</div>
					<Skeleton className="h-64 w-full rounded-xl" />
				</div>
			</div>
		);
	}

	const showWizard = !saved?.guildId && !wizardDismissed;

	if (showWizard) {
		return <OnboardingWizard onComplete={() => setWizardDismissed(true)} />;
	}

	return <SetupForm initialData={saved ?? DEFAULT_SETTINGS} wsStatus={wsStatus} />;
}
