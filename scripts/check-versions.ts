import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface Manifest {
	name: string;
	version?: string;
	workspaces?: string[];
}

export function checkVersions(root = dirname(dirname(fileURLToPath(import.meta.url)))): string[] {
	const read = (path: string) => readFileSync(join(root, path), "utf8");
	const manifest = (path: string): Manifest => JSON.parse(read(path));
	const app = manifest("app/package.json");
	if (typeof app.version !== "string" || app.version.length === 0) {
		throw new Error("app/package.json must declare a version");
	}
	const errors: string[] = [];
	const expectVersion = (path: string, actual: unknown, expected: string | undefined) => {
		if (actual !== expected) {
			errors.push(`${path}: expected ${expected}, found ${actual}`);
		}
	};
	const tauri = JSON.parse(read("app/src-tauri/tauri.conf.json"));
	const cargo = Bun.TOML.parse(read("app/src-tauri/Cargo.toml")) as {
		package: { version: string };
	};
	const cargoLock = Bun.TOML.parse(read("app/src-tauri/Cargo.lock")) as {
		package: { name: string; version: string; source?: string }[];
	};
	const nativePackage = cargoLock.package.find(
		(pkg) => pkg.name === "memeover" && pkg.source === undefined,
	);
	expectVersion("app/src-tauri/tauri.conf.json", tauri.version, app.version);
	expectVersion("app/src-tauri/Cargo.toml", cargo.package.version, app.version);
	expectVersion("app/src-tauri/Cargo.lock (memeover)", nativePackage?.version, app.version);
	expectVersion("site/package.json", manifest("site/package.json").version, app.version);

	const lock = Bun.JSON5.parse(read("bun.lock")) as { workspaces: Record<string, Manifest> };
	const rootManifest = manifest("package.json");
	if (!Array.isArray(rootManifest.workspaces)) {
		throw new Error("package.json must declare the workspace paths");
	}
	for (const workspace of ["", ...rootManifest.workspaces]) {
		const pkg = manifest(join(workspace, "package.json"));
		if (workspace && (typeof pkg.version !== "string" || pkg.version.length === 0)) {
			errors.push(`${workspace}/package.json must declare a version`);
		}
		const locked = lock.workspaces[workspace];
		if (!locked || locked.name !== pkg.name) {
			errors.push(`bun.lock (${workspace || "root"}): missing or mismatched workspace ${pkg.name}`);
			continue;
		}
		expectVersion(`bun.lock (${workspace || "root"})`, locked.version, pkg.version);
	}
	return errors;
}

if (import.meta.main) {
	try {
		const errors = checkVersions();
		if (errors.length > 0) {
			console.error(errors.join("\n"));
			process.exitCode = 1;
		} else {
			console.log("Product and workspace versions are synchronized.");
		}
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	}
}
