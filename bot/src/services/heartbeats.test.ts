import { expect, test } from "bun:test";
import { Clock, Effect, Layer, ManagedRuntime } from "effect";
import { TestClock } from "effect/testing";
import { type HeartbeatConnection, Heartbeats } from "./heartbeats";

function fixture() {
	const runtime = ManagedRuntime.make(Heartbeats.layer.pipe(Layer.provideMerge(TestClock.layer())));
	const run = (body: (heartbeats: Heartbeats["Service"]) => Effect.Effect<void>) =>
		runtime.runSync(Effect.flatMap(Heartbeats, body));
	const events: Array<[string, number]> = [];
	const connection = (id = "socket"): HeartbeatConnection => ({
		id,
		sendPing: () => {
			events.push([`${id}:ping`, runtime.runSync(Clock.currentTimeMillis)]);
			return true;
		},
		onTimeout: () => void events.push([`${id}:timeout`, runtime.runSync(Clock.currentTimeMillis)]),
		onSendFailure: () =>
			void events.push([`${id}:failure`, runtime.runSync(Clock.currentTimeMillis)]),
	});
	return {
		runtime,
		run,
		events,
		connection,
		adjust: (ms: number) => runtime.runPromise(TestClock.adjust(ms)),
	};
}

test("first PING is at 30 seconds and the next waits 30 seconds after PONG", async () => {
	const f = fixture();
	try {
		f.run((h) => h.start(f.connection()));
		await f.adjust(29_999);
		expect(f.events).toEqual([]);
		await f.adjust(1);
		expect(f.events).toEqual([["socket:ping", 30_000]]);
		await f.adjust(1000);
		f.run((h) => h.pong("socket"));
		await f.adjust(29_999);
		expect(f.events).toHaveLength(1);
		await f.adjust(1);
		expect(f.events).toEqual([
			["socket:ping", 30_000],
			["socket:ping", 61_000],
		]);
	} finally {
		await f.runtime.dispose();
	}
});

test("missing PONG times out once at exactly 10 seconds, then ends", async () => {
	const f = fixture();
	try {
		f.run((h) => h.start(f.connection()));
		await f.adjust(39_999);
		expect(f.events).toEqual([["socket:ping", 30_000]]);
		await f.adjust(1);
		expect(f.events).toEqual([
			["socket:ping", 30_000],
			["socket:timeout", 40_000],
		]);
		await f.adjust(100_000);
		expect(f.events).toHaveLength(2);
	} finally {
		await f.runtime.dispose();
	}
});

test("an immediate PONG during send is retained; unknown and duplicate PONG are harmless", async () => {
	const f = fixture();
	try {
		f.run((h) => h.pong("unknown"));
		const connection = f.connection();
		const send = connection.sendPing;
		connection.sendPing = () => {
			f.run((h) => h.pong("socket"));
			return send();
		};
		f.run((h) => h.start(connection));
		await f.adjust(30_000);
		f.run((h) => h.pong("socket"));
		await f.adjust(30_000);
		expect(f.events).toEqual([
			["socket:ping", 30_000],
			["socket:ping", 60_000],
		]);
	} finally {
		await f.runtime.dispose();
	}
});

for (const failure of ["false", "throw"] as const) {
	test(`a send that ${failure === "false" ? "returns false" : "throws"} fails once without a PONG timeout`, async () => {
		const f = fixture();
		try {
			const connection = f.connection();
			connection.sendPing = () => {
				if (failure === "throw") throw new Error("Fixture transport failure");
				return false;
			};
			f.run((h) => h.start(connection));
			await f.adjust(100_000);
			expect(f.events).toEqual([["socket:failure", 30_000]]);
		} finally {
			await f.runtime.dispose();
		}
	});
}

test("stop and replacement cancel old waits without affecting the new connection", async () => {
	const f = fixture();
	try {
		f.run((h) => h.start(f.connection()));
		await f.adjust(30_000);
		f.run((h) => h.start(f.connection()));
		await f.adjust(10_000);
		f.run((h) => h.pong("socket")); // Must not acknowledge an old, cancelled wait.
		await f.adjust(20_000);
		expect(f.events).toEqual([
			["socket:ping", 30_000],
			["socket:ping", 60_000],
		]);
		f.run((h) => h.stop("socket"));
		f.run((h) => h.stop("socket"));
		f.run((h) => h.stop("unknown"));
		await f.adjust(100_000);
		expect(f.events).toHaveLength(2);
	} finally {
		await f.runtime.dispose();
	}
});

test("runtime disposal cancels all pending replies and sleeping jobs", async () => {
	const f = fixture();
	f.run((h) => h.start(f.connection("first")));
	await f.adjust(30_000);
	f.run((h) => h.start(f.connection("second")));
	const clock = f.runtime.runSync(TestClock.testClockWith((clock) => Effect.succeed(clock)));
	await f.runtime.dispose();
	await Effect.runPromise(clock.adjust(100_000));
	expect(f.events).toEqual([["first:ping", 30_000]]);
});

for (const reason of ["timeout", "failure"] as const) {
	test(`a synchronous close during ${reason} finishes cleanup without self-interruption`, async () => {
		const f = fixture();
		try {
			const connection = f.connection();
			if (reason === "failure") connection.sendPing = () => false;
			const close = () => {
				f.events.push(["remove-membership", 0]);
				f.run((h) => h.stop(connection.id));
				f.events.push(["transport-closed", 0]);
			};
			connection.onTimeout = close;
			connection.onSendFailure = close;
			f.run((h) => h.start(connection));
			await f.adjust(100_000);
			expect(f.events.slice(-2)).toEqual([
				["remove-membership", 0],
				["transport-closed", 0],
			]);
			expect(f.events).toHaveLength(reason === "timeout" ? 3 : 2);
		} finally {
			await f.runtime.dispose();
		}
	});
}
