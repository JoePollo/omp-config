import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import type { Exec } from "./session.ts";

export type GateStep = {
  group: "setup" | "python" | "terraform" | "sql" | "json" | "markdown" | "yaml";
  command: string;
  cwd: string;
  outcome: "pass" | "fail" | "superseded" | "skipped" | "unavailable" | "needs-config";
  detail: string;
};

export type GateReport = {
  status: "pass" | "findings" | "blocked" | "skipped";
  summary: string;
  steps: GateStep[];
  blockers: Array<{ kind: "ci" | "config"; step: string; detail: string }>;
  findings: Array<{ step: string; detail: string }>;
  filesChangedByGate: string[];
};

type Group = Exclude<GateStep["group"], "setup">;
type StepResult = { step: GateStep; output: string; stdout: string; code: number | null; killed: boolean };
type FileGroups = Record<Group, string[]>;
type GroupRunContext = { exec: Exec; root: string; signal: AbortSignal; steps: GateStep[]; blockers: GateReport["blockers"]; findings: GateReport["findings"] };
type GroupRunner = (context: GroupRunContext, files: string[]) => Promise<void>;

const GROUPS: Group[] = ["python", "terraform", "sql", "json", "markdown", "yaml"];
const PROJECT_MARKERS = ["pyproject.toml", "databricks.yml", "databricks.yaml", "setup.cfg", "setup.py"];
const GROUP_MATCHERS: Array<[Group, (name: string) => boolean]> = [
  ["python", (name) => /\.pyi?$|\.ipynb$/.test(name) || ["pyproject.toml", "uv.lock", "setup.cfg", "pytest.ini"].includes(name) || /^requirements.*\.txt$/.test(name)],
  ["terraform", (name) => /\.tf(?:vars)?$/.test(name)],
  ["sql", (name) => name.endsWith(".sql")],
  ["json", (name) => (name.endsWith(".json") || name.endsWith(".jsonc")) && !["package-lock.json", "npm-shrinkwrap.json"].includes(name)],
  ["markdown", (name) => name.endsWith(".md") || name.endsWith(".markdown")],
  ["yaml", (name) => name.endsWith(".yml") || name.endsWith(".yaml")],
];

function displayCommand(command: string, args: string[]): string {
  return [command, ...args].map((part) => /\s/.test(part) ? `"${part.replaceAll('"', '\\"')}"` : part).join(" ");
}


function outputDetail(output: string): string {
  const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const diagnostics = lines.filter((line) => /\S+:\d+(?::\d+)?/.test(line));
  return (diagnostics.length > 0 ? diagnostics : lines).join(" | ").slice(0, 300);
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
  const step: GateStep = { group, command: displayCommand(command, args), cwd, outcome: "pass", detail: "" };
  try {
    const result = await exec(command, args, { cwd, timeout, signal });
    const output = `${result.stderr}\n${result.stdout}`;
    if (result.killed) {
      step.outcome = "fail";
      step.detail = "timed out or cancelled";
    } else if (/Failed to spawn|not recognized as an internal or external command|No such file or directory|command not found|ENOENT/i.test(output)) {
      step.outcome = "unavailable";
      step.detail = outputDetail(output) || "command unavailable";
    } else if (result.code !== 0) {
      step.outcome = "fail";
      step.detail = outputDetail(output) || `exited with code ${result.code}`;
    }
    return { step, output, stdout: result.stdout, code: result.code, killed: Boolean(result.killed) };
  } catch (error) {
    step.outcome = "unavailable";
    step.detail = error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300);
    return { step, output: step.detail, stdout: "", code: null, killed: false };
  }
}


function addToGroup(groups: FileGroups, path: string): void {
  const name = path.split("/").at(-1)!.toLowerCase();
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

function hasDecidingFailure(step: GateStep): boolean {
  return step.outcome === "fail" || step.outcome === "unavailable";
}

function addFinding(findings: GateReport["findings"], step: GateStep): void {
  if (hasDecidingFailure(step)) findings.push({ step: step.command, detail: step.detail });
}

function addPythonBlocker(blockers: GateReport["blockers"], step: GateStep): void {
  if (hasDecidingFailure(step)) blockers.push({ kind: "ci", step: step.command, detail: step.detail });
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

async function hasProjectMarker(directory: string): Promise<boolean> {
  for (const marker of PROJECT_MARKERS) {
    if (await isFile(join(directory, marker))) return true;
  }
  return false;
}

async function projectDirectory(root: string, path: string): Promise<string> {
  const rootPath = resolve(root);
  let directory = resolve(rootPath, dirname(path));
  while (true) {
    if (await hasProjectMarker(directory)) return directory;
    if (directory === rootPath) return rootPath;
    const parent = dirname(directory);
    if (parent === directory || relative(rootPath, directory).startsWith("..")) return rootPath;
    directory = parent;
  }
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
      steps.push({ group: "python", command: "uv run pytest", cwd, outcome: "skipped", detail: "no tests found" });
    }
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
    findings.push({ step: "terraform version", detail: "terraform is not on PATH; scoop install terraform" });
    return;
  }
  const configurationDirs = [...new Set(files.filter((path) => path.toLowerCase().endsWith(".tf")).map((path) => resolve(root, dirname(path))))].sort();
  for (const cwd of configurationDirs) {
    for (const args of [["init", "-backend=false", "-input=false", "-no-color"], ["validate", "-no-color"]]) {
      const result = await runStep(exec, signal, "terraform", cwd, "terraform", args);
      steps.push(result.step);
      addFinding(findings, result.step);
    }
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
    steps.push({ group: "sql", command: displayCommand("sqlfluff", ["lint", ...files]), cwd: root, outcome: "needs-config", detail });
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
  terraform: ({ exec, root, signal, steps, findings }, files) => runTerraform(exec, root, files, signal, steps, findings),
  sql: ({ exec, root, signal, steps, blockers, findings }, files) => runSql(exec, root, files, signal, steps, blockers, findings),
  json: ({ exec, root, signal, steps, findings }, files) => runJson(exec, root, files, signal, steps, findings),
  markdown: ({ exec, root, signal, steps, findings }, files) => runMarkdown(exec, root, files, signal, steps, findings),
  yaml: ({ exec, root, signal, steps, findings }, files) => runYaml(exec, root, files, signal, steps, findings),
};

function summaryFor(steps: GateStep[], groups: FileGroups): string {
  const clauses = GROUPS.filter((group) => groups[group].length > 0).map((group) => {
    const failures = steps.filter((step) => step.group === group && ["fail", "unavailable", "needs-config"].includes(step.outcome)).length;
    return failures === 0 ? `${group} ok` : `${group} ${failures} failing`;
  });
  return clauses.join("; ");
}

function gateStatus(steps: GateStep[], blockers: GateReport["blockers"], findings: GateReport["findings"]): GateReport["status"] {
  if (blockers.length > 0) return "blocked";
  if (findings.length > 0 || steps.some(hasDecidingFailure)) return "findings";
  return "pass";
}

async function filesChangedByGate(root: string, before: Map<string, string>): Promise<string[]> {
  const after = await fileHashes(root, [...before.keys()]);
  return [...before.keys()].filter((path) => before.get(path) !== after.get(path)).sort();
}

export async function runGate(exec: Exec, root: string, planStartedAt: string, signal: AbortSignal): Promise<GateReport> {
  const changed = await changedPaths(exec, root, planStartedAt, signal);
  const before = await fileHashes(root, changed.paths);
  const groups: FileGroups = { python: [], terraform: [], sql: [], json: [], markdown: [], yaml: [] };
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
      filesChangedByGate: [],
    };
  }
  const context: GroupRunContext = { exec, root, signal, steps, blockers, findings };
  for (const group of GROUPS) if (groups[group].length > 0) await GROUP_RUNNERS[group](context, groups[group]);
  const changedByGate = await filesChangedByGate(root, before);
  return {
    status: gateStatus(steps, blockers, findings),
    summary: summaryFor(steps, groups),
    steps,
    blockers,
    findings,
    filesChangedByGate: changedByGate,
  };
}
