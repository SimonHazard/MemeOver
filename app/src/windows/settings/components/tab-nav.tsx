import { Button } from "@memeover/ui/components/ui/button";
import { NB_SHADOW_MD, NB_SHADOW_SM } from "@memeover/ui/lib/nb-classes";
import { cn } from "@memeover/ui/lib/utils";
import type { FileRoutesByPath } from "@tanstack/react-router";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { History, LayoutDashboard, Monitor, Server, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/shared/store";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabRoute = keyof FileRoutesByPath;

interface TabDef {
	route: TabRoute;
	icon: React.ComponentType<{ className?: string }>;
	labelKey: string;
}

// One pill shared by every tab: `layoutId` makes Framer Motion slide it from the
// previous tab to the new one. MotionConfig reducedMotion="user" turns it into a swap.
const PILL_SPRING = { type: "spring", duration: 0.3, bounce: 0.15 } as const;

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS: TabDef[] = [
	{ route: "/", icon: LayoutDashboard, labelKey: "tabs.dashboard" },
	{ route: "/overlay", icon: Monitor, labelKey: "tabs.overlay" },
	{ route: "/server", icon: Server, labelKey: "tabs.server" },
	{ route: "/history", icon: History, labelKey: "tabs.history" },
	{ route: "/about", icon: Settings, labelKey: "tabs.about" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function TabNav() {
	const { pathname } = useLocation();
	const navigate = useNavigate();
	const { t } = useTranslation();
	const updateAvailable = useAppStore((s) => s.updateAvailable);

	return (
		<nav className="flex justify-center px-4 pt-4 pb-0 shrink-0">
			<div
				className={`inline-flex gap-0.5 p-1 bg-background rounded-xl ${NB_SHADOW_MD} ring-2 ring-foreground`}
			>
				{TABS.map((tab) => {
					const isActive = pathname === tab.route;
					const Icon = tab.icon;
					const showUpdateDot = tab.route === "/about" && updateAvailable;
					return (
						<Button
							key={tab.route}
							variant="ghost"
							size="sm"
							onClick={() => navigate({ to: tab.route })}
							aria-current={isActive ? "page" : undefined}
							className={cn(
								"relative h-8 gap-1.5 rounded-lg text-sm font-display tracking-wide border-2 border-transparent bg-transparent transition-[color,background-color,transform,translate,scale] duration-300 ease-out cursor-pointer",
								isActive
									? "text-primary-foreground hover:bg-transparent hover:text-primary-foreground dark:hover:bg-transparent"
									: "text-muted-foreground hover:text-foreground hover:bg-accent",
							)}
						>
							{isActive && (
								<motion.span
									layoutId="tab-nav-pill"
									transition={PILL_SPRING}
									className={`absolute -inset-0.5 rounded-lg bg-primary-400 border-2 border-foreground ${NB_SHADOW_SM} -translate-x-px -translate-y-px`}
								/>
							)}
							<Icon className="relative h-3.5 w-3.5" />
							<span className="relative">{t(tab.labelKey)}</span>
							{showUpdateDot && (
								<span className="pointer-events-none absolute -top-1 -right-1 flex size-2.5">
									<span
										className="absolute inline-flex h-full w-full rounded-full bg-secondary-500 opacity-75 motion-safe:animate-ping"
										style={{ animationIterationCount: 2 }}
									/>
									<span className="relative inline-flex size-2.5 rounded-full bg-secondary-500 border border-foreground" />
								</span>
							)}
						</Button>
					);
				})}
			</div>
		</nav>
	);
}
