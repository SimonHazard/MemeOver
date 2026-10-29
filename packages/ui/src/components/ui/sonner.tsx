import { cn } from "@memeover/ui/lib/utils";
import {
	CircleCheckIcon,
	InfoIcon,
	Loader2Icon,
	OctagonXIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

type Theme = "light" | "dark" | "system";

const Toaster = ({
	theme = "system",
	className,
	style,
	...props
}: ToasterProps & { theme?: Theme }) => {
	return (
		<Sonner
			theme={theme}
			className={cn("toaster group", className)}
			icons={{
				success: <CircleCheckIcon className="size-4" />,
				info: <InfoIcon className="size-4" />,
				warning: <TriangleAlertIcon className="size-4" />,
				error: <OctagonXIcon className="size-4" />,
				loading: <Loader2Icon className="size-4 animate-spin" />,
			}}
			style={
				{
					"--normal-bg": "var(--popover)",
					"--normal-text": "var(--popover-foreground)",
					"--normal-border": "var(--foreground)",
					"--border-radius": "0px",
					...style,
				} as React.CSSProperties
			}
			{...props}
		/>
	);
};

export type { ToasterProps };
export { Toaster };
