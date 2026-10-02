import { appendFileSync, closeSync, mkdirSync, openSync, readFileSync, readSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { skillRulesHash, type AreaEntry, type IndexSchema, type ProjectIndex } from "./project-index-contract.ts";
import { SUPPRESSIONS_RELATIVE_PATH } from "./review-suppressions.ts";
import type { Exec } from "./session.ts";
import type { KbSkill, Probe } from "./skills.ts";

export const INDEX_RELATIVE_PATH = ".omp/project-index.yaml";
export const GITIGNORE_LINE = "/.omp/";
const LOCAL_FILES = [INDEX_RELATIVE_PATH, SUPPRESSIONS_RELATIVE_PATH];

export type RepoRef = { worktreeRoot: string; mainRoot: string; indexPath: string };
type IndexWrite = { status: "written" | "unchanged" } | { status: "failed"; error: string };
type GeneratedIndex = { index: ProjectIndex; gitignoreUpdated: boolean; write: IndexWrite };

type FilePath = { display: string; lower: string };
type AreaStats = Omit<AreaEntry, "path">;
type RecordValue = Record<string, unknown>;

const CONTENT_LIMIT = 262_144;
const PROBE_LIMIT = 5_000;
const AREA_LIMIT = 150;
const globCache = new Map<string, Bun.Glob>();
const EMPTY_PATHS = new Set<string>();

function intersects(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  for (const value of left) if (right.has(value)) return true;
  return false;
}


function globMatches(pattern: string, path: string): boolean {
  let glob = globCache.get(pattern);
  if (!glob) {
    glob = new Bun.Glob(pattern);
    globCache.set(pattern, glob);
  }
  return glob.match(path);
}

function parseCountedFiles(execResult: { stdout: string }): FilePath[] {
  return execResult.stdout.split("\0").filter(Boolean).map((display) => ({ display, lower: display.toLowerCase() }))
    .filter((file) => file.lower !== INDEX_RELATIVE_PATH)
    .sort((a, b) => a.lower < b.lower ? -1 : a.lower > b.lower ? 1 : a.display < b.display ? -1 : a.display > b.display ? 1 : 0);
}

function readContent(root: string, file: string, cache: Map<string, string | null>): string | null {
  const existing = cache.get(file);
  if (existing !== undefined) return existing;
  let content: string | null = null;
  try {
    const descriptor = openSync(join(root, file), "r");
    try {
      const buffer = Buffer.alloc(CONTENT_LIMIT);
      let length = 0;
      while (length < CONTENT_LIMIT) {
        const read = readSync(descriptor, buffer, length, CONTENT_LIMIT - length, length);
        if (read === 0) break;
        length += read;
      }
      content = buffer.toString("utf8", 0, length);
    } finally {
      closeSync(descriptor);
    }
  } catch {
    content = null;
  }
  cache.set(file, content);
  return content;
}

function excluded(file: FilePath, globs: string[]): boolean {
  return globs.some((pattern) => globMatches(pattern, file.lower));
}

function matchingFiles(files: FilePath[], excludes: string[], pattern: string): FilePath[] {
  const matches: FilePath[] = [];
  for (const file of files) {
    if (excluded(file, excludes) || !globMatches(pattern, file.lower)) continue;
    matches.push(file);
    if (matches.length === PROBE_LIMIT) break;
  }
  return matches;
}

function matchingContent(
  root: string,
  files: FilePath[],
  excludes: string[],
  probes: Probe[],
  cache: Map<string, string | null>,
): Set<string> {
  const matched = new Set<string>();
  for (const probe of probes) {
    for (const file of matchingFiles(files, excludes, probe.files)) {
      const content = readContent(root, file.display, cache);
      if (content !== null && probe.pattern.test(content)) matched.add(file.display);
    }
  }
  return matched;
}

function matchedByRules(
  root: string,
  files: FilePath[],
  excludes: string[],
  paths: string[],
  probes: Probe[],
  cache: Map<string, string | null>,
): Set<string> {
  const matched = new Set<string>();
  for (const file of files) {
    if (!excluded(file, excludes) && paths.some((pattern) => globMatches(pattern, file.lower))) matched.add(file.display);
  }
  for (const path of matchingContent(root, files, excludes, probes, cache)) matched.add(path);
  return matched;
}

function filesUnderRoots(files: FilePath[], excludes: string[], roots: string[]): string[] {
  const eligible = roots.length ? files.filter((file) => !excluded(file, excludes)) : [];
  const markers = eligible.filter((file) => roots.some((pattern) => globMatches(pattern, file.lower)));
  const rootDirs = markers.map((marker) => {
    const slash = marker.lower.lastIndexOf("/");
    return marker.lower.slice(0, slash + 1);
  });
  const rooted = eligible.filter((file) => rootDirs.some((directory) => file.lower.startsWith(directory)));
  return rooted.map((file) => file.display);
}


function readParagraph(source: string, limit: number): string | null {
  const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  const paragraphs = body.split(/\n\s*\n/);
  const skipped = ["#", "![", "[![", "<", "|", "```", "---"];
  for (const paragraph of paragraphs) {
    const text = paragraph.trim();
    if (!text || skipped.some((prefix) => text.startsWith(prefix))) continue;
    const flattened = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\s+/g, " ").trim();
    if (!flattened) continue;
    return truncate(flattened, limit);
  }
  return null;
}

function truncate(text: string, limit: number): string {
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text;
}

function readmeFor(root: string, files: FilePath[], dir: string): string | null {
  const expected = `${dir.toLowerCase()}readme.md`;
  const match = files.find((file) => file.lower === expected);
  if (!match) return null;
  try {
    return readParagraph(readFileSync(join(root, match.display), "utf8"), 200);
  } catch {
    return null;
  }
}

function areaFiles(files: FilePath[], path: string): FilePath[] {
  if (path === "./") return files.filter((file) => !file.lower.includes("/"));
  const prefix = path.toLowerCase();
  return files.filter((file) => file.lower.startsWith(prefix));
}

function rankedTypes(types: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(types)
    .sort(([leftKey, leftCount], [rightKey, rightCount]) => rightCount - leftCount || (leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0))
    .slice(0, 5));
}

function domainsInArea(skills: KbSkill[], skillFiles: Map<string, Set<string>>, displayFiles: Set<string>): string[] {
  return skills.filter((skill) => intersects(skillFiles.get(skill.name) ?? EMPTY_PATHS, displayFiles))
    .map((skill) => skill.name);
}

function topicsInArea(skills: KbSkill[], domains: string[], topicFiles: Map<string, Set<string>>, displayFiles: Set<string>): string[] {
  const topics: string[] = [];
  for (const skill of skills) {
    if (!domains.includes(skill.name)) continue;
    for (const topic of skill.topics) {
      if (intersects(topicFiles.get(`${skill.name}/${topic.file}`) ?? EMPTY_PATHS, displayFiles)) {
        topics.push(`${skill.name}/${topic.file}`);
      }
    }
  }
  return topics;
}

function areaStats(
  root: string,
  files: FilePath[],
  path: string,
  skills: KbSkill[],
  skillFiles: Map<string, Set<string>>,
  topicFiles: Map<string, Set<string>>,
): AreaStats {
  const subtree = areaFiles(files, path);
  const types: Record<string, number> = {};
  for (const file of subtree) {
    const extension = extname(file.display).toLowerCase() || "(none)";
    types[extension] = (types[extension] ?? 0) + 1;
  }
  const displayFiles = new Set(subtree.map((file) => file.display));
  const domains = domainsInArea(skills, skillFiles, displayFiles);
  return {
    files: subtree.length,
    types: rankedTypes(types),
    readme: readmeFor(root, files, path === "./" ? "" : path),
    domains,
    topics: topicsInArea(skills, domains, topicFiles, displayFiles)
  };
}

function areaDirectories(files: FilePath[]): { depth1: string[]; depth2: string[]; depth3: string[] } {
  const directories = new Set<string>();
  for (const file of files) {
    const pieces = file.display.split("/");
    for (let depth = 1; depth <= Math.min(3, pieces.length - 1); depth++) directories.add(`${pieces.slice(0, depth).join("/")}/`);
  }
  const sorted = [...directories].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  return {
    depth1: sorted.filter((path) => path.split("/").length === 2),
    depth2: sorted.filter((path) => path.split("/").length === 3),
    depth3: sorted.filter((path) => path.split("/").length === 4),
  };
}

function topicsDiffer(left: AreaStats, right: AreaStats): boolean {
  return left.domains.join("\0") !== right.domains.join("\0") || left.topics.join("\0") !== right.topics.join("\0");
}

function synopsisFallback(name: string, files: FilePath[], depth1: string[]): string {
  return `${name}: ${files.length} files in ${depth1.length} top-level areas (${depth1.join(", ")}).`;
}

function readmeSynopsis(root: string, files: FilePath[]): string | null {
  const readme = files.find((file) => file.lower === "readme.md");
  if (!readme) return null;
  try {
    return readParagraph(readFileSync(join(root, readme.display), "utf8"), 600);
  } catch {
    return null;
  }
}

function pyprojectSynopsis(root: string): string | null {
  try {
    const pyproject = readFileSync(join(root, "pyproject.toml"), "utf8");
    const start = pyproject.match(/^\[project\][ \t]*\r?\n/m);
    if (!start || start.index === undefined) return null;
    const remaining = pyproject.slice(start.index + start[0].length);
    const nextSection = remaining.search(/^\s*\[/m);
    const section = nextSection < 0 ? remaining : remaining.slice(0, nextSection);
    const description = section.match(/^\s*description\s*=\s*"([^"]*)"/m)?.[1];
    return description ? truncate(description, 600) : null;
  } catch {
    return null;
  }
}

function packageSynopsis(root: string): string | null {
  try {
    const packageData: unknown = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    if (isRecord(packageData) && typeof packageData.description === "string" && packageData.description.length > 0) {
      return truncate(packageData.description, 600);
    }
  } catch {}
  return null;
}

function bundleSynopsis(root: string): string | null {
  try {
    const yaml: unknown = Bun.YAML.parse(readFileSync(join(root, "databricks.yml"), "utf8"));
    const bundle = isRecord(yaml) && isRecord(yaml.bundle) ? yaml.bundle : null;
    if (bundle && typeof bundle.name === "string" && bundle.name.length > 0) return truncate(bundle.name, 600);
  } catch {}
  return null;
}

function projectSynopsis(root: string, name: string, files: FilePath[], depth1: string[]): { synopsis: string; source: ProjectIndex["project"]["synopsisSource"] } {
  const readme = readmeSynopsis(root, files);
  if (readme) return { synopsis: readme, source: "README.md" };
  const pythonDescription = pyprojectSynopsis(root);
  if (pythonDescription) return { synopsis: pythonDescription, source: "pyproject.toml" };
  const packageDescription = packageSynopsis(root);
  if (packageDescription) return { synopsis: packageDescription, source: "package.json" };
  const bundleName = bundleSynopsis(root);
  if (bundleName) return { synopsis: bundleName, source: "databricks.yml" };
  return { synopsis: truncate(synopsisFallback(name, files, depth1), 600), source: "generated" };
}

export async function resolveRepo(exec: Exec, dir: string): Promise<RepoRef | null> {
  const result = await exec("git", ["rev-parse", "--path-format=absolute", "--show-toplevel", "--git-common-dir"], { cwd: dir, timeout: 15_000 });
  if (result.code !== 0) return null;
  const [worktreeRoot, commonDir] = result.stdout.trim().split(/\r?\n/);
  if (!worktreeRoot || !commonDir) return null;
  const mainRoot = basename(commonDir) === ".git" ? dirname(commonDir) : worktreeRoot;
  return { worktreeRoot, mainRoot, indexPath: join(mainRoot, INDEX_RELATIVE_PATH) };
}

async function ensureGitignored(exec: Exec, repo: RepoRef): Promise<boolean> {
  const result = await exec("git", ["check-ignore", "--no-index", "-v", "--", ...LOCAL_FILES], { cwd: repo.mainRoot });
  const decided = result.stdout.split("\n").filter((line) => /\.gitignore:\d+:/.test(line.split("\t", 1)[0]));
  if (decided.length === LOCAL_FILES.length) return false;
  let current = "";
  try {
    current = readFileSync(join(repo.mainRoot, ".gitignore"), "utf8");
  } catch {}
  const separator = current.length > 0 && !current.endsWith("\n") ? "\n" : "";
  appendFileSync(join(repo.mainRoot, ".gitignore"), `${separator}${GITIGNORE_LINE}\n`);
  return true;
}

type SkillMatches = { counted: Map<string, Set<string>>; topics: Map<string, Set<string>> };
type AreaCandidate = { path: string; stats: AreaStats };

function matchSkills(root: string, files: FilePath[], skills: KbSkill[], cache: Map<string, string | null>): SkillMatches {
  const counted = new Map<string, Set<string>>();
  const topics = new Map<string, Set<string>>();
  for (const skill of skills) {
    if (skill.gate !== "files") continue;
    const countedFiles = matchedByRules(root, files, skill.exclude, skill.files, skill.content, cache);
    for (const path of filesUnderRoots(files, skill.exclude, skill.roots)) countedFiles.add(path);
    counted.set(skill.name, countedFiles);
    for (const topic of skill.topics) {
      topics.set(`${skill.name}/${topic.file}`, matchedByRules(root, files, skill.exclude, topic.files, topic.content, cache));
    }
  }
  return { counted, topics };
}

function domainEntries(skills: KbSkill[], counted: Map<string, Set<string>>): Array<{ name: string; files: number }> {
  const domains: Array<{ name: string; files: number }> = [];
  for (const skill of skills) {
    if (skill.gate !== "files") continue;
    const count = counted.get(skill.name)?.size ?? 0;
    if (count > 0) domains.push({ name: skill.name, files: count });
  }
  return domains;
}

function parentArea(path: string, depth: number): string {
  return `${path.split("/").filter(Boolean).slice(0, depth).join("/")}/`;
}

function appendDepth1Areas(
  root: string,
  files: FilePath[],
  dirs: string[],
  skills: KbSkill[],
  skillFiles: Map<string, Set<string>>,
  topicFiles: Map<string, Set<string>>,
  prioritized: AreaCandidate[],
): Map<string, AreaStats> {
  const statsByPath = new Map<string, AreaStats>();
  for (const path of dirs) {
    if (prioritized.length >= AREA_LIMIT) break;
    const stats = areaStats(root, files, path, skills, skillFiles, topicFiles);
    statsByPath.set(path, stats);
    prioritized.push({ path, stats });
  }
  return statsByPath;
}

function appendDepth2Areas(
  root: string,
  files: FilePath[],
  dirs: string[],
  skills: KbSkill[],
  skillFiles: Map<string, Set<string>>,
  topicFiles: Map<string, Set<string>>,
  depth1Stats: Map<string, AreaStats>,
  prioritized: AreaCandidate[],
): Map<string, AreaStats> {
  const statsByPath = new Map<string, AreaStats>();
  for (const path of dirs) {
    const stats = areaStats(root, files, path, skills, skillFiles, topicFiles);
    statsByPath.set(path, stats);
    const parentStats = depth1Stats.get(parentArea(path, 1));
    if (parentStats && topicsDiffer(stats, parentStats)) prioritized.push({ path, stats });
    if (prioritized.length >= AREA_LIMIT) break;
  }
  return statsByPath;
}

function appendDepth3Areas(
  root: string,
  files: FilePath[],
  dirs: string[],
  skills: KbSkill[],
  skillFiles: Map<string, Set<string>>,
  topicFiles: Map<string, Set<string>>,
  depth2Stats: Map<string, AreaStats>,
  prioritized: AreaCandidate[],
): void {
  for (const path of dirs) {
    const parentStats = depth2Stats.get(parentArea(path, 2));
    if (!parentStats) continue;
    const stats = areaStats(root, files, path, skills, skillFiles, topicFiles);
    if (topicsDiffer(stats, parentStats)) prioritized.push({ path, stats });
    if (prioritized.length >= AREA_LIMIT) break;
  }
}

function buildAreas(
  root: string,
  files: FilePath[],
  dirs: ReturnType<typeof areaDirectories>,
  skills: KbSkill[],
  skillFiles: Map<string, Set<string>>,
  topicFiles: Map<string, Set<string>>,
): AreaEntry[] {
  const prioritized: AreaCandidate[] = [{ path: "./", stats: areaStats(root, files, "./", skills, skillFiles, topicFiles) }];
  const depth1Stats = appendDepth1Areas(root, files, dirs.depth1, skills, skillFiles, topicFiles, prioritized);
  if (prioritized.length < AREA_LIMIT) {
    const depth2Stats = appendDepth2Areas(root, files, dirs.depth2, skills, skillFiles, topicFiles, depth1Stats, prioritized);
    if (prioritized.length < AREA_LIMIT) appendDepth3Areas(root, files, dirs.depth3, skills, skillFiles, topicFiles, depth2Stats, prioritized);
  }
  return prioritized.map(({ path, stats }) => ({ path, ...stats }))
    .sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}

async function buildIndex(exec: Exec, repo: RepoRef, skills: KbSkill[]): Promise<ProjectIndex> {
  const orderedSkills = skills.slice().sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  const [listed, head] = await Promise.all([
    exec("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { cwd: repo.mainRoot }),
    exec("git", ["rev-parse", "HEAD"], { cwd: repo.mainRoot }),
  ]);
  const files = parseCountedFiles(listed);
  const commit = head.code === 0 ? head.stdout.trim() : "none";
  const matches = matchSkills(repo.mainRoot, files, orderedSkills, new Map<string, string | null>());
  const domains = domainEntries(orderedSkills, matches.counted);
  const dirs = areaDirectories(files);
  const skillFiles = new Map(orderedSkills.filter((skill) => skill.gate === "files")
    .map((skill) => [skill.name, matches.counted.get(skill.name) ?? EMPTY_PATHS]));
  const areas = buildAreas(repo.mainRoot, files, dirs, orderedSkills, skillFiles, matches.topics);
  const name = basename(repo.mainRoot);
  const synopsis = projectSynopsis(repo.mainRoot, name, files, dirs.depth1);
  const rules = skillRulesHash(orderedSkills);
  return {
    version: 1,
    generator: { name: "domain-router", commit, rules },
    project: { name, synopsis: synopsis.synopsis, synopsisSource: synopsis.source },
    domains,
    map: areas,
  };
}

function isRecord(value: unknown): value is RecordValue {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function serializeIndex(index: ProjectIndex): string {
  const ordered = {
    version: index.version,
    generator: { name: index.generator.name, commit: index.generator.commit, rules: index.generator.rules },
    project: { name: index.project.name, synopsis: index.project.synopsis, synopsisSource: index.project.synopsisSource },
    domains: index.domains.map(({ name, files }) => ({ name, files })),
    map: index.map.map(({ path, files, types, readme, domains, topics }) => ({ path, files, types, readme, domains, topics })),
  };
  const yaml = Bun.YAML.stringify(ordered, null, 2);
  return yaml.endsWith("\n") ? yaml : `${yaml}\n`;
}

function writeIndexFile(path: string, serialized: string): IndexWrite {
  let current: string | null;
  try {
    current = readFileSync(path, "utf8");
  } catch {
    current = null;
  }
  if (current === serialized) return { status: "unchanged" };
  const temporary = `${path}.${process.pid}.tmp`;
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(temporary, serialized);
    renameSync(temporary, path);
    return { status: "written" };
  } catch (error) {
    rmSync(temporary, { force: true });
    return { status: "failed", error: error instanceof Error ? error.message : String(error) };
  }
}

export async function generateIndex(exec: Exec, repo: RepoRef, skills: KbSkill[], schema: IndexSchema): Promise<GeneratedIndex> {
  const built = await buildIndex(exec, repo, skills);
  let index: ProjectIndex;
  try {
    index = schema.assert(built);
  } catch (error) {
    throw new Error(`project-index: generated index for ${repo.mainRoot} violates the contract: ${error instanceof Error ? error.message : String(error)}`);
  }
  const gitignoreUpdated = await ensureGitignored(exec, repo);
  return { index, gitignoreUpdated, write: writeIndexFile(repo.indexPath, serializeIndex(index)) };
}
