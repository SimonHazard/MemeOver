import { useLocation, useRouter } from "@tanstack/react-router";
import { History, LayoutDashboard, Monitor, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabRoute = "/" | "/overlay" | "/history" | "/about";

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
	const router = useRouter();
	const { t } = useTranslation();

	return (
		<nav className="flex justify-center px-4 pt-4 pb-0 shrink-0">
			<div className="inline-flex gap-0.5 p-1 bg-background border-2 border-foreground rounded-xl shadow-[3px_3px_0px_0px_var(--nb-shadow)]">
				{TABS.map((tab) => {
					const isActive = pathname === tab.route;
					const Icon = tab.icon;
					return (
						<button
							key={tab.route}
							type="button"
							onClick={() => router.history.push(tab.route)}
							className={cn(
								"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all cursor-pointer",
								"font-display tracking-wide border-2",
								isActive
									? "bg-primary-400 text-black border-foreground shadow-[2px_2px_0px_0px_var(--nb-shadow)] -translate-x-px -translate-y-px"
									: "bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-accent",
							)}
						>
							<Icon className="h-3.5 w-3.5 shrink-0" />
							<span>{t(tab.labelKey)}</span>
						</button>
					);
				})}
			</div>
		</nav>
	);
}
