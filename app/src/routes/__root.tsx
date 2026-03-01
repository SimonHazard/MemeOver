import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet, useLocation } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";

import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/shared/theme";
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
				<main className="min-h-screen bg-background overflow-hidden">
					{/* initial={false} prevents exit animation conflict with TanStack Router:
					    the router swaps <Outlet /> immediately, so we skip exit to avoid
					    the "appears → disappears → reappears" flicker with mode="wait". */}
					<AnimatePresence initial={false}>
						<motion.div
							key={location.pathname}
							initial={{ opacity: 0, x: 12 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.15, ease: "easeOut" }}
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
