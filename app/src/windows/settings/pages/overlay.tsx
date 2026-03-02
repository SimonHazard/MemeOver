import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { loadSettings } from "@/shared/settings";
import { DEFAULT_SETTINGS } from "@/shared/types";
import { OverlayForm } from "../components/overlay-form";

// ─── Page ─────────────────────────────────────────────────────────────────────

export function OverlayPage() {
	const { data: saved, isLoading } = useQuery({
		queryKey: ["settings"],
		queryFn: loadSettings,
	});

	if (isLoading) {
		return (
			<div className="p-5">
				<div className="mx-auto max-w-xl space-y-5">
					<Skeleton className="h-36 w-full rounded-xl" />
					<Skeleton className="h-96 w-full rounded-xl" />
				</div>
			</div>
		);
	}

	return <OverlayForm initialData={saved ?? DEFAULT_SETTINGS} />;
}
