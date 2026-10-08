import { EASE_IN_OUT } from "@memeover/ui/lib/motion";
import { motion, useReducedMotion } from "framer-motion";
import { Bot, Download, Image, MessageCircle, Smile, Video, Volume2 } from "lucide-react";

interface Props {
	badge: string;
	title: string;
	subtitle: string;
	tagline: string;
	description: string;
	ctaDownload: string;
	ctaInvite: string;
	downloadHref: string;
	inviteHref: string | null;
}

// Entrances use the CSS `.hero-pop`/`.hero-rise` classes (global.css) so the server-rendered
// heading is visible before hydration; `--hero-step` staggers them. Framer only drives the loops.
const ctaMotion =
	"transition-[box-shadow,background-color,translate,scale] duration-200 ease-out [@media(hover:hover)]:motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.98]";

export default function HeroAnimation({
	badge,
	title,
	subtitle,
	tagline,
	description,
	ctaDownload,
	ctaInvite,
	downloadHref,
	inviteHref,
}: Props) {
	const shouldReduceMotion = useReducedMotion();

	const mediaDrops = [
		{ label: "GIF", Icon: Image },
		{ label: "VIDEO", Icon: Video },
		{ label: "AUDIO", Icon: Volume2 },
		{ label: "TEXT", Icon: MessageCircle },
		{ label: "REACT", Icon: Smile },
	];

	return (
		<div className="grid w-full max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:gap-14">
			<div className="flex min-w-0 flex-col items-start gap-6 text-left">
				<span className="hero-pop inline-flex items-center rounded-lg border-2 border-foreground bg-secondary px-4 py-1.5 font-display text-xs uppercase tracking-wider text-secondary-foreground shadow-[2px_2px_0px_0px_var(--nb-shadow)] [--hero-step:0]">
					{badge}
				</span>

				{/* The h1 is the brand lockup: wordmark plus descriptor, which carries the search terms. */}
				<h1 className="hero-pop flex max-w-full min-w-0 flex-col items-start gap-3 [--hero-step:1] sm:flex-row sm:items-center sm:gap-4">
					<img
						src="/icon.png"
						alt=""
						width={92}
						height={92}
						fetchPriority="high"
						className="size-16 shrink-0 rounded-2xl border-2 border-foreground shadow-[4px_4px_0px_0px_var(--nb-shadow)] sm:size-[92px]"
					/>
					<span className="flex min-w-0 max-w-full flex-col gap-2">
						{/* lg:text-5xl: the lg column is ~420px, too narrow for the 72px wordmark beside the icon. */}
						<span className="max-w-full min-w-0 font-display text-4xl leading-none tracking-wide text-foreground sm:text-6xl md:text-7xl lg:text-5xl xl:text-6xl 2xl:text-7xl">
							{title}
						</span>
						<span className="sr-only"> — </span>
						<span className="text-balance text-sm font-semibold tracking-wide text-muted-foreground sm:text-base">
							{subtitle}
						</span>
					</span>
				</h1>

				<p className="hero-rise max-w-full break-words font-display text-lg tracking-wide text-primary-700 [--hero-step:2] dark:text-primary-300 sm:max-w-2xl sm:text-balance sm:text-2xl">
					{tagline}
				</p>

				<p className="hero-rise max-w-full break-words text-base leading-relaxed text-muted-foreground [--hero-step:3] sm:max-w-xl sm:text-lg">
					{description}
				</p>

				<div className="hero-rise mt-2 flex w-full flex-wrap items-center gap-4 [--hero-step:4]">
					<a
						href={downloadHref}
						className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-primary px-6 py-3 font-display text-sm tracking-wide sm:text-base text-primary-foreground shadow-[3px_3px_0px_0px_var(--nb-shadow)] hover:shadow-[4px_4px_0px_0px_var(--nb-shadow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background min-[390px]:w-auto ${ctaMotion}`}
					>
						<Download className="size-5" aria-hidden="true" />
						{ctaDownload}
					</a>
					{inviteHref ? (
						<a
							href={inviteHref}
							target="_blank"
							rel="noopener noreferrer"
							className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground bg-secondary px-6 py-3 font-display text-sm tracking-wide sm:text-base text-secondary-foreground shadow-[3px_3px_0px_0px_var(--nb-shadow)] hover:shadow-[4px_4px_0px_0px_var(--nb-shadow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background min-[390px]:w-auto ${ctaMotion}`}
						>
							<Bot className="size-5" aria-hidden="true" />
							{ctaInvite}
						</a>
					) : (
						<span className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border-2 border-foreground/30 bg-muted px-6 py-3 font-display text-sm tracking-wide sm:text-base text-muted-foreground opacity-50 min-[390px]:w-auto">
							<Bot className="size-5" aria-hidden="true" />
							{ctaInvite}
						</span>
					)}
				</div>
			</div>

			<div className="hero-rise relative min-h-[440px] [--hero-step:5]" aria-hidden="true">
				<div className="absolute left-0 top-10 h-72 w-[82%] rotate-[-3deg] rounded-3xl border-2 border-foreground bg-card shadow-[6px_6px_0px_0px_var(--nb-shadow)]" />
				<motion.div
					className="absolute right-0 top-0 flex w-[86%] flex-col gap-4 rounded-3xl border-2 border-foreground bg-background p-5 shadow-[8px_8px_0px_0px_var(--nb-shadow)]"
					animate={shouldReduceMotion ? undefined : { y: [0, -8, 0] }}
					transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: EASE_IN_OUT }}
				>
					<div className="flex items-center justify-between border-b-2 border-foreground pb-3">
						<div className="flex items-center gap-3">
							<div className="size-9 rounded-xl border-2 border-foreground bg-primary" />
							<div>
								<div className="h-3 w-28 rounded-full bg-foreground" />
								<div className="mt-2 h-2 w-20 rounded-full bg-muted-foreground/50" />
							</div>
						</div>
						<div className="h-6 w-16 rounded-lg border-2 border-foreground bg-secondary" />
					</div>
					<div className="flex flex-col gap-3">
						{mediaDrops.map(({ label, Icon }, index) => (
							<motion.div
								key={label}
								className="flex items-center gap-3 rounded-2xl border-2 border-foreground bg-card p-3 shadow-[2px_2px_0px_0px_var(--nb-shadow)]"
								animate={shouldReduceMotion ? undefined : { x: [0, index % 2 === 0 ? 8 : -8, 0] }}
								transition={{
									duration: 4.5,
									delay: index * 0.25,
									repeat: Number.POSITIVE_INFINITY,
									ease: EASE_IN_OUT,
								}}
							>
								<div className="flex size-10 items-center justify-center rounded-xl border-2 border-foreground bg-primary-100 text-foreground">
									<Icon className="size-5" aria-hidden="true" />
								</div>
								<div className="min-w-0 flex-1">
									<div className="h-3 w-24 rounded-full bg-foreground" />
									<div className="mt-2 h-2 w-full max-w-48 rounded-full bg-muted-foreground/40" />
								</div>
								<span className="rounded-lg border-2 border-foreground bg-secondary px-2 py-1 font-display text-[10px] tracking-wide text-secondary-foreground">
									{label}
								</span>
							</motion.div>
						))}
					</div>
				</motion.div>
			</div>
		</div>
	);
}
