import { Toaster, type ToasterProps } from "@memeover/ui/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet, useLocation } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ThemeProvider, useTheme } from "@/components/theme";
import { TabNav } from "@/windows/settings/components/tab-nav";
import appCss from "../App.css?url";

// ─── Themed toaster — must live inside ThemeProvider ──────────────────────────

function ThemedToaster(props: Omit<ToasterProps, "theme">) {
	const { theme } = useTheme();
	return <Toaster theme={theme} {...props} />;
}

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
				<ThemedToaster richColors closeButton />
				<main className="h-screen flex flex-col bg-background">
					<TabNav />
					<AnimatePresence initial={false}>
						<motion.div
							key={location.pathname}
							initial={{ opacity: 0, y: 4 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.12, ease: "easeOut" }}
							className="flex-1"
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
