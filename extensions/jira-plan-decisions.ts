import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { findPlanMarker, latestMode, textOf, type BranchEntry } from "./lib/session.ts";
import { mcpToolName, recordInput } from "./lib/tool-args.ts";

const STORY_ENTRY = "jpollock.jira-plan-decisions.story";
const PENDING_ENTRY = "jpollock.jira-plan-decisions.pending";
const OUTCOME_ENTRY = "jpollock.jira-plan-decisions.outcome";
const REQUEST_MESSAGE = "jpollock.jira-plan-decisions.request";
const COMMENT_TOOL = "mcp__atlassian_addoreditjiraissuecomment";
const JIRA_CLOUD_ID = "312bcfb3-bcfa-4a50-8288-79546cce4310";
const STAGED_BODY = "@staged";
const STORY_PROMPT = "Jira story for this plan's decisions";
const OTHER_STORY = "Enter a different key";
const PLANNING_MODES = ["plan", "plan_paused"];
const DECISION_SECTIONS = [/^## Context\b/i, /^## Assumptions\b/i];
const ISSUE_KEY = /\b[A-Z][A-Z0-9_]+-\d+\b/g;
const PLAN_BLOCK = /<plan path="([^"]+)">\n([\s\S]*)\n<\/plan>/;
const SECTION_HEADING = /^#{1,2} /;
const FENCE = /^\s*(?:```|~~~)/;
const COMMENT_ID = /"commentId"\s*:\s*"?(\d+)/;
const MAX_COMMENT_CHARS = 30_000;
const MAX_REMINDERS = 2;
const LOADED_AT = Date.now();

type Ui = {
  select(title: string, options: string[]): Promise<string | undefined>;
  input(title: string, placeholder?: string): Promise<string | undefined>;
  notify(message: string, type?: "info" | "warning" | "error"): void;
};

type Ctx = {
  hasUI: boolean;
  ui: Ui;
  sessionManager: { getBranch(): unknown; getSessionId(): string };
};

type AskAnswer = { question: string; selectedOptions?: string[]; customInput?: string; note?: string };

type Cycle = { planFilePath: string | null; sessionId: string; story: string | null | undefined; answers: AskAnswer[] };

type Approval = { index: number; planFilePath: string; plan: string; approvedAt: string };

type PendingData = { key: string | null; body: string };

type OutcomeData = { key: string; status: "posted" | "failed" | "abandoned"; commentId: string | null; detail: string };

type Pending = PendingData & { id: string; index: number; timestamp: string; outcome: OutcomeData | null };

type OpenPost = Pending & { key: string };

function branchOf(ctx: Ctx): BranchEntry[] {
  return ctx.sessionManager.getBranch() as BranchEntry[];
}

function isCustom(customType: string): (entry: BranchEntry) => boolean {
  return (entry) => entry.type === "custom" && entry.customType === customType;
}

function issueKeys(text: string): string[] {
  return [...new Set(text.match(ISSUE_KEY) ?? [])];
}

function issueKey(value: unknown): string | null {
  return typeof value === "string" ? issueKeys(value.toUpperCase())[0] ?? null : null;
}

function flat(text: string): string {
  return text.replace(/\s*\n\s*/g, " ").trim();
}

async function chooseStory(candidates: string[], ui: Ui): Promise<string | null> {
  if (candidates.length === 1) return candidates[0];
  const choice = candidates.length > 1 ? await ui.select(STORY_PROMPT, [...candidates, OTHER_STORY]) : OTHER_STORY;
  if (choice !== OTHER_STORY) return choice ?? null;
  return issueKey(await ui.input(STORY_PROMPT, "Issue key or browse URL, e.g. DP-12345; leave empty to skip"));
}

function notifyStory(ui: Ui, key: string | null): void {
  if (key) ui.notify(`Jira: this plan's decisions go to ${key} when it is approved. /jira-story <KEY> changes it.`, "info");
  else ui.notify("Jira: no story set, so this plan's decisions will not be posted. /jira-story <KEY> sets one.", "warning");
}

function askAnswers(entry: BranchEntry): AskAnswer[] {
  const message = entry.message;
  if (message?.role !== "toolResult" || message.toolName !== "ask" || message.isError) return [];
  const details = recordInput(message.details);
  const answers: unknown[] = Array.isArray(details.results) ? details.results : [details];
  return answers.filter((answer): answer is AskAnswer => typeof recordInput(answer).question === "string");
}

function collectCycle(branch: readonly BranchEntry[], sessionId: string): Cycle | null {
  const since = branch.slice(branch.findLastIndex(isCustom(PENDING_ENTRY)) + 1);
  let planning = false;
  const planned = since.filter((entry) => {
    if (entry.type === "mode_change") planning = PLANNING_MODES.includes(entry.mode ?? "none");
    return planning;
  });
  if (planned.length === 0) return null;
  const planFilePath = planned.findLast((entry) => entry.mode === "plan")?.data?.planFilePath;
  const story = since.findLast(isCustom(STORY_ENTRY))?.data;
  return {
    planFilePath: typeof planFilePath === "string" ? planFilePath : null,
    sessionId,
    story: story ? (story.key as string | null) : undefined,
    answers: planned.flatMap(askAnswers),
  };
}

function approvalAt(branch: readonly BranchEntry[]): Approval | null {
  const marker = findPlanMarker(branch);
  if (!marker || Date.parse(marker.timestamp) < LOADED_AT) return null;
  if (branch.slice(marker.index + 1).some(isCustom(PENDING_ENTRY))) return null;
  const match = PLAN_BLOCK.exec(textOf(branch[marker.index].message?.content));
  return match ? { index: marker.index, planFilePath: match[1], plan: match[2], approvedAt: marker.timestamp } : null;
}

function decisionSections(lines: readonly string[]): string[] {
  let fenced = false;
  const headings = lines.flatMap((line, index) => {
    if (FENCE.test(line)) fenced = !fenced;
    return !fenced && SECTION_HEADING.test(line) ? [index] : [];
  });
  return DECISION_SECTIONS.flatMap((pattern) => {
    const position = headings.findIndex((index) => pattern.test(lines[index]));
    if (position < 0) return [];
    const section = lines.slice(headings[position], headings[position + 1] ?? lines.length).join("\n").trim();
    return [section.replace(/^##/, "####")];
  });
}

function composeComment(approval: Approval, cycle: Cycle): string {
  const lines = approval.plan.split("\n");
  const title = lines.find((line) => line.startsWith("# "))?.slice(2).trim() ?? approval.planFilePath;
  const decisions = cycle.answers.map((answer, index) => {
    const choice = [...(answer.selectedOptions ?? []), answer.customInput].filter(Boolean).join("; ");
    const note = answer.note ? `\n   - Note: ${flat(answer.note)}` : "";
    return `${index + 1}. ${flat(answer.question)}\n   - Answer: ${flat(choice) || "(none)"}${note}`;
  });
  const body = [
    `### Plan decisions: ${title}`,
    `Approved ${approval.approvedAt.slice(0, 16).replace("T", " ")} UTC · plan \`${approval.planFilePath}\` · omp session \`${cycle.sessionId}\``,
    `#### Decisions\n${decisions.join("\n") || "No `ask` decisions were recorded in this planning cycle."}`,
    ...decisionSections(lines),
  ].join("\n\n");
  return body.length <= MAX_COMMENT_CHARS ? body : `${body.slice(0, MAX_COMMENT_CHARS)}\n\n_Truncated; full plan: \`${approval.planFilePath}\`._`;
}

function postInstruction(key: string): string {
  const payload = JSON.stringify({ cloudId: JIRA_CLOUD_ID, issueIdOrKey: key, commentBody: STAGED_BODY, contentFormat: "markdown" });
  return [
    `Post the staged plan-decisions comment to Jira story ${key} now, before any other step. The user enabled these posts and confirms each one in a dialog.`,
    `Write this exact JSON to \`xd://${COMMENT_TOOL}\` (or pass it as the arguments of \`${COMMENT_TOOL}\` when that tool is listed directly):`,
    payload,
    `The extension replaces "${STAGED_BODY}" with the staged comment. If the post is declined or fails, say so in one line and continue; do not retry.`,
  ].join("\n");
}

function requestMessage(key: string, body: string) {
  return {
    customType: REQUEST_MESSAGE,
    content: `[jira-plan-decisions] Staged comment for Jira story ${key}:\n\n${body}\n\n${postInstruction(key)}`,
    display: true,
    attribution: "agent" as const,
  };
}

function latestPending(branch: readonly BranchEntry[]): Pending | null {
  const index = branch.findLastIndex(isCustom(PENDING_ENTRY));
  if (index < 0 || branch.slice(index).some((entry) => entry.type === "reset_boundary")) return null;
  const entry = branch[index];
  const outcome = branch.slice(index + 1).find(isCustom(OUTCOME_ENTRY))?.data as OutcomeData | undefined;
  return { ...(entry.data as PendingData), id: entry.id, index, timestamp: entry.timestamp, outcome: outcome ?? null };
}

function openPost(branch: readonly BranchEntry[]): OpenPost | null {
  const pending = latestPending(branch);
  return pending?.key && !pending.outcome ? { ...pending, key: pending.key } : null;
}

function commentArgs(toolName: string, input: Record<string, unknown>): Record<string, unknown> | null {
  if (mcpToolName(toolName, input) !== COMMENT_TOOL) return null;
  let args = input;
  if (toolName === "write") {
    try {
      args = recordInput(JSON.parse(String(input.content)));
    } catch {
      return null;
    }
  }
  return "commentId" in args ? null : args;
}

function stagedInput(toolName: string, input: Record<string, unknown>, args: Record<string, unknown>, post: OpenPost | null): Record<string, unknown> | null {
  if (!post || issueKey(args.issueIdOrKey) !== post.key || args.commentBody === post.body) return null;
  const payload = { ...args, cloudId: JIRA_CLOUD_ID, issueIdOrKey: post.key, commentBody: post.body, contentFormat: "markdown" };
  return toolName === "write" ? { ...input, content: JSON.stringify(payload) } : payload;
}

function commentCallIds(entry: BranchEntry, key: string): string[] {
  const content = entry.message?.role === "assistant" ? entry.message.content : null;
  if (!Array.isArray(content)) return [];
  return content.flatMap((block) => {
    const call = recordInput(block);
    const args = call.type === "toolCall" ? commentArgs(String(call.name), recordInput(call.arguments)) : null;
    return args && issueKey(args.issueIdOrKey) === key ? [String(call.id)] : [];
  });
}

function attemptOutcome(branch: readonly BranchEntry[], post: OpenPost): OutcomeData | null {
  const after = branch.slice(post.index + 1);
  const callIds = new Set(after.flatMap((entry) => commentCallIds(entry, post.key)));
  const result = after.find((entry) => entry.message?.role === "toolResult" && callIds.has(entry.message.toolCallId ?? ""))?.message;
  if (!result) return null;
  const text = textOf(result.content);
  if (result.isError) return { key: post.key, status: "failed", commentId: null, detail: flat(text).slice(0, 300) };
  return { key: post.key, status: "posted", commentId: COMMENT_ID.exec(text)?.[1] ?? null, detail: "" };
}

function outcomeNotice(outcome: OutcomeData): string {
  if (outcome.status === "posted") return `Jira: posted the plan decisions to ${outcome.key} (comment ${outcome.commentId ?? "id not returned"}).`;
  const problem = outcome.status === "failed" ? `posting to ${outcome.key} failed: ${outcome.detail}` : `the plan decisions were not posted to ${outcome.key}`;
  return `Jira: ${problem}. Run /jira-story ${outcome.key} to retry.`;
}

export default function jiraPlanDecisions(pi: ExtensionAPI): void {
  let carried: Cycle | null = null;
  let staging: Promise<void> = Promise.resolve();
  const reminders = new Map<string, number>();

  function cycleFor(branch: readonly BranchEntry[], approval: Approval, sessionId: string): Cycle {
    const carriedCycle = carried?.planFilePath === approval.planFilePath ? carried : null;
    return collectCycle(branch.slice(0, approval.index), sessionId)
      ?? carriedCycle
      ?? { planFilePath: approval.planFilePath, sessionId, story: undefined, answers: [] };
  }

  async function stage(ctx: Ctx): Promise<void> {
    const branch = branchOf(ctx);
    const approval = approvalAt(branch);
    if (!approval) return;
    const cycle = cycleFor(branch, approval, ctx.sessionManager.getSessionId());
    const key = cycle.story === undefined ? await chooseStory([], ctx.ui) : cycle.story;
    const body = composeComment(approval, cycle);
    pi.appendEntry(PENDING_ENTRY, { key, body } satisfies PendingData);
    if (key) pi.sendMessage(requestMessage(key, body), { deliverAs: "aside" });
    else ctx.ui.notify("Jira: no story for this plan, so its decisions were not posted. /jira-story <KEY> posts them.", "warning");
  }

  function stageInOrder(ctx: Ctx): Promise<void> {
    staging = staging.then(() => stage(ctx), () => stage(ctx));
    return staging;
  }

  function recordOutcome(ctx: Ctx): OpenPost | null {
    const branch = branchOf(ctx);
    const post = openPost(branch);
    const outcome = post ? attemptOutcome(branch, post) : null;
    if (!outcome) return post;
    pi.appendEntry(OUTCOME_ENTRY, outcome satisfies OutcomeData);
    ctx.ui.notify(outcomeNotice(outcome), outcome.status === "posted" ? "info" : "warning");
    return null;
  }

  function remind(post: OpenPost, ctx: Ctx) {
    if (Date.parse(post.timestamp) < LOADED_AT) return undefined;
    const count = (reminders.get(post.id) ?? 0) + 1;
    reminders.set(post.id, count);
    if (count <= MAX_REMINDERS) return { decision: "block" as const, reason: `[jira-plan-decisions] ${postInstruction(post.key)}` };
    const outcome: OutcomeData = { key: post.key, status: "abandoned", commentId: null, detail: "" };
    pi.appendEntry(OUTCOME_ENTRY, outcome);
    ctx.ui.notify(outcomeNotice(outcome), "warning");
    return undefined;
  }

  pi.registerCommand("jira-story", {
    description: "Set the Jira story for this plan's decisions; outside plan mode, re-post unposted plan decisions to it",
    handler: async (args, ctx) => {
      const key = await chooseStory(issueKeys(args.toUpperCase()), ctx.ui);
      if (!key) return;
      const branch = branchOf(ctx);
      const pending = latestMode(branch) === "plan" ? null : latestPending(branch);
      if (pending && pending.outcome?.status !== "posted") {
        pi.appendEntry(PENDING_ENTRY, { key, body: pending.body } satisfies PendingData);
        pi.sendMessage(requestMessage(key, pending.body), { deliverAs: "followUp", triggerTurn: true });
        return;
      }
      pi.appendEntry(STORY_ENTRY, { key });
      notifyStory(ctx.ui, key);
    },
  });

  pi.on("before_agent_start", async (event, ctx) => {
    const branch = branchOf(ctx);
    const cycle = ctx.hasUI && latestMode(branch) === "plan" ? collectCycle(branch, ctx.sessionManager.getSessionId()) : null;
    if (!cycle || cycle.story !== undefined) return;
    const key = await chooseStory(issueKeys(event.prompt), ctx.ui);
    pi.appendEntry(STORY_ENTRY, { key });
    notifyStory(ctx.ui, key);
  });

  pi.on("session_before_switch", (event, ctx) => {
    if (event.reason !== "new" || !ctx.hasUI) return;
    carried = collectCycle(branchOf(ctx), ctx.sessionManager.getSessionId());
  });

  pi.on("tool_call", (event, ctx) => {
    const input = recordInput(event.input);
    const args = ctx.hasUI ? commentArgs(event.toolName, input) : null;
    const revised = args ? stagedInput(event.toolName, input, args, openPost(branchOf(ctx))) : null;
    return revised ? { input: revised } : undefined;
  });

  pi.on("turn_end", async (_event, ctx) => {
    if (!ctx.hasUI) return;
    await stageInOrder(ctx);
    recordOutcome(ctx);
  });

  pi.on("session_stop", async (event, ctx) => {
    if (event.signal.aborted || !ctx.hasUI) return undefined;
    await stageInOrder(ctx);
    const post = recordOutcome(ctx);
    return post ? remind(post, ctx) : undefined;
  });
}
