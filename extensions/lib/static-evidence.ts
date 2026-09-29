import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { readFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PYTHON } from "./python-evidence.ts";
import { overlapsChanges, type ChangedFile } from "./review-scope.ts";
import { execBudget, type Exec } from "./session.ts";
import { TYPESCRIPT } from "./typescript-evidence.ts";

export type Scores = Map<string, number> | null;
export type Language = {
  name: string;
  files: RegExp;
  command: string;
  args: string[];
  server: string;
  unitKinds: Record<number, string>;
  metric: string;
  complexityTool: string;
  header: string;
  languageId: (path: string) => string;
  project: (root: string, path: string) => Promise<string>;
  contextFiles: (exec: Exec, projectDir: string, deadline: number) => Promise<string[]>;
  complexityScores: (exec: Exec, root: string, files: ChangedFile[], deadline: number) => Promise<Scores>;
};

type Position = { line: number; character: number };
type Range = { start: Position; end: Position };
type DocumentSymbol = { name: string; kind: number; range: Range; selectionRange: Range; children?: DocumentSymbol[] };
type Location = { uri: string; range: Range };
type IncomingCall = { from: { name: string; uri: string }; fromRanges: Range[] };
type RpcMessage = { id?: number | string; method?: string; result?: unknown; error?: { message?: string } };
type Unit = { path: string; name: string; kind: number; start: number; end: number; nameLine: number; position: Position; declarationInScope: boolean };
type Site = { caller: string; uri: string; line: number };

const LANGUAGES = [PYTHON, TYPESCRIPT];
const CONTENT_LENGTH = /Content-Length: (\d+)/i;
const IDENTIFIER = /^[\p{L}_$][\p{L}\p{N}_$]*$/u;
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_LISTED = 5;
const CLASS_KIND = 5;
const CLIENT_CAPABILITIES = { textDocument: { documentSymbol: { hierarchicalDocumentSymbolSupport: true }, references: {}, callHierarchy: {} } };
const NO_EVIDENCE = "Static evidence: none. Only in-scope Python and TypeScript files get automated evidence (LSP references and incoming calls; ruff McCabe for Python, Biome cognitive complexity for TypeScript); judge every other file without it.";
const SHARED_HEADER = [
  "- `references` (LSP references without the declaration) and `incoming call sites` (LSP call hierarchy) are static and project-local: dynamic dispatch, reflection, decorators, registries, framework entrypoints, and callers outside the project are invisible, so 0 never proves a unit unused.",
  "- `no evidence` means the tool could not answer: unknown, never zero.",
];

class LspServer {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly pending = new Map<number, PromiseWithResolvers<unknown>>();
  private readonly opened = new Set<string>();
  private buffer = Buffer.alloc(0);
  private failure: unknown = null;
  private nextId = 1;
  private readonly deadline: number;

  constructor(command: string, args: string[], cwd: string, deadline: number) {
    this.deadline = deadline;
    this.child = spawn(command, args, { cwd, stdio: "pipe", windowsHide: true });
    this.child.stdout.on("data", (chunk: Buffer) => this.receive(chunk));
    this.child.stdin.on("error", (error) => this.fail(error));
    this.child.on("error", (error) => this.fail(error));
    this.child.on("exit", () => this.fail(new Error(`${command} exited`)));
    this.child.stderr.resume();
  }

  async request(method: string, params?: unknown): Promise<unknown> {
    if (this.failure !== null) throw this.failure;
    const id = this.nextId++;
    const call = Promise.withResolvers<unknown>();
    const timer = setTimeout(() => call.reject(new Error(`${method} timed out`)), execBudget(this.deadline, REQUEST_TIMEOUT_MS));
    this.pending.set(id, call);
    this.send({ jsonrpc: "2.0", id, method, params });
    try {
      return await call.promise;
    } finally {
      clearTimeout(timer);
      this.pending.delete(id);
    }
  }

  notify(method: string, params?: unknown): void {
    this.send({ jsonrpc: "2.0", method, params });
  }

  async open(path: string, languageId: string): Promise<string> {
    const uri = pathToFileURL(path).href;
    if (this.opened.has(uri)) return uri;
    const text = await readFile(path, "utf8");
    this.opened.add(uri);
    this.notify("textDocument/didOpen", { textDocument: { uri, languageId, version: 1, text } });
    return uri;
  }

  async close(): Promise<void> {
    await this.request("shutdown").catch(() => null);
    this.notify("exit");
    setTimeout(() => this.child.kill(), 2_000).unref();
  }

  private send(message: object): void {
    const body = Buffer.from(JSON.stringify(message), "utf8");
    this.child.stdin.write(Buffer.concat([Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "ascii"), body]));
  }

  private receive(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    try {
      for (let message = this.nextMessage(); message !== null; message = this.nextMessage()) this.dispatch(message);
    } catch (error) {
      this.fail(error);
      this.child.kill();
    }
  }

  private nextMessage(): RpcMessage | null {
    const headerEnd = this.buffer.indexOf("\r\n\r\n");
    const length = Number(CONTENT_LENGTH.exec(this.buffer.subarray(0, Math.max(headerEnd, 0)).toString("ascii"))?.[1]);
    const bodyEnd = headerEnd + 4 + length;
    if (headerEnd < 0 || !Number.isInteger(length) || this.buffer.length < bodyEnd) return null;
    const body = this.buffer.subarray(headerEnd + 4, bodyEnd).toString("utf8");
    this.buffer = this.buffer.subarray(bodyEnd);
    return JSON.parse(body);
  }

  private dispatch(message: RpcMessage): void {
    if (message.method === undefined) this.settle(message);
    else if (message.id !== undefined) this.send({ jsonrpc: "2.0", id: message.id, result: null });
  }

  private settle(message: RpcMessage): void {
    const call = this.pending.get(Number(message.id));
    if (message.error) call?.reject(new Error(message.error.message ?? "request failed"));
    else call?.resolve(message.result);
  }

  private fail(error: unknown): void {
    this.failure = error;
    for (const call of this.pending.values()) call.reject(error);
  }
}

function listed(root: string, sites: Site[]): string {
  const labels = sites.map((site) => `${site.caller}${relative(root, fileURLToPath(site.uri)).replaceAll("\\", "/")}:${site.line + 1}`);
  if (labels.length === 0) return "";
  const shown = labels.slice(0, MAX_LISTED).join(", ");
  return labels.length > MAX_LISTED ? ` (${shown}, +${labels.length - MAX_LISTED} more)` : ` (${shown})`;
}

async function referenceFacts(server: LspServer, root: string, uri: string, unit: Unit): Promise<string> {
  try {
    const found = await server.request("textDocument/references", { textDocument: { uri }, position: unit.position, context: { includeDeclaration: false } });
    const locations: Location[] = Array.isArray(found) ? found : [];
    return `references ${locations.length}${listed(root, locations.map((location) => ({ caller: "", uri: location.uri, line: location.range.start.line })))}`;
  } catch (error) {
    return `references: no evidence (${String(error)})`;
  }
}

async function incomingSites(server: LspServer, uri: string, unit: Unit): Promise<Site[]> {
  const prepared = await server.request("textDocument/prepareCallHierarchy", { textDocument: { uri }, position: unit.position });
  const item: unknown = Array.isArray(prepared) ? prepared[0] : undefined;
  if (item === undefined) throw new Error("no call hierarchy item");
  const incoming = await server.request("callHierarchy/incomingCalls", { item });
  const calls: IncomingCall[] = Array.isArray(incoming) ? incoming : [];
  return calls.flatMap((call) => call.fromRanges.map((range) => ({ caller: `${call.from.name} `, uri: call.from.uri, line: range.start.line })));
}

async function callFacts(server: LspServer, root: string, uri: string, unit: Unit): Promise<string> {
  if (unit.kind === CLASS_KIND) return "";
  try {
    const sites = await incomingSites(server, uri, unit);
    return `incoming call sites ${sites.length}${listed(root, sites)}`;
  } catch (error) {
    return `incoming call sites: no evidence (${String(error)})`;
  }
}

function complexityFact(language: Language, scores: Scores, unit: Unit): string {
  if (unit.kind === CLASS_KIND) return "";
  if (scores === null) return `${language.metric}: no evidence (${language.complexityTool} did not run)`;
  const score = scores.get(`${unit.path}:${unit.nameLine}`);
  return score === undefined ? `${language.metric} ≤ 5` : `${language.metric} ${score} (> 5)`;
}

async function unitLine(language: Language, server: LspServer, root: string, uri: string, unit: Unit, scores: Scores): Promise<string> {
  const scope = unit.declarationInScope ? "declaration in scope" : "only body in scope";
  const facts = [await referenceFacts(server, root, uri, unit), await callFacts(server, root, uri, unit), complexityFact(language, scores, unit)];
  return `- \`${unit.path}:${unit.nameLine}\` ${language.unitKinds[unit.kind]} \`${unit.name}\` (lines ${unit.start}-${unit.end}, ${scope}): ${facts.filter(Boolean).join("; ")}`;
}

function* namedSymbols(symbols: DocumentSymbol[], prefix: string): Generator<[string, DocumentSymbol]> {
  for (const symbol of symbols) {
    const name = prefix === "" ? symbol.name : `${prefix}.${symbol.name}`;
    yield [name, symbol];
    yield* namedSymbols(symbol.children ?? [], name);
  }
}

function unitsIn(language: Language, symbols: DocumentSymbol[], file: ChangedFile): Unit[] {
  const units: Unit[] = [];
  for (const [name, symbol] of namedSymbols(symbols, "")) {
    const start = symbol.range.start.line + 1;
    const end = symbol.range.end.line + 1;
    const nameLine = symbol.selectionRange.start.line + 1;
    if (symbol.kind in language.unitKinds && IDENTIFIER.test(symbol.name) && overlapsChanges(file.ranges, start, end)) {
      units.push({ path: file.path, name, kind: symbol.kind, start, end, nameLine, position: symbol.selectionRange.start, declarationInScope: overlapsChanges(file.ranges, nameLine, nameLine) });
    }
  }
  return units;
}

async function documentSymbols(server: LspServer, uri: string): Promise<DocumentSymbol[]> {
  const symbols = await server.request("textDocument/documentSymbol", { textDocument: { uri } });
  if (!Array.isArray(symbols) || !symbols.every((symbol) => "selectionRange" in Object(symbol))) throw new Error("the language server returned no hierarchical document symbols");
  return symbols;
}

async function fileEvidence(language: Language, server: LspServer, root: string, file: ChangedFile, scores: Scores, deadline: number): Promise<string[]> {
  if (Date.now() > deadline) return [`- \`${file.path}\`: no evidence (time budget spent)`];
  const uri = await server.open(join(root, file.path), language.languageId(file.path));
  const units = unitsIn(language, await documentSymbols(server, uri), file);
  if (units.length === 0) return [`- \`${file.path}\`: no function, method, or class overlaps the in-scope lines`];
  const lines: string[] = [];
  for (const unit of units) {
    lines.push(Date.now() > deadline ? `- \`${unit.path}:${unit.nameLine}\` \`${unit.name}\`: no evidence (time budget spent)` : await unitLine(language, server, root, uri, unit, scores));
  }
  return lines;
}

async function projectEvidence(language: Language, exec: Exec, projectDir: string, root: string, files: ChangedFile[], scores: Scores, deadline: number): Promise<string[]> {
  const server = new LspServer(language.command, language.args, projectDir, deadline);
  const lines: string[] = [];
  try {
    const rootUri = pathToFileURL(projectDir).href;
    await server.request("initialize", { processId: process.pid, rootUri, workspaceFolders: [{ uri: rootUri, name: basename(projectDir) }], capabilities: CLIENT_CAPABILITIES });
    server.notify("initialized", {});
    for (const path of await language.contextFiles(exec, projectDir, deadline)) {
      if (Date.now() > deadline) break;
      await server.open(path, language.languageId(path));
    }
    for (const file of files) {
      lines.push(...(await fileEvidence(language, server, root, file, scores, deadline).catch((error) => [`- \`${file.path}\`: no evidence (${String(error)})`])));
    }
  } catch (error) {
    lines.push(...files.map((file) => `- \`${file.path}\`: no evidence (${language.server}: ${String(error)})`));
  }
  await server.close();
  return lines;
}

async function byProject(language: Language, root: string, files: ChangedFile[]): Promise<Map<string, ChangedFile[]>> {
  const groups = new Map<string, ChangedFile[]>();
  for (const file of files) {
    const directory = await language.project(root, file.path);
    groups.set(directory, [...(groups.get(directory) ?? []), file]);
  }
  return groups;
}

export async function staticEvidence(exec: Exec, root: string, files: ChangedFile[], deadline: number): Promise<string> {
  const present = LANGUAGES.map((language) => ({ language, files: files.filter((file) => language.files.test(file.path)) })).filter((entry) => entry.files.length > 0);
  if (present.length === 0) return NO_EVIDENCE;
  const covered = new Set(present.flatMap((entry) => entry.files.map((file) => file.path)));
  const others = files.filter((file) => !covered.has(file.path)).map((file) => `\`${file.path}\``);
  const scored = await Promise.all(present.map(async (entry) => ({ ...entry, scores: await entry.language.complexityScores(exec, root, entry.files, deadline) })));
  const names = present.map((entry) => entry.language.name).join(" and ");
  const lines = [`Static evidence for in-scope ${names} units (computed by the quality gate; facts to weigh, never findings):`, ...SHARED_HEADER, ...present.map((entry) => entry.language.header), `- Other in-scope files have no automated evidence: ${others.join(", ") || "none"}.`];
  for (const entry of scored) {
    for (const [projectDir, members] of await byProject(entry.language, root, entry.files)) lines.push(...(await projectEvidence(entry.language, exec, projectDir, root, members, entry.scores, deadline)));
  }
  return lines.join("\n");
}
