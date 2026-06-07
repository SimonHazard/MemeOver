import { Label } from "@memeover/ui/components/ui/label";
import { Switch } from "@memeover/ui/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@memeover/ui/components/ui/toggle-group";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@memeover/ui/components/ui/tooltip";
import { NB_TOGGLE_ITEM } from "@memeover/ui/lib/nb-classes";
import { Clapperboard, FileAudio, ImageIcon, MessageSquare, Sticker, Video } from "lucide-react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { enabledTypesToList, listToEnabledTypes } from "@/shared/helpers";
import { SectionHeader } from "../components/section-header";
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
		<div className="space-y-5">
			<SectionHeader title={t("display.group_types")} hint={t("display.group_types_hint")} />

			<form.Field name="enabledTypes">
				{(field) => {
					const enabledCount = enabledTypesToList(field.state.value).length;

					return (
						<div className="space-y-3">
							<TooltipProvider delayDuration={150}>
								<ToggleGroup
									type="multiple"
									value={enabledTypesToList(field.state.value)}
									onValueChange={(vals) => field.handleChange(listToEnabledTypes(vals))}
									className="flex gap-1.5 justify-start"
								>
									{MEDIA_TYPE_KEYS.map((value) => {
										const Icon = MEDIA_TYPE_ICONS[value];
										const label = t(`display.type_${value}`);
										return (
											<Tooltip key={value}>
												<TooltipTrigger asChild>
													{/* span absorbs Tooltip's `data-state` so ToggleGroupItem can keep
													    its own (which drives the selected background color). */}
													<span className="inline-flex">
														<ToggleGroupItem
															value={value}
															size="sm"
															aria-label={label}
															className={NB_TOGGLE_ITEM}
														>
															<Icon className="h-4 w-4" />
														</ToggleGroupItem>
													</span>
												</TooltipTrigger>
												<TooltipContent side="bottom">{label}</TooltipContent>
											</Tooltip>
										);
									})}
								</ToggleGroup>
							</TooltipProvider>
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

			<form.Field name="showBotAppSources">
				{(field) => (
					<div className="flex items-start justify-between gap-4">
						<div className="space-y-0.5">
							<Label className="font-display tracking-wide text-xs">
								{t("display.bot_app_sources")}
							</Label>
							<p className="text-xs text-muted-foreground">{t("display.bot_app_sources_hint")}</p>
						</div>
						<Switch
							checked={field.state.value}
							onCheckedChange={field.handleChange}
							className="shrink-0 mt-0.5"
						/>
					</div>
				)}
			</form.Field>
		</div>
	);
}
