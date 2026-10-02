import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { KbSkill } from "./skills.ts";

export const INDEX_DEFINITION = {
  version: "1",
  generator: { name: "'domain-router'", commit: "string", rules: "string", "+": "reject" },
  project: {
    name: "string",
    synopsis: "string <= 600",
    synopsisSource: "'README.md' | 'pyproject.toml' | 'package.json' | 'databricks.yml' | 'generated'",
    "+": "reject",
  },
  domains: [{ name: "string", files: "number.integer >= 1", "+": "reject" }, "[]"],
  map: [
    {
      path: "string",
      files: "number.integer >= 0",
      types: { "[string]": "number.integer >= 1" },
      readme: "string <= 200 | null",
      domains: "string[]",
      topics: "string[]",
      "+": "reject",
    },
    "[]",
  ],
  "+": "reject",
} as const;

export type AreaEntry = {
  path: string;
  files: number;
  types: Record<string, number>;
  readme: string | null;
  domains: string[];
  topics: string[];
};
export type ProjectIndex = {
  version: 1;
  generator: { name: "domain-router"; commit: string; rules: string };
  project: {
    name: string;
    synopsis: string;
    synopsisSource: "README.md" | "pyproject.toml" | "package.json" | "databricks.yml" | "generated";
  };
  domains: Array<{ name: string; files: number }>;
  map: AreaEntry[];
};
export type IndexSchema = { assert(value: unknown): ProjectIndex };

export function skillRulesHash(skills: KbSkill[]): string {
  const ordered = skills.slice().sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  return createHash("sha256").update(JSON.stringify(ordered.map((skill) => [skill.name, skill.raw]))).digest("hex").slice(0, 12);
}

export function readIndex(path: string, skills: KbSkill[], schema: IndexSchema): ProjectIndex | null {
  let index: ProjectIndex;
  try {
    index = schema.assert(Bun.YAML.parse(readFileSync(path, "utf8")));
  } catch {
    return null;
  }
  return index.generator.rules === skillRulesHash(skills) ? index : null;
}

export function areaFor(index: ProjectIndex, relPath: string): AreaEntry | null {
  const normalized = relPath.replaceAll("\\", "/");
  if (!normalized.includes("/")) return index.map.find((area) => area.path === "./") ?? null;
  const lower = normalized.toLowerCase();
  let match: AreaEntry | null = null;
  for (const area of index.map) {
    if (area.path !== "./" && lower.startsWith(area.path.toLowerCase()) && (!match || area.path.length > match.path.length)) match = area;
  }
  return match;
}
