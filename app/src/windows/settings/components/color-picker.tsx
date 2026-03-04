import { Palette } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

const SWATCHES = [
	"#000000",
	"#1a1a1a",
	"#ffffff",
	"#F5E642",
	"#ef4444",
	"#3b82f6",
	"#22c55e",
	"#a855f7",
] as const;

export interface ColorPickerProps {
	value: string;
	onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	return (
		<div className="flex flex-wrap gap-1.5">
			{SWATCHES.map((swatch) => (
				<button
					key={swatch}
					type="button"
					onClick={() => onChange(swatch)}
					style={{ backgroundColor: swatch }}
					className={cn(
						"w-7 h-7 rounded-sm border-2 border-foreground transition-all",
						value === swatch && "shadow-[2px_2px_0px_0px_var(--nb-shadow)]",
					)}
					aria-label={swatch}
				/>
			))}

			{/* Custom color button */}
			<button
				type="button"
				onClick={() => inputRef.current?.click()}
				style={
					!SWATCHES.includes(value as (typeof SWATCHES)[number])
						? { backgroundColor: value }
						: undefined
				}
				className={cn(
					"w-7 h-7 rounded-sm border-2 border-foreground flex items-center justify-center transition-all",
					!SWATCHES.includes(value as (typeof SWATCHES)[number]) &&
						"shadow-[2px_2px_0px_0px_var(--nb-shadow)]",
				)}
				aria-label="Custom color"
			>
				<Palette className="w-3.5 h-3.5" />
			</button>

			<input
				ref={inputRef}
				type="color"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="sr-only"
				tabIndex={-1}
			/>
		</div>
	);
}
