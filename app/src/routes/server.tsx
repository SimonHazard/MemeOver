import { createFileRoute } from "@tanstack/react-router";
import { ServerPage } from "@/windows/settings/pages/server";

export const Route = createFileRoute("/server")({
	component: ServerPage,
});
