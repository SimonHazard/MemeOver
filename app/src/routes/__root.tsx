import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet, useLocation } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";

import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/shared/theme";
import { TabNav } from "@/windows/settings/components/tab-nav";
import appCss from "../App.css?url";

// ─── Query client ─────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { retry: 1, staleTime: 10_000 },
	},
});

// ─── Root layout ──────────────────────────────────────────────────────────────

function RootLayout() {
	const location = useLocation();

	return (
		<ThemeProvider>
			<QueryClientProvider client={queryClient}>
				<Toaster richColors closeButton />
				<main className="h-screen flex flex-col bg-background overflow-hidden">
					<TabNav />
					{/* initial={false} prevents exit animation conflict with TanStack Router:
					    the router swaps <Outlet /> immediately, so we skip exit to avoid
					    the "appears → disappears → reappears" flicker with mode="wait". */}
					<AnimatePresence initial={false}>
						<motion.div
							key={location.pathname}
							initial={{ opacity: 0, y: 4 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.12, ease: "easeOut" }}
							className="flex-1 overflow-y-auto"
						>
							<Outlet />
						</motion.div>
					</AnimatePresence>
				</main>
			</QueryClientProvider>
		</ThemeProvider>
	);
}

export const Route = createRootRoute({
	head: () => ({
		meta: [],
		links: [{ rel: "stylesheet", href: appCss }],
	}),
	component: RootLayout,
});
