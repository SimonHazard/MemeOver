"use client";

import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import * as React from "react";

import { cn } from "@memeover/ui/lib/utils";

function Slider<Value extends number | readonly number[]>({
	className,
	"aria-label": ariaLabel,
	"aria-labelledby": ariaLabelledBy,
	defaultValue,
	value,
	min = 0,
	max = 100,
	...props
}: SliderPrimitive.Root.Props<Value>) {
	const _values = React.useMemo(() => {
		const current = value ?? defaultValue;
		if (Array.isArray(current)) return current;
		return typeof current === "number" ? [current] : [min];
	}, [value, defaultValue, min, max]);

	return (
		<SliderPrimitive.Root
			data-slot="slider"
			aria-label={ariaLabel}
			aria-labelledby={ariaLabelledBy}
			defaultValue={defaultValue}
			value={value}
			min={min}
			max={max}
			thumbAlignment="edge"
			className={cn(
				"data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full",
				className,
			)}
			{...props}
		>
			<SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col">
				<SliderPrimitive.Track
					data-slot="slider-track"
					className="bg-muted relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
				>
					<SliderPrimitive.Indicator
						data-slot="slider-range"
						className="bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
					/>
				</SliderPrimitive.Track>
				{Array.from({ length: _values.length }, (_, index) => (
					<SliderPrimitive.Thumb
						data-slot="slider-thumb"
						key={index}
						index={index}
						aria-label={ariaLabel}
						aria-labelledby={ariaLabelledBy}
						className="border-primary ring-ring/50 block size-4 shrink-0 rounded-full border bg-white shadow-sm transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
					/>
				))}
			</SliderPrimitive.Control>
		</SliderPrimitive.Root>
	);
}

export { Slider };
