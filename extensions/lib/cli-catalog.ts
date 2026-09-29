import { execFile } from "node:child_process";

export type CliEffect = "read" | "write";
type FlagArity = "value" | "boolean";
type CliSpec = {
  commands: Record<string, CliEffect>;
  globalFlags: Record<string, FlagArity>;
  readVerbPrefixes: string[];
  readVerbs: string[];
  resolver: "help" | "leading-words";
  subtrees: Record<string, CliEffect>;
};
export type CliCatalog = Record<string, CliSpec>;
type CliDecision = { kind: "allow" } | { kind: "confirm" } | { kind: "remember-read"; command: string } | { kind: "ask"; command: string };

const ALLOW: CliDecision = { kind: "allow" };
const CONFIRM: CliDecision = { kind: "confirm" };
const HELP_TIMEOUT_MS = 15_000;

export async function classifyCli(catalog: CliCatalog, argv: string[]): Promise<CliDecision> {
  if (!Object.hasOwn(catalog, argv[0])) return ALLOW;
  const spec = catalog[argv[0]];
  const words = commandWords(spec.globalFlags, argv);
  if (words === null) return CONFIRM;
  const known = knownEffect(spec, words);
  if (known === null) return commandPathDecision(spec, argv[0], words);
  return known === "read" ? ALLOW : CONFIRM;
}

function commandWords(flags: Record<string, FlagArity>, argv: string[]): string[] | null {
  const words: string[] = [];
  for (let index = 1; index < argv.length; index++) {
    const token = argv[index];
    const width = globalFlagWidth(flags, token);
    if (width > 0) index += width - 1;
    else if (token.startsWith("-")) return words.length > 0 ? words : null;
    else words.push(token);
  }
  return words;
}

function globalFlagWidth(flags: Record<string, FlagArity>, token: string): number {
  const [name] = token.split("=", 1);
  if (!Object.hasOwn(flags, name)) return 0;
  return flags[name] === "value" && name === token ? 2 : 1;
}

function knownEffect(spec: CliSpec, words: string[]): CliEffect | null {
  const subtree = longestPrefix(spec.subtrees, words);
  if (subtree !== null) return spec.subtrees[subtree];
  const command = spec.resolver === "help" ? longestPrefix(spec.commands, words) : words.join(" ");
  return command !== null && Object.hasOwn(spec.commands, command) ? spec.commands[command] : null;
}

function longestPrefix(entries: Record<string, CliEffect>, words: string[]): string | null {
  let command = "";
  let longest: string | null = null;
  for (const word of words) {
    command = command === "" ? word : `${command} ${word}`;
    if (Object.hasOwn(entries, command)) longest = command;
  }
  return longest;
}

async function commandPathDecision(spec: CliSpec, program: string, words: string[]): Promise<CliDecision> {
  if (words.length === 0) return ALLOW;
  const path = spec.resolver === "help" ? await helpCommandPath(program, words) : words;
  return path === null ? CONFIRM : verbDecision(spec, path);
}

function verbDecision(spec: CliSpec, path: string[]): CliDecision {
  const verb = path[path.length - 1];
  const command = path.join(" ");
  const read = spec.readVerbs.includes(verb) || spec.readVerbPrefixes.some((prefix) => verb.startsWith(prefix));
  return read ? { kind: "remember-read", command } : { kind: "ask", command };
}

async function helpCommandPath(program: string, words: string[]): Promise<string[] | null> {
  const usage = usageLines(await helpOutput(program, words));
  const leaf = usage.length > 0 && !usage.some((line) => line.endsWith("[command]"));
  const path = leaf ? usagePath(usage[0], words) : [];
  return path.length > 0 ? path : null;
}

function helpOutput(program: string, words: string[]): Promise<string> {
  const { promise, resolve } = Promise.withResolvers<string>();
  execFile(program, ["help", ...words], { timeout: HELP_TIMEOUT_MS, windowsHide: true }, (_error, stdout) => resolve(String(stdout)));
  return promise;
}

function usageLines(output: string): string[] {
  const lines = output.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === "Usage:");
  if (start === -1) return [];
  const usage: string[] = [];
  for (let index = start + 1; index < lines.length && lines[index].trim() !== ""; index++) usage.push(lines[index].trim());
  return usage;
}

function usagePath(usage: string, words: string[]): string[] {
  const tokens = usage.split(" ");
  const path: string[] = [];
  while (path.length < words.length && tokens[path.length + 1] === words[path.length]) path.push(words[path.length]);
  return path;
}
