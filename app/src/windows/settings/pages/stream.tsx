import { ObsDesktopGuide } from "@/windows/settings/components/stream/obs-desktop-guide";

// ─── Component ────────────────────────────────────────────────────────────────

export function StreamPage() {
	return (
		<div className="p-5">
			<div className="mx-auto max-w-2xl space-y-5">
				<ObsDesktopGuide />
			</div>
		</div>
	);
}
