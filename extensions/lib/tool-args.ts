export type Target = { path: string; content: string };

export const JIRA_COMMENT_TOOL = "mcp__atlassian_addoreditjiraissuecomment";
const HASHLINE_HEADER = /^\[(.+?)#[0-9A-Fa-f]{4}\]\s*$/gm;
const MOVE_LINE = /^MV\s+"?(.+?)"?\s*$/gm;
const INTERNAL_URL = /^[a-z][a-z0-9+.-]*:\/\//i;
const READ_SELECTOR = /(?::(?:raw|img|conflicts|-?\d+(?:[-+]\d*)?(?:,\d+(?:[-+]\d*)?)*))+$/;

export function isInternalUrl(path: string): boolean {
  return INTERNAL_URL.test(path);
}

export function stripReadSelector(path: string): string {
  return path.replace(READ_SELECTOR, "");
}

export function mutationTargets(toolName: string, input: Record<string, unknown>): Target[] {
  if (toolName === "edit") return editTargets(input);
  if (toolName === "write") return writeTargets(input);
  if (toolName === "ast_edit") return pathTargets(input.paths);
  return [];
}

export function mcpToolName(toolName: string, input: Record<string, unknown>): string | null {
  if (toolName.startsWith("mcp__")) return toolName;
  if (toolName === "write" && typeof input.path === "string" && input.path.startsWith("xd://mcp__")) return input.path.slice(5);
  return null;
}

export function recordInput(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function editTargets(input: Record<string, unknown>): Target[] {
  const source = typeof input.input === "string" ? input.input : "";
  const headers = Array.from(source.matchAll(HASHLINE_HEADER));
  if (headers.length > 0) {
    const targets = headers.map((header, index) => ({
      path: header[1],
      content: source.slice(header.index! + header[0].length, headers[index + 1]?.index ?? source.length),
    }));
    for (const move of source.matchAll(MOVE_LINE)) targets.push({ path: move[1], content: "" });
    return targets;
  }
  return typeof input.path === "string" ? [{ path: input.path, content: source }] : [];
}

function writeTargets(input: Record<string, unknown>): Target[] {
  if (typeof input.path !== "string") return [];
  if (input.path === "xd://ast_edit") return astEditTargets(input.content);
  if (input.path.startsWith("xd://")) return [];
  return [{ path: input.path, content: typeof input.content === "string" ? input.content : "" }];
}

function astEditTargets(content: unknown): Target[] {
  if (typeof content !== "string") return [];
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    return [];
  }
  if (!data || typeof data !== "object") return [];
  const { paths, ops } = data as { paths?: unknown; ops?: unknown };
  const output = operationOutput(ops);
  return pathTargets(paths).map((target) => ({ path: target.path, content: output }));
}

function operationOutput(ops: unknown): string {
  if (!Array.isArray(ops)) return "";
  return ops.flatMap((operation) => {
    if (operation && typeof operation === "object" && "out" in operation && typeof operation.out === "string") return [operation.out];
    return [];
  }).join("\n");
}

function pathTargets(paths: unknown): Target[] {
  if (!Array.isArray(paths)) return [];
  return paths.flatMap((path) => typeof path === "string" ? [{ path, content: "" }] : []);
}

