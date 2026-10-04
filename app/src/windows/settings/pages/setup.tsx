import { Skeleton } from "@memeover/ui/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { loadSettings } from "@/shared/settings";
import { useAppStore } from "@/shared/store";
import { DEFAULT_SETTINGS, type Settings } from "@/shared/types";
import { OnboardingWizard } from "@/windows/settings/components/onboarding-wizard";
import { SetupForm } from "@/windows/settings/components/setup-form/setup-form";

export function SetupPage() {
	const { data: saved, isLoading } = useQuery({
		queryKey: ["settings"],
		queryFn: loadSettings,
	});

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

	return <SetupContent saved={saved ?? DEFAULT_SETTINGS} />;
}

function SetupContent({ saved }: { saved: Settings }) {
	const wsStatus = useAppStore((s) => s.wsStatus);
	// Keep an already-started wizard mounted after saving the connection,
	// so its final step remains available until the user finishes or skips it.
	const [showWizard, setShowWizard] = useState(
		() => !saved.guildId && !localStorage.getItem("onboarding-done"),
	);

	if (showWizard) {
		return <OnboardingWizard onComplete={() => setShowWizard(false)} />;
	}

	return <SetupForm initialData={saved} wsStatus={wsStatus} />;
}
