import { Check, Palette, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

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
] as const;

type SwatchColor = (typeof SWATCHES)[number];

const SWATCH_LABELS: Record<SwatchColor, string> = {
	"#09090b": "Zinc-950",
	"#71717a": "Zinc-500",
	"#f4f4f5": "Zinc-100",
	"#F5E642": "Jaune",
	"#4ade80": "Vert",
	"#ef4444": "Rouge",
	"#3b82f6": "Bleu",
	"#a855f7": "Violet",
};

function getContrastColor(hex: string): string {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > 0.5 ? "#000000" : "#ffffff";
}

// Shared Neo-brutalist swatch button classes
const swatchBase =
	"relative rounded-sm border-2 border-foreground transition-all duration-150 hover:scale-110 hover:shadow-[2px_2px_0px_0px_var(--nb-shadow)] active:scale-95 active:shadow-none";
const swatchSelected = "shadow-[2px_2px_0px_0px_var(--nb-shadow)] scale-105";

export interface ColorPickerProps {
	value: string;
	onChange: (color: string) => void;
	onReset?: () => void;
}

export function ColorPicker({ value, onChange, onReset }: ColorPickerProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const isCustom = !SWATCHES.includes(value as SwatchColor);

	return (
		<TooltipProvider delayDuration={300}>
			<div className="flex flex-wrap gap-1.5">
				{SWATCHES.map((swatch) => {
					const isSelected = value === swatch;
					return (
						<Tooltip key={swatch}>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									onClick={() => onChange(swatch)}
									style={{ backgroundColor: swatch }}
									className={cn(swatchBase, isSelected && swatchSelected)}
									aria-label={swatch}
								>
									<AnimatePresence>
										{isSelected && (
											<motion.span
												className="absolute inset-0 flex items-center justify-center"
												initial={{ scale: 0 }}
												animate={{ scale: 1 }}
												exit={{ scale: 0 }}
												transition={{ type: "spring", stiffness: 400, damping: 20 }}
											>
												<Check
													className="size-3.5"
													style={{ color: getContrastColor(swatch) }}
													strokeWidth={3}
												/>
											</motion.span>
										)}
									</AnimatePresence>
								</Button>
							</TooltipTrigger>
							<TooltipContent side="top" sideOffset={6}>
								<span className="font-mono">{SWATCH_LABELS[swatch]}</span>
							</TooltipContent>
						</Tooltip>
					);
				})}

				{/* Custom color button */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							onClick={() => inputRef.current?.click()}
							style={isCustom ? { backgroundColor: value } : undefined}
							className={cn(swatchBase, isCustom && swatchSelected)}
							aria-label="Custom color"
						>
							<AnimatePresence mode="wait">
								{isCustom ? (
									<motion.span
										key="check"
										className="absolute inset-0 flex items-center justify-center"
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										exit={{ scale: 0 }}
										transition={{ type: "spring", stiffness: 400, damping: 20 }}
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
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										exit={{ scale: 0 }}
										transition={{ type: "spring", stiffness: 400, damping: 20 }}
									>
										<Palette className="size-3.5" />
									</motion.span>
								)}
							</AnimatePresence>
						</Button>
					</TooltipTrigger>
					<TooltipContent side="top" sideOffset={6}>
						<span className="font-mono">{isCustom ? value.toUpperCase() : "Couleur custom"}</span>
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
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant="outline"
								size="icon-sm"
								onClick={onReset}
								className={cn(
									swatchBase,
									"text-muted-foreground hover:text-foreground hover:bg-transparent",
								)}
								aria-label="Reset color"
							>
								<RotateCcw className="size-3.5" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="top" sideOffset={6}>
							<span className="font-mono">Réinitialiser</span>
						</TooltipContent>
					</Tooltip>
				)}
			</div>
		</TooltipProvider>
	);
}
