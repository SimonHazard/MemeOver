import { motion, type Variants } from "framer-motion";

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
	return (
		<motion.div
			variants={container}
			initial="hidden"
			animate="show"
			className="flex flex-col items-center gap-6 text-center"
		>
			{/* Badge */}
			<motion.span
				variants={pop}
				className="inline-block px-4 py-1.5 rounded-lg border-2 border-foreground bg-secondary text-secondary-foreground font-display text-xs tracking-wider shadow-[2px_2px_0px_0px_var(--nb-shadow)] uppercase"
			>
				{badge}
			</motion.span>

			{/* Logo + Title */}
			<motion.div variants={pop} className="flex flex-col items-center gap-4">
				<img
					src="/icon.png"
					alt="MemeOver logo"
					width={120}
					height={120}
					className="rounded-2xl border-2 border-foreground shadow-[4px_4px_0px_0px_var(--nb-shadow)]"
				/>
				<h1 className="font-display text-5xl sm:text-6xl md:text-7xl tracking-wide text-foreground">
					{title}
				</h1>
			</motion.div>

			{/* Tagline */}
			<motion.p
				variants={fadeUp}
				className="font-display text-lg sm:text-xl md:text-2xl text-primary-600 dark:text-primary-300 tracking-wide max-w-2xl"
			>
				{tagline}
			</motion.p>

			{/* Description */}
			<motion.p
				variants={fadeUp}
				className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed"
			>
				{description}
			</motion.p>

			{/* CTAs */}
			<motion.div
				variants={fadeUp}
				className="flex flex-wrap items-center justify-center gap-4 mt-2"
			>
				<a
					href={downloadHref}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-display tracking-wide text-base border-2 border-foreground shadow-[3px_3px_0px_0px_var(--nb-shadow)] hover:shadow-[4px_4px_0px_0px_var(--nb-shadow)] active:shadow-none active:translate-x-0.75 active:translate-y-0.75 transition-all"
				>
					{ctaDownload}
				</a>
				{inviteHref ? (
					<a
						href={inviteHref}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-display tracking-wide text-base border-2 border-foreground shadow-[3px_3px_0px_0px_var(--nb-shadow)] hover:shadow-[4px_4px_0px_0px_var(--nb-shadow)] active:shadow-none active:translate-x-0.75 active:translate-y-0.75 transition-all"
					>
						{ctaInvite}
					</a>
				) : (
					<span className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-muted text-muted-foreground font-display tracking-wide text-base border-2 border-foreground/30 opacity-50 cursor-not-allowed">
						{ctaInvite}
					</span>
				)}
			</motion.div>
		</motion.div>
	);
}
