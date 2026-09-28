import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";

export type Probe = { files: string; pattern: RegExp };
export type TopicRule = { file: string; files: string[]; content: Probe[]; commands: RegExp[] };
export type KbSkill = {
  name: string;
  dir: string;
  description: string;
  gate: "files" | "commit-bound";
  files: string[];
  roots: string[];
  exclude: string[];
  content: Probe[];
  commands: RegExp[];
  mcp: string[];
  topics: TopicRule[];
  raw: unknown;
};

type RawRecord = Record<string, unknown>;

let cachedSignature = "";
let cachedResult: { skills: KbSkill[]; errors: string[] } = { skills: [], errors: [] };

function asRecord(value: unknown, path: string): RawRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path} must be an object`);
  return value as RawRecord;
}

function checkKeys(value: RawRecord, allowed: string[], path: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(`${path}.${key} is unknown`);
  }
}

function stringList(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    throw new Error(`${path} must be an array of non-empty strings`);
  }
  return value as string[];
}

function globList(value: unknown, path: string): string[] {
  const globs = stringList(value, path);
  if (globs.some((glob) => glob !== glob.toLowerCase())) throw new Error(`${path} globs must be lowercase`);
  return globs;
}
function optionalList<T>(value: unknown, path: string, parse: (value: unknown, path: string) => T[]): T[] {
  return value === undefined ? [] : parse(value, path);
}


function compilePatterns(value: unknown, path: string): RegExp[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`);
  return value.map((item, index) => {
    if (typeof item !== "string") throw new Error(`${path}[${index}] must be a string`);
    try {
      return new RegExp(item, "m");
    } catch {
      throw new Error(`${path}[${index}] is not a valid regular expression`);
    }
  });
}

function compileProbes(value: unknown, path: string): Probe[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`);
  return value.map((item, index) => {
    const probePath = `${path}[${index}]`;
    const probe = asRecord(item, probePath);
    checkKeys(probe, ["files", "pattern", "flags"], probePath);
    if (typeof probe.files !== "string" || probe.files.length === 0 || probe.files !== probe.files.toLowerCase()) {
      throw new Error(`${probePath}.files must be a lowercase glob`);
    }
    if (typeof probe.pattern !== "string") throw new Error(`${probePath}.pattern must be a string`);
    const flags = probe.flags === undefined ? "" : probe.flags;
    if (typeof flags !== "string" || /[^isu]/.test(flags) || new Set(flags).size !== flags.length) {
      throw new Error(`${probePath}.flags must contain unique characters from "isu"`);
    }
    try {
      return { files: probe.files, pattern: new RegExp(probe.pattern, `${flags}m`) };
    } catch {
      throw new Error(`${probePath}.pattern is not a valid regular expression`);
    }
  });
}

function compileTopics(value: unknown, dir: string): TopicRule[] {
  if (!Array.isArray(value)) throw new Error("kb.topics must be an array");
  const files = new Set<string>();
  return value.map((item, index) => compileTopic(item, index, dir, files));
}

function compileTopic(item: unknown, index: number, dir: string, files: Set<string>): TopicRule {
  const path = `kb.topics[${index}]`;
  const topic = asRecord(item, path);
  checkKeys(topic, ["file", "files", "content", "commands"], path);
  if (typeof topic.file !== "string" || !/^[^/\\]+\.md$/.test(topic.file) || topic.file.toLowerCase() === "skill.md") {
    throw new Error(`${path}.file must name a topic .md file`);
  }
  if (files.has(topic.file.toLowerCase())) throw new Error(`${path}.file is duplicated`);
  files.add(topic.file.toLowerCase());
  const topicPath = join(dir, topic.file);
  if (!existsSync(topicPath) || !statSync(topicPath).isFile()) throw new Error(`${path}.file does not exist beside SKILL.md`);
  const patterns = optionalList(topic.content, `${path}.content`, compileProbes);
  const paths = optionalList(topic.files, `${path}.files`, globList);
  const commands = optionalList(topic.commands, `${path}.commands`, compilePatterns);
  if (paths.length + patterns.length + commands.length === 0) throw new Error(`${path} needs files, content, or commands`);
  return { file: topic.file, files: paths, content: patterns, commands };
}

function compileKb(value: unknown, dir: string): Omit<KbSkill, "name" | "dir" | "description"> {
  const kb = asRecord(value, "kb");
  checkKeys(kb, ["gate", "files", "roots", "exclude", "content", "commands", "mcp", "topics"], "kb");
  const gate = kb.gate === undefined ? "files" : kb.gate;
  if (gate !== "files" && gate !== "commit-bound") throw new Error('kb.gate must be "files" or "commit-bound"');
  if (gate === "commit-bound" && Object.keys(kb).some((key) => key !== "gate")) {
    throw new Error('kb.gate "commit-bound" does not allow other keys');
  }
  const files = optionalList(kb.files, "kb.files", globList);
  const roots = optionalList(kb.roots, "kb.roots", globList);
  const exclude = optionalList(kb.exclude, "kb.exclude", globList);
  const content = optionalList(kb.content, "kb.content", compileProbes);
  const commands = optionalList(kb.commands, "kb.commands", compilePatterns);
  const mcp = optionalList(kb.mcp, "kb.mcp", stringList);
  if (mcp.some((prefix) => !prefix.startsWith("mcp__"))) throw new Error('kb.mcp values must start with "mcp__"');
  const topics = optionalList(kb.topics, "kb.topics", (items) => compileTopics(items, dir));
  return { gate, files, roots, exclude, content, commands, mcp, topics, raw: value };
}

function readSkill(file: string, dir: string, folder: string): { skill?: KbSkill; error?: string } {
  let name = folder;
  try {
    const source = readFileSync(file, "utf8");
    const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    if (!match) return {};
    const metadata = asRecord(Bun.YAML.parse(match[1]), "frontmatter");
    if (typeof metadata.name === "string" && metadata.name.length > 0) name = metadata.name;
    if (!("kb" in metadata)) return {};
    return {
      skill: {
        name,
        dir,
        description: typeof metadata.description === "string" ? metadata.description : "",
        ...compileKb(metadata.kb, dir),
      },
    };
  } catch (error) {
    return { error: `${name}: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export function loadKbSkills(skillsDir: string): { skills: KbSkill[]; errors: string[] } {
  let entries: string[];
  try {
    entries = readdirSync(skillsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(skillsDir, entry.name, "SKILL.md"))
      .filter((file) => existsSync(file))
      .sort();
  } catch {
    return { skills: [], errors: [] };
  }
  const signature = entries.map((file) => `${file}\0${statSync(file).mtimeMs}`).join("\0");
  if (signature === cachedSignature) return cachedResult;
  const skills: KbSkill[] = [];
  const errors: string[] = [];
  for (const file of entries) {
    const dir = dirname(file);
    const folder = basename(dir);
    const result = readSkill(file, dir, folder);
    if (result.skill) skills.push(result.skill);
    if (result.error) errors.push(result.error);
  }
  skills.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  errors.sort();
  cachedSignature = signature;
  cachedResult = { skills, errors };
  return cachedResult;
}

