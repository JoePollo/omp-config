import { relative } from "node:path";
import { projectDirectory } from "./gate-runner.ts";
import type { ChangedFile } from "./review-scope.ts";
import { execBudget, type Exec } from "./session.ts";
import type { Language } from "./static-evidence.ts";

type RuffViolation = { filename: string; message: string; location: { row: number } };

const C901_SCORE = /\((\d+) > \d+\)/;
const RUFF_BATCH_FILES = 100;
const RUFF_C901 = ["ruff", "check", "--isolated", "--no-cache", "--ignore-noqa", "--exit-zero", "--select", "C901", "--config", "lint.mccabe.max-complexity = 5", "--output-format", "json"];

async function complexityScores(exec: Exec, root: string, files: ChangedFile[], deadline: number): Promise<Map<string, number> | null> {
  const scores = new Map<string, number>();
  try {
    for (let start = 0; start < files.length; start += RUFF_BATCH_FILES) {
      const batch = files.slice(start, start + RUFF_BATCH_FILES).map((file) => file.path);
      const result = await exec("uvx", [...RUFF_C901, ...batch], { cwd: root, timeout: execBudget(deadline, 120_000) });
      if (result.code !== 0) return null;
      for (const violation of JSON.parse(result.stdout) as RuffViolation[]) {
        scores.set(`${relative(root, violation.filename).replaceAll("\\", "/")}:${violation.location.row}`, Number(C901_SCORE.exec(violation.message)?.[1]));
      }
    }
    return scores;
  } catch {
    return null;
  }
}

export const PYTHON: Language = {
  name: "Python",
  files: /\.pyi?$/i,
  command: "uvx",
  args: ["ty", "server"],
  server: "ty server",
  unitKinds: { 5: "class", 6: "method", 9: "constructor", 12: "function" },
  metric: "McCabe",
  complexityTool: "ruff",
  header: "- Python: `references` and `incoming call sites` come from `uvx ty server`; `McCabe` comes from `uvx ruff check --isolated --select C901` at max-complexity 5 with noqa ignored; `McCabe ≤ 5` means ruff ran and did not flag the function. Repo config still overrides the KB threshold.",
  languageId: () => "python",
  project: projectDirectory,
  contextFiles: async () => [],
  complexityScores,
};
