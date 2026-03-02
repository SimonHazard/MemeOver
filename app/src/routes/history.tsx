import { createFileRoute } from "@tanstack/react-router";
import { HistoryPage } from "@/windows/settings/pages/history";

export const Route = createFileRoute("/history")({
	component: HistoryPage,
});
