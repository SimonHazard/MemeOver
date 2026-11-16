import { Data, Effect, Exit } from "effect";

type Release = () => void | Promise<void>;

export interface BotLifecycleSteps {
	listen: () => Release;
	rearmPauses: () => void;
	loginDiscord: () => Promise<void>;
	registerCommands: () => Promise<void>;
	destroyDiscord: Release;
	flushRegistry: Release;
	notifyClientsOfShutdown: Release;
	disposeRuntime: Release;
	beginShutdown: () => void;
	logFailure: (event: string, error: unknown, message: string) => void;
}

export class BotStartError extends Data.TaggedError("BotStartError")<{
	readonly cause: unknown;
}> {}

// The process boundary owns the timer, including when startup fails before a signal arrives.
export const SHUTDOWN_TIMEOUT_MS = 8_000;

export function createShutdownDeadline(onTimeout: () => void) {
	let timer: ReturnType<typeof setTimeout> | undefined;
	return {
		start() {
			if (timer !== undefined) return;
			timer = setTimeout(onTimeout, SHUTDOWN_TIMEOUT_MS);
			timer.unref();
		},
		clear() {
			if (timer !== undefined) clearTimeout(timer);
		},
	};
}

export function lifecycleExitCode(exit: Exit.Exit<unknown, unknown>): 0 | 1 {
	// An interrupted cause may also contain a real failure; only pure interruption is success.
	return Exit.hasFails(exit) || Exit.hasDies(exit) ? 1 : 0;
}

export function runBot(steps: BotLifecycleSteps): Effect.Effect<never, BotStartError> {
	const release = (action: Release, event: string, message: string) =>
		Effect.tryPromise({ try: () => Promise.resolve().then(action), catch: (error) => error }).pipe(
			Effect.catch((error) => Effect.sync(() => steps.logFailure(event, error, message))),
		);
	const startup = <A>(action: () => A) =>
		Effect.try({ try: action, catch: (cause) => new BotStartError({ cause }) });
	const startupPromise = (action: () => Promise<void>) =>
		Effect.tryPromise({ try: action, catch: (cause) => new BotStartError({ cause }) });

	return Effect.scoped(
		Effect.uninterruptibleMask((restore) =>
			Effect.gen(function* () {
				yield* Effect.addFinalizer(() =>
					release(
						steps.disposeRuntime,
						"shutdown_runtime_failed",
						"Failed to dispose Effect runtime",
					),
				);
				const start = Effect.gen(function* () {
					yield* Effect.acquireRelease(startup(steps.listen), (stop) =>
						release(stop, "shutdown_stop_failed", "Failed to stop server during shutdown"),
					);
					// Register ownership atomically, before rearm/login can fail or be interrupted.
					yield* Effect.addFinalizer(() =>
						release(
							steps.destroyDiscord,
							"shutdown_discord_failed",
							"Failed to destroy Discord client",
						),
					);
					yield* Effect.addFinalizer(() =>
						release(
							steps.flushRegistry,
							"shutdown_flush_failed",
							"Failed to flush registry during shutdown",
						),
					);
					yield* Effect.addFinalizer(() =>
						release(
							steps.notifyClientsOfShutdown,
							"shutdown_notify_failed",
							"Failed to notify clients during shutdown",
						),
					);
					yield* restore(
						Effect.gen(function* () {
							yield* startup(steps.rearmPauses);
							yield* startupPromise(steps.loginDiscord);
							yield* startupPromise(steps.registerCommands);
						}),
					);
				});
				yield* start.pipe(
					Effect.catchTag("BotStartError", (error) =>
						Effect.sync(() => {
							const message =
								error.cause instanceof Error ? error.cause.message : "Failed to start Discord bot";
							steps.logFailure("bot_start_failed", error.cause, message);
							steps.beginShutdown();
						}).pipe(Effect.andThen(Effect.fail(error))),
					),
				);
				return yield* restore(Effect.never);
			}),
		),
	);
}
