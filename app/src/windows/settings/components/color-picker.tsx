import { Button } from "@memeover/ui/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@memeover/ui/components/ui/tooltip";
import { cn } from "@memeover/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Palette, RotateCcw } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";

const SWATCHES = [
	// Grayscale (Zinc)
	"#09090b",
	"#71717a",
	"#f4f4f5",
	// Theme
	"#F5E642",
	"#4ade80",
	"#ef4444",
	"#3b82f6",
	"#a855f7",
	"#FFFFFF",
] as const;

type SwatchColor = (typeof SWATCHES)[number];

const SWATCH_LABEL_KEYS: Record<SwatchColor, string> = {
	"#09090b": "display.color_black",
	"#71717a": "display.color_gray",
	"#f4f4f5": "display.color_light_gray",
	"#F5E642": "display.color_yellow",
	"#4ade80": "display.color_green",
	"#ef4444": "display.color_red",
	"#3b82f6": "display.color_blue",
	"#a855f7": "display.color_purple",
	"#FFFFFF": "display.color_white",
};

const ICON_TRANSITION = { type: "spring", duration: 0.18, bounce: 0.1 } as const;

function getContrastColor(hex: string): string {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > 0.5 ? "#000000" : "#ffffff";
}

// Shared Neo-brutalist swatch button classes
const swatchBase =
	"relative rounded-sm border-2 border-foreground transition-[scale,box-shadow,border-color] duration-150 ease-out hover:scale-110 hover:shadow-[2px_2px_0px_0px_var(--nb-shadow)] active:scale-95 active:shadow-none motion-reduce:transition-[box-shadow,border-color] motion-reduce:hover:scale-100 motion-reduce:active:scale-100";
const swatchSelected = "shadow-[2px_2px_0px_0px_var(--nb-shadow)] scale-105 hover:scale-110";

export interface ColorPickerProps {
	value: string;
	onChange: (color: string) => void;
	onReset?: () => void;
}

export function ColorPicker({ value, onChange, onReset }: ColorPickerProps) {
	const { t } = useTranslation();
	const inputRef = useRef<HTMLInputElement>(null);
	const isCustom = !SWATCHES.includes(value as SwatchColor);

	return (
		<TooltipProvider delay={300}>
			<div className="flex flex-wrap gap-1.5">
				{SWATCHES.map((swatch) => {
					const isSelected = value === swatch;
					return (
						<Tooltip key={swatch}>
							<TooltipTrigger
								render={
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										onClick={() => onChange(swatch)}
										style={{ backgroundColor: swatch }}
										className={cn(swatchBase, isSelected && swatchSelected)}
										aria-label={t(SWATCH_LABEL_KEYS[swatch])}
										aria-pressed={isSelected}
									/>
								}
							>
								<AnimatePresence>
									{isSelected && (
										<motion.span
											className="absolute inset-0 flex items-center justify-center"
											initial={{ scale: 0.8, opacity: 0 }}
											animate={{ scale: 1, opacity: 1 }}
											exit={{ scale: 0.8, opacity: 0 }}
											transition={ICON_TRANSITION}
										>
											<Check
												className="size-3.5"
												style={{ color: getContrastColor(swatch) }}
												strokeWidth={3}
											/>
										</motion.span>
									)}
								</AnimatePresence>
							</TooltipTrigger>
							<TooltipContent side="top" sideOffset={6}>
								<span className="font-mono">{t(SWATCH_LABEL_KEYS[swatch])}</span>
							</TooltipContent>
						</Tooltip>
					);
				})}

				{/* Custom color button */}
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								type="button"
								variant="outline"
								size="icon-sm"
								onClick={() => inputRef.current?.click()}
								style={isCustom ? { backgroundColor: value } : undefined}
								className={cn(swatchBase, isCustom && swatchSelected)}
								// Base UI tooltips are visual only: the custom value must be in the name.
								aria-label={
									isCustom
										? `${t("display.color_custom")} ${value.toUpperCase()}`
										: t("display.color_custom")
								}
								aria-pressed={isCustom}
							/>
						}
					>
						<AnimatePresence mode="wait">
							{isCustom ? (
								<motion.span
									key="check"
									className="absolute inset-0 flex items-center justify-center"
									initial={{ scale: 0.8, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
									exit={{ scale: 0.8, opacity: 0 }}
									transition={ICON_TRANSITION}
								>
									<Check
										className="size-3.5"
										style={{ color: getContrastColor(value) }}
										strokeWidth={3}
									/>
								</motion.span>
							) : (
								<motion.span
									key="palette"
									initial={{ scale: 0.8, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
									exit={{ scale: 0.8, opacity: 0 }}
									transition={ICON_TRANSITION}
								>
									<Palette className="size-3.5" />
								</motion.span>
							)}
						</AnimatePresence>
					</TooltipTrigger>
					<TooltipContent side="top" sideOffset={6}>
						<span className="font-mono">
							{isCustom ? value.toUpperCase() : t("display.color_custom")}
						</span>
					</TooltipContent>
				</Tooltip>

				<input
					ref={inputRef}
					type="color"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className="sr-only"
					tabIndex={-1}
				/>

				{/* Reset button */}
				{onReset && (
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									type="button"
									variant="outline"
									size="icon-sm"
									onClick={onReset}
									className={cn(
										swatchBase,
										"text-muted-foreground hover:text-foreground hover:bg-transparent",
									)}
									aria-label={t("display.color_reset")}
								/>
							}
						>
							<RotateCcw className="size-3.5" />
						</TooltipTrigger>
						<TooltipContent side="top" sideOffset={6}>
							<span className="font-mono">{t("display.color_reset")}</span>
						</TooltipContent>
					</Tooltip>
				)}
			</div>
		</TooltipProvider>
	);
}
