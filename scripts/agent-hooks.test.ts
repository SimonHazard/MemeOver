import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

test("agent hooks protect paths and preserve unrelated edits", () => {
	const result = Bun.spawnSync(["bash", ".claude/hooks/test-hooks.sh"], {
		cwd: fileURLToPath(new URL("..", import.meta.url)),
		stdout: "pipe",
		stderr: "pipe",
	});
	expect(result.exitCode, result.stderr.toString()).toBe(0);
}, 20_000);
