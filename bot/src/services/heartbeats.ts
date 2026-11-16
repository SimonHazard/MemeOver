import { Context, Deferred, Effect, FiberMap, Layer } from "effect";

export interface HeartbeatConnection {
	readonly id: string;
	sendPing: () => boolean;
	onTimeout: () => void;
	onSendFailure: () => void;
}

export class Heartbeats extends Context.Service<
	Heartbeats,
	{
		start: (connection: HeartbeatConnection) => Effect.Effect<void>;
		pong: (id: string) => Effect.Effect<void>;
		stop: (id: string) => Effect.Effect<void>;
	}
>()("memeover/Heartbeats") {
	static readonly layer = Layer.effect(
		Heartbeats,
		Effect.gen(function* () {
			const jobs = yield* FiberMap.make<string, void, never>();
			const pending = new Map<string, Deferred.Deferred<void>>();
			// A close callback may synchronously reenter stop from its own job.
			const notifying = new Set<string>();
			const notify = (id: string, callback: () => void) => {
				notifying.add(id);
				try {
					callback();
				} finally {
					notifying.delete(id);
				}
			};
			const cycle = (connection: HeartbeatConnection) =>
				Effect.gen(function* () {
					while (true) {
						yield* Effect.sleep(30_000);
						const reply = yield* Deferred.make<void>();
						// Register before sending: an immediate PONG must resolve this wait.
						pending.set(connection.id, reply);
						const continueHeartbeat = yield* Effect.gen(function* () {
							let sent = false;
							try {
								sent = connection.sendPing();
							} catch {
								// The production delivered() adapter also contains send exceptions.
							}
							if (!sent) {
								notify(connection.id, connection.onSendFailure);
								return false;
							}
							const answered = yield* Deferred.await(reply).pipe(
								Effect.as(true),
								Effect.timeoutOrElse({ duration: 10_000, orElse: () => Effect.succeed(false) }),
							);
							if (!answered) {
								notify(connection.id, connection.onTimeout);
								return false;
							}
							return true;
						}).pipe(
							Effect.ensuring(
								Effect.sync(() => {
									if (pending.get(connection.id) === reply) pending.delete(connection.id);
								}),
							),
						);
						if (!continueHeartbeat) return;
					}
				});
			return {
				start: (connection) =>
					Effect.gen(function* () {
						yield* FiberMap.remove(jobs, connection.id);
						yield* FiberMap.run(jobs, connection.id, cycle(connection));
					}),
				pong: (id) =>
					Effect.gen(function* () {
						const reply = pending.get(id);
						if (reply) yield* Deferred.succeed(reply, undefined);
					}),
				stop: (id) =>
					Effect.suspend(() => (notifying.has(id) ? Effect.void : FiberMap.remove(jobs, id))),
			};
		}),
	);
}
