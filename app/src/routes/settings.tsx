// This route remains defined for backwards-compatibility with any internal references.
// The canonical Overlay Config tab is at /overlay (overlay.tsx).
import { createFileRoute } from "@tanstack/react-router";
import { OverlayPage } from "@/windows/settings/pages/overlay";

export const Route = createFileRoute("/settings")({
	component: OverlayPage,
});
