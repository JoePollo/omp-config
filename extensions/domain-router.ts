import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { areaFor, buildIndex, ensureGitignored, GITIGNORE_LINE, readIndexFile, resolveRepo, serializeIndex, type ProjectIndex, type RepoRef } from "./lib/project-index.ts";
import { isTaskSession, latestMode, type BranchEntry, type Exec } from "./lib/session.ts";
import { commandSegments } from "./lib/shell.ts";
import { isInternalUrl, mcpToolName, mutationTargets, stripReadSelector } from "./lib/tool-args.ts";
import { loadKbSkills, type KbSkill } from "./lib/skills.ts";

const KB_MESSAGE = "jpollock.domain-router.kb";
const AGENT_DIR = join(import.meta.dir, "..");
const SKILLS_DIR = join(AGENT_DIR, "skills");
const CODE_EXTENSIONS = new Set(".py .pyi .ipynb .ts .tsx .js .jsx .mjs .cjs .sql .tf .tfvars .hcl .ps1 .psm1 .sh .bash .cs .go .rs .java .kt .scala .yml .yaml .json .toml".split(" "));
const ONE_SEGMENT = /^[^/]+\/$/;
type RouterContext = {
  cwd: string;
  sessionManager: { getBranch(): unknown };
  ui: { notify(message: string, level?: "info" | "warning" | "error"): void };
};

function normalizedRoot(path: string): string {
  return path.replaceAll("\\", "/").toLowerCase();
}

function contentOf(
  keys: string[],
  trigger: string,
  skills: KbSkill[],
  indexes: Map<string, ProjectIndex>,
  repos: Map<string, RepoRef>,
  missing: Set<string>,
  notify: (message: string, level?: "info" | "warning" | "error") => void,
): { content: string; included: string[] } {
  const sections: string[] = [];
  const included: string[] = [];
  for (const key of keys) {
    const section = contentForKey(key, trigger, skills, indexes, repos, missing, notify);
    if (section === null) continue;
    sections.push(section);
    included.push(key);
  }
  return { content: sections.join("\n\n"), included };
}

function contentForKey(
  key: string,
  trigger: string,
  skills: KbSkill[],
  indexes: Map<string, ProjectIndex>,
  repos: Map<string, RepoRef>,
  missing: Set<string>,
  notify: (message: string, level?: "info" | "warning" | "error") => void,
): string | null {
  if (key === "catalog") return catalogContent(skills);
  if (key.startsWith("project:")) {
    const repo = repos.get(key.slice("project:".length));
    const index = repo ? indexes.get(repo.mainRoot) : undefined;
    return repo && index ? orientation(index, repo, skills) : null;
  }
  return skillContent(key, trigger, skills, missing, notify);
}

function reportMissing(file: string, missing: Set<string>, notify: (message: string, level?: "info" | "warning" | "error") => void): void {
  const key = normalizedRoot(file);
  if (missing.has(key)) return;
  missing.add(key);
  notify(`domain-router: missing ${file}`, "error");
}

function skillContent(
  key: string,
  trigger: string,
  skills: KbSkill[],
  missing: Set<string>,
  notify: (message: string, level?: "info" | "warning" | "error") => void,
): string | null {
  const separator = key.indexOf("/");
  const skillName = separator < 0 ? key : key.slice(0, separator);
  const topic = separator < 0 ? null : key.slice(separator + 1);
  const skill = skills.find((item) => item.name === skillName);
  if (!skill) {
    const file = join(SKILLS_DIR, skillName, topic ?? "SKILL.md");
    if (!existsSync(file)) reportMissing(file, missing, notify);
    return null;
  }
  if (topic && !skill.topics.some((item) => item.file === topic)) {
    const topicPath = join(skill.dir, topic);
    if (!existsSync(topicPath)) reportMissing(topicPath, missing, notify);
    return null;
  }
  const file = topic ? join(skill.dir, topic) : join(skill.dir, "SKILL.md");
  try {
    const body = readFileSync(file, "utf8").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
    const uri = topic ? `skill://${skillName}/${topic}` : `skill://${skillName}`;
    const header = topic
      ? `[domain-router] ${uri} (trigger: ${trigger}).`
      : `[domain-router] ${uri} (trigger: ${trigger}). Apply it; also read any other topic file it selects.`;
    return `${header}\n\n${body}`;
  } catch {
    reportMissing(file, missing, notify);
    return null;
  }
}

function catalogContent(skills: KbSkill[]): string {
  const lines = ["KB catalog:", ...skills.map((skill) => `- skill://${skill.name} — ${skill.description}`)];
  lines.push("Read a catalog KB yourself when work it covers starts before any call touches its files.");
  return lines.join("\n");
}

function orientationArea(area: ProjectIndex["map"][number]): string {
  const types = Object.entries(area.types).map(([extension, count]) => `${extension} ${count}`).join(", ");
  const tags = area.domains.length || area.topics.length
    ? ` [${area.domains.join(", ")}; topics: ${area.topics.join(", ")}]`
    : "";
  const readme = area.readme ? ` — ${area.readme}` : "";
  return `- ${area.path} — ${area.files} files (${types})${tags}${readme}`;
}

function orientation(index: ProjectIndex, repo: RepoRef, skills: KbSkill[]): string {
  const topLevel = index.map.filter((area) => ONE_SEGMENT.test(area.path));
  const visible = topLevel.slice(0, 60);
  const lines = [
    `[project-index] ${index.project.name} — ${repo.indexPath} (generated from skill kb rules, commit ${index.generator.commit.slice(0, 8)})`,
    index.project.synopsis,
    `Domains: ${index.domains.length ? index.domains.map((domain) => `${domain.name} (${domain.files})`).join(", ") : "none"}`,
    "Areas:",
  ];
  for (const area of visible) lines.push(orientationArea(area));
  lines.push(`Deeper areas (${index.map.length - visible.length} more): call the project_index tool with file or directory paths; direct reads of ${repo.indexPath} are blocked.`);
  lines.push(catalogContent(skills));
  return lines.join("\n");
}

function childAreas(index: ProjectIndex, directory: string): ProjectIndex["map"] {
  const prefix = directory.toLowerCase();
  return index.map.filter((area) => {
    if (area.path === "./") return false;
    const areaPath = area.path.toLowerCase();
    if (!areaPath.startsWith(prefix)) return false;
    const remainder = area.path.slice(prefix.length);
    return ONE_SEGMENT.test(remainder);
  });
}

function startAfterReset(branch: BranchEntry[]): number {
  for (let index = branch.length - 1; index >= 0; index--) {
    if (branch[index].type === "reset_boundary") return index + 1;
  }
  return 0;
}

function afterCompaction(branch: BranchEntry[], start: number): number {
  for (let index = branch.length - 1; index >= start; index--) {
    const entry = branch[index];
    if (entry.type !== "compaction") continue;
    const firstKept = entry.firstKeptEntryId;
    const keptIndex = typeof firstKept === "string" ? branch.findIndex((candidate) => candidate.id === firstKept) : -1;
    return keptIndex < 0 ? index + 1 : keptIndex;
  }
  return start;
}

function contextStart(branch: BranchEntry[]): number {
  return afterCompaction(branch, startAfterReset(branch));
}

function skillKey(path: string): string | null {
  if (!path.startsWith("skill://")) return null;
  const parts = path.slice("skill://".length).split("/");
  if (!parts[0]) return null;
  if (parts.length === 1 || parts.length === 2 && parts[1] === "SKILL.md") return parts[0];
  if (parts.length > 1 && parts.slice(1).every(Boolean)) return `${parts[0]}/${parts.slice(1).join("/")}`;
  return null;
}

function addCustomMessageKeys(entry: BranchEntry, delivered: Set<string>): void {
  if (entry.type !== "custom_message" || entry.customType !== KB_MESSAGE || !Array.isArray(entry.details?.keys)) return;
  for (const key of entry.details.keys) if (typeof key === "string") delivered.add(key);
}

function readPathFromBlock(block: unknown): string | null {
  const call = asInput(block);
  if (!call) return null;
  if (call.type !== "toolCall" || call.name !== "read") return null;
  const args = asInput(call.arguments);
  if (!args) return null;
  return typeof args.path === "string" ? args.path : null;
}

function addReadKeys(entry: BranchEntry, delivered: Set<string>): void {
  if (entry.type !== "message") return;
  const content = entry.message?.content;
  if (!Array.isArray(content)) return;
  for (const block of content) {
    const path = readPathFromBlock(block);
    if (!path) continue;
    const key = skillKey(stripReadSelector(path));
    if (key) delivered.add(key);
  }
}

function deliveredKeys(branch: BranchEntry[], queued: Set<string>): Set<string> {
  const delivered = new Set(queued);
  for (const entry of branch.slice(contextStart(branch))) {
    addCustomMessageKeys(entry, delivered);
    addReadKeys(entry, delivered);
  }
  return delivered;
}

function pathExistsAsDirectory(path: string): string | null {
  let current = resolve(path);
  while (true) {
    try {
      if (statSync(current).isDirectory()) return current;
    } catch {}
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function insideDirectory(directory: string, path: string): boolean {
  const child = normalizedRoot(path);
  const parent = normalizedRoot(directory);
  const pathFromParent = relative(parent, child);
  return pathFromParent === "" || pathFromParent !== ".." && !pathFromParent.startsWith(`..${sep}`) && !isAbsolute(pathFromParent);
}

function asInput(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function uniq(values: string[]): string[] {
  return [...new Set(values)];
}
function mutationToolsActive(pi: ExtensionAPI): boolean {
  return pi.getActiveTools().some((tool) => tool === "edit" || tool === "write");
}

function requestedKbKeys(
  prompt: unknown,
  skills: KbSkill[],
  delivered: Set<string>,
  notify: (message: string, level?: "info" | "warning" | "error") => void,
): string[] {
  if (typeof prompt !== "string") return [];
  const request = prompt.match(/\bkb: ([a-z0-9-]+(?:, ?[a-z0-9-]+)*)\./);
  if (!request) return [];
  const keys: string[] = [];
  for (const name of request[1].split(/, ?/)) {
    if (!skills.some((skill) => skill.name === name)) notify(`domain-router: unknown kb ${name}`, "warning");
    else if (!delivered.has(name)) keys.push(name);
  }
  return keys;
}
function commandKeys(command: string, skills: KbSkill[]): string[] {
  const keys: string[] = [];
  for (const segment of commandSegments(command)) {
    const line = segment.join(" ");
    for (const skill of skills) {
      if (skill.commands.some((pattern) => pattern.test(line))) keys.push(skill.name);
      for (const topic of skill.topics) if (topic.commands.some((pattern) => pattern.test(line))) keys.push(`${skill.name}/${topic.file}`);
    }
  }
  return keys;
}

function mcpKeys(toolName: string, input: Record<string, unknown>, skills: KbSkill[]): string[] {
  const name = mcpToolName(toolName, input);
  if (!name) return [];
  const keys: string[] = [];
  for (const skill of skills) if (skill.mcp.some((prefix) => name.startsWith(prefix))) keys.push(skill.name);
  return keys;
}

export default function domainRouter(pi: ExtensionAPI): void {
  const exec: Exec = (command, args, options) => pi.exec(command, args, options);
  let ready: Promise<void> | undefined;
  let skills: KbSkill[] = [];
  let cwdRepo: RepoRef | null = null;
  let taskSession = false;
  const indexes = new Map<string, ProjectIndex>();
  const repos = new Map<string, RepoRef>();
  const resolved = new Map<string, RepoRef | null>();
  const bound = new Map<string, boolean>();
  const refreshedThisTurn = new Set<string>();
  const queued = new Set<string>();
  const missing = new Set<string>();

  const notify = (ctx: RouterContext, message: string, level: "info" | "warning" | "error" = "info") => {
    ctx.ui.notify(message, level);
  };

  async function resolveDirectory(dir: string): Promise<RepoRef | null> {
    if (resolved.has(dir)) return resolved.get(dir) ?? null;
    const repo = await resolveRepo(exec, dir);
    resolved.set(dir, repo);
    if (repo) repos.set(normalizedRoot(repo.mainRoot), repo);
    return repo;
  }

  async function prepareTaskIndex(repo: RepoRef): Promise<ProjectIndex> {
    return readIndexFile(repo) ?? await buildIndex(exec, repo, skills);
  }

  async function prepareMainIndex(repo: RepoRef, ctx: RouterContext): Promise<ProjectIndex> {
    if (await ensureGitignored(exec, repo)) notify(ctx, `project-index: added ${GITIGNORE_LINE} to ${join(repo.mainRoot, ".gitignore")}`);
    const index = await buildIndex(exec, repo, skills);
    const serialized = serializeIndex(index);
    let current: string | null = null;
    try {
      current = readFileSync(repo.indexPath, "utf8");
    } catch {}
    if (current !== serialized) {
      mkdirSync(dirname(repo.indexPath), { recursive: true });
      writeFileSync(repo.indexPath, serialized);
    }
    const changed = current === serialized ? "unchanged" : "written";
    const domainNames = index.domains.map((domain) => domain.name).join(", ") || "none";
    notify(ctx, `project-index: ${changed} ${repo.indexPath} (${index.map.length} areas; domains: ${domainNames})`);
    return index;
  }

  function reloadSkills(ctx: RouterContext): void {
    const loaded = loadKbSkills(SKILLS_DIR);
    skills = loaded.skills;
    for (const error of loaded.errors) notify(ctx, `domain-router: ${error}`, "error");
  }

  async function prepareRepoIndex(repo: RepoRef, isTask: boolean, ctx: RouterContext): Promise<ProjectIndex> {
    return isTask ? await prepareTaskIndex(repo) : await prepareMainIndex(repo, ctx);
  }

  async function prepare(ctx: RouterContext): Promise<void> {
    taskSession = false;
    cwdRepo = null;
    try {
      reloadSkills(ctx);
      taskSession = isTaskSession(ctx.sessionManager.getBranch() as BranchEntry[]);
      cwdRepo = await resolveDirectory(ctx.cwd);
      if (!cwdRepo) return;
      const index = await prepareRepoIndex(cwdRepo, taskSession, ctx);
      indexes.set(cwdRepo.mainRoot, index);
      repos.set(normalizedRoot(cwdRepo.mainRoot), cwdRepo);
    } catch (error) {
      const failedRepo = cwdRepo ?? resolved.get(ctx.cwd);
      if (failedRepo) indexes.delete(failedRepo.mainRoot);
      cwdRepo = null;
      notify(ctx, `domain-router: ${error instanceof Error ? error.message : String(error)}`, "error");
    }
  }

  async function readyFor(ctx: RouterContext): Promise<void> {
    await (ready ??= prepare(ctx));
  }

  function resetTurn(): void {
    queued.clear();
    refreshedThisTurn.clear();
  }

  async function repoForPath(path: string, cwd: string): Promise<RepoRef | null> {
    if (isInternalUrl(path)) return null;
    const absolute = resolve(cwd, path);
    const existing = pathExistsAsDirectory(absolute);
    if (!existing) return null;
    return resolveDirectory(existing);
  }

  async function indexFor(repo: RepoRef): Promise<ProjectIndex> {
    const existing = indexes.get(repo.mainRoot);
    if (existing) return existing;
    const index = await buildIndex(exec, repo, skills);
    indexes.set(repo.mainRoot, index);
    repos.set(normalizedRoot(repo.mainRoot), repo);
    return index;
  }

  async function indexSection(path: string, cwd: string): Promise<string> {
    const absolute = resolve(cwd, path);
    const repo = await repoForPath(absolute, cwd);
    if (!repo) return `${path}: not inside a git repository`;
    const index = await indexFor(repo);
    const relativePath = relative(repo.worktreeRoot, absolute);
    const relPath = relativePath.replaceAll("\\", "/");
    const key = relPath && pathExistsAsDirectory(absolute) === absolute ? `${relPath}/` : relPath;
    const owning = areaFor(index, key);
    const directChildren = childAreas(index, key);
    const children = directChildren.map((child) => `  ${orientationArea(child)}`);
    return [`${path}:`, owning ? orientationArea(owning) : "- no indexed area", ...children].join("\n");
  }

  function writeRefreshed(index: ProjectIndex, repo: RepoRef): void {
    if (!cwdRepo || repo.mainRoot !== cwdRepo.mainRoot || taskSession) return;
    const serialized = serializeIndex(index);
    let current: string | null = null;
    try {
      current = readFileSync(repo.indexPath, "utf8");
    } catch {}
    if (current === serialized) return;
    mkdirSync(dirname(repo.indexPath), { recursive: true });
    writeFileSync(repo.indexPath, serialized);
  }

  async function areaKeysForPath(absolute: string, repo: RepoRef): Promise<string[]> {
    let index = await indexFor(repo);
    const relPath = relative(repo.worktreeRoot, absolute).replaceAll("\\", "/");
    let area = areaFor(index, relPath);
    if (!area && !refreshedThisTurn.has(repo.mainRoot)) {
      index = await buildIndex(exec, repo, skills);
      indexes.set(repo.mainRoot, index);
      refreshedThisTurn.add(repo.mainRoot);
      writeRefreshed(index, repo);
      area = areaFor(index, relative(repo.worktreeRoot, absolute).replaceAll("\\", "/"));
    }
    return area ? [...area.domains, ...area.topics] : [];
  }

  async function commitBoundKeys(absolute: string, ctx: RouterContext, mutation: boolean, read: boolean): Promise<string[]> {
    const planRead = read && latestMode(ctx.sessionManager.getBranch() as BranchEntry[]) === "plan";
    if (!mutation && !planRead) return [];
    if (!await boundForCommit(absolute)) return [];
    return skills.filter((skill) => skill.gate === "commit-bound").map((skill) => skill.name);
  }

  async function keysForPath(path: string, ctx: RouterContext, mutation: boolean, read: boolean): Promise<string[]> {
    if (isInternalUrl(path)) return [];
    const absolute = resolve(ctx.cwd, path);
    const repo = await repoForPath(absolute, ctx.cwd);
    if (!repo) return [];
    return uniq([
      ...await areaKeysForPath(absolute, repo),
      ...await commitBoundKeys(absolute, ctx, mutation, read),
    ]);
  }

  function commitBoundEligible(absolute: string): boolean {
    return !insideDirectory(tmpdir(), absolute) && CODE_EXTENSIONS.has(extname(absolute).toLowerCase());
  }

  async function boundForCommit(absolute: string): Promise<boolean> {
    const key = normalizedRoot(absolute);
    if (bound.has(key)) return bound.get(key)!;
    if (!commitBoundEligible(absolute)) {
      bound.set(key, false);
      return false;
    }
    const cwd = pathExistsAsDirectory(absolute);
    if (!cwd) {
      bound.set(key, false);
      return false;
    }
    const root = await exec("git", ["rev-parse", "--show-toplevel"], { cwd });
    if (root.code !== 0) {
      bound.set(key, false);
      return false;
    }
    const ignored = await exec("git", ["check-ignore", "-q", "--", absolute], { cwd: root.stdout.trim() });
    const result = ignored.code !== 0;
    bound.set(key, result);
    return result;
  }

  async function generatedIndexTarget(targets: Array<{ path: string }>, cwd: string): Promise<string | null> {
    for (const target of targets) {
      if (isInternalUrl(target.path)) continue;
      const absolute = resolve(cwd, target.path);
      const repo = await repoForPath(absolute, cwd);
      if (repo && normalizedRoot(absolute) === normalizedRoot(repo.indexPath)) return repo.indexPath;
    }
    return null;
  }

  async function indexBlockReason(
    targets: Array<{ path: string }>,
    toolName: string,
    input: Record<string, unknown>,
    cwd: string,
  ): Promise<string | null> {
    const writeIndexPath = await generatedIndexTarget(targets, cwd);
    if (writeIndexPath) return `[domain-router] ${writeIndexPath} is generated at startup from skill kb rules; change the rules in skills/<name>/SKILL.md instead.`;
    if (toolName === "read" && typeof input.path === "string") {
      const readPath = stripReadSelector(input.path);
      const readIndexPath = await generatedIndexTarget([{ path: readPath }], cwd);
      if (readIndexPath) return `[domain-router] ${readIndexPath} is read through the project_index tool; call project_index with the paths you need instead.`;
    }
    return null;
  }

  async function resultKeys(toolName: string, input: Record<string, unknown>, ctx: RouterContext): Promise<string[]> {
    const reads = toolName === "read" && typeof input.path === "string"
      ? await keysForPath(stripReadSelector(input.path), ctx, false, true)
      : [];
    const commands = toolName === "bash" && typeof input.command === "string"
      ? commandKeys(input.command, skills)
      : [];
    return [...reads, ...commands, ...mcpKeys(toolName, input, skills)];
  }

  async function send(keys: string[], trigger: string, ctx: RouterContext): Promise<void> {
    const prepared = contentOf(keys, trigger, skills, indexes, repos, missing, (message, level) => notify(ctx, message, level));
    if (!prepared.included.length) return;
    await pi.sendMessage({
      customType: KB_MESSAGE,
      content: prepared.content,
      display: false,
      details: { keys: prepared.included },
      attribution: "agent",
    }, { deliverAs: "aside" });
    for (const key of prepared.included) queued.add(key);
    notify(ctx, `domain-router: ${prepared.included.map((key) => key.startsWith("project:") ? key : `skill://${key}`).join(", ")}`);
  }

  pi.registerTool({
    name: "project_index",
    label: "Project Index",
    description: "Look up the generated project index instead of reading .omp/project-index.yaml. For each file or directory path (absolute or relative to the working directory) returns the owning area (file count, top file types, README summary, detected KB domains and topics), then the areas directly beneath a directory. An empty list means the working directory.",
    parameters: pi.arktype({ paths: "string[]" }),
    loadMode: "essential",
    approval: "read",
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const { paths } = params as { paths: string[] };
      const sections: string[] = [];
      for (const path of paths.length ? paths : ["."]) {
        const section = await indexSection(path, ctx.cwd);
        sections.push(section);
      }
      return { content: [{ type: "text", text: sections.join("\n\n") }], details: { paths } };
    },
  });

  pi.on("session_start", async (_event, ctx) => {
    resetTurn();
    ready = prepare(ctx);
    await ready;
  });

  pi.on("session_switch", async (_event, ctx) => {
    resetTurn();
    ready = prepare(ctx);
    await ready;
  });

  pi.on("turn_start", () => resetTurn());
  pi.on("session_branch", () => resetTurn());
  pi.on("session_tree", () => resetTurn());
  pi.on("session_compact", () => resetTurn());

  pi.on("before_agent_start", async (event, ctx) => {
    await readyFor(ctx);
    const branch = ctx.sessionManager.getBranch() as unknown as BranchEntry[];
    const delivered = deliveredKeys(branch, queued);
    const pending = requestedKbKeys(event.prompt, skills, delivered, (message, level) => notify(ctx, message, level));
    if (mutationToolsActive(pi)) {
      const orientationKey = cwdRepo ? `project:${normalizedRoot(cwdRepo.mainRoot)}` : "catalog";
      if (!delivered.has(orientationKey)) pending.push(orientationKey);
    }
    const keys = uniq(pending);
    if (!keys.length) return;
    const prepared = contentOf(keys, "first prompt", skills, indexes, repos, missing, (message, level) => notify(ctx, message, level));
    for (const key of prepared.included) queued.add(key);
    if (!prepared.included.length) return;
    return { message: { customType: KB_MESSAGE, content: prepared.content, display: false, details: { keys: prepared.included } } };
  });

  pi.on("tool_call", async (event, ctx) => {
    await readyFor(ctx);
    const input = asInput(event.input);
    if (!input) return;
    const targets = mutationTargets(event.toolName, input);
    const blockReason = await indexBlockReason(targets, event.toolName, input, ctx.cwd);
    if (blockReason) return { block: true, reason: blockReason };
    if (!mutationToolsActive(pi)) return;
    const branch = ctx.sessionManager.getBranch() as unknown as BranchEntry[];
    const delivered = deliveredKeys(branch, queued);
    const keys: string[] = [];
    for (const target of targets) keys.push(...await keysForPath(target.path, ctx, true, false));
    const pending = uniq(keys).filter((key) => !delivered.has(key));
    if (!pending.length) return;
    await send(pending, event.toolName, ctx);
    const urls = pending.map((key) => `skill://${key}`).join(", ");
    return { block: true, reason: `[domain-router] Blocked once: ${urls} were just added to context. Apply them, then re-issue this call.` };
  });

  pi.on("tool_result", async (event, ctx) => {
    await readyFor(ctx);
    if (!mutationToolsActive(pi) || event.isError) return;
    const input = asInput(event.input);
    if (!input) return;
    const keys = await resultKeys(event.toolName, input, ctx);
    const branch = ctx.sessionManager.getBranch() as unknown as BranchEntry[];
    const delivered = deliveredKeys(branch, queued);
    const pending = uniq(keys).filter((key) => !delivered.has(key));
    if (pending.length) await send(pending, event.toolName, ctx);
    return undefined;
  });
}
