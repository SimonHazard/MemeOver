# Bot runtime and tests

The Effect version is pinned in [package.json](package.json). For Effect APIs, start with the installed `bot/node_modules/effect/AGENTS.md` and targeted examples in `bot/node_modules/effect/ai-docs/src/`. The upstream [Effect 4.1.6 LLM guide](https://github.com/Effect-TS/effect/blob/effect%404.1.6/LLMS.md) collects those examples. Check the installed exports and types for the exact version. Domain services under `src/services/` expose explicit layers. Keep runtime and server imports out of service files. [runtime.ts](src/runtime.ts) owns the production composition. Run effects at Discord/Elysia boundaries and preserve existing facade signatures.

Use the Effect clock and `TestClock` for scheduling. Align virtual time with registry fixtures whose writes use `Date.now`. A fiber must never remove or restart itself through its own `FiberMap` key. Replacement finalizers must preserve newer waits.

Expected Discord failures use tagged errors. Expiry and scheduled-job boundaries contain defects and propagate interruption. `E = never` still permits defects. Unwrap `Redacted` only at the consuming integration and preserve Pino’s safe serializers and hashed Discord references.

The lifecycle releases resources in reverse order. Cover release and partial-startup failure for new resources. Tests inject fake layers, own and dispose their runtimes, and stop servers before disposal. When replacing a module mock, retain its behavior assertions and check which production boundary the new test exercises.
