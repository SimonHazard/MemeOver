import { NbBadge } from "@memeover/ui/components/branded/nb-badge";
import { NbCard } from "@memeover/ui/components/branded/nb-card";
import { ScrollArea } from "@memeover/ui/components/ui/scroll-area";
import { Skeleton } from "@memeover/ui/components/ui/skeleton";
import { Terminal } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ServerLogsCard({ logs, loading }: { logs: string[]; loading: boolean }) {
	const { t } = useTranslation();

	return (
		<NbCard>
			<div className="flex flex-col gap-3">
				<div className="flex items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<Terminal className="size-4" aria-hidden="true" />
						<h2 className="font-display text-sm tracking-wide">{t("server.logs.title")}</h2>
					</div>
					<NbBadge variant="outline">{logs.length}</NbBadge>
				</div>
				<ScrollArea className="h-44 rounded-md border-2 border-foreground bg-foreground p-3 text-background">
					{loading ? (
						<div className="flex flex-col gap-2">
							<Skeleton className="h-4 w-5/6 bg-background/20" />
							<Skeleton className="h-4 w-2/3 bg-background/20" />
							<Skeleton className="h-4 w-4/5 bg-background/20" />
						</div>
					) : logs.length === 0 ? (
						<p className="font-mono text-xs opacity-70">{t("server.logs.empty")}</p>
					) : (
						<pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
							{logs.slice(-140).join("\n")}
						</pre>
					)}
				</ScrollArea>
			</div>
		</NbCard>
	);
}
