import { NbCard } from "@memeover/ui/components/branded/nb-card";
import type { Settings } from "@/shared/types";
import { FullscreenCompatibilityNotice } from "./fullscreen-compatibility-notice";
import { AppearanceSection } from "./sections/appearance-section";
import { FormActions } from "./sections/form-actions";
import { MediaTypesSection } from "./sections/media-types-section";
import { OverlayControls } from "./sections/overlay-controls";
import { PlacementSection } from "./sections/placement-section";
import { StickyPreview } from "./sections/sticky-preview";
import { TextSection } from "./sections/text-section";
import { TimingSoundSection } from "./sections/timing-sound-section";
import { useOverlayForm } from "./use-overlay-form";

export interface OverlayFormProps {
	initialData: Settings;
}

export function OverlayForm({ initialData }: OverlayFormProps) {
	const { form, isPending } = useOverlayForm(initialData);

	return (
		<div className="p-5">
			<div className="mx-auto max-w-4xl space-y-5">
				{/* ── Fullscreen compatibility notice ── */}
				<FullscreenCompatibilityNotice />

				{/* ── Overlay Controls (orthogonal to form state) ── */}
				<NbCard>
					<OverlayControls />
				</NbCard>

				{/* ── Settings form ── */}
				<form
					onSubmit={(e) => {
						e.preventDefault();
						void form.handleSubmit();
					}}
				>
					<form.AppForm>
						<div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_280px]">
							{/* Main column — sections grouped by user intent */}
							<div className="space-y-5 min-w-0">
								<NbCard>
									<PlacementSection />
								</NbCard>

								<NbCard>
									<TimingSoundSection />
								</NbCard>

								<NbCard>
									<AppearanceSection />
								</NbCard>

								<NbCard>
									<TextSection />
								</NbCard>

								<NbCard>
									<MediaTypesSection />
								</NbCard>

								<FormActions isPending={isPending} />
							</div>

							{/* Sticky preview sidebar — desktop only */}
							<aside className="hidden md:block md:sticky md:top-5 md:self-start">
								<NbCard>
									<StickyPreview />
								</NbCard>
							</aside>
						</div>
					</form.AppForm>
				</form>
			</div>
		</div>
	);
}
