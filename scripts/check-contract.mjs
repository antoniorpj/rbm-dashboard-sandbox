#!/usr/bin/env node
/**
 * Contract check for the external-team sandbox.
 *
 * Verifies that the module respects the integration rules of the Global
 * Malaria Dashboard: files only inside the allowed folders, protected starter
 * files untouched, i18n parity, allowed imports, env-var discipline and an
 * approved dependency list.
 *
 * Usage:
 *   node scripts/check-contract.mjs             # validate (exit 1 on failure)
 *   node scripts/check-contract.mjs --snapshot  # maintainer only: regenerate manifests
 *
 * Node 20, no dependencies.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SLUG = "unitaid";
const NAMESPACE = "Unitaid";
const ENV_PREFIX = "UNITAID_";

const MODULE_PAGE = `src/app/[locale]/${SLUG}/`;
const MODULE_API = `src/app/api/${SLUG}/`;
const MODULE_PUBLIC = `public/${SLUG}/`;
const ALLOWED_PREFIXES = [MODULE_PAGE, MODULE_API, MODULE_PUBLIC];
const MODULE_SRC_PREFIXES = [MODULE_PAGE, MODULE_API];

const PROTECTED_MANIFEST = "scripts/protected-files.json";
const APPROVED_DEPS = "scripts/approved-dependencies.json";

const IGNORED_DIRS = new Set([".git", "node_modules", ".next", "out", "coverage", ".idea"]);
const IGNORED_FILES = new Set([
	"next-env.d.ts",
	"tsconfig.tsbuildinfo",
	".DS_Store",
	"package-lock.json",
]);
const isIgnoredFile = (name) =>
	IGNORED_FILES.has(name) || (name.startsWith(".env") && name !== ".env.example");

const ALLOWED_HOST_IMPORTS = [
	"@/navigation",
	"@/fonts",
	"@/utils/server/crypto",
	"@/utils/common-functions",
];
const ALLOWED_MODULE_IMPORT_PREFIXES = [`@/app/[locale]/${SLUG}/`, `@/app/api/${SLUG}/`];
const FORBIDDEN_IMPORT_PATTERNS = [/^next\/font\/google/];
const ENV_ALLOWED_FILES = new Set([`${MODULE_PAGE}lib/env.ts`]);
const ENV_ALLOWED_NAMES = new Set(["NODE_ENV"]);

const REQUIRED_MODULE_FILES = [
	`${MODULE_PAGE}page.tsx`,
	`${MODULE_PAGE}page-content.tsx`,
	`${MODULE_PAGE}i18n/en.json`,
	`${MODULE_PAGE}i18n/fr.json`,
	`${MODULE_PAGE}i18n/pt.json`,
	`${MODULE_PAGE}.env.example`,
	`${MODULE_PAGE}INTEGRATION.md`,
	`${MODULE_PAGE}README.md`,
	`${MODULE_API}data/route.ts`,
];
const REQUIRED_I18N_KEYS = [
	`${NAMESPACE}.metadata.title`,
	`${NAMESPACE}.metadata.description`,
	`${NAMESPACE}.metadata.keywords`,
	`${NAMESPACE}.title`,
];
const SIDEBAR_KEY_PATTERN = new RegExp(`^[A-Za-z0-9]+_subitem_${SLUG}(_tooltip)?$`);
const MAX_PUBLIC_ASSET_BYTES = 5 * 1024 * 1024;
const SOURCE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

// ---------------------------------------------------------------- helpers
const toPosix = (p) => p.split(path.sep).join("/");
const rel = (abs) => toPosix(path.relative(ROOT, abs));
const sha256 = (abs) => createHash("sha256").update(readFileSync(abs)).digest("hex");
const startsWithAny = (p, prefixes) => prefixes.some((prefix) => p.startsWith(prefix));
const readJson = (relPath) => JSON.parse(readFileSync(path.join(ROOT, relPath), "utf8"));

function walk(dirAbs, out = []) {
	for (const entry of readdirSync(dirAbs, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (IGNORED_DIRS.has(entry.name)) continue;
			walk(path.join(dirAbs, entry.name), out);
		} else if (entry.isFile()) {
			if (isIgnoredFile(entry.name)) continue;
			out.push(rel(path.join(dirAbs, entry.name)));
		}
	}
	return out.sort();
}

function flatten(obj, prefix = "", out = {}) {
	for (const [key, value] of Object.entries(obj)) {
		const full = prefix ? `${prefix}.${key}` : key;
		if (value && typeof value === "object" && !Array.isArray(value)) flatten(value, full, out);
		else out[full] = value;
	}
	return out;
}

const issues = {};
const fail = (group, message) => {
	(issues[group] ??= []).push(message);
};

// ---------------------------------------------------------------- snapshot
function snapshot() {
	// Approved dependencies first, so the manifest below also protects that file.
	const pkg = readJson("package.json");
	writeFileSync(
		path.join(ROOT, APPROVED_DEPS),
		`${JSON.stringify(
			{ dependencies: pkg.dependencies ?? {}, devDependencies: pkg.devDependencies ?? {} },
			null,
			"\t",
		)}\n`,
	);
	const files = {};
	for (const file of walk(ROOT)) {
		if (startsWithAny(file, ALLOWED_PREFIXES)) continue;
		if (file === PROTECTED_MANIFEST) continue;
		files[file] = sha256(path.join(ROOT, file));
	}
	writeFileSync(
		path.join(ROOT, PROTECTED_MANIFEST),
		`${JSON.stringify({ generatedAt: new Date().toISOString(), files }, null, "\t")}\n`,
	);
	console.log(
		`Snapshot written: ${Object.keys(files).length} protected files, dependencies approved.`,
	);
}

// ---------------------------------------------------------------- checks
function checkPaths(allFiles, manifest) {
	for (const file of allFiles) {
		if (startsWithAny(file, ALLOWED_PREFIXES)) continue;
		if (file === PROTECTED_MANIFEST) continue;
		if (!(file in manifest.files)) {
			fail("paths", `unexpected file outside the module folders: ${file}`);
		}
	}
}

function checkProtected(manifest) {
	for (const [file, expected] of Object.entries(manifest.files)) {
		const abs = path.join(ROOT, file);
		if (!existsSync(abs)) {
			fail("protected", `missing protected file: ${file}`);
			continue;
		}
		if (sha256(abs) !== expected) fail("protected", `modified protected file: ${file}`);
	}
}

function checkRequiredFiles() {
	for (const file of REQUIRED_MODULE_FILES) {
		if (!existsSync(path.join(ROOT, file))) fail("paths", `required module file missing: ${file}`);
	}
}

function checkI18n() {
	const locales = ["en", "fr", "pt"];
	const flat = {};
	for (const locale of locales) {
		const file = `${MODULE_PAGE}i18n/${locale}.json`;
		if (!existsSync(path.join(ROOT, file))) return;
		let json;
		try {
			json = readJson(file);
		} catch (err) {
			fail("i18n", `${file}: invalid JSON (${err.message})`);
			return;
		}
		for (const top of Object.keys(json)) {
			if (top !== NAMESPACE && top !== "Sidebar") {
				fail(
					"i18n",
					`${file}: unexpected top-level namespace "${top}" (only "${NAMESPACE}" and "Sidebar")`,
				);
			}
		}
		flat[locale] = flatten(json);
		for (const [key, value] of Object.entries(flat[locale])) {
			if (typeof value !== "string") fail("i18n", `${file}: "${key}" must be a string`);
			else if (!value.trim()) fail("i18n", `${file}: "${key}" is empty`);
			if (key.startsWith("Sidebar.") && !SIDEBAR_KEY_PATTERN.test(key.slice("Sidebar.".length))) {
				fail("i18n", `${file}: Sidebar key "${key}" must match <group>_subitem_${SLUG}[_tooltip]`);
			}
		}
	}

	const reference = new Set(Object.keys(flat.en ?? {}));
	for (const key of REQUIRED_I18N_KEYS) {
		if (!reference.has(key)) fail("i18n", `i18n/en.json: required key "${key}" missing`);
	}
	for (const locale of ["fr", "pt"]) {
		const keys = new Set(Object.keys(flat[locale] ?? {}));
		for (const key of reference)
			if (!keys.has(key)) fail("i18n", `i18n/${locale}.json: missing "${key}"`);
		for (const key of keys)
			if (!reference.has(key)) fail("i18n", `i18n/${locale}.json: extra "${key}" (not in en)`);
	}

	// Module keys must not override shell keys of the host messages.
	const baseFile = "messages/en.json";
	if (existsSync(path.join(ROOT, baseFile))) {
		const base = flatten(readJson(baseFile));
		for (const key of reference) {
			if (key in base)
				fail("i18n", `i18n/en.json: "${key}" collides with a host key in ${baseFile}`);
		}
	}
}

const IMPORT_RE =
	/(?:^|[^\w$])(?:import|export)\s*(?:[\s\S]*?\sfrom\s*)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|require\s*\(\s*["']([^"']+)["']\s*\)/g;

function listImports(source) {
	const specs = [];
	for (const match of source.matchAll(IMPORT_RE)) {
		const spec = match[1] ?? match[2] ?? match[3];
		if (spec) specs.push(spec);
	}
	return specs;
}

function checkImports(moduleSources) {
	for (const file of moduleSources) {
		const source = readFileSync(path.join(ROOT, file), "utf8");
		for (const spec of listImports(source)) {
			if (FORBIDDEN_IMPORT_PATTERNS.some((re) => re.test(spec))) {
				fail("imports", `${file}: forbidden import "${spec}"`);
				continue;
			}
			if (spec.startsWith("@/")) {
				const ok =
					ALLOWED_HOST_IMPORTS.includes(spec) ||
					startsWithAny(spec, ALLOWED_MODULE_IMPORT_PREFIXES);
				if (!ok) fail("imports", `${file}: host import "${spec}" is not in the allowed list`);
				continue;
			}
			if (spec.startsWith(".")) {
				const target = toPosix(
					path.relative(ROOT, path.resolve(path.dirname(path.join(ROOT, file)), spec)),
				);
				if (
					!startsWithAny(`${target}/`, MODULE_SRC_PREFIXES) &&
					!startsWithAny(target, MODULE_SRC_PREFIXES)
				) {
					fail("imports", `${file}: relative import "${spec}" escapes the module folders`);
				}
			}
		}
		if (file.startsWith(`${MODULE_PAGE}lib/`) && !/import\s+["']server-only["']/.test(source)) {
			fail("imports", `${file}: files under lib/ must start with import "server-only"`);
		}
	}
}

function checkEnv(moduleSources) {
	const envRe = /process\.env(?:\.([A-Za-z0-9_]+)|\[\s*["']([A-Za-z0-9_]+)["']\s*\])/g;
	for (const file of moduleSources) {
		const source = readFileSync(path.join(ROOT, file), "utf8");
		const matches = [...source.matchAll(envRe)];
		if (matches.length === 0) continue;
		const allowedHere = ENV_ALLOWED_FILES.has(file) || file.startsWith(MODULE_API);
		if (!allowedHere) {
			fail(
				"env",
				`${file}: process.env may only be read in ${MODULE_PAGE}lib/env.ts or ${MODULE_API}**`,
			);
		}
		for (const match of matches) {
			const name = match[1] ?? match[2];
			if (name && !name.startsWith(ENV_PREFIX) && !ENV_ALLOWED_NAMES.has(name)) {
				fail("env", `${file}: variable "${name}" must be prefixed with ${ENV_PREFIX}`);
			}
		}
	}

	const example = `${MODULE_PAGE}.env.example`;
	if (existsSync(path.join(ROOT, example))) {
		const lines = readFileSync(path.join(ROOT, example), "utf8").split(/\r?\n/);
		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) continue;
			const key = trimmed.split("=")[0].trim();
			if (!key.startsWith(ENV_PREFIX))
				fail("env", `${example}: "${key}" must be prefixed with ${ENV_PREFIX}`);
		}
	}
}

function checkDependencies() {
	if (!existsSync(path.join(ROOT, APPROVED_DEPS))) {
		fail("deps", `${APPROVED_DEPS} missing (run --snapshot as maintainer)`);
		return;
	}
	const approved = readJson(APPROVED_DEPS);
	const pkg = readJson("package.json");
	for (const section of ["dependencies", "devDependencies"]) {
		const current = pkg[section] ?? {};
		const expected = approved[section] ?? {};
		for (const [name, version] of Object.entries(current)) {
			if (!(name in expected)) fail("deps", `${section}: "${name}" is not an approved dependency`);
			else if (expected[name] !== version)
				fail(
					"deps",
					`${section}: "${name}" version "${version}" differs from approved "${expected[name]}"`,
				);
		}
		for (const name of Object.keys(expected)) {
			if (!(name in current)) fail("deps", `${section}: approved dependency "${name}" was removed`);
		}
	}
	for (const script of ["lint", "build", "check:contract"]) {
		if (!pkg.scripts?.[script]) fail("deps", `package.json: script "${script}" is required`);
	}
}

function checkPublicAssets(allFiles) {
	for (const file of allFiles) {
		if (!file.startsWith(MODULE_PUBLIC)) continue;
		const size = statSync(path.join(ROOT, file)).size;
		if (size > MAX_PUBLIC_ASSET_BYTES) {
			fail(
				"paths",
				`${file}: ${(size / 1024 / 1024).toFixed(1)} MB exceeds the 5 MB limit for module assets`,
			);
		}
	}
}

// ---------------------------------------------------------------- main
const allFiles = walk(ROOT);

if (process.argv.includes("--snapshot")) {
	snapshot();
	process.exit(0);
}

if (!existsSync(path.join(ROOT, PROTECTED_MANIFEST))) {
	console.error(
		`${PROTECTED_MANIFEST} missing. A maintainer must run: node scripts/check-contract.mjs --snapshot`,
	);
	process.exit(1);
}
const manifest = readJson(PROTECTED_MANIFEST);
const moduleSources = allFiles.filter(
	(file) => startsWithAny(file, MODULE_SRC_PREFIXES) && SOURCE_EXT.has(path.extname(file)),
);

checkPaths(allFiles, manifest);
checkProtected(manifest);
checkRequiredFiles();
checkI18n();
checkImports(moduleSources);
checkEnv(moduleSources);
checkDependencies();
checkPublicAssets(allFiles);

const groups = Object.keys(issues);
if (groups.length === 0) {
	console.log(
		`Contract OK: ${moduleSources.length} module source files, ${Object.keys(manifest.files).length} protected files verified.`,
	);
	process.exit(0);
}

let count = 0;
for (const group of ["paths", "protected", "i18n", "imports", "env", "deps"]) {
	for (const message of issues[group] ?? []) {
		count += 1;
		console.error(`[${group}] ${message}`);
	}
}
console.error(`\nContract check failed with ${count} issue(s).`);
process.exit(1);
