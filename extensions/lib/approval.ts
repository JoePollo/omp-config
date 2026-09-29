import { classifyTarget } from "./policy.ts";
import { mcpToolName, mutationTargets, recordInput } from "./tool-args.ts";

const MAX_PAYLOAD_LINES = 40;
const LINE_BREAK = /\r?\n/;
const EDGE_LINE_BREAKS = /^(?:\r?\n)+|(?:\r?\n)+$/g;

export function approvalMessage(detail: string, toolName: string, input: Record<string, unknown>, intent: string | undefined): string {
  const lines = intent ? [`Intent: ${intent}`, `Reason: ${detail}`] : [`Reason: ${detail}`];
  if (toolName === "bash" && typeof input.command === "string") lines.push(...block("Command:", input.command.split(LINE_BREAK)));
  else if (mcpToolName(toolName, input) !== null) lines.push(...block("Arguments:", mcpArgumentLines(toolName, input), MAX_PAYLOAD_LINES));
  else lines.push(...targetChangeLines(toolName, input));
  return lines.join("\n");
}

function mcpArgumentLines(toolName: string, input: Record<string, unknown>): string[] {
  if (toolName !== "write") return argumentLines(input);
  const content = String(input.content ?? "");
  try {
    return argumentLines(recordInput(JSON.parse(content)));
  } catch {
    return content.split(LINE_BREAK);
  }
}

function argumentLines(args: Record<string, unknown>): string[] {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(args)) {
    const text = typeof value === "string" ? value : String(JSON.stringify(value, null, 2));
    const valueLines = text.split(LINE_BREAK);
    if (valueLines.length === 1) lines.push(`${key}: ${text}`);
    else lines.push(`${key}:`, ...valueLines.map((line) => `  ${line}`));
  }
  return lines;
}

function targetChangeLines(toolName: string, input: Record<string, unknown>): string[] {
  const targets = mutationTargets(toolName, input);
  const classified = targets.find((target) => classifyTarget(target.path) !== null);
  const change = classified ? classified.content.replace(EDGE_LINE_BREAKS, "") : "";
  return change ? block("Change:", change.split(LINE_BREAK), MAX_PAYLOAD_LINES) : [];
}

function block(label: string, lines: string[], maxLines = Number.POSITIVE_INFINITY): string[] {
  const shown = lines.slice(0, maxLines);
  const indented = shown.map((line) => `  ${line}`);
  const hidden = lines.length - shown.length;
  return hidden > 0 ? [label, ...indented, `  … ${hidden} more lines`] : [label, ...indented];
}
