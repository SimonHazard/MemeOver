import { createFileRoute } from "@tanstack/react-router";
import { OverlayPage } from "@/windows/settings/pages/overlay";

export const Route = createFileRoute("/overlay")({
	component: OverlayPage,
});
