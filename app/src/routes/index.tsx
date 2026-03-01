import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SetupSettings } from "@/windows/settings/pages/setup-settings";

export const Route = createFileRoute("/")({ component: SetupPage });

function SetupPage() {
	const navigate = useNavigate();
	return <SetupSettings onOpenDisplay={() => void navigate({ to: "/settings" })} />;
}
