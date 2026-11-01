// Protected-path rules shared by guard-protected-paths.sh and guard-protected-bash.sh.
// The command mode is a heuristic, not a shell parser or sandbox: it resolves the literal
// operands of known write commands and redirections without evaluating anything.
//   bun protected-paths.mjs path <file> <root>
//   bun protected-paths.mjs command <command> <cwd> <root>
// Exits 2 with a reason on stderr when a protected path would be written.
import { existsSync, readdirSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const real = (path) => {
	try {
		return realpathSync(path);
	} catch {
		return path;
	}
};
const isOutside = (rel) => rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel);
const split = (path) => path.split("/").filter((segment) => segment && segment !== ".");

// `.env*`, every `data` directory, the Tauri build cache and personal Claude settings.
function isProtected(segments) {
	return segments.some(
		(segment, i) =>
			segment === "data" ||
			segment.startsWith(".env") ||
			(segment === "app" && segments[i + 1] === "src-tauri" && segments[i + 2] === "target") ||
			(segment === ".claude" && segments[i + 1] === "settings.local.json"),
	);
}

// Rules apply below the root, so a checkout under /mnt/data stays writable; outside the
// root, the ancestors it shares with the root are ignored the same way.
function segmentsBelowRoot(path, root) {
	let base = root;
	while (isOutside(relative(base, path)) && dirname(base) !== base) base = dirname(base);
	return split(relative(base, path));
}

const isGlob = (segment) => /[*?[]/.test(segment);
function segmentMatches(pattern, name) {
	if (!isGlob(pattern)) return pattern === name;
	const source = pattern
		.replace(/[.+^${}()|\\]/g, "\\$&")
		.replace(/\*/g, ".*")
		.replace(/\?/g, ".")
		.replace(/\[!/g, "[^");
	try {
		return new RegExp(`^${source}$`).test(name);
	} catch {
		return true;
	}
}

// Existing protected entries below the root, listed on demand for removals and globs:
// `rm -rf bot` must not erase bot/data.
const SKIPPED = new Set([".git", "node_modules"]);
function findProtectedEntries(root) {
	const found = [];
	const walk = (dir, segments) => {
		let entries = [];
		try {
			entries = readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			const next = [...segments, entry.name];
			if (isProtected(next)) found.push(next);
			else if (entry.isDirectory() && next.length < 6 && !SKIPPED.has(entry.name)) {
				walk(join(dir, entry.name), next);
			}
		}
	};
	walk(root, []);
	return found;
}

// A written path is blocked when it is protected, a removal also when it contains a
// protected entry, and a glob when it may match one.
function writes(ctx, path, removal) {
	const segments = segmentsBelowRoot(path, ctx.root);
	if (isProtected(segments)) return true;
	if (!removal && !segments.some(isGlob)) return false;
	if (isOutside(relative(ctx.root, path))) {
		return removal && !isOutside(relative(path, ctx.root)) && ctx.entries().length > 0;
	}
	return ctx.entries().some((entry) => {
		const shared = Math.min(segments.length, entry.length);
		for (let i = 0; i < shared; i++) if (!segmentMatches(segments[i], entry[i])) return false;
		return removal || segments.length >= entry.length;
	});
}

// Shell word → literal text, `dynamic` when it depends on an expansion.
function literal(word) {
	let text = "";
	let dynamic = false;
	for (const part of word.match(/'[^']*'|"(?:[^"\\]|\\[\s\S])*"|`[^`]*`|\\[\s\S]|[^'"`\\]+/g) ??
		[]) {
		if (part[0] === "'") text += part.slice(1, -1);
		else if (part[0] === '"') {
			dynamic ||= /[$`]/.test(part);
			text += part.slice(1, -1).replace(/\\([$`"\\])/g, "$1");
		} else if (part[0] === "`") {
			dynamic = true;
			text += part;
		} else if (part[0] === "\\") text += part.slice(1);
		else {
			dynamic ||= part.includes("$");
			text += part;
		}
	}
	return { text, dynamic };
}

// null when the path depends on an expansion or an unknown working directory.
function resolveWord(word, cwd) {
	if (word.dynamic) return null;
	const text = word.text === "~" || word.text.startsWith("~/") ? homedir() + word.text.slice(1) : word.text;
	if (isAbsolute(text)) return resolve(text);
	return cwd === null ? null : resolve(cwd, text);
}

function check(ctx, word, cwd, removal) {
	if (word.text === "") return;
	const path = resolveWord(word, cwd);
	const blocked = path === null ? isProtected(split(word.text)) : writes(ctx, path, removal);
	if (blocked) ctx.blocked.push(path ?? word.text);
}

// `valued` lists the short options whose value is the next word.
function parse(args, valued = "") {
	const options = [];
	const operands = [];
	let ended = false;
	for (let i = 0; i < args.length; i++) {
		const { text } = args[i];
		if (ended || !text.startsWith("-") || text === "-") {
			if (text !== "") operands.push(args[i]);
		} else if (text === "--") ended = true;
		else {
			const long = /^--([^=]+)=([\s\S]*)$/.exec(text);
			const short = !text.startsWith("--");
			let value;
			if (long) value = { text: long[2], dynamic: args[i].dynamic };
			else if (short && valued.includes(text.at(-1))) value = args[++i];
			options.push({ name: long ? long[1] : short ? text : text.slice(2), value });
		}
	}
	return { options, operands };
}

function destination(args, valued) {
	const { options, operands } = parse(args, valued);
	const target = options.find(
		(option) => option.value && (/^-[A-Za-z]*t$/.test(option.name) || option.name === "target-directory"),
	);
	if (target) return { options, dest: target.value, sources: operands };
	return { options, dest: operands.at(-1), sources: operands.slice(0, -1) };
}

const each =
	(removal, skip = 0, valued = "") =>
	(ctx, args, cwd) => {
		for (const word of parse(args, valued).operands.slice(skip)) check(ctx, word, cwd, removal);
		return cwd;
	};

const copy = (removeSources) => (ctx, args, cwd) => {
	const { dest, sources } = destination(args, "tSmog");
	if (dest) check(ctx, dest, cwd, false);
	if (removeSources) for (const source of sources) check(ctx, source, cwd, true);
	return cwd;
};

function changeDirectory(args, cwd) {
	const dir = parse(args).operands[0];
	if (!dir) return homedir();
	return dir.text === "-" ? null : resolveWord(dir, cwd);
}

const HERE = { text: ".", dynamic: false };
const VERBS = new Map(
	Object.entries({
		cd: (_ctx, args, cwd) => changeDirectory(args, cwd),
		pushd: (ctx, args, cwd) => {
			ctx.dirs.push(cwd);
			return changeDirectory(args, cwd);
		},
		popd: (ctx) => (ctx.dirs.length > 0 ? ctx.dirs.pop() : null),
		rm: each(true),
		rmdir: each(true),
		unlink: each(true),
		shred: each(true),
		tee: each(false),
		touch: each(false, 0, "rtd"),
		truncate: each(false, 0, "sr"),
		chmod: each(false, 1),
		chown: each(false, 1),
		cp: copy(false),
		ln: copy(false),
		install: copy(false),
		mv: copy(true),
		rsync: (ctx, args, cwd) => {
			const { options, dest, sources } = destination(args, "ef");
			const names = options.map((option) => option.name);
			if (dest) check(ctx, dest, cwd, names.some((name) => name.startsWith("delete")));
			if (names.includes("remove-source-files")) {
				for (const source of sources) check(ctx, source, cwd, true);
			}
			return cwd;
		},
		dd: (ctx, args, cwd) => {
			for (const word of args) {
				if (word.text.startsWith("of=")) {
					check(ctx, { text: word.text.slice(3), dynamic: word.dynamic }, cwd, false);
				}
			}
			return cwd;
		},
		sqlite3: (ctx, args, cwd) => {
			const database = parse(args).operands[0];
			if (database) check(ctx, database, cwd, false);
			return cwd;
		},
		sed: (ctx, args, cwd) => {
			const { options, operands } = parse(args, "ef");
			const inPlace = options.some(
				(option) => /^-[A-Za-z]*i/.test(option.name) || option.name.startsWith("in-place"),
			);
			if (!inPlace) return cwd;
			const scripted = options.some(
				(option) => /^-[A-Za-z]*[ef]$/.test(option.name) || ["expression", "file"].includes(option.name),
			);
			for (const word of operands.slice(scripted ? 0 : 1)) check(ctx, word, cwd, false);
			return cwd;
		},
		find: (ctx, args, cwd) => {
			if (!args.some((word) => word.text === "-delete")) return cwd;
			const end = args.findIndex((word) => /^[-(!]/.test(word.text));
			const paths = args.slice(0, end === -1 ? args.length : end);
			for (const path of paths.length > 0 ? paths : [HERE]) check(ctx, path, cwd, true);
			return cwd;
		},
		git: (ctx, args, cwd) => {
			let dir = cwd;
			let i = 0;
			while (i < args.length && args[i].text.startsWith("-")) {
				if (args[i].text === "-C" && args[i + 1]) dir = resolveWord(args[++i], dir);
				else if (args[i].text === "-c") i++;
				i++;
			}
			const rest = args.slice(i + 1);
			if (args[i]?.text === "rm") each(true)(ctx, rest, dir);
			else if (args[i]?.text === "mv") copy(true)(ctx, rest, dir);
			else if (args[i]?.text === "clean") {
				const { options, operands } = parse(rest, "e");
				if (options.some((option) => /^-[A-Za-z]*[xX]/.test(option.name))) {
					for (const path of operands.length > 0 ? operands : [HERE]) check(ctx, path, dir, true);
				}
			}
			return cwd;
		},
		...Object.fromEntries(
			["bash", "sh", "zsh", "dash"].map((shell) => [
				shell,
				(ctx, args, cwd) => {
					const script = parse(args, "c").options.find((option) => /^-[A-Za-z]*c$/.test(option.name));
					if (script?.value) analyze(ctx, script.value.text, cwd);
					return cwd;
				},
			]),
		),
	}),
);

// Words that run the next word as the command.
const PREFIXES = new Set(
	"sudo command builtin exec env nice nohup time xargs if then else elif while until do { !".split(" "),
);

function runSimple(ctx, words, targets, cwd) {
	for (const target of targets) check(ctx, target, cwd, false);
	let i = 0;
	while (i < words.length) {
		if (/^[A-Za-z_]\w*=/.test(words[i].text)) i++;
		else if (PREFIXES.has(words[i].text)) {
			i++;
			while (i < words.length && words[i].text.startsWith("-")) i++;
		} else break;
	}
	const verb = words[i] && VERBS.get(basename(words[i].text));
	return verb ? verb(ctx, words.slice(i + 1), cwd) : cwd;
}

// Heredoc bodies are data, not commands: `cat > notes.md <<'EOF'` may mention data freely.
function stripHeredocs(command) {
	const operator = /(?<!<)<<(-?)[ \t]*(["']?)([A-Za-z_][\w.-]*)\2/g;
	let text = command;
	for (let match = operator.exec(text); match; match = operator.exec(text)) {
		const bodyStart = text.indexOf("\n", operator.lastIndex) + 1;
		if (bodyStart === 0) break;
		const delimiter = match[3].replace(/[.-]/g, "\\$&");
		const close = new RegExp(`^${match[1] ? "\\t*" : ""}${delimiter}$`, "m").exec(text.slice(bodyStart));
		const bodyEnd = close ? bodyStart + close.index + close[0].length : text.length;
		text = text.slice(0, bodyStart) + text.slice(bodyEnd);
	}
	return text;
}

const TOKEN =
	/\d*[<>]&(?:\d+-?|-)|&>>?|\d*>&|\d*>>?\|?|\d*<>|<<<|<<-?|<|&&|\|\||[;&|()\n]|(?:[^\s"'`;&|()<>\\]|\\[\s\S]|"(?:[^"\\]|\\[\s\S])*"|'[^']*'|`[^`]*`)+/g;

function analyze(ctx, command, initialCwd) {
	let cwd = initialCwd;
	const subshells = [];
	let words = [];
	let targets = [];
	let pending = null;
	const end = () => {
		if (words.length > 0 || targets.length > 0) cwd = runSimple(ctx, words, targets, cwd);
		words = [];
		targets = [];
	};
	for (const token of stripHeredocs(command).match(TOKEN) ?? []) {
		const operator = /^(?:&&|\|\||[;&|()\n<>]|\d*[<>])/.test(token);
		if (pending && !operator) {
			if (pending === "write") targets.push(literal(token));
			pending = null;
			continue;
		}
		pending = null;
		if (token === "(") {
			end();
			subshells.push(cwd);
		} else if (token === ")") {
			end();
			if (subshells.length > 0) cwd = subshells.pop();
		} else if (/^(?:&&|\|\||[;&|\n])$/.test(token)) end();
		else if (/^\d*[<>]&(?:\d+-?|-)$/.test(token)) {
			// File descriptor duplication such as 2>&1 writes no file.
		} else if (/^(?:<<<|<<-?|<)$/.test(token)) pending = "skip";
		else if (/[<>]/.test(token)) pending = "write";
		else words.push(literal(token));
	}
	end();
	return cwd;
}

function fail(message) {
	console.error(message);
	process.exit(2);
}

const [mode, ...args] = process.argv.slice(2);
if (mode === "path") {
	const [file, root] = args;
	const absolute = resolve(root, file);
	const path = existsSync(absolute)
		? real(absolute)
		: join(real(dirname(absolute)), basename(absolute));
	if (isProtected(segmentsBelowRoot(path, real(root)))) {
		fail("Protected project data or personal configuration: edit blocked.");
	}
} else if (mode === "command") {
	const [command, cwd, root] = args;
	let entries;
	const ctx = {
		root: real(root),
		blocked: [],
		dirs: [],
		entries: () => {
			entries ??= findProtectedEntries(ctx.root);
			return entries;
		},
	};
	analyze(ctx, command, real(resolve(root, cwd)));
	if (ctx.blocked.length > 0) {
		const path = ctx.blocked[0];
		const inside = isAbsolute(path) && !isOutside(relative(ctx.root, path));
		const shown = inside ? relative(ctx.root, path) || "." : path;
		fail(
			`Protected project data or personal configuration: shell write to ${shown} blocked (edit it yourself if needed).`,
		);
	}
} else {
	fail(`protected-paths.mjs: unknown mode ${mode ?? "(none)"}`);
}
