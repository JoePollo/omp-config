import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const SUPPRESSIONS_RELATIVE_PATH = ".omp/quality-suppressions.yaml";

export type Suppression = { agent: "entropy-review" | "code-review"; file: string; rule: string; reason: string };
type SuppressionFile = { entries: Suppression[]; problem: string | null };

const SUPPRESSION_AGENTS = ["entropy-review", "code-review"];
const SUPPRESSION_TEXT_FIELDS = ["file", "rule", "reason"];

function isEntry(value: unknown): value is Suppression {
  const entry: Record<string, unknown> = Object(value);
  return Object.keys(entry).length === 4 && SUPPRESSION_AGENTS.includes(String(entry.agent)) && SUPPRESSION_TEXT_FIELDS.every((field) => typeof entry[field] === "string" && String(entry[field]).trim() !== "");
}

function parseSuppressions(text: string): SuppressionFile {
  const data: Record<string, unknown> = Object(Bun.YAML.parse(text));
  const entries: unknown = data.suppressions;
  if (!Array.isArray(entries) || Object.keys(data).length !== 1) return { entries: [], problem: "the file must hold exactly one key, suppressions, whose value is a list (suppressions: [] for none)" };
  const invalid = entries.findIndex((entry) => !isEntry(entry));
  if (invalid < 0) return { entries, problem: null };
  return { entries: [], problem: `entry ${invalid + 1} must have exactly the keys agent (entropy-review or code-review), file, rule, and reason, each non-blank text` };
}

export function loadSuppressions(root: string): SuppressionFile {
  const path = join(root, SUPPRESSIONS_RELATIVE_PATH);
  if (!existsSync(path)) return { entries: [], problem: null };
  try {
    return parseSuppressions(readFileSync(path, "utf8"));
  } catch (error) {
    return { entries: [], problem: error instanceof Error ? error.message : String(error) };
  }
}
