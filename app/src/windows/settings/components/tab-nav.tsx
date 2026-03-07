import { Button } from "@memeover/ui/components/ui/button";
import { cn } from "@memeover/ui/lib/utils";
import type { FileRoutesByPath } from "@tanstack/react-router";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { History, LayoutDashboard, Monitor, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabRoute = keyof FileRoutesByPath;

interface TabDef {
	route: TabRoute;
	icon: React.ComponentType<{ className?: string }>;
	labelKey: string;
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS: TabDef[] = [
	{ route: "/", icon: LayoutDashboard, labelKey: "tabs.dashboard" },
	{ route: "/overlay", icon: Monitor, labelKey: "tabs.overlay" },
	{ route: "/history", icon: History, labelKey: "tabs.history" },
	{ route: "/about", icon: Settings, labelKey: "tabs.about" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function TabNav() {
	const { pathname } = useLocation();
	const navigate = useNavigate();
	const { t } = useTranslation();

	return (
		<nav className="flex justify-center px-4 pt-4 pb-0 shrink-0">
			<div className="inline-flex gap-0.5 p-1 bg-background rounded-xl shadow-[3px_3px_0px_0px_var(--nb-shadow)] ring-2 ring-foreground">
				{TABS.map((tab) => {
					const isActive = pathname === tab.route;
					const Icon = tab.icon;
					return (
						<Button
							key={tab.route}
							variant="ghost"
							size="sm"
							onClick={() => navigate({ to: tab.route })}
							className={cn(
								"h-8 gap-1.5 rounded-lg text-sm font-display tracking-wide border-2 transition-all cursor-pointer",
								isActive
									? "bg-primary-400 text-black border-foreground shadow-[2px_2px_0px_0px_var(--nb-shadow)] hover:bg-primary-400 hover:text-black dark:hover:bg-primary-400 -translate-x-px -translate-y-px"
									: "bg-transparent text-muted-foreground border-transparent hover:text-foreground",
							)}
						>
							<Icon className="h-3.5 w-3.5" />
							<span>{t(tab.labelKey)}</span>
						</Button>
					);
				})}
			</div>
		</nav>
	);
}
