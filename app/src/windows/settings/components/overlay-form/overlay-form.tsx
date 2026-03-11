import { NbCard } from "@memeover/ui/components/branded/nb-card";
import type { Settings } from "@/shared/types";
import { FullscreenCompatibilityNotice } from "./fullscreen-compatibility-notice";
import { BackgroundSettingsSection } from "./sections/background-settings-section";
import { DisplaySettingsSection } from "./sections/display-settings-section";
import { FormActions } from "./sections/form-actions";
import { MediaTypesSection } from "./sections/media-types-section";
import { OverlayControls } from "./sections/overlay-controls";
import { useOverlayForm } from "./use-overlay-form";

export interface OverlayFormProps {
	initialData: Settings;
}

export function OverlayForm({ initialData }: OverlayFormProps) {
	const { form, isPending } = useOverlayForm(initialData);

	return (
		<div className="p-5">
			<div className="mx-auto max-w-2xl space-y-5">
				{/* ── Fullscreen compatibility notice ── */}
				<FullscreenCompatibilityNotice />

				{/* ── Overlay Controls ── */}
				<NbCard>
					<OverlayControls />
				</NbCard>

				{/* ── Display & Background & Media Settings ── */}
				<NbCard>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							void form.handleSubmit();
						}}
					>
						<form.AppForm>
							<div className="space-y-5">
								<DisplaySettingsSection />
								<BackgroundSettingsSection />
								<MediaTypesSection />
								<FormActions isPending={isPending} />
							</div>
						</form.AppForm>
					</form>
				</NbCard>
			</div>
		</div>
	);
}
