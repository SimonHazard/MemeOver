import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HistoryPage } from "@/windows/settings/pages/history";

export const Route = createFileRoute("/history")({ component: HistoryRoute });

function HistoryRoute() {
	const navigate = useNavigate();
	return <HistoryPage onBack={() => void navigate({ to: "/" })} />;
}
