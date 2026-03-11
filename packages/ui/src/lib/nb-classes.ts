// ─── Neo-Brutalist Design Tokens ──────────────────────────────────────────────
// Shared class constants for MemeOver's neo-brutalist identity.
// All shadows reference `--nb-shadow` which switches black ↔ white in dark mode.
//
// RULE: Never construct Tailwind variant prefixes (hover:, data-[...]:, dark:)
// via template literals — Tailwind's static scanner cannot detect them.
// Always write the full class string literally.
// ──────────────────────────────────────────────────────────────────────────────

// ─── Shadow primitives ───────────────────────────────────────────────────────

export const NB_SHADOW_SM = "shadow-[2px_2px_0px_0px_var(--nb-shadow)]";
export const NB_SHADOW_MD = "shadow-[3px_3px_0px_0px_var(--nb-shadow)]";
export const NB_SHADOW_LG = "shadow-[4px_4px_0px_0px_var(--nb-shadow)]";

/** Hover variants — must be full static strings, never `hover:${NB_SHADOW_*}` */
export const NB_HOVER_SHADOW_SM = "hover:shadow-[2px_2px_0px_0px_var(--nb-shadow)]";
export const NB_HOVER_SHADOW_LG = "hover:shadow-[4px_4px_0px_0px_var(--nb-shadow)]";

// ─── Button classes ──────────────────────────────────────────────────────────

/** Standard neo-brutalist button — 2px shadow, active press, display font */
export const NB_BTN_BASE = [
	"border-2 border-foreground",
	NB_SHADOW_SM,
	"active:shadow-none active:translate-x-0.5 active:translate-y-0.5",
	"transition-all font-display tracking-wide",
].join(" ");

/** Small button — NB_BTN_BASE + text-xs */
export const NB_BTN_SM = NB_BTN_BASE + " text-xs";

/** Large button — 3px shadow, bigger active press offset */
export const NB_BTN_LG = [
	"border-2 border-foreground",
	NB_SHADOW_MD,
	"active:shadow-none active:translate-x-0.75 active:translate-y-0.75",
	"transition-all font-display tracking-wide",
].join(" ");

/** Disabled state — combine with any NB_BTN_* */
export const NB_BTN_DISABLED =
	"disabled:opacity-40 disabled:shadow-none disabled:pointer-events-none";

// ─── Toggle / ToggleGroup classes ────────────────────────────────────────────

/** ToggleGroupItem — inactive dim, active primary with shadow, hover reveal */
export const NB_TOGGLE_ITEM = [
	"gap-1.5 border-2 border-foreground/30",
	"data-[state=on]:border-foreground",
	"data-[state=on]:bg-primary-400 data-[state=on]:text-primary-foreground",
	"data-[state=off]:opacity-50",
	// Full static string — never `data-[state=on]:${NB_SHADOW_SM}` (breaks Tailwind scanner)
	"data-[state=on]:shadow-[2px_2px_0px_0px_var(--nb-shadow)]",
	"hover:bg-primary-400/15 hover:border-foreground/60",
	"transition-all font-display text-xs tracking-wide",
].join(" ");

/** Toggle — similar to ToggleGroupItem but with hover states */
export const NB_TOGGLE = [
	"border-2 border-foreground/30",
	"data-[state=on]:bg-primary-400 data-[state=on]:text-primary-foreground",
	"data-[state=on]:border-foreground",
	// Full static string — never `data-[state=on]:${NB_SHADOW_SM}` (breaks Tailwind scanner)
	"data-[state=on]:shadow-[2px_2px_0px_0px_var(--nb-shadow)]",
	"hover:bg-primary-400/15 hover:border-foreground/60",
	"transition-all",
].join(" ");

// ─── Card classes ────────────────────────────────────────────────────────────

/** Neo-brutalist card — thick border + 4px offset shadow */
export const NB_CARD = [
	"border-2 border-foreground p-5 gap-0",
	NB_SHADOW_LG,
].join(" ");

// ─── Badge classes ───────────────────────────────────────────────────────────

/** Neo-brutalist badge — thick border, display font, tight tracking */
export const NB_BADGE =
	"border-2 border-foreground rounded-md font-display text-xs tracking-wide";
