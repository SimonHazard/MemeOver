import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MediaSettings } from "@/windows/settings/pages/media-settings";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
	const navigate = useNavigate();
	return <MediaSettings onBack={() => void navigate({ to: "/" })} />;
}
