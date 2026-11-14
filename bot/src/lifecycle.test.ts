import { expect, spyOn, test } from "bun:test";
import { Cause, Effect, Exit, Fiber, ManagedRuntime } from "effect";
import {
	type BotLifecycleSteps,
	BotStartError,
	createShutdownDeadline,
	lifecycleExitCode,
	runBot,
	SHUTDOWN_TIMEOUT_MS,
} from "./lifecycle";
import { Heartbeats } from "./services/heartbeats";

function gate() {
	let resolve: () => void = () => {};
	const promise = new Promise<void>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

function fixture() {
	const events: string[] = [];
	const failures: Array<{ event: string; error: unknown; message: string }> = [];
	const registered = gate();
	const steps: BotLifecycleSteps = {
		listen: () => {
			events.push("listen");
			return () => {
				events.push("stop");
			};
		},
		rearmPauses: () => {
			events.push("rearm");
		},
		loginDiscord: async () => {
			events.push("login");
		},
		registerCommands: async () => {
			events.push("register");
			registered.resolve();
		},
		destroyDiscord: () => {
			events.push("destroy");
		},
		flushRegistry: () => {
			events.push("flush");
		},
		notifyClientsOfShutdown: () => {
			events.push("notify");
		},
		disposeRuntime: () => {
			events.push("dispose");
		},
		beginShutdown: () => {
			events.push("deadline");
		},
		logFailure: (event, error, message) => {
			events.push(event);
			failures.push({ event, error, message });
		},
	};
	return { steps, events, failures, registered };
}

const startup = ["listen", "rearm", "login", "register"];
const cleanup = ["notify", "flush", "destroy", "stop", "dispose"];

test("startup order and repeated interruption release resources once in reverse order", async () => {
	const f = fixture();
	const fiber = Effect.runFork(runBot(f.steps));
	await f.registered.promise;
	expect(f.events).toEqual(startup);
	fiber.interruptUnsafe();
	fiber.interruptUnsafe();
	const exit = await Effect.runPromise(Fiber.await(fiber));
	expect(f.events).toEqual([...startup, ...cleanup]);
	expect(lifecycleExitCode(exit)).toBe(0);
	expect(f.failures).toEqual([]);
});

for (const phase of ["login", "register"] as const) {
	test(`${phase} failure is logged before complete cleanup and exits with failure`, async () => {
		const f = fixture();
		const error = new Error(`${phase} fixture failure`);
		const action = async () => {
			f.events.push(phase);
			throw error;
		};
		if (phase === "login") f.steps.loginDiscord = action;
		else f.steps.registerCommands = action;
		const exit = await Effect.runPromiseExit(runBot(f.steps));
		expect(f.events).toEqual([
			...startup.slice(0, phase === "login" ? 3 : 4),
			"bot_start_failed",
			"deadline",
			...cleanup,
		]);
		expect(f.failures).toEqual([{ event: "bot_start_failed", error, message: error.message }]);
		expect(lifecycleExitCode(exit)).toBe(1);
		expect(Exit.isFailure(exit) && Cause.squash(exit.cause)).toBeInstanceOf(BotStartError);
	});
}

test("listen failure releases only the runtime and never calls an unacquired stop", async () => {
	const f = fixture();
	f.steps.listen = () => {
		f.events.push("listen");
		throw new Error("bind failed");
	};
	const exit = await Effect.runPromiseExit(runBot(f.steps));
	expect(f.events).toEqual(["listen", "bot_start_failed", "deadline", "dispose"]);
	expect(lifecycleExitCode(exit)).toBe(1);
});

test("synchronous rearm failure still releases all resources protected before startup", async () => {
	const f = fixture();
	f.steps.rearmPauses = () => {
		f.events.push("rearm");
		throw new Error("write failed");
	};
	const exit = await Effect.runPromiseExit(runBot(f.steps));
	expect(f.events).toEqual(["listen", "rearm", "bot_start_failed", "deadline", ...cleanup]);
	expect(lifecycleExitCode(exit)).toBe(1);
});

test("signal during pending login destroys the partially initialized client", async () => {
	const f = fixture();
	const loginStarted = gate();
	const loginFinished = gate();
	f.steps.loginDiscord = () => {
		f.events.push("login");
		loginStarted.resolve();
		return loginFinished.promise;
	};
	const fiber = Effect.runFork(runBot(f.steps));
	await loginStarted.promise;
	fiber.interruptUnsafe();
	const exit = await Effect.runPromise(Fiber.await(fiber));
	expect(f.events).toEqual(["listen", "rearm", "login", ...cleanup]);
	expect(lifecycleExitCode(exit)).toBe(0);
	loginFinished.resolve();
	expect(f.events).not.toContain("register");
});

const releases = [
	[
		"notifyClientsOfShutdown",
		"notify",
		"shutdown_notify_failed",
		"Failed to notify clients during shutdown",
	],
	["flushRegistry", "flush", "shutdown_flush_failed", "Failed to flush registry during shutdown"],
	["destroyDiscord", "destroy", "shutdown_discord_failed", "Failed to destroy Discord client"],
	["listen", "stop", "shutdown_stop_failed", "Failed to stop server during shutdown"],
	["disposeRuntime", "dispose", "shutdown_runtime_failed", "Failed to dispose Effect runtime"],
] as const;

for (const [key, event, logEvent, message] of releases) {
	for (const mode of ["throw", "reject"] as const) {
		test(`${event} ${mode} is logged and does not skip another finalizer`, async () => {
			const f = fixture();
			const error = new Error(`${event} failure`);
			const action = () => {
				f.events.push(event);
				if (mode === "throw") throw error;
				return Promise.reject(error);
			};
			if (key === "listen")
				f.steps.listen = () => {
					f.events.push("listen");
					return action;
				};
			else f.steps[key] = action;
			const fiber = Effect.runFork(runBot(f.steps));
			await f.registered.promise;
			await Effect.runPromise(Fiber.interrupt(fiber));
			expect(f.events.filter((item) => !item.startsWith("shutdown_"))).toEqual([
				...startup,
				...cleanup,
			]);
			expect(f.failures).toEqual([{ event: logEvent, error, message }]);
		});
	}
}

test("server stop keeps its receiver and completes heartbeat callbacks before runtime disposal", async () => {
	const f = fixture();
	const runtime = ManagedRuntime.make(Heartbeats.layer);
	let disposed = false;
	const server = {
		calls: 0,
		stop() {
			this.calls++;
			expect(disposed).toBe(false);
			runtime.runSync(Effect.flatMap(Heartbeats, (h) => h.stop("fixture")));
			f.events.push("stop");
		},
	};
	f.steps.listen = () => {
		f.events.push("listen");
		runtime.runSync(
			Effect.flatMap(Heartbeats, (h) =>
				h.start({
					id: "fixture",
					sendPing: () => true,
					onTimeout: () => {},
					onSendFailure: () => {},
				}),
			),
		);
		return () => server.stop();
	};
	f.steps.disposeRuntime = async () => {
		await runtime.dispose();
		disposed = true;
		f.events.push("dispose");
	};
	const fiber = Effect.runFork(runBot(f.steps));
	try {
		await f.registered.promise;
		await Effect.runPromise(Fiber.interrupt(fiber));
		expect(server.calls).toBe(1);
		expect(disposed).toBe(true);
		expect(f.events).toEqual([...startup, ...cleanup]);
	} finally {
		await runtime.dispose();
	}
});

test("exit classification preserves failures and defects combined with interruption", () => {
	expect(lifecycleExitCode(Exit.succeed(undefined))).toBe(0);
	expect(lifecycleExitCode(Exit.interrupt())).toBe(0);
	expect(lifecycleExitCode(Exit.fail("startup"))).toBe(1);
	expect(lifecycleExitCode(Exit.die("defect"))).toBe(1);
	expect(
		lifecycleExitCode(Exit.failCause(Cause.combine(Cause.fail("startup"), Cause.interrupt()))),
	).toBe(1);
	expect(
		lifecycleExitCode(Exit.failCause(Cause.combine(Cause.die("defect"), Cause.interrupt()))),
	).toBe(1);
});

test("a shutdown request while a startup failure is being handled cannot turn it into success", async () => {
	const f = fixture();
	f.steps.loginDiscord = async () => {
		throw new Error("startup failed before shutdown");
	};
	let fiber: Fiber.Fiber<never, BotStartError>;
	f.steps.beginShutdown = () => {
		fiber.interruptUnsafe();
	};
	fiber = Effect.runFork(runBot(f.steps));
	const exit = await Effect.runPromise(Fiber.await(fiber));
	expect(lifecycleExitCode(exit)).toBe(1);
	expect(f.failures[0]?.event).toBe("bot_start_failed");
	expect(f.events.slice(-cleanup.length)).toEqual(cleanup);
});

function fakeDeadline() {
	let time = 0;
	let scheduled: { at: number; callback: () => void } | undefined;
	let unrefs = 0;
	let schedules = 0;
	const timer = {
		unref: () => {
			unrefs++;
		},
	} as ReturnType<typeof setTimeout>;
	// Narrow the Node/Bun timer overload; the same global object is restored below.
	const timers: {
		setTimeout: (callback: () => void, delay?: number) => ReturnType<typeof setTimeout>;
		clearTimeout: (timer: ReturnType<typeof setTimeout>) => void;
	} = globalThis;
	const set = spyOn(timers, "setTimeout").mockImplementation((callback, delay) => {
		schedules++;
		scheduled = { at: time + (delay ?? 0), callback };
		return timer;
	});
	const clear = spyOn(timers, "clearTimeout").mockImplementation(() => {
		scheduled = undefined;
	});
	const exits: number[] = [];
	const deadline = createShutdownDeadline(() => {
		exits.push(1);
	});
	return {
		deadline,
		exits,
		counts: () => ({ schedules, unrefs }),
		advance(ms: number) {
			time += ms;
			if (scheduled && time >= scheduled.at) {
				const callback = scheduled.callback;
				scheduled = undefined;
				callback();
			}
		},
		restore() {
			set.mockRestore();
			clear.mockRestore();
		},
	};
}

for (const reason of ["signal", "startup failure"] as const) {
	test(`${reason} cleanup is bounded by the same unref'd 8-second deadline`, async () => {
		const f = fixture();
		const clock = fakeDeadline();
		const releasing = gate();
		const resumeRelease = gate();
		f.steps.beginShutdown = () => clock.deadline.start();
		f.steps.notifyClientsOfShutdown = () => {
			releasing.resolve();
			return resumeRelease.promise;
		};
		if (reason === "startup failure")
			f.steps.loginDiscord = async () => {
				throw new Error("login failed");
			};
		const fiber = Effect.runFork(runBot(f.steps));
		try {
			if (reason === "signal") {
				await f.registered.promise;
				clock.deadline.start();
				clock.deadline.start();
				fiber.interruptUnsafe();
			}
			await releasing.promise;
			expect(clock.counts()).toEqual({ schedules: 1, unrefs: 1 });
			clock.advance(SHUTDOWN_TIMEOUT_MS - 1);
			expect(clock.exits).toEqual([]);
			clock.advance(1);
			expect(clock.exits).toEqual([1]);
		} finally {
			resumeRelease.resolve();
			await Effect.runPromise(Fiber.await(fiber));
			clock.deadline.clear();
			clock.restore();
		}
	});
}

test("completed cleanup clears the deadline before it can force an exit", () => {
	const clock = fakeDeadline();
	try {
		clock.deadline.start();
		clock.deadline.clear();
		clock.advance(SHUTDOWN_TIMEOUT_MS);
		expect(clock.exits).toEqual([]);
	} finally {
		clock.restore();
	}
});
