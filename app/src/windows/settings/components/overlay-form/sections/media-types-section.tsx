import { Label } from "@memeover/ui/components/ui/label";
import { Separator } from "@memeover/ui/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@memeover/ui/components/ui/toggle-group";
import { NB_TOGGLE_ITEM } from "@memeover/ui/lib/nb-classes";
import { Clapperboard, FileAudio, ImageIcon, MessageSquare, Sticker, Video } from "lucide-react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { enabledTypesToList, listToEnabledTypes } from "@/shared/helpers";
import { useOverlayFormContext } from "../form-hook";

const MEDIA_TYPE_KEYS = ["image", "gif", "video", "audio", "text", "sticker"] as const;

type MediaTypeKey = (typeof MEDIA_TYPE_KEYS)[number];

const MEDIA_TYPE_ICONS: Record<MediaTypeKey, ComponentType<{ className?: string }>> = {
	image: ImageIcon,
	gif: Clapperboard,
	video: Video,
	audio: FileAudio,
	text: MessageSquare,
	sticker: Sticker,
};

export function MediaTypesSection() {
	const form = useOverlayFormContext();
	const { t } = useTranslation();

	return (
		<div className="space-y-3">
			<Separator />

			<form.Field name="enabledTypes">
				{(field) => {
					const enabledCount = enabledTypesToList(field.state.value).length;

					return (
						<div className="space-y-3">
							<Label className="font-display tracking-wide text-xs">
								{t("display.mediaTypes")}
							</Label>
							<ToggleGroup
								type="multiple"
								value={enabledTypesToList(field.state.value)}
								onValueChange={(vals) => field.handleChange(listToEnabledTypes(vals))}
								className="flex flex-wrap gap-1.5 justify-start"
							>
								{MEDIA_TYPE_KEYS.map((value) => {
									const Icon = MEDIA_TYPE_ICONS[value];
									return (
										<ToggleGroupItem key={value} value={value} size="sm" className={NB_TOGGLE_ITEM}>
											<Icon className="h-3.5 w-3.5" />
											{t(`display.type_${value}`)}
										</ToggleGroupItem>
									);
								})}
							</ToggleGroup>
							<p className="text-xs text-muted-foreground">
								{t("display.mediaTypesCount", {
									count: enabledCount,
									total: MEDIA_TYPE_KEYS.length,
								})}
							</p>
						</div>
					);
				}}
			</form.Field>
		</div>
	);
}
