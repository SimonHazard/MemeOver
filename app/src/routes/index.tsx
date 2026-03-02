import { createFileRoute } from "@tanstack/react-router";
import { SetupPage } from "@/windows/settings/pages/setup";

export const Route = createFileRoute("/")({
	component: SetupPage,
});
