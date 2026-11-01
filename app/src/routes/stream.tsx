import { createFileRoute } from "@tanstack/react-router";
import { StreamPage } from "@/windows/settings/pages/stream";

export const Route = createFileRoute("/stream")({
	component: StreamPage,
});
