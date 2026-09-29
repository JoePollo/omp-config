import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { areaFor, buildIndex, resolveRepo, serializeIndex, type ProjectIndex, type RepoRef } from "./project-index.ts";
import type { Exec } from "./session.ts";
import { loadKbSkills } from "./skills.ts";

export type LineRange = [number, number];
export type ChangedFile = { path: string; ranges: LineRange[] };
export type ScopeMode = "diff" | "repo";
type KbSelection = { code: string[]; topics: string[]; entropy: string[] };
export type ReviewScope = KbSelection & { root: string; files: ChangedFile[] };

export const SKILLS_DIR = join(import.meta.dir, "..", "..", "skills");

const IGNORED_DIRECTORIES = new Set(["__pycache__", ".pytest_cache", ".ruff_cache", ".venv", "node_modules"]);
const IGNORED_FILES = new Set(["uv.lock", "package-lock.json", "poetry.lock"]);
const BINARY_PROBE_BYTES = 8_000;
const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm;
const NO_KB: KbSelection = { code: [], topics: [], entropy: [] };
const TRACKED_FILES: Record<ScopeMode, string[]> = { diff: ["diff", "--name-only", "-z"], repo: ["ls-files", "-z"] };
const GIT_TIMEOUT_MS = 15_000;

export function overlapsChanges(ranges: LineRange[], start: number, end: number): boolean {
  return ranges.some(([first, last]) => first <= end && last >= start);
}

export function formatRanges(ranges: LineRange[]): string {
  return ranges.map(([start, end]) => (start === end ? `${start}` : `${start}-${end}`)).join(", ");
}

function reviewablePaths(output: string): string[] {
  const paths = [...new Set(output.split("\0").filter(Boolean))].map((path) => path.replaceAll("\\", "/"));
  return paths.filter((path) => {
    const parts = path.toLowerCase().split("/");
    const name = parts.at(-1) ?? "";
    return !IGNORED_FILES.has(name) && !name.endsWith(".lock") && !parts.some((part) => IGNORED_DIRECTORIES.has(part));
  });
}

async function git(exec: Exec, root: string, args: string[]): Promise<string> {
  const result = await exec("git", args, { cwd: root, timeout: GIT_TIMEOUT_MS });
  if (result.killed) throw new Error(`git ${args.join(" ")} timed out after ${GIT_TIMEOUT_MS / 1000} s in ${root}`);
  if (result.code !== 0) throw new Error(`git ${args.join(" ")} failed in ${root} with exit code ${result.code}: ${result.stderr.trim().slice(0, 300)}`);
  return result.stdout;
}

async function diffRanges(exec: Exec, root: string, path: string): Promise<LineRange[]> {
  const diff = await git(exec, root, ["diff", "--no-color", "--no-ext-diff", "--unified=0", "--", path]);
  const ranges: LineRange[] = [];
  for (const hunk of diff.matchAll(HUNK_HEADER)) {
    const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
    if (count > 0) ranges.push([Number(hunk[1]), Number(hunk[1]) + count - 1]);
  }
  return ranges;
}

async function wholeFileRanges(file: string): Promise<LineRange[]> {
  const content = await readFile(file).catch(() => Buffer.alloc(0));
  if (content.length === 0 || content.subarray(0, BINARY_PROBE_BYTES).includes(0)) return [];
  const text = content.toString("utf8");
  return [[1, text.split("\n").length - (text.endsWith("\n") ? 1 : 0)]];
}

export async function reviewManifest(exec: Exec, root: string, mode: ScopeMode): Promise<ChangedFile[]> {
  const [tracked, untracked] = await Promise.all([
    git(exec, root, TRACKED_FILES[mode]),
    git(exec, root, ["ls-files", "--others", "--exclude-standard", "-z"]),
  ]);
  const files: ChangedFile[] = [];
  for (const path of reviewablePaths(tracked)) files.push({ path, ranges: mode === "diff" ? await diffRanges(exec, root, path) : await wholeFileRanges(join(root, path)) });
  for (const path of reviewablePaths(untracked)) files.push({ path, ranges: await wholeFileRanges(join(root, path)) });
  return files.filter((file) => file.ranges.length > 0).sort((left, right) => (left.path < right.path ? -1 : 1));
}

async function writeIndexIfChanged(repo: RepoRef, index: ProjectIndex): Promise<void> {
  const serialized = serializeIndex(index);
  let existing: string | null = null;
  try {
    existing = await readFile(repo.indexPath, "utf8");
  } catch {
    existing = null;
  }
  if (serialized === existing) return;
  await mkdir(dirname(repo.indexPath), { recursive: true });
  await writeFile(repo.indexPath, serialized);
}

async function kbSelection(exec: Exec, root: string, files: ChangedFile[]): Promise<KbSelection> {
  const skills = loadKbSkills(SKILLS_DIR).skills;
  const entropy = skills.filter((skill) => skill.gate === "commit-bound").map((skill) => skill.name);
  const repo = await resolveRepo(exec, root);
  if (!repo) return { code: skills.filter((skill) => skill.gate === "files").map((skill) => skill.name), topics: [], entropy };
  const index = await buildIndex(exec, repo, skills);
  await writeIndexIfChanged(repo, index);
  const areas = files.flatMap((file) => areaFor(index, file.path) ?? []);
  return {
    code: [...new Set(areas.flatMap((area) => area.domains))].sort(),
    topics: [...new Set(areas.flatMap((area) => area.topics))].sort(),
    entropy,
  };
}

export async function reviewScope(exec: Exec, root: string | null, mode: ScopeMode): Promise<ReviewScope> {
  if (root === null) return { root: "", files: [], ...NO_KB };
  const files = await reviewManifest(exec, root, mode);
  return { root, files, ...(files.length === 0 ? NO_KB : await kbSelection(exec, root, files)) };
}
