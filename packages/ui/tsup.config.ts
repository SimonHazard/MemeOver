import { defineConfig } from "tsup";

export default defineConfig({
	entry: {
		// ── ui components ────────────────────────────────────────────────────
		"components/ui/alert": "src/components/ui/alert.tsx",
		"components/ui/avatar": "src/components/ui/avatar.tsx",
		"components/ui/badge": "src/components/ui/badge.tsx",
		"components/ui/button": "src/components/ui/button.tsx",
		"components/ui/card": "src/components/ui/card.tsx",
		"components/ui/dialog": "src/components/ui/dialog.tsx",
		"components/ui/input": "src/components/ui/input.tsx",
		"components/ui/label": "src/components/ui/label.tsx",
		"components/ui/progress": "src/components/ui/progress.tsx",
		"components/ui/scroll-area": "src/components/ui/scroll-area.tsx",
		"components/ui/select": "src/components/ui/select.tsx",
		"components/ui/separator": "src/components/ui/separator.tsx",
		"components/ui/skeleton": "src/components/ui/skeleton.tsx",
		"components/ui/slider": "src/components/ui/slider.tsx",
		"components/ui/sonner": "src/components/ui/sonner.tsx",
		"components/ui/switch": "src/components/ui/switch.tsx",
		"components/ui/tabs": "src/components/ui/tabs.tsx",
		"components/ui/toggle": "src/components/ui/toggle.tsx",
		"components/ui/toggle-group": "src/components/ui/toggle-group.tsx",
		"components/ui/tooltip": "src/components/ui/tooltip.tsx",
		// ── branded components ───────────────────────────────────────────────
		"components/branded/nb-badge": "src/components/branded/nb-badge.tsx",
		"components/branded/nb-button": "src/components/branded/nb-button.tsx",
		"components/branded/nb-card": "src/components/branded/nb-card.tsx",
		// ── lib ──────────────────────────────────────────────────────────────
		"lib/nb-classes": "src/lib/nb-classes.ts",
		"lib/utils": "src/lib/utils.ts",
	},
	format: ["esm"],
	// Transpile-only mode: each file is compiled individually, imports are preserved.
	// This is correct for a component library — no inlining of shared utilities.
	bundle: false,
	dts: true,
	outDir: "dist",
	clean: true,
	tsconfig: "tsconfig.build.json",
});
