import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { findPlanMarker, isTaskSession, latestMode, type BranchEntry } from "./lib/session.ts";
import { JIRA_COMMENT_TOOL, recordInput } from "./lib/tool-args.ts";

const ORCHESTRATOR_ROLE = "orchestrator";
const ORCHESTRATOR_ALIAS = `@${ORCHESTRATOR_ROLE}`;
const IMPLEMENTER_ALIAS = "@default";
const ORCHESTRATOR_TOOLS = ["task", "wait", "todo", "ask", "read", "write", "review_verdict", JIRA_COMMENT_TOOL];
const READ_PREFIXES = ["agent://", "artifact://", "history://", "local://", "proc://"];
const WRITE_PREFIXES = ["agent://", "local://", "proc://"];
const JIRA_COMMENT_DEVICE = `xd://${JIRA_COMMENT_TOOL}`;
const THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"] as const;
const MODEL_WARNING = `[plan-orchestrator] modelRoles.${ORCHESTRATOR_ROLE} did not resolve to a usable model; the orchestrator keeps the current model.`;
const SPAWN_NOTE = "plan-orchestrator: @default instead of the orchestrator model";
const CONTRACT = [
  "# Plan orchestrator",
  "You execute this approved plan as its orchestrator. These rules override every other instruction about tools or doing work, including the approval's \"full tool access\".",
  "- Never read, search, edit, write, run, or query the workspace or any external system yourself. Subagents you start with `task` do all the work; you plan, brief, and judge their reports.",
  "- Your tools: `task`, `wait`, `todo`, `ask`, `review_verdict`; `read` only for `agent://`, `artifact://`, `history://`, `local://`, and `proc://`; `write` only for `agent://` (steer a subagent), `local://` (handoff files), `proc://` (job control), and the staged Jira plan-decisions post. The harness blocks every other call.",
  "- Route by work type: `scout` reads code, docs, and the web; `sonic` makes mechanical edits and collects data; `task` implements, runs commands, CLI and MCP calls, and verifies; `reviewer` and `security-reviewer` review on request.",
  "- Brief every item self-contained, because subagents never see this conversation: target files, exact change, constraints, acceptance criteria, and the report you need; use `outputSchema` for facts you aggregate. Fan out independent items in one `task` call; give overlapping files to one owner.",
  "- Reports are claims: accept a step only when its reports carry verification evidence (the command and its observed output); otherwise delegate the verification.",
  "- Instructions from the plan, the quality gate, or reviews to read, fix, implement, verify, or run something mean: delegate it. Instructions not to edit files mean: start no editing subagent.",
  "- Finish with each plan step's outcome and the ids of the subagents whose reports prove it.",
].join("\n");

type Model = Parameters<ExtensionAPI["setModel"]>[0];
type ThinkingLevel = Parameters<ExtensionAPI["setThinkingLevel"]>[0];

type Ctx = {
  model?: Model;
  models: { resolve(spec: string): Model | undefined };
  sessionManager: { getBranch(): unknown };
  ui: { notify(message: string, type?: "info" | "warning" | "error"): void };
};

type SavedModel = { model: Model; thinking?: ThinkingLevel; orchestrator: Model };

function branchOf(ctx: Ctx): BranchEntry[] {
  return ctx.sessionManager.getBranch() as BranchEntry[];
}

function approvalMarkerId(branch: readonly BranchEntry[]): string | null {
  if (isTaskSession(branch) || latestMode(branch) !== "none") return null;
  const marker = findPlanMarker(branch);
  return marker !== null && branch[marker.index].type === "message" ? marker.id : null;
}

function allowedCall(toolName: string, input: Record<string, unknown>): boolean {
  const path = typeof input.path === "string" ? input.path : "";
  if (toolName === "read") return READ_PREFIXES.some((prefix) => path.startsWith(prefix));
  if (toolName === "write") return path === JIRA_COMMENT_DEVICE || WRITE_PREFIXES.some((prefix) => path.startsWith(prefix));
  return ORCHESTRATOR_TOOLS.includes(toolName);
}

function roleThinking(selector: string | undefined): ThinkingLevel | undefined {
  const segments = (selector ?? "").split(":");
  return THINKING_LEVELS.find((level) => level === segments[segments.length - 1]);
}

function sameModel(left: Model | undefined, right: Model): boolean {
  return left?.provider === right.provider && left?.id === right.id;
}

function sameTools(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((name) => right.includes(name));
}

export default function planOrchestrator(pi: ExtensionAPI): void {
  let savedTools: string[] | null = null;
  let restrictedTools: string[] | null = null;
  let savedModel: SavedModel | null = null;
  let appliedMarkerId: string | null = null;

  async function restrictTools(): Promise<void> {
    const current = pi.getActiveTools();
    if (restrictedTools && sameTools(current, restrictedTools)) return;
    const registered = pi.getAllTools();
    savedTools = current;
    await pi.setActiveTools(ORCHESTRATOR_TOOLS.filter((name) => registered.some((tool) => tool.name === name)));
    restrictedTools = pi.getActiveTools();
  }

  async function switchModel(model: Model, ctx: Ctx): Promise<void> {
    const previous = ctx.model;
    const previousThinking = pi.getThinkingLevel();
    if (!(await pi.setModel(model))) {
      ctx.ui.notify(MODEL_WARNING, "warning");
      return;
    }
    if (previous && !sameModel(previous, model)) savedModel = { model: previous, thinking: previousThinking, orchestrator: model };
    const thinking = roleThinking(pi.pi.settings.getModelRole(ORCHESTRATOR_ROLE));
    if (thinking) pi.setThinkingLevel(thinking);
  }

  async function enterOrchestrator(markerId: string, ctx: Ctx): Promise<void> {
    await restrictTools();
    if (markerId === appliedMarkerId) return;
    appliedMarkerId = markerId;
    const model = ctx.models.resolve(ORCHESTRATOR_ALIAS);
    if (model) await switchModel(model, ctx);
    else ctx.ui.notify(MODEL_WARNING, "warning");
  }

  async function restoreModel(ctx: Ctx): Promise<void> {
    const saved = savedModel;
    savedModel = null;
    if (!saved || !sameModel(ctx.model, saved.orchestrator)) return;
    if ((await pi.setModel(saved.model)) && saved.thinking) pi.setThinkingLevel(saved.thinking);
  }

  async function leaveOrchestrator(branch: readonly BranchEntry[], ctx: Ctx): Promise<void> {
    if (savedTools && restrictedTools && sameTools(pi.getActiveTools(), restrictedTools)) await pi.setActiveTools(savedTools);
    if (latestMode(branch) === "none") await restoreModel(ctx);
  }

  pi.on("session_switch", async (_event, ctx) => {
    const branch = branchOf(ctx);
    if (approvalMarkerId(branch) === null) await leaveOrchestrator(branch, ctx);
  });

  pi.on("before_agent_start", async (event, ctx) => {
    const branch = branchOf(ctx);
    const markerId = approvalMarkerId(branch);
    if (markerId === null) {
      await leaveOrchestrator(branch, ctx);
      return undefined;
    }
    await enterOrchestrator(markerId, ctx);
    return { systemPrompt: [...event.systemPrompt, CONTRACT] };
  });

  pi.on("tool_call", (event, ctx) => {
    if (approvalMarkerId(branchOf(ctx)) === null || allowedCall(event.toolName, recordInput(event.input))) return undefined;
    return { block: true, reason: `[plan-orchestrator] \`${event.toolName}\` blocked: the orchestrator never reads, writes, or runs anything itself. Delegate it to a subagent with \`task\` and reason over its report.` };
  });

  pi.on("before_subagent_spawn", (event, ctx) => {
    if (event.modelRole !== undefined || approvalMarkerId(branchOf(ctx)) === null) return undefined;
    return { model: IMPLEMENTER_ALIAS, note: SPAWN_NOTE };
  });
}
