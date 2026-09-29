import { existsSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { approvalMessage } from "./lib/approval.ts";
import { loadCatalog, updateCatalog } from "./lib/catalog-file.ts";
import { classifyCli, type CliCatalog, type CliEffect } from "./lib/cli-catalog.ts";
import { addTool, classify, recordEffect, type Classification } from "./lib/mcp-catalog.ts";
import { classifyCommandSegment, classifyTarget, externalDetail, type Verdict } from "./lib/policy.ts";
import { commandSegments } from "./lib/shell.ts";
import { mcpToolName, mutationTargets, recordInput } from "./lib/tool-args.ts";

const INTENT_WAIT_MS = 25;
const INTENT_WAIT_ATTEMPTS = 10;
const CATALOG_PATH = join(import.meta.dir, "..", "mcp-catalog.json");
const CLI_CATALOG_PATH = join(import.meta.dir, "..", "cli-catalog.json");
const EFFECT = "'read' | 'write' | 'unknown'";
const CLI_EFFECT = "'read' | 'write'";
const BLOCK_CHOICE = "Block this call; remember nothing";

type McpCall = { name: string; args: Record<string, unknown> };
type Choice = { effect: "read" | "write"; values: string[] };
type Ui = {
  select(title: string, options: string[]): Promise<string | undefined>;
  confirm(title: string, message: string): Promise<boolean>;
  notify(message: string, type?: "info" | "warning" | "error"): void;
};
type GuardContext = { hasUI: boolean; ui: Ui };
type ToolCall = { toolName: string; toolCallId: string };

function mcpCall(toolName: string, input: Record<string, unknown>): McpCall | null {
  const name = mcpToolName(toolName, input);
  if (name === null) return null;
  if (toolName !== "write") return { name, args: input };
  try {
    return { name, args: recordInput(JSON.parse(String(input.content))) };
  } catch {
    return { name, args: {} };
  }
}

function mcpVerdict(reason: string, label: string): Verdict {
  return {
    action: "confirm",
    category: "external-write",
    detail: `${reason} (AGENTS.md: external services are read-only unless you explicitly permit): ${label}`,
  };
}

function classificationChoices(classification: Classification): Map<string, Choice | null> {
  const { label, selector, value, unclassified } = classification;
  const remembered = value === null ? [] : [value];
  const everyUnclassified = `every unclassified ${selector} (${unclassified.join(", ")})`;
  const choices = new Map<string, Choice | null>();
  choices.set(`Read: allow; never ask again for ${label}`, { effect: "read", values: remembered });
  if (unclassified.length > 1) choices.set(`Read: allow; never ask again for ${everyUnclassified}`, { effect: "read", values: unclassified });
  choices.set(`Write: remember ${label} as write; review this call`, { effect: "write", values: remembered });
  if (unclassified.length > 1) choices.set(`Write: remember ${everyUnclassified} as write; review this call`, { effect: "write", values: unclassified });
  choices.set(BLOCK_CHOICE, null);
  return choices;
}

async function waitForIntent(intents: ReadonlyMap<string, string>, toolCallId: string): Promise<string | undefined> {
  for (let attempt = 0; attempt < INTENT_WAIT_ATTEMPTS && !intents.has(toolCallId); attempt++) await sleep(INTENT_WAIT_MS);
  return intents.get(toolCallId);
}

export default function policyGuard(pi: ExtensionAPI): void {
  const intents = new Map<string, string>();
  const allowedMcpCalls = new Set<string>();
  const catalogSchema = pi.arktype({
    "[string]": pi.arktype(EFFECT).or(pi.arktype({ selector: "string", values: { "[string]": EFFECT }, "+": "reject" })),
  });
  const cliCatalogSchema = pi.arktype({
    "[string]": pi.arktype({
      commands: { "[string]": CLI_EFFECT },
      globalFlags: { "[string]": "'value' | 'boolean'" },
      readVerbPrefixes: "string[]",
      readVerbs: "string[]",
      resolver: "'help' | 'leading-words'",
      subtrees: { "[string]": CLI_EFFECT },
      "+": "reject",
    }),
  });

  function registeredTool(name: string) {
    return pi.getAllTools().find((tool) => tool.name === name);
  }

  function classifyCall(call: McpCall): Classification {
    const catalog = loadCatalog(CATALOG_PATH, catalogSchema);
    if (typeof catalog === "string") {
      return {
        effect: "unknown",
        label: `${call.name} (${CATALOG_PATH} is unreadable: ${catalog})`,
        selector: null,
        value: null,
        unclassified: [],
        classifiable: false,
      };
    }
    const tool = registeredTool(call.name);
    if (tool) addTool(catalog, tool);
    return classify(catalog, call.name, call.args);
  }

  function rememberChoice(call: McpCall, choice: Choice, ui: Ui): void {
    const tool = registeredTool(call.name);
    const error = updateCatalog(CATALOG_PATH, catalogSchema, (catalog) => {
      if (tool) addTool(catalog, tool);
      recordEffect(catalog, call.name, choice.effect, choice.values);
    });
    if (error) ui.notify(`Policy guard: ${CATALOG_PATH} was not updated, so this choice covers only this call: ${error}`, "warning");
  }

  async function askClassification(call: McpCall, classification: Classification, ui: Ui): Promise<Verdict | null> {
    const choices = classificationChoices(classification);
    const selected = await ui.select(`Policy guard: unclassified MCP call ${classification.label}`, [...choices.keys()]);
    const choice = selected === undefined ? null : choices.get(selected);
    if (!choice) {
      return {
        action: "block",
        category: "external-write",
        detail: `The user blocked unclassified MCP call ${classification.label}. Do not retry or work around it; ask the user how to proceed.`,
      };
    }
    rememberChoice(call, choice, ui);
    return choice.effect === "read" ? null : mcpVerdict("Catalogued MCP write", classification.label);
  }

  async function mcpPolicy(call: McpCall, ctx: GuardContext): Promise<Verdict | null> {
    const classification = classifyCall(call);
    if (classification.effect === "read") return null;
    if (ctx.hasUI && classification.classifiable) return askClassification(call, classification, ctx.ui);
    return mcpVerdict(classification.effect === "write" ? "Catalogued MCP write" : "Unclassified MCP call", classification.label);
  }

  function rememberCommand(program: string, command: string, effect: CliEffect, catalog: CliCatalog, ui: Ui): void {
    catalog[program].commands[command] = effect;
    const error = updateCatalog(CLI_CATALOG_PATH, cliCatalogSchema, (stored) => {
      if (Object.hasOwn(stored, program)) stored[program].commands[command] = effect;
    });
    if (error) ui.notify(`Policy guard: ${CLI_CATALOG_PATH} was not updated, so this choice covers only this call: ${error}`, "warning");
  }

  async function askCommand(program: string, command: string, line: string, catalog: CliCatalog, ui: Ui): Promise<Verdict | null> {
    const label = `${program} ${command}`;
    const read = `Read: allow; never ask again for ${label}`;
    const write = `Write: remember ${label} as write; review this call`;
    const selected = await ui.select(`Policy guard: unclassified command ${label}`, [read, write, BLOCK_CHOICE]);
    if (selected !== read && selected !== write) {
      return {
        action: "block",
        category: "external-write",
        detail: `The user blocked unclassified command ${label}. Do not retry or work around it; ask the user how to proceed.`,
      };
    }
    const effect = selected === read ? "read" : "write";
    rememberCommand(program, command, effect, catalog, ui);
    return effect === "read" ? null : externalDetail(line);
  }

  async function cliPolicy(argv: string[], line: string, catalog: CliCatalog, ctx: GuardContext): Promise<Verdict | null> {
    const decision = await classifyCli(catalog, argv);
    if (decision.kind === "allow") return null;
    if (decision.kind === "remember-read") {
      rememberCommand(argv[0], decision.command, "read", catalog, ctx.ui);
      return null;
    }
    if (decision.kind === "ask" && ctx.hasUI) return askCommand(argv[0], decision.command, line, catalog, ctx.ui);
    return externalDetail(line);
  }

  async function segmentPolicy(argv: string[], catalog: CliCatalog | string, ctx: GuardContext): Promise<Verdict | null> {
    const line = argv.join(" ");
    const verdict = classifyCommandSegment(argv, line);
    if (verdict) return verdict;
    if (typeof catalog === "string") return externalDetail(`${line} (${CLI_CATALOG_PATH} is unreadable: ${catalog})`);
    return cliPolicy(argv, line, catalog, ctx);
  }

  async function bashPolicy(command: string, ctx: GuardContext): Promise<Verdict | null> {
    const catalog = existsSync(CLI_CATALOG_PATH) ? loadCatalog(CLI_CATALOG_PATH, cliCatalogSchema) : "file not found";
    for (const argv of commandSegments(command)) {
      const verdict = await segmentPolicy(argv, catalog, ctx);
      if (verdict) return verdict;
    }
    return null;
  }

  async function inputPolicy(toolName: string, input: Record<string, unknown>, ctx: GuardContext): Promise<Verdict | null> {
    if (toolName === "bash") return typeof input.command === "string" ? bashPolicy(input.command, ctx) : null;
    for (const target of mutationTargets(toolName, input)) {
      const policy = classifyTarget(target.path);
      if (policy) return policy;
    }
    return null;
  }

  async function enforce(policy: Verdict | null, event: ToolCall, input: Record<string, unknown>, ctx: GuardContext) {
    if (!policy) return undefined;
    if (policy.action === "block") return { block: true, reason: `[policy-guard] ${policy.detail}` };
    if (!ctx.hasUI) {
      return {
        block: true,
        reason: `[policy-guard] ${policy.category} needs explicit user approval, which this session cannot request: ${policy.detail}. Stop and report this step to the main agent or the user.`,
      };
    }
    const intent = await waitForIntent(intents, event.toolCallId);
    const approved = await ctx.ui.confirm(`Policy guard: ${policy.category}`, approvalMessage(policy.detail, event.toolName, input, intent));
    if (approved) return undefined;
    return {
      block: true,
      reason: `[policy-guard] The user declined: ${policy.detail}. Do not retry or work around it; ask the user how to proceed.`,
    };
  }

  pi.on("message_update", (event) => {
    const update = event.assistantMessageEvent;
    if (update?.type !== "toolcall_end") return;
    const intent = update.toolCall.arguments?.i;
    if (typeof intent === "string") intents.set(update.toolCall.id, intent.trim());
  });

  pi.on("turn_end", () => {
    intents.clear();
    allowedMcpCalls.clear();
  });

  pi.on("session_start", (_event, ctx) => {
    if (!ctx.hasUI) return;
    const tools = pi.getAllTools();
    const error = updateCatalog(CATALOG_PATH, catalogSchema, (catalog) => {
      for (const tool of tools) if (tool.name.startsWith("mcp__")) addTool(catalog, tool);
    });
    if (error) ctx.ui.notify(`Policy guard: ${CATALOG_PATH} was not synced: ${error}`, "warning");
  });

  pi.on("tool_call", async (event, ctx) => {
    const input = recordInput(event.input);
    const call = mcpCall(event.toolName, input);
    if (call === null) return enforce(await inputPolicy(event.toolName, input, ctx), event, input, ctx);
    const allowedKey = `${event.toolCallId}\n${call.name}`;
    if (allowedMcpCalls.has(allowedKey)) return undefined;
    const result = await enforce(await mcpPolicy(call, ctx), event, input, ctx);
    if (result === undefined) allowedMcpCalls.add(allowedKey);
    return result;
  });
}
