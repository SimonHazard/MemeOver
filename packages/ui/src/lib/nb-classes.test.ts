import { expect, test } from "bun:test";
import * as nb from "./nb-classes";
import {
	NB_BADGE,
	NB_BTN_BASE,
	NB_BTN_DISABLED,
	NB_BTN_LG,
	NB_BTN_SM,
	NB_CARD,
	NB_HOVER_SHADOW_LG,
	NB_HOVER_SHADOW_SM,
	NB_SHADOW_LG,
	NB_SHADOW_MD,
	NB_SHADOW_SM,
	NB_SWITCH,
	NB_TOGGLE,
	NB_TOGGLE_ITEM,
} from "./nb-classes";

// Characterization: pins the exact string value of every nb-classes export.
// Expected values were captured from the implementation before the
// shared-fragment refactor and must stay identical after it (every class must
// remain a full literal string so Tailwind's static scanner still sees it).
const VALUES = {
	NB_BADGE,
	NB_BTN_BASE,
	NB_BTN_DISABLED,
	NB_BTN_LG,
	NB_BTN_SM,
	NB_CARD,
	NB_HOVER_SHADOW_LG,
	NB_HOVER_SHADOW_SM,
	NB_SHADOW_LG,
	NB_SHADOW_MD,
	NB_SHADOW_SM,
	NB_SWITCH,
	NB_TOGGLE,
	NB_TOGGLE_ITEM,
} as const;

const EXPECTED: Record<keyof typeof VALUES, string> = {
	NB_BADGE: "border-2 border-foreground rounded-md font-display text-xs tracking-wide",
	NB_BTN_BASE:
		"border-2 border-foreground shadow-[2px_2px_0px_0px_var(--nb-shadow)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_var(--nb-shadow)] motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 active:scale-100 motion-reduce:active:translate-x-0 motion-reduce:active:translate-y-0 active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-[color,background-color,border-color,box-shadow,transform,translate,scale,opacity] duration-150 ease-out font-display tracking-wide",
	NB_BTN_DISABLED: "disabled:opacity-40 disabled:shadow-none disabled:pointer-events-none",
	NB_BTN_LG:
		"border-2 border-foreground shadow-[3px_3px_0px_0px_var(--nb-shadow)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_var(--nb-shadow)] motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 active:scale-100 motion-reduce:active:translate-x-0 motion-reduce:active:translate-y-0 active:shadow-none active:translate-x-0.75 active:translate-y-0.75 transition-[color,background-color,border-color,box-shadow,transform,translate,scale,opacity] duration-150 ease-out font-display tracking-wide",
	NB_BTN_SM:
		"border-2 border-foreground shadow-[2px_2px_0px_0px_var(--nb-shadow)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_var(--nb-shadow)] motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0 active:scale-100 motion-reduce:active:translate-x-0 motion-reduce:active:translate-y-0 active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-[color,background-color,border-color,box-shadow,transform,translate,scale,opacity] duration-150 ease-out font-display tracking-wide text-xs",
	NB_CARD: "border-2 border-foreground p-5 gap-0 shadow-[4px_4px_0px_0px_var(--nb-shadow)]",
	NB_HOVER_SHADOW_LG: "hover:shadow-[4px_4px_0px_0px_var(--nb-shadow)]",
	NB_HOVER_SHADOW_SM: "hover:shadow-[2px_2px_0px_0px_var(--nb-shadow)]",
	NB_SHADOW_LG: "shadow-[4px_4px_0px_0px_var(--nb-shadow)]",
	NB_SHADOW_MD: "shadow-[3px_3px_0px_0px_var(--nb-shadow)]",
	NB_SHADOW_SM: "shadow-[2px_2px_0px_0px_var(--nb-shadow)]",
	NB_SWITCH:
		"border-2 border-foreground data-[size=default]:h-5 data-[size=default]:w-[34px] data-checked:shadow-[2px_2px_0px_0px_var(--nb-shadow)]",
	NB_TOGGLE:
		"active:translate-x-px active:translate-y-px active:shadow-none motion-reduce:active:translate-x-0 motion-reduce:active:translate-y-0 border-2 border-foreground/30 data-pressed:bg-primary-400 data-pressed:text-primary-foreground data-pressed:border-foreground data-pressed:shadow-[2px_2px_0px_0px_var(--nb-shadow)] hover:bg-primary-400/15 hover:border-foreground/60 transition-[color,background-color,border-color,box-shadow,transform,translate,scale,opacity] duration-150 ease-out",
	NB_TOGGLE_ITEM:
		"active:translate-x-px active:translate-y-px active:shadow-none motion-reduce:active:translate-x-0 motion-reduce:active:translate-y-0 gap-1.5 border-2 border-foreground/30 data-pressed:border-foreground data-pressed:bg-primary-400 data-pressed:text-primary-foreground not-data-pressed:opacity-50 data-pressed:shadow-[2px_2px_0px_0px_var(--nb-shadow)] hover:bg-primary-400/15 hover:border-foreground/60 transition-[color,background-color,border-color,box-shadow,transform,translate,scale,opacity] duration-150 ease-out font-display text-xs tracking-wide",
};

test("nb-classes exports exactly the pinned class strings", () => {
	expect(Object.keys(nb).sort()).toEqual(Object.keys(EXPECTED).sort());
	for (const key of Object.keys(EXPECTED) as Array<keyof typeof VALUES>)
		expect(VALUES[key]).toBe(EXPECTED[key]);
});
