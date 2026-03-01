import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { loadSettings } from "@/shared/settings";
import { DEFAULT_SETTINGS } from "@/shared/types";
import { MediaSettingsForm } from "../components/media-settings-form/form";

interface MediaSettingsProps {
	onBack: () => void;
}

export function MediaSettings({ onBack }: MediaSettingsProps) {
	const { data: saved, isLoading } = useQuery({
		queryKey: ["settings"],
		queryFn: loadSettings,
	});

	if (isLoading) {
		return (
			<div className="p-6">
				<div className="mx-auto max-w-2xl space-y-6">
					<div className="flex items-center gap-3">
						<Skeleton className="h-9 w-24" />
						<Skeleton className="h-8 w-48" />
					</div>
					<Card className="p-6 space-y-6">
						<Skeleton className="h-6 w-24" />
						<div className="h-px bg-muted" />
						{[1, 2, 3].map((i) => (
							<div key={i} className="space-y-3">
								<div className="flex justify-between">
									<Skeleton className="h-4 w-28" />
									<Skeleton className="h-4 w-10" />
								</div>
								<Skeleton className="h-4 w-full rounded-full" />
							</div>
						))}
						<div className="space-y-2">
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-24 w-24" />
						</div>
					</Card>
				</div>
			</div>
		);
	}

	return <MediaSettingsForm initialData={saved ?? DEFAULT_SETTINGS} onBack={onBack} />;
}
