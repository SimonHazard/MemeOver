const files = [
	...new Bun.Glob("{app,bot,shared,site}/src/**/*.mocked.test.ts").scanSync("."),
].sort();
if (files.length === 0) console.log("No mocked test files found.");
let failed = false;
for (const file of files) {
	console.log(`Isolated tests: ${file}`);
	const result = Bun.spawnSync(["bun", "test", `./${file}`], {
		stdout: "inherit",
		stderr: "inherit",
	});
	if (result.exitCode !== 0) failed = true;
}
process.exit(failed ? 1 : 0);
