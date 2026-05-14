import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Bot, Download, Image, MessageCircle, Smile, Video, Volume2 } from "lucide-react";

interface Props {
	badge: string;
	title: string;
	tagline: string;
	description: string;
	ctaDownload: string;
	ctaInvite: string;
	downloadHref: string;
	inviteHref: string | null;
}

const container: Variants = {
	hidden: {},
	show: {
		transition: { staggerChildren: 0.12, delayChildren: 0.1 },
	},
};

const fadeUp: Variants = {
	hidden: { opacity: 0, y: 24 },
	show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const pop: Variants = {
	hidden: { opacity: 0, scale: 0.8, rotate: -3 },
	show: {
		opacity: 1,
		scale: 1,
		rotate: 0,
		transition: { type: "spring", stiffness: 200, damping: 15 },
	},
};

export default function HeroAnimation({
	badge,
	title,
	tagline,
	description,
	ctaDownload,
	ctaInvite,
	downloadHref,
	inviteHref,
}: Props) {
	const shouldReduceMotion = useReducedMotion();
	const initialState = shouldReduceMotion ? "show" : "hidden";

	const mediaDrops = [
		{ label: "GIF", Icon: Image },
		{ label: "VIDEO", Icon: Video },
		{ label: "AUDIO", Icon: Volume2 },
		{ label: "TEXT", Icon: MessageCircle },
		{ label: "REACT", Icon: Smile },
	];

	return (
		<motion.div
			variants={container}
			initial={initialState}
			animate="show"
			className="grid w-full max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:gap-14"
		>
			<div className="flex flex-col items-start gap-6 text-left">
				<motion.span
					variants={pop}
					className="inline-flex items-center rounded-lg border-2 border-foreground bg-secondary px-4 py-1.5 font-display text-xs uppercase tracking-wider text-secondary-foreground shadow-[2px_2px_0px_0px_var(--nb-shadow)]"
				>
					{badge}
				</motion.span>

				<motion.div variants={pop} className="flex items-center gap-4">
					<img
						src="/icon.png"
						alt="MemeOver logo"
						width={92}
						height={92}
						fetchPriority="high"
						className="rounded-2xl border-2 border-foreground shadow-[4px_4px_0px_0px_var(--nb-shadow)]"
					/>
					<h1 className="text-balance font-display text-5xl tracking-wide text-foreground sm:text-6xl md:text-7xl">
						{title}
					</h1>
				</motion.div>

				<motion.p
					variants={fadeUp}
					className="max-w-2xl text-balance font-display text-xl tracking-wide text-primary-700 dark:text-primary-300 sm:text-2xl"
				>
					{tagline}
				</motion.p>

				<motion.p
					variants={fadeUp}
					className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
				>
					{description}
				</motion.p>

				<motion.div variants={fadeUp} className="mt-2 flex flex-wrap items-center gap-4">
					<motion.a
						href={downloadHref}
						target="_blank"
						rel="noopener noreferrer"
						whileHover={shouldReduceMotion ? undefined : { y: -2 }}
						whileTap={{ scale: 0.98 }}
						className="inline-flex items-center gap-2 rounded-xl border-2 border-foreground bg-primary px-6 py-3 font-display text-base tracking-wide text-primary-foreground shadow-[3px_3px_0px_0px_var(--nb-shadow)] transition-[box-shadow,transform,background-color] duration-200 hover:shadow-[4px_4px_0px_0px_var(--nb-shadow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
					>
						<Download className="size-5" aria-hidden="true" />
						{ctaDownload}
					</motion.a>
					{inviteHref ? (
						<motion.a
							href={inviteHref}
							target="_blank"
							rel="noopener noreferrer"
							whileHover={shouldReduceMotion ? undefined : { y: -2 }}
							whileTap={{ scale: 0.98 }}
							className="inline-flex items-center gap-2 rounded-xl border-2 border-foreground bg-secondary px-6 py-3 font-display text-base tracking-wide text-secondary-foreground shadow-[3px_3px_0px_0px_var(--nb-shadow)] transition-[box-shadow,transform,background-color] duration-200 hover:shadow-[4px_4px_0px_0px_var(--nb-shadow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
						>
							<Bot className="size-5" aria-hidden="true" />
							{ctaInvite}
						</motion.a>
					) : (
						<span className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border-2 border-foreground/30 bg-muted px-6 py-3 font-display text-base tracking-wide text-muted-foreground opacity-50">
							<Bot className="size-5" aria-hidden="true" />
							{ctaInvite}
						</span>
					)}
				</motion.div>
			</div>

			<motion.div variants={fadeUp} className="relative min-h-[440px]" aria-hidden="true">
				<div className="absolute left-0 top-10 h-72 w-[82%] rotate-[-3deg] rounded-3xl border-2 border-foreground bg-card shadow-[6px_6px_0px_0px_var(--nb-shadow)]" />
				<motion.div
					className="absolute right-0 top-0 flex w-[86%] flex-col gap-4 rounded-3xl border-2 border-foreground bg-background p-5 shadow-[8px_8px_0px_0px_var(--nb-shadow)]"
					animate={shouldReduceMotion ? undefined : { y: [0, -8, 0] }}
					transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
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
									ease: "easeInOut",
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
			</motion.div>
		</motion.div>
	);
}
