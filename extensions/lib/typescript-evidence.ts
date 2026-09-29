import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { tsconfigDirectory } from "./gate-runner.ts";
import type { ChangedFile } from "./review-scope.ts";
import { execBudget, type Exec } from "./session.ts";
import type { Language, Scores } from "./static-evidence.ts";

const COGNITIVE_ANNOTATION = /^::\w+ title=lint\/complexity\/noExcessiveCognitiveComplexity,file=([^,]+),line=(\d+),[^:]*::Excessive complexity of (\d+) detected/;
const BIOME_BATCH_FILES = 100;
const BIOME_COGNITIVE = ["lint", "--reporter=github", "--max-diagnostics=none", "--no-errors-on-unmatched", "--files-ignore-unknown=true"];
const BIOME_COGNITIVE_CONFIG = JSON.stringify({ linter: { rules: { recommended: false, complexity: { noExcessiveCognitiveComplexity: { level: "error", options: { maxAllowedComplexity: 5 } } } } } });

function addCognitiveScores(scores: Map<string, number>, root: string, output: { stdout: string; code: number }): boolean {
  const annotations = output.stdout.split(/\r?\n/).filter((line) => line.startsWith("::"));
  const scored = annotations.map((line) => COGNITIVE_ANNOTATION.exec(line)).filter((match) => match !== null);
  if (scored.length !== annotations.length || (output.code !== 0 && scored.length === 0)) return false;
  for (const [, file, line, score] of scored) scores.set(`${relative(root, decodeURIComponent(file)).replaceAll("\\", "/")}:${line}`, Number(score));
  return true;
}

async function complexityScores(exec: Exec, root: string, files: ChangedFile[], deadline: number): Promise<Scores> {
  const configDir = await mkdtemp(join(tmpdir(), "omp-cognitive-")).catch(() => null);
  if (configDir === null) return null;
  try {
    await writeFile(join(configDir, "biome.json"), BIOME_COGNITIVE_CONFIG);
    const scores = new Map<string, number>();
    for (let start = 0; start < files.length; start += BIOME_BATCH_FILES) {
      const batch = files.slice(start, start + BIOME_BATCH_FILES).map((file) => file.path);
      const output = await exec("biome", [...BIOME_COGNITIVE, `--config-path=${configDir}`, ...batch], { cwd: root, timeout: execBudget(deadline, 120_000) });
      if (!addCognitiveScores(scores, root, output)) return null;
    }
    return scores;
  } catch {
    return null;
  } finally {
    await rm(configDir, { recursive: true, force: true });
  }
}

async function contextFiles(exec: Exec, projectDir: string, deadline: number): Promise<string[]> {
  if (await Bun.file(join(projectDir, "tsconfig.json")).exists()) return [];
  const listed = await exec("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", "*.ts", "*.tsx", "*.mts", "*.cts"], { cwd: projectDir, timeout: execBudget(deadline, 30_000) });
  return listed.stdout.split("\0").filter(Boolean).map((path) => join(projectDir, path));
}

export const TYPESCRIPT: Language = {
  name: "TypeScript",
  files: /(?<!\.d)\.(?:ts|tsx|mts|cts)$/i,
  command: "tsc",
  args: ["--lsp", "--stdio"],
  server: "tsc --lsp",
  unitKinds: { 5: "class/type", 6: "method", 9: "constructor", 12: "function" },
  metric: "Cognitive",
  complexityTool: "biome",
  header: "- TypeScript: `references` and `incoming call sites` come from `tsc --lsp --stdio` (TypeScript 7+); without a `tsconfig.json`, every TypeScript file git lists under the repo root is opened first so references span them. `Cognitive` is Biome cognitive complexity (`complexity/noExcessiveCognitiveComplexity` at maxAllowedComplexity 5, repo Biome config ignored), not McCabe: `Cognitive N (> 5)` flags nesting-heavy code, and `Cognitive ≤ 5` never clears the McCabe ≤ 5 rule.",
  languageId: (path) => (path.toLowerCase().endsWith(".tsx") ? "typescriptreact" : "typescript"),
  project: async (root, path) => (await tsconfigDirectory(root, path)) ?? resolve(root),
  contextFiles,
  complexityScores,
};
