import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import type { Exec } from "./session.ts";

export type GateStep = {
  group: "setup" | "python" | "typescript" | "terraform" | "sql" | "json" | "markdown" | "yaml";
  command: string;
  cwd: string;
  outcome: "pass" | "fail" | "superseded" | "skipped" | "unavailable" | "needs-config";
  detail: string;
  durationMs: number;
};

export type GateReport = {
  status: "pass" | "findings" | "blocked" | "skipped";
  summary: string;
  steps: GateStep[];
  blockers: Array<{ kind: "ci" | "config"; step: string; detail: string }>;
  findings: Array<{ step: string; detail: string }>;
  environment: Array<{ step: string; detail: string }>;
  filesChangedByGate: string[];
  durationMs: number;
};

type Group = Exclude<GateStep["group"], "setup">;
type StepResult = { step: GateStep; output: string; stdout: string; code: number | null; killed: boolean };
type FileGroups = Record<Group, string[]>;
type GroupRunContext = { exec: Exec; root: string; signal: AbortSignal; steps: GateStep[]; blockers: GateReport["blockers"]; findings: GateReport["findings"] };
type GroupRunner = (context: GroupRunContext, files: string[]) => Promise<void>;

const GROUPS: Group[] = ["python", "typescript", "terraform", "sql", "json", "markdown", "yaml"];
const PROJECT_MARKERS = ["pyproject.toml", "databricks.yml", "databricks.yaml", "setup.cfg", "setup.py"];
const GROUP_MATCHERS: Array<[Group, (name: string) => boolean]> = [
  ["python", (name) => /\.pyi?$|\.ipynb$/.test(name) || ["pyproject.toml", "uv.lock", "setup.cfg", "pytest.ini"].includes(name) || /^requirements.*\.txt$/.test(name)],
  ["typescript", (name) => /\.(?:ts|tsx|mts|cts)$/.test(name)],
  ["terraform", (name) => /\.tf(?:vars)?$/.test(name)],
  ["sql", (name) => name.endsWith(".sql")],
  ["json", (name) => (name.endsWith(".json") || name.endsWith(".jsonc")) && !["package-lock.json", "npm-shrinkwrap.json"].includes(name)],
  ["markdown", (name) => name.endsWith(".md") || name.endsWith(".markdown")],
  ["yaml", (name) => name.endsWith(".yml") || name.endsWith(".yaml")],
];
const UNAVAILABLE_OUTPUT = /Failed to spawn|not recognized as an internal or external command|No such file or directory|command not found|ENOENT/i;
const TERRAFORM_PLATFORM = /does not have a package available for your current platform, (\w+)/;
const TERRAFORM_REGISTRY_UNREACHABLE = /could not connect to registry|failed to request discovery document|no such host|i\/o timeout|TLS handshake timeout/i;

function displayCommand(command: string, args: string[]): string {
  return [command, ...args].map((part) => /\s/.test(part) ? `"${part.replaceAll('"', '\\"')}"` : part).join(" ");
}


function outputDetail(output: string): string {
  const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const diagnostics = lines.filter((line) => /\S+:\d+(?::\d+)?/.test(line));
  return (diagnostics.length > 0 ? diagnostics : lines).join(" | ").slice(0, 300);
}


function stepOutcome(result: Awaited<ReturnType<Exec>>, output: string, signal: AbortSignal, timeout: number): Pick<GateStep, "outcome" | "detail"> {
  if (result.killed) return { outcome: "fail", detail: signal.aborted ? "cancelled: the quality gate stopped" : `timed out after ${timeout / 1000} s` };
  if (UNAVAILABLE_OUTPUT.test(output)) return { outcome: "unavailable", detail: outputDetail(output) || "command unavailable" };
  if (result.code !== 0) return { outcome: "fail", detail: outputDetail(output) || `exited with code ${result.code}` };
  return { outcome: "pass", detail: "" };
}

async function runStep(
  exec: Exec,
  signal: AbortSignal,
  group: GateStep["group"],
  cwd: string,
  command: string,
  args: string[],
  timeout = 300_000,
): Promise<StepResult> {
  const started = Date.now();
  const base = { group, command: displayCommand(command, args), cwd };
  try {
    const result = await exec(command, args, { cwd, timeout, signal });
    const output = `${result.stderr}\n${result.stdout}`;
    const step: GateStep = { ...base, ...stepOutcome(result, output, signal, timeout), durationMs: Date.now() - started };
    return { step, output, stdout: result.stdout, code: result.code, killed: Boolean(result.killed) };
  } catch (error) {
    const detail = (error instanceof Error ? error.message : String(error)).slice(0, 300);
    return { step: { ...base, outcome: "unavailable", detail, durationMs: Date.now() - started }, output: detail, stdout: "", code: null, killed: false };
  }
}


function addToGroup(groups: FileGroups, path: string): void {
  const name = path.slice(path.lastIndexOf("/") + 1).toLowerCase();
  const group = GROUP_MATCHERS.find(([, matches]) => matches(name))?.[0];
  if (group) groups[group].push(path);
}

function parseStatus(output: string): string[] {
  const records = output.split("\0");
  const paths: string[] = [];
  for (let index = 0; index < records.length; index++) {
    const record = records[index];
    if (!record) continue;
    const status = record.slice(0, 2);
    const path = record.slice(3);
    if (!status.includes("D") && path) paths.push(path);
    if (status.includes("R") || status.includes("C")) index++;
  }
  return paths;
}


async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

function recordSetupResult(result: StepResult, setup: GateStep[], findings: GateReport["findings"], reportFailures: boolean): void {
  if (result.step.outcome === "pass" || (!reportFailures && result.step.outcome === "fail" && !result.killed)) return;
  setup.push(result.step);
  findings.push({ step: result.step.command, detail: result.step.detail });
}


async function existingPaths(root: string, candidates: Set<string>): Promise<string[]> {
  const paths: string[] = [];
  for (const path of [...candidates].sort()) {
    if (await isFile(join(root, path))) paths.push(path);
  }
  return paths;
}

async function changedPaths(exec: Exec, root: string, planStartedAt: string, signal: AbortSignal): Promise<{ paths: string[]; setup: GateStep[]; findings: Array<{ step: string; detail: string }> }> {
  const [status, commits] = await Promise.all([
    runStep(exec, signal, "setup", root, "git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"]),
    runStep(exec, signal, "setup", root, "git", ["log", `--since=${planStartedAt}`, "--name-only", "--format=", "HEAD"]),
  ]);
  const setup: GateStep[] = [];
  const findings: GateReport["findings"] = [];
  recordSetupResult(status, setup, findings, true);
  recordSetupResult(commits, setup, findings, false);
  const paths = new Set([
    ...(status.step.outcome === "pass" ? parseStatus(status.stdout) : []),
    ...(commits.step.outcome === "pass" ? commits.stdout.split(/\r?\n/).filter(Boolean) : []),
  ].map((path) => path.replaceAll("\\", "/").replace(/^\.\//, "")));
  return { paths: await existingPaths(root, paths), setup, findings };
}

async function fileHashes(root: string, paths: string[]): Promise<Map<string, string>> {
  const hashes = new Map<string, string>();
  for (const path of paths) {
    const fullPath = join(root, path);
    if (!(await isFile(fullPath))) continue;
    hashes.set(path, createHash("sha256").update(await readFile(fullPath)).digest("hex"));
  }
  return hashes;
}

function addFinding(findings: GateReport["findings"], step: GateStep): void {
  if (step.outcome === "fail") findings.push({ step: step.command, detail: step.detail });
}

function addPythonBlocker(blockers: GateReport["blockers"], step: GateStep): void {
  if (step.outcome === "fail") blockers.push({ kind: "ci", step: step.command, detail: step.detail });
}

async function hasTests(projectDir: string): Promise<boolean> {
  const patterns = ["**/{test_*.py,*_test.py,conftest.py}", "**/tests/**/*.py"];
  for (const pattern of patterns) {
    for await (const path of new Bun.Glob(pattern).scan({ cwd: projectDir, onlyFiles: true })) {
      if (!path.split(/[\\/]/).some((part) => [".venv", "node_modules", "site-packages"].includes(part))) return true;
    }
  }
  return false;
}

async function hasMarker(directory: string, markers: readonly string[]): Promise<boolean> {
  for (const marker of markers) {
    if (await isFile(join(directory, marker))) return true;
  }
  return false;
}

async function markerDirectory(root: string, path: string, markers: readonly string[]): Promise<string | null> {
  const rootPath = resolve(root);
  let directory = resolve(rootPath, dirname(path));
  while (!relative(rootPath, directory).startsWith("..")) {
    if (await hasMarker(directory, markers)) return directory;
    if (directory === rootPath || directory === dirname(directory)) return null;
    directory = dirname(directory);
  }
  return null;
}

export async function projectDirectory(root: string, path: string): Promise<string> {
  return (await markerDirectory(root, path, PROJECT_MARKERS)) ?? resolve(root);
}

export async function tsconfigDirectory(root: string, path: string): Promise<string | null> {
  return markerDirectory(root, path, ["tsconfig.json"]);
}

async function pythonProjects(root: string, files: string[]): Promise<string[]> {
  const directories = new Set<string>();
  for (const path of files) directories.add(await projectDirectory(root, path));
  return [...directories].sort();
}

async function runPython(
  exec: Exec,
  root: string,
  files: string[],
  signal: AbortSignal,
  steps: GateStep[],
  blockers: GateReport["blockers"],
): Promise<void> {
  for (const cwd of await pythonProjects(root, files)) {
    const format = await runStep(exec, signal, "python", cwd, "uvx", ["ruff", "format", "."]);
    steps.push(format.step);
    addPythonBlocker(blockers, format.step);

    const check = await runStep(exec, signal, "python", cwd, "uvx", ["ruff", "check", "."]);
    if (check.step.outcome === "fail") {
      check.step.outcome = "superseded";
      steps.push(check.step);
      const fix = await runStep(exec, signal, "python", cwd, "uvx", ["ruff", "check", "--fix", "."]);
      fix.step.outcome = "superseded";
      steps.push(fix.step);
      const rerun = await runStep(exec, signal, "python", cwd, "uvx", ["ruff", "check", "."]);
      steps.push(rerun.step);
      addPythonBlocker(blockers, rerun.step);
    } else {
      steps.push(check.step);
      addPythonBlocker(blockers, check.step);
    }

    const typing = await runStep(exec, signal, "python", cwd, "uvx", ["ty", "check"]);
    steps.push(typing.step);
    addPythonBlocker(blockers, typing.step);

    if (await hasTests(cwd)) {
      const tests = await runStep(exec, signal, "python", cwd, "uv", ["run", "pytest"], 1_800_000);
      if (tests.code === 5 && !tests.killed && tests.step.outcome === "fail") {
        tests.step.outcome = "skipped";
        tests.step.detail = "no tests collected";
      }
      steps.push(tests.step);
      addPythonBlocker(blockers, tests.step);
    } else {
      steps.push({ group: "python", command: "uv run pytest", cwd, outcome: "skipped", detail: "no tests found", durationMs: 0 });
    }
  }
}

async function runTypescript(
  exec: Exec,
  root: string,
  files: string[],
  signal: AbortSignal,
  steps: GateStep[],
  findings: GateReport["findings"],
): Promise<void> {
  await runFixableCheck(
    exec,
    signal,
    "typescript",
    root,
    "biome",
    ["lint", "--no-errors-on-unmatched", "--files-ignore-unknown=true", ...files],
    ["lint", "--no-errors-on-unmatched", "--files-ignore-unknown=true", "--write", ...files],
    steps,
    findings,
  );
  const projects = new Set<string>();
  let unchecked = 0;
  for (const path of files) {
    const directory = await tsconfigDirectory(root, path);
    if (directory === null) unchecked++;
    else projects.add(directory);
  }
  for (const cwd of [...projects].sort()) {
    const result = await runStep(exec, signal, "typescript", cwd, "tsc", ["--noEmit", "--pretty", "false"]);
    steps.push(result.step);
    addFinding(findings, result.step);
  }
  if (unchecked > 0) {
    steps.push({ group: "typescript", command: "tsc --noEmit --pretty false", cwd: root, outcome: "skipped", detail: `no tsconfig.json between ${unchecked} changed file(s) and the repo root`, durationMs: 0 });
  }
}

function classifyTerraformInit(init: StepResult): void {
  if (init.step.outcome !== "fail") return;
  const output = init.output.replace(/\s+/g, " ");
  const platform = TERRAFORM_PLATFORM.exec(output)?.[1];
  if (platform !== undefined) {
    init.step.outcome = "unavailable";
    init.step.detail = `No provider package exists for ${platform}, the platform of the terraform CLI on PATH; a code edit cannot fix this. ${init.step.detail}`;
  } else if (TERRAFORM_REGISTRY_UNREACHABLE.test(output)) {
    init.step.outcome = "unavailable";
    init.step.detail = `The Terraform registry is unreachable from this machine; a code edit cannot fix this. ${init.step.detail}`;
  }
}

async function runTerraform(
  exec: Exec,
  root: string,
  files: string[],
  signal: AbortSignal,
  steps: GateStep[],
  findings: GateReport["findings"],
): Promise<void> {
  const version = await runStep(exec, signal, "terraform", root, "terraform", ["version"]);
  if (version.step.outcome !== "pass") {
    steps.push({ ...version.step, outcome: "unavailable", detail: "terraform is not on PATH; scoop install terraform" });
    return;
  }
  const configurationDirs = [...new Set(files.filter((path) => path.toLowerCase().endsWith(".tf")).map((path) => resolve(root, dirname(path))))].sort();
  for (const cwd of configurationDirs) {
    const init = await runStep(exec, signal, "terraform", cwd, "terraform", ["init", "-backend=false", "-input=false", "-no-color"]);
    classifyTerraformInit(init);
    steps.push(init.step);
    addFinding(findings, init.step);
    if (init.step.outcome !== "pass") {
      steps.push({ group: "terraform", command: "terraform validate -no-color", cwd, outcome: "skipped", detail: "terraform init did not pass in this directory", durationMs: 0 });
      continue;
    }
    const validate = await runStep(exec, signal, "terraform", cwd, "terraform", ["validate", "-no-color"]);
    steps.push(validate.step);
    addFinding(findings, validate.step);
  }
  const formatDirs = [...new Set(files.map((path) => resolve(root, dirname(path))))].sort();
  for (const cwd of formatDirs) {
    const result = await runStep(exec, signal, "terraform", cwd, "terraform", ["fmt", "-no-color"]);
    steps.push(result.step);
    addFinding(findings, result.step);
  }
}


async function runFixableCheck(
  exec: Exec,
  signal: AbortSignal,
  group: Group,
  cwd: string,
  command: string,
  args: string[],
  fixArgs: string[],
  steps: GateStep[],
  findings: GateReport["findings"],
): Promise<StepResult> {
  const first = await runStep(exec, signal, group, cwd, command, args);
  if (first.step.outcome !== "fail") {
    steps.push(first.step);
    addFinding(findings, first.step);
    return first;
  }
  first.step.outcome = "superseded";
  steps.push(first.step);
  const fix = await runStep(exec, signal, group, cwd, command, fixArgs);
  fix.step.outcome = "superseded";
  steps.push(fix.step);
  const final = await runStep(exec, signal, group, cwd, command, args);
  steps.push(final.step);
  addFinding(findings, final.step);
  return final;
}

async function runSql(
  exec: Exec,
  root: string,
  files: string[],
  signal: AbortSignal,
  steps: GateStep[],
  blockers: GateReport["blockers"],
  findings: GateReport["findings"],
): Promise<void> {
  const paths = files.map((path) => path.includes(" ") ? `"${path.replaceAll('"', '\\"')}"` : path);
  const format = await runStep(exec, signal, "sql", root, "sqlfluff", ["format", ...files]);
  if (/No dialect was specified/i.test(format.output)) {
    const detail = `No SQLFluff dialect configured for: ${paths.join(", ")}. Needs a .sqlfluff with dialect = tsql, databricks, or snowflake.`;
    steps.push({ ...format.step, outcome: "needs-config", detail });
    steps.push({ group: "sql", command: displayCommand("sqlfluff", ["lint", ...files]), cwd: root, outcome: "needs-config", detail, durationMs: 0 });
    blockers.push({ kind: "config", step: "sqlfluff", detail });
    return;
  }
  steps.push(format.step);
  addFinding(findings, format.step);
  await runFixableCheck(exec, signal, "sql", root, "sqlfluff", ["lint", ...files], ["fix", ...files], steps, findings);
}

async function runJson(
  exec: Exec,
  root: string,
  files: string[],
  signal: AbortSignal,
  steps: GateStep[],
  findings: GateReport["findings"],
): Promise<void> {
  const configFiles = ["biome.json", "biome.jsonc", ".editorconfig"];
  const existing = await Promise.all(configFiles.map((name) => isFile(join(root, name))));
  const extra = existing[0] || existing[1] ? [] : existing[2] ? ["--use-editorconfig=true"] : ["--indent-style=space", "--indent-width=2"];
  const formatArgs = ["format", "--write", "--no-errors-on-unmatched", "--files-ignore-unknown=true", ...extra, ...files];
  const format = await runStep(exec, signal, "json", root, "biome", formatArgs);
  steps.push(format.step);
  addFinding(findings, format.step);
  await runFixableCheck(
    exec,
    signal,
    "json",
    root,
    "biome",
    ["lint", "--no-errors-on-unmatched", "--files-ignore-unknown=true", ...files],
    ["lint", "--no-errors-on-unmatched", "--files-ignore-unknown=true", "--write", ...files],
    steps,
    findings,
  );
}

async function runMarkdown(
  exec: Exec,
  root: string,
  files: string[],
  signal: AbortSignal,
  steps: GateStep[],
  findings: GateReport["findings"],
): Promise<void> {
  for (const [command, args] of [["rumdl", ["fmt", "--no-cache", ...files]], ["rumdl", ["check", "--no-cache", ...files]]] as const) {
    const result = await runStep(exec, signal, "markdown", root, command, [...args]);
    steps.push(result.step);
    addFinding(findings, result.step);
  }
}

async function hasYamlConfig(root: string): Promise<boolean> {
  if (process.env.YAMLLINT_CONFIG_FILE) return true;
  const configs = [join(root, ".yamllint"), join(root, ".yamllint.yaml"), join(root, ".yamllint.yml"), join(homedir(), ".config", "yamllint", "config")];
  return (await Promise.all(configs.map(isFile))).some(Boolean);
}

async function runYaml(
  exec: Exec,
  root: string,
  files: string[],
  signal: AbortSignal,
  steps: GateStep[],
  findings: GateReport["findings"],
): Promise<void> {
  const configArgs = await hasYamlConfig(root) ? [] : ["-d", "relaxed"];
  const args = ["-f", "parsable", ...configArgs, ...files];
  const result = await runStep(exec, signal, "yaml", root, "yamllint", args);
  if (result.step.outcome === "pass") {
    const warnings = result.output.split(/\r?\n/).filter((line) => line.includes("[warning]")).length;
    result.step.detail = `${warnings} warnings`;
  }
  steps.push(result.step);
  addFinding(findings, result.step);
}

const GROUP_RUNNERS: Record<Group, GroupRunner> = {
  python: ({ exec, root, signal, steps, blockers }, files) => runPython(exec, root, files, signal, steps, blockers),
  typescript: ({ exec, root, signal, steps, findings }, files) => runTypescript(exec, root, files, signal, steps, findings),
  terraform: ({ exec, root, signal, steps, findings }, files) => runTerraform(exec, root, files, signal, steps, findings),
  sql: ({ exec, root, signal, steps, blockers, findings }, files) => runSql(exec, root, files, signal, steps, blockers, findings),
  json: ({ exec, root, signal, steps, findings }, files) => runJson(exec, root, files, signal, steps, findings),
  markdown: ({ exec, root, signal, steps, findings }, files) => runMarkdown(exec, root, files, signal, steps, findings),
  yaml: ({ exec, root, signal, steps, findings }, files) => runYaml(exec, root, files, signal, steps, findings),
};

function summaryFor(steps: GateStep[], groups: FileGroups): string {
  const clauses = GROUPS.filter((group) => groups[group].length > 0).map((group) => {
    const own = steps.filter((step) => step.group === group);
    const failing = own.filter((step) => step.outcome === "fail" || step.outcome === "needs-config").length;
    const environment = own.filter((step) => step.outcome === "unavailable").length;
    const counts = [failing > 0 ? `${failing} failing` : "", environment > 0 ? `${environment} environment` : ""].filter(Boolean);
    return `${group} ${counts.join(", ") || "ok"}`;
  });
  return clauses.join("; ");
}

function gateStatus(blockers: GateReport["blockers"], findings: GateReport["findings"], environment: GateReport["environment"]): GateReport["status"] {
  if (blockers.length > 0) return "blocked";
  return findings.length > 0 || environment.length > 0 ? "findings" : "pass";
}

async function filesChangedByGate(root: string, before: Map<string, string>): Promise<string[]> {
  const after = await fileHashes(root, [...before.keys()]);
  return [...before.keys()].filter((path) => before.get(path) !== after.get(path)).sort();
}

export async function runGate(exec: Exec, root: string, planStartedAt: string, signal: AbortSignal): Promise<GateReport> {
  const started = Date.now();
  const changed = await changedPaths(exec, root, planStartedAt, signal);
  const before = await fileHashes(root, changed.paths);
  const groups: FileGroups = { python: [], typescript: [], terraform: [], sql: [], json: [], markdown: [], yaml: [] };
  for (const path of changed.paths) addToGroup(groups, path);
  const steps: GateStep[] = [...changed.setup];
  const blockers: GateReport["blockers"] = [];
  const findings: GateReport["findings"] = [...changed.findings];
  if (!GROUPS.some((group) => groups[group].length > 0)) {
    return {
      status: findings.length > 0 ? "findings" : "skipped",
      summary: findings.length > 0 ? "setup findings" : "no checked file types changed",
      steps,
      blockers,
      findings,
      environment: [],
      filesChangedByGate: [],
      durationMs: Date.now() - started,
    };
  }
  const context: GroupRunContext = { exec, root, signal, steps, blockers, findings };
  for (const group of GROUPS) if (groups[group].length > 0) await GROUP_RUNNERS[group](context, groups[group]);
  const environment = steps.filter((step) => step.outcome === "unavailable" && step.group !== "setup").map((step) => ({ step: `${step.command} (${relative(root, step.cwd).replaceAll("\\", "/") || "."})`, detail: step.detail }));
  const changedByGate = await filesChangedByGate(root, before);
  return {
    status: gateStatus(blockers, findings, environment),
    summary: summaryFor(steps, groups),
    steps,
    blockers,
    findings,
    environment,
    filesChangedByGate: changedByGate,
    durationMs: Date.now() - started,
  };
}
