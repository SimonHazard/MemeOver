"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";
import { toggleVariants } from "@memeover/ui/components/ui/toggle";
import { cn } from "@memeover/ui/lib/utils";

const ToggleGroupContext = React.createContext<
	VariantProps<typeof toggleVariants> & {
		spacing?: number;
	}
>({
	size: "default",
	variant: "default",
	spacing: 0,
});

// Every Base UI Toggle sets aria-pressed; data-slot is replaced when an item is the
// render target of another component (e.g. a TooltipTrigger).
const ITEM_SELECTOR = "[aria-pressed]:not([data-disabled])";

function ToggleGroup<Value extends string>({
	className,
	variant,
	size,
	spacing = 0,
	children,
	onFocus,
	onKeyDown,
	onPointerDown,
	...props
}: ToggleGroupPrimitive.Props<Value> &
	VariantProps<typeof toggleVariants> & {
		spacing?: number;
	}) {
	// Base UI starts the roving tab stop on the first item and, when horizontal, ignores
	// ArrowUp/ArrowDown. A single-choice group behaves as a radio group (WAI-ARIA APG):
	// entering it from the keyboard focuses the selected item; multiple-choice groups keep
	// the toolbar rule (first item). Up/Down move like Left/Right, as under Radix and as
	// the APG allows. A click keeps focus on the clicked item.
	const pointerFocus = React.useRef(false);
	const handlePointerDown: typeof onPointerDown = (event) => {
		onPointerDown?.(event);
		pointerFocus.current = true;
		// Focus caused by the press happens in this same task.
		setTimeout(() => {
			pointerFocus.current = false;
		}, 0);
	};
	const handleFocus: typeof onFocus = (event) => {
		onFocus?.(event);
		if (props.multiple || pointerFocus.current) return;
		const group = event.currentTarget;
		if (group.contains(event.relatedTarget as Node | null)) return;
		const pressed = group.querySelector<HTMLElement>(`${ITEM_SELECTOR}[aria-pressed="true"]`);
		if (pressed && pressed !== event.target) pressed.focus();
	};
	const handleKeyDown: typeof onKeyDown = (event) => {
		onKeyDown?.(event);
		if (props.orientation === "vertical") return;
		if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
		const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
		const index = items.indexOf(event.target as HTMLElement);
		if (index === -1) return;
		event.preventDefault();
		const next = index + (event.key === "ArrowDown" ? 1 : -1);
		if (props.loopFocus === false && (next < 0 || next >= items.length)) return;
		items[(next + items.length) % items.length]?.focus();
	};

	return (
		<ToggleGroupPrimitive
			data-slot="toggle-group"
			data-variant={variant}
			data-size={size}
			data-spacing={spacing}
			style={{ "--gap": spacing } as React.CSSProperties}
			className={cn(
				"group/toggle-group flex w-fit items-center gap-[--spacing(var(--gap))] rounded-md data-[spacing=default]:data-[variant=outline]:shadow-xs",
				className,
			)}
			onFocus={handleFocus}
			onKeyDown={handleKeyDown}
			onPointerDown={handlePointerDown}
			{...props}
		>
			<ToggleGroupContext.Provider value={{ variant, size, spacing }}>
				{children}
			</ToggleGroupContext.Provider>
		</ToggleGroupPrimitive>
	);
}

function ToggleGroupItem({
	className,
	children,
	variant,
	size,
	...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
	const context = React.useContext(ToggleGroupContext);

	return (
		<TogglePrimitive
			data-slot="toggle-group-item"
			data-variant={context.variant || variant}
			data-size={context.size || size}
			data-spacing={context.spacing}
			className={cn(
				toggleVariants({
					variant: context.variant || variant,
					size: context.size || size,
				}),
				"w-auto min-w-0 shrink-0 px-3 focus:z-10 focus-visible:z-10",
				"data-[spacing=0]:rounded-none data-[spacing=0]:data-[variant=outline]:shadow-none data-[spacing=0]:first:rounded-l-md data-[spacing=0]:last:rounded-r-md data-[spacing=0]:data-[variant=outline]:border-l-0 data-[spacing=0]:data-[variant=outline]:first:border-l",
				className,
			)}
			{...props}
		>
			{children}
		</TogglePrimitive>
	);
}

export { ToggleGroup, ToggleGroupItem };
