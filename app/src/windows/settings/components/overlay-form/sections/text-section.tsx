import { Label } from "@memeover/ui/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@memeover/ui/components/ui/toggle-group";
import { NB_TOGGLE_ITEM } from "@memeover/ui/lib/nb-classes";
import { Type } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TextSize } from "@/shared/types";
import { DEFAULT_SETTINGS } from "@/shared/types";
import { ColorPicker } from "../../color-picker";
import { SectionHeader } from "../components/section-header";
import { useOverlayFormContext } from "../form-hook";

const TEXT_SIZE_KEYS: TextSize[] = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl"];

export function TextSection() {
	const form = useOverlayFormContext();
	const { t } = useTranslation();

	return (
		<div className="space-y-5">
			<SectionHeader title={t("display.group_text")} hint={t("display.group_text_hint")} />

			{/* Text size */}
			<form.Field name="textSize">
				{(field) => (
					<div className="space-y-3">
						<Label className="font-display tracking-wide text-xs">{t("display.textSize")}</Label>
						<ToggleGroup
							type="single"
							value={field.state.value}
							onValueChange={(v) => {
								if (v) field.handleChange(v as TextSize);
							}}
							className="flex flex-wrap gap-1.5 justify-start"
						>
							{TEXT_SIZE_KEYS.map((size) => (
								<ToggleGroupItem key={size} value={size} size="sm" className={NB_TOGGLE_ITEM}>
									<Type className="h-3.5 w-3.5" />
									{size}
								</ToggleGroupItem>
							))}
						</ToggleGroup>
					</div>
				)}
			</form.Field>

			{/* Text color */}
			<form.Field name="textColor">
				{(field) => (
					<div className="space-y-2">
						<Label className="font-display tracking-wide text-xs">{t("display.textColor")}</Label>
						<ColorPicker
							value={field.state.value}
							onChange={field.handleChange}
							onReset={() => field.handleChange(DEFAULT_SETTINGS.textColor)}
						/>
					</div>
				)}
			</form.Field>
		</div>
	);
}
