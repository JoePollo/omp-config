import { createHash, randomUUID } from "node:crypto";
import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { runGate, type GateReport, type GateStep } from "./lib/gate-runner.ts";
import { INDEX_DEFINITION, type IndexSchema } from "./lib/project-index-contract.ts";
import { allowedReport, reviewReport, type Finding, type ReportSource, type ReviewReport, type ReviewStatus } from "./lib/review-report.ts";
import { formatRanges, reviewManifest, reviewScope, type ReviewScope, type ScopeMode } from "./lib/review-scope.ts";
import { loadSuppressions, SUPPRESSIONS_RELATIVE_PATH } from "./lib/review-suppressions.ts";
import { findPlanMarker, latestMode, type BranchEntry, type Exec } from "./lib/session.ts";
import { staticEvidence } from "./lib/static-evidence.ts";

const MAX_GATE_RUNS = 3;
const MAX_UNANSWERED_REQUESTS = 2;
const GATE_START_ENTRY = "quality-gate.start";
const GATE_RUN_ENTRY = "quality-gate.gate-run";
const FINAL_ENTRY = "quality-gate.final";
const MUTATING_TOOLS = ["edit", "write", "ast_edit", "apply_patch", "bash", "eval", "task"];
const REVIEW_RUN_ENTRY = "quality-gate.review-run";
const VERDICT_ENTRY = "quality-gate.verdict";
const REVIEW_AGENTS: readonly ReviewAgent[] = ["entropy-review", "code-review"];
const CYCLE_AGENTS = REVIEW_AGENTS;
const MAX_REVIEW_RUNS = 5;
const STOP_WAIT_MS = 15_000;
const STOP_POLL_MS = 250;
const GATE_PREPARING_REASON = "[quality-gate] Preparing the quality gate. Do not edit files until its report is persisted. End your turn and let it finish before reporting completion.";
const GATE_RUNNING_REASON = "[quality-gate] The quality gate is running. Do not edit files until its report is persisted. End your turn and let it finish before reporting completion.";
const SCOPE_PREPARING_REASON = "[quality-gate] Computing the review scope. Do not edit files. End your turn and let it finish before reporting completion.";
const CARD_MESSAGE = "quality-gate.card";
const STATUS_KEY = "quality-gate";
const HANDLER_BUDGET_MS = 25_000;
const BRIEFING_BUDGET_MS = 20_000;
const SCOPE_LIMIT_MS = 300_000;
const GIT_TIMEOUT_MS = 15_000;
const LOADED_AT = Date.now();
const SOURCE_DIRS = [import.meta.dir, join(import.meta.dir, "lib")];

const REVIEW_SCOPE_MESSAGE = "quality-gate.review-scope";
const REVIEW_TASK = /\brepo_root: (.+?)\. review_mode: (diff|repo)\. /;
const MANUAL_REVIEW_ENTRY = "quality-gate.manual-review";
const MANUAL_REQUEST_MESSAGE = "quality-gate.manual-review-request";
const MODE_SUBJECTS: Record<ScopeMode, string> = { diff: "unstaged changes", repo: "whole repository" };

type FinalOutcome = "pass" | "skipped" | "findings" | "blocked" | "cap-reached" | "reviews-passed" | "reviews-dismissed" | "reviews-agreed" | "review-cap-reached" | "review-blocked" | "review-not-run" | "verdict-missing" | "review-error" | "scope-error";

type GateStatus = "pass" | "findings" | "blocked" | "skipped";

type GateStartData = { markerId: string; id: string };
type GateRunData = {
  markerId: string;
  id: string;
  status: GateStatus;
  fingerprint: string | null;
  report: GateReport;
};
type ReviewAgent = "entropy-review" | "code-review";

type ReviewRunData = {
  markerId: string;
  toolCallId: string;
  agent: ReviewAgent;
  run: number;
  status: ReviewStatus;
  findings: Finding[];
  problem: string | null;
  fingerprint: string | null;
};

type VerdictData = {
  markerId: string;
  agent: ReviewAgent;
  run: number;
  agreed: string[];
  dismissed: Array<Finding & { reason: string }>;
};

type Decision = { id: string; verdict: "agree" | "disagree"; reason: string };

type ReviewItem = { agent: ReviewAgent; run: number; dismissed: string; kb: string };

type ReviewTarget = { id: string; mode: ScopeMode; root: string };

type ActiveReview = ReviewTarget & { index: number };

type CycleState = {
  gateRuns: GateRunData[];
  phaseGateRuns: GateRunData[];
  unfinishedGateStart: boolean;
  reviewRuns: ReviewRunData[];
  verdicts: VerdictData[];
  finalized: boolean;
};
type GateJob = {
  markerId: string;
  id: string;
  controller: AbortController;
  clearTimer?: () => void;
  running?: boolean;
  failure?: string;
  prepared?: { current: string | null; root: string | null } | { error: unknown };
};


type TaskResult = ReportSource & { agent?: string };
type GateContext = {
  ui: {
    notify(message: string, type?: "info" | "warning" | "error"): void;
    setStatus(key: string, text: string | undefined): void;
  };
};
type TimerContext = GateContext & {
  cwd: string;
  setTimeout(callback: () => unknown, ms: number): unknown;
  setInterval(callback: () => unknown, ms: number): unknown;
  clearTimer(timer: unknown): void;
};
type StopContext = TimerContext & { sessionManager: { getBranch(): unknown } };
type StopBlock = { decision: "block"; reason: string };
type StopCall = { ctx: StopContext; deadline: number; signal: AbortSignal };
type Requester = (key: string, notice: string, reason: string, unanswered: FinalOutcome, blocked: string) => StopBlock;
type Settled<T> = { value: T } | { error: unknown };
type ScopeRequest = { anchorId: string; key: string; root: string | null; mode: ScopeMode };
type ScopeJob = { key: string; started: number; result?: Settled<ReviewScope> };
type ResultTarget = { id: string; index: number; root: string | null; mode: ScopeMode };
type ReviewInputs = { snapshot: string | null; scope: ReviewScope };
type Theme = { fg(token: string, text: string): string };
type CardLine = [token: string, text: string];
type CardFinding = Finding & { detail: string; fix: string };
type GateCard = { kind: "gate"; run: number; root: string | null; report: GateReport };
type ReviewCard = { kind: "review"; agent: ReviewAgent; run: number; status: ReviewStatus; findings: CardFinding[]; problem: string | null; suppressed: string[] };
type Card = GateCard | ReviewCard;



const FINAL_NOTICES: Record<FinalOutcome, { message: string; level: "info" | "warning" | "error" }> = {
  pass: { message: "Quality gate passed; no reviewable unstaged changes", level: "info" },
  skipped: { message: "Quality gate skipped; no reviewable unstaged changes", level: "info" },
  findings: { message: "Quality gate finished with findings; no reviewable unstaged changes", level: "warning" },
  blocked: { message: "Quality gate blockers reported to the user", level: "warning" },
  "cap-reached": { message: "Quality gate run cap reached", level: "warning" },
  "reviews-passed": { message: "Reviews passed", level: "info" },
  "reviews-dismissed": { message: "Reviews finished; remaining findings disagreed", level: "info" },
  "reviews-agreed": { message: "Review-only run finished; agreed findings reported, nothing implemented", level: "warning" },
  "review-cap-reached": { message: "Review run cap reached; blockers reported to the user", level: "warning" },
  "review-blocked": { message: "Agreed review findings reported to the user as blockers", level: "warning" },
  "review-not-run": { message: "Reviews were requested but never ran; BLOCKED report requested", level: "error" },
  "verdict-missing": { message: "Review findings never received a verdict; BLOCKED report requested", level: "error" },
  "review-error": { message: "A review agent produced no valid report; BLOCKED report requested", level: "error" },
  "scope-error": { message: "The quality gate could not compute the review scope; BLOCKED report requested", level: "error" },
};
const STATUS_TOKENS: Record<GateStatus | ReviewStatus, string> = { pass: "success", skipped: "muted", findings: "warning", blocked: "error", fail: "warning", error: "error" };

function readCycle(after: BranchEntry[], markerId: string): CycleState {
  const cycle: CycleState = { gateRuns: [], phaseGateRuns: [], unfinishedGateStart: false, reviewRuns: [], verdicts: [], finalized: false };
  for (const entry of after) {
    if (entry.type !== "custom" || entry.data?.markerId !== markerId) continue;
    if (entry.customType === GATE_START_ENTRY) {
      cycle.unfinishedGateStart = true;
    } else if (entry.customType === GATE_RUN_ENTRY) {
      const run = entry.data as unknown as GateRunData;
      cycle.gateRuns.push(run);
      cycle.phaseGateRuns.push(run);
      cycle.unfinishedGateStart = false;
    } else if (entry.customType === REVIEW_RUN_ENTRY) {
      cycle.reviewRuns.push(entry.data as unknown as ReviewRunData);
      cycle.phaseGateRuns = [];
    } else if (entry.customType === VERDICT_ENTRY) {
      cycle.verdicts.push(entry.data as unknown as VerdictData);
    } else if (entry.customType === FINAL_ENTRY) {
      cycle.finalized = true;
    }
  }
  return cycle;
}

function activeManualReview(branch: BranchEntry[]): ActiveReview | null {
  const index = branch.findLastIndex((entry) => entry.type === "custom" && entry.customType === MANUAL_REVIEW_ENTRY);
  if (index < 0 || branch.slice(index).some((entry) => entry.type === "reset_boundary")) return null;
  const target = branch[index].data as unknown as ReviewTarget;
  return readCycle(branch.slice(index + 1), target.id).finalized ? null : { ...target, index };
}

function latestRuns(cycle: CycleState): ReviewRunData[] {
  const latest: ReviewRunData[] = [];
  for (const agent of REVIEW_AGENTS) {
    const run = cycle.reviewRuns.findLast((entry) => entry.agent === agent);
    if (run) latest.push(run);
  }
  return latest;
}

function verdictFor(cycle: CycleState, run: ReviewRunData): VerdictData | undefined {
  return cycle.verdicts.find((verdict) => verdict.agent === run.agent && verdict.run === run.run);
}

function isCycleTask(args: unknown): boolean {
  if (!args || typeof args !== "object") return false;
  const value = args as { agent?: unknown; tasks?: unknown };
  if (!Array.isArray(value.tasks)) return typeof value.agent === "string" && CYCLE_AGENTS.includes(value.agent as ReviewAgent);
  return value.tasks.length > 0 && value.tasks.every((task) =>
    task !== null && typeof task === "object" && "agent" in task && typeof task.agent === "string" && CYCLE_AGENTS.includes(task.agent as ReviewAgent),
  );
}

function didWorkSince(after: BranchEntry[]): boolean {
  for (const entry of after) {
    if (entry.type !== "message" || entry.message?.role !== "assistant" || !Array.isArray(entry.message.content)) continue;
    for (const block of entry.message.content) {
      if (!block || typeof block !== "object" || !("type" in block) || block.type !== "toolCall") continue;
      if (!("name" in block) || typeof block.name !== "string" || !MUTATING_TOOLS.includes(block.name)) continue;
      if (block.name === "task" && "arguments" in block && isCycleTask(block.arguments)) continue;
      return true;
    }
  }
  return false;
}

function resultTarget(branch: BranchEntry[], input: unknown): ResultTarget | null {
  const manual = activeManualReview(branch);
  if (manual && JSON.stringify(input ?? null).includes(`review_id: ${manual.id}.`)) return { id: manual.id, index: manual.index, root: manual.root, mode: manual.mode };
  const marker = findPlanMarker(branch);
  return marker ? { id: marker.id, index: marker.index, root: null, mode: "diff" } : null;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)} s`;
}

function settle<T>(work: Promise<T>): Promise<Settled<T>> {
  return work.then((value) => ({ value }), (error: unknown) => ({ error }));
}

async function within<T>(work: Promise<T>, ms: number): Promise<Settled<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<Settled<T>>((resolve) => {
    timer = setTimeout(() => resolve({ error: new Error(`timed out after ${seconds(ms)}`) }), ms);
  });
  try {
    return await Promise.race([settle(work), expired]);
  } finally {
    clearTimeout(timer);
  }
}

function where(cwd: string, root: string | null): string {
  if (root === null) return cwd;
  return relative(root, cwd).replaceAll("\\", "/") || ".";
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

async function staleSource(): Promise<string | null> {
  for (const directory of SOURCE_DIRS) {
    for (const name of await readdir(directory)) {
      const path = join(directory, name);
      if (name.endsWith(".ts") && (await stat(path)).mtimeMs > LOADED_AT) return relative(import.meta.dir, path).replaceAll("\\", "/");
    }
  }
  return null;
}

async function repoRoot(pi: ExtensionAPI, cwd: string): Promise<string | null> {
  const result = await pi.exec("git", ["rev-parse", "--show-toplevel"], { cwd, timeout: GIT_TIMEOUT_MS });
  return result.code === 0 ? result.stdout.trim() : null;
}

async function fingerprint(pi: ExtensionAPI, cwd: string): Promise<string | null> {
  const root = await repoRoot(pi, cwd);
  if (root === null) return null;

  const [status, head] = await Promise.all([
    pi.exec("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], { cwd: root, timeout: GIT_TIMEOUT_MS }),
    pi.exec("git", ["rev-parse", "HEAD"], { cwd: root, timeout: GIT_TIMEOUT_MS }),
  ]);
  if (status.code !== 0 || head.code !== 0 || status.killed || head.killed) return null;

  const hash = createHash("sha256");
  hash.update(head.stdout);
  hash.update(status.stdout);

  const records = status.stdout.split("\0");
  for (let index = 0; index < records.length; index++) {
    const record = records[index];
    if (!record) continue;

    const statusCode = record.slice(0, 2);
    const relativePath = record.slice(3);
    try {
      const info = await stat(join(root, relativePath));
      hash.update(`\0${relativePath}|${info.size}|${info.mtimeMs}`);
    } catch {
      hash.update(`\0${relativePath}|missing`);
    }

    if (statusCode.includes("R") || statusCode.includes("C")) index++;
  }

  return hash.digest("hex");
}

async function reviewBriefing(exec: Exec, root: string, mode: ScopeMode, agent: ReviewAgent, deadline: number): Promise<string> {
  const files = await reviewManifest(exec, root, mode);
  const suppressions = loadSuppressions(root).entries.filter((entry) => entry.agent === agent);
  const lines = [
    `[plan-review] Review scope from the quality gate for the ${MODE_SUBJECTS[mode]} (review_mode: ${mode}) in ${root}: every reviewable file with its in-scope lines as 1-based inclusive ranges. Every finding and suggestion \`line\` must be one of these lines; the gate rejects the whole report otherwise.`,
    ...files.map((file) => `- \`${file.path}\`: ${formatRanges(file.ranges)}`),
  ];
  if (files.length === 0) lines.push("- none: nothing is in scope; yield status `skipped`.");
  if (suppressions.length > 0) lines.push("", `Suppressed findings from \`${SUPPRESSIONS_RELATIVE_PATH}\`; the user elected not to remediate them. Never report a finding or suggestion with the same file and rule as an entry, even if its line moved; the gate drops any that match. Each entry is \`file\` [rule]: reason.`, ...suppressions.map((entry) => `- \`${entry.file}\` [${entry.rule}]: ${entry.reason}`));
  if (agent === "entropy-review") lines.push("", await staticEvidence(exec, root, files, deadline));
  return lines.join("\n");
}

function listSection(title: string, items: Array<{ step: string; detail: string }>): string[] {
  return items.length === 0 ? [] : [`${title}\n${items.map((item) => `- ${item.step}: ${item.detail}`).join("\n")}`];
}

function GATE_REPORT_REASON(report: GateReport, n: number): string {
  const reformatted = report.filesChangedByGate.length > 0 ? [`Reformatted by the gate: ${report.filesChangedByGate.join(", ")}.`] : [];
  return [
    `[quality-gate] Run ${n} of ${MAX_GATE_RUNS}: ${report.summary}.`,
    ...listSection("CI blockers (never ignore; fix them, then end your turn so the gate re-runs):", report.blockers.filter((item) => item.kind === "ci")),
    ...listSection("Config blockers (fix the configuration each line names, or report it to the user):", report.blockers.filter((item) => item.kind === "config")),
    ...listSection("Findings (your call; fix what matters or list them in your final summary):", report.findings),
    ...listSection("Environment problems (a code edit cannot fix these; do not change code or config for them; list them for the user in your final summary):", report.environment),
    ...reformatted,
    "If a CI blocker cannot be fixed within this plan, end your turn with an explicit BLOCKED report giving the failing command and error. Never silence tools with suppressions or config changes unless the plan calls for it.",
  ].join("\n");
}



const CAP_REASON = "[quality-gate] Files changed after the final quality-gate run (3 of 3). The gate will not re-run. End your turn with a summary stating the gate did not re-run after the last changes, listing any unresolved blockers and findings from the last report.";

function runLabels(runs: ReviewRunData[]): string {
  const labels = runs.map((run) => `${run.agent} run ${run.run}`);
  return labels.join(", ");
}

function dismissedFor(cycle: CycleState, agent: ReviewAgent): string {
  const entries: string[] = [];
  for (const verdict of cycle.verdicts) {
    if (verdict.agent !== agent) continue;
    for (const finding of verdict.dismissed) {
      const rule = finding.rule.replace(/["\s]+/g, " ");
      entries.push(`${finding.file}:${finding.line} [${rule}]`);
    }
  }
  return entries.length > 0 ? entries.join("; ") : "none";
}

function reviewItem(agent: ReviewAgent, run: ReviewRunData | undefined, scope: ReviewScope, cycle: CycleState): ReviewItem {
  const names = agent === "code-review" ? [...scope.code, ...scope.topics] : scope.entropy;
  return { agent, run: (run?.run ?? 0) + 1, dismissed: dismissedFor(cycle, agent), kb: names.join(", ") || "none" };
}

function manualDueItems(latest: ReviewRunData[], scope: ReviewScope, cycle: CycleState): ReviewItem[] {
  const items: ReviewItem[] = [];
  for (const agent of REVIEW_AGENTS) {
    const run = latest.find((entry) => entry.agent === agent);
    const due = run ? run.status === "error" : agent === "entropy-review" || scope.code.length > 0;
    if (due) items.push(reviewItem(agent, run, scope, cycle));
  }
  return items;
}

function manualOutcome(latest: ReviewRunData[], cycle: CycleState): FinalOutcome {
  if (latest.some((run) => (verdictFor(cycle, run)?.agreed.length ?? 0) > 0)) return "reviews-agreed";
  return latest.some((run) => run.status === "fail") ? "reviews-dismissed" : "reviews-passed";
}

function reviewTaskLine(item: ReviewItem, target: ReviewTarget): string {
  return `- agent "${item.agent}", task "Review the ${MODE_SUBJECTS[target.mode]}. repo_root: ${target.root}. review_mode: ${target.mode}. review_id: ${target.id}. review_run: ${item.run} of ${MAX_REVIEW_RUNS}. kb: ${item.kb}. dismissed: ${item.dismissed}."`;
}

function REVIEW_REQUEST(items: ReviewItem[], target: ReviewTarget): string {
  const taskLines = items.map((item) => reviewTaskLine(item, target));
  const itemWord = items.length === 1 ? "this item" : "these items";
  return `[plan-review] The quality gate has settled. Before finishing this approved plan, review the unstaged changes.\nCall the \`task\` tool once with context "Post-implementation review of the unstaged changes for an approved plan." and ${itemWord}:\n${taskLines.join("\n")}\nThe review agents are blocking; wait for every report, then act on each:\n- pass or skipped: nothing to do.\n- rejected by the gate (the task result ends with \`[plan-review] The quality gate rejected\`): record no verdict for it; the gate requests that review again.\n- fail: judge every finding on its merits against the plan and the code, then call \`review_verdict\` once for that report with its agent, its run number, and one decision { id, verdict: "agree" or "disagree", reason } per finding id. Record every verdict before editing files.\n- After the verdicts, implement every agreed finding unless the \`review_verdict\` reply says the review cap is reached, then end your turn: the quality gate re-runs, then only the agents whose findings you agreed with.\n- Suggestions are informational and need no verdict.\nIf you agreed with no finding in these reports, finish with a short summary that includes each report's summary line and every finding you disagreed with in this plan's reviews, with its reason.`;
}

function MANUAL_REVIEW_REQUEST(items: ReviewItem[], target: ReviewTarget): string {
  const taskLines = items.map((item) => reviewTaskLine(item, target));
  const itemWord = items.length === 1 ? "this item" : "these items";
  return `[hybrid-review] Review-only run of the ${MODE_SUBJECTS[target.mode]} in ${target.root}: no quality gate, no edits, no implementation.\nCall the \`task\` tool once with context "Review-only run of the ${MODE_SUBJECTS[target.mode]}; findings are reported, never implemented." and ${itemWord}:\n${taskLines.join("\n")}\nThe review agents are blocking; wait for every report, then act on each:\n- pass or skipped: nothing to do.\n- rejected by the gate (the task result ends with \`[plan-review] The quality gate rejected\`): record no verdict for it; the gate requests that review again.\n- fail: judge every finding on its merits against the code, then call \`review_verdict\` once for that report with its agent, its run number, and one decision { id, verdict: "agree" or "disagree", reason } per finding id.\n- Suggestions are informational and need no verdict.\nThen end your turn with a summary listing each report's summary line and every finding with its verdict and reason. Do not edit files or implement any finding.`;
}

function VERDICT_REQUEST(pending: ReviewRunData[]): string {
  return `[plan-review] Review findings await your verdict: ${runLabels(pending)}. Judge every finding on its merits and call \`review_verdict\` once per listed report, with one decision per finding id, before finishing.`;
}

function AGREED_REASON(unimplemented: ReviewRunData[]): string {
  return `[plan-review] You agreed with findings from ${runLabels(unimplemented)} but no files have changed since. Implement them and end your turn so the quality gate and those reviews re-run, or, if they cannot be implemented within this plan, end your turn with an explicit BLOCKED report to the user listing each agreed finding (agent, id, file:line, rule, fix).`;
}

const REVIEW_CAP_REASON = `[plan-review] Files changed after a final review run (${MAX_REVIEW_RUNS} of ${MAX_REVIEW_RUNS}) whose findings you agreed with. Do not run the gate or the reviews again. End your turn with an explicit BLOCKED report to the user listing each agreed finding from that run (agent, id, file:line, rule, fix) and stating that changes made after it were not re-checked.`;

function VERDICT_MISSING_REASON(pending: ReviewRunData[]): string {
  return `[plan-review] Findings from ${runLabels(pending)} still have no verdict after two requests, so the review cycle is closed. End your turn with an explicit BLOCKED report to the user listing each unjudged finding (agent, id, file:line, rule) and stating that no verdict was recorded.`;
}

function REVIEW_NOT_RUN_REASON(labels: string[]): string {
  return `[plan-review] Reviews requested twice never ran: ${labels.join(", ")}. The review cycle is closed. End your turn with an explicit BLOCKED report to the user stating that these reviews never checked the final changes.`;
}

function REVIEW_ERROR_REASON(run: ReviewRunData): string {
  return `[plan-review] ${run.agent} produced no valid report by run ${MAX_REVIEW_RUNS} of ${MAX_REVIEW_RUNS} (last problem: ${run.problem ?? "unreadable report"}), so the review cycle is closed. End your turn with an explicit BLOCKED report to the user stating that ${run.agent} never produced a valid review of the final changes and quoting that problem.`;
}

function REJECTED_NOTE(rejected: ReviewRunData[]): string {
  const lines = rejected.map((run) => `- ${run.agent} run ${run.run}: ${run.problem}`);
  return `[plan-review] The quality gate rejected these reports; their findings are void and need no verdict:\n${lines.join("\n")}\nEnd your turn: the gate requests each rejected review again, up to run ${MAX_REVIEW_RUNS} of ${MAX_REVIEW_RUNS}.`;
}

function SCOPE_ERROR_REASON(error: unknown): string {
  return `[quality-gate] Could not compute the review scope: ${errorText(error)}. Fix the cause if it is yours to fix (for example a git problem in the repository), then end your turn so the gate retries.`;
}

function SCOPE_BLOCKED_REASON(error: unknown): string {
  return `[quality-gate] The review scope still cannot be computed (${errorText(error)}), so the review cycle is closed. End your turn with an explicit BLOCKED report to the user quoting this error and stating that the final changes were not reviewed.`;
}

function SCOPE_UNAVAILABLE_BRIEFING(root: string, error: unknown): string {
  return `[plan-review] The quality gate could not compute the review scope in ${root}: ${errorText(error)}. Review nothing: yield status \`skipped\`, summary \`Nothing in scope.\`, and empty \`kbsRead\`, \`findings\`, and \`suggestions\`. The gate rejects that report when its own scope is not empty and requests the review again.`;
}

function reviewNotes(suppressed: string[], suppressionProblem: string | null, rejected: ReviewRunData[]): string[] {
  const notes: string[] = [];
  if (suppressed.length > 0) notes.push(`[plan-review] The quality gate suppressed these findings per \`${SUPPRESSIONS_RELATIVE_PATH}\`, where the user elected not to remediate them. They are not recorded and need no verdict; list them in your final summary:\n${suppressed.join("\n")}`);
  if (suppressionProblem !== null) notes.push(`[plan-review] \`${SUPPRESSIONS_RELATIVE_PATH}\` is invalid, so the quality gate suppressed nothing: ${suppressionProblem}. Tell the user; change the file only if the user asks.`);
  if (rejected.length > 0) notes.push(REJECTED_NOTE(rejected));
  return notes;
}

function VERDICT_REPLY(agent: ReviewAgent, run: number, agreed: string[], disagreed: number): string {
  if (agreed.length === 0) return `[plan-review] Recorded ${agent} run ${run}: all ${disagreed} findings disagreed. Nothing to implement for this agent.`;
  if (run >= MAX_REVIEW_RUNS) return `[plan-review] Recorded ${agent} run ${run} of ${MAX_REVIEW_RUNS}: agreed ${agreed.join(", ")}. The review cap is reached: do not implement them. End your turn with an explicit BLOCKED report to the user listing each agreed finding (agent, id, file:line, rule, fix).`;
  return `[plan-review] Recorded ${agent} run ${run}: agreed ${agreed.join(", ")}; disagreed ${disagreed}. Once every failing report has a verdict, implement the agreed findings and end your turn; the quality gate re-runs, then ${agent}.`;
}

function MANUAL_VERDICT_REPLY(agent: ReviewAgent, run: number, agreed: string[], disagreed: number): string {
  return `[hybrid-review] Recorded ${agent} run ${run}: agreed ${agreed.join(", ") || "none"}; disagreed ${disagreed}. This is a review-only run: do not implement findings. Once every failing report has a verdict, end your turn with the summary the review request describes.`;
}


function gateFailure(error: unknown): GateReport {
  return { status: "findings", summary: "gate execution failed", steps: [], blockers: [], findings: [{ step: "setup", detail: errorText(error) }], environment: [], filesChangedByGate: [], durationMs: 0 };
}

async function waitWhile(pending: () => boolean, deadline: number, signal: AbortSignal): Promise<void> {
  while (pending() && !signal.aborted && Date.now() < deadline) await sleep(STOP_POLL_MS);
}

function wrap(text: string, width: number): string[] {
  const body = text.trimStart();
  const lead = text.slice(0, text.length - body.length);
  const lines: string[] = [];
  let line = "";
  for (const word of body.split(" ")) {
    if (line !== "" && lead.length + line.length + word.length + 3 > width) {
      lines.push(line);
      line = word;
    } else {
      line = line === "" ? word : `${line} ${word}`;
    }
  }
  lines.push(line);
  return lines.map((wrapped, index) => `${lead}${index === 0 ? "" : "  "}${wrapped}`.slice(0, width));
}

function section(token: string, title: string, items: Array<{ step: string; detail: string }>): CardLine[] {
  if (items.length === 0) return [];
  return [[token, title], ...items.map((item): CardLine => ["text", `  ${clip(item.step, 160)}: ${item.detail}`])];
}

function stepLines(steps: GateStep[], root: string | null, expanded: boolean): CardLine[] {
  if (steps.length === 0) return [];
  if (expanded) return [["dim", "Steps (outcome, duration, command, directory):"], ...steps.map((step): CardLine => [step.outcome === "pass" ? "dim" : "text", `  ${step.outcome} ${seconds(step.durationMs)} ${clip(step.command, 160)} (${where(step.cwd, root)})${step.detail === "" ? "" : `: ${step.detail}`}`])];
  const slowest = steps.reduce((left, right) => (right.durationMs > left.durationMs ? right : left));
  return [["dim", `${steps.length} steps; slowest ${clip(slowest.command, 80)} (${where(slowest.cwd, root)}) took ${seconds(slowest.durationMs)}. Expand tool output to list every step.`]];
}

function gateLines(card: GateCard, expanded: boolean): CardLine[] {
  const { report } = card;
  const reformatted: CardLine[] = report.filesChangedByGate.length > 0 ? [["muted", `Reformatted by the gate: ${report.filesChangedByGate.join(", ")}`]] : [];
  return [
    [STATUS_TOKENS[report.status], `Quality gate · run ${card.run} of ${MAX_GATE_RUNS} · ${report.status} · ${seconds(report.durationMs)}`],
    ["muted", report.summary],
    ...section("error", "CI blockers (the agent must fix these):", report.blockers.filter((item) => item.kind === "ci")),
    ...section("warning", "Config blockers:", report.blockers.filter((item) => item.kind === "config")),
    ...section("warning", "Findings:", report.findings),
    ...section("warning", "Environment (a code edit cannot fix these; they need you):", report.environment),
    ...reformatted,
    ...stepLines(report.steps, card.root, expanded),
  ];
}

function findingLines(finding: CardFinding): CardLine[] {
  const lines: CardLine[] = [["text", `  ${finding.id} ${finding.file}:${finding.line} [${finding.rule}]`]];
  if (finding.detail !== "") lines.push(["muted", `    ${finding.detail}`]);
  if (finding.fix !== "") lines.push(["muted", `    fix: ${finding.fix}`]);
  return lines;
}

function reviewLines(card: ReviewCard): CardLine[] {
  const count = card.findings.length > 0 ? ` · findings: ${card.findings.length}` : "";
  const lines: CardLine[] = [[STATUS_TOKENS[card.status], `Review · ${card.agent} run ${card.run} of ${MAX_REVIEW_RUNS} · ${card.status}${count}`]];
  if (card.problem !== null) lines.push(["error", `Rejected by the quality gate: ${card.problem}`]);
  lines.push(...card.findings.flatMap(findingLines));
  if (card.suppressed.length > 0) lines.push(["dim", `Suppressed per ${SUPPRESSIONS_RELATIVE_PATH}:`], ...card.suppressed.map((line): CardLine => ["dim", `  ${line}`]));
  return lines;
}

function cardComponent(card: Card, expanded: boolean, theme: Theme): { render(width: number): readonly string[]; invalidate(): void } {
  let renderedWidth = -1;
  let rendered: readonly string[] = [];
  return {
    render(width: number): readonly string[] {
      if (width !== renderedWidth) {
        const lines = card.kind === "gate" ? gateLines(card, expanded) : reviewLines(card);
        rendered = lines.flatMap(([token, text]) => wrap(text, width).map((line) => theme.fg(token, line)));
        renderedWidth = width;
      }
      return rendered;
    },
    invalidate(): void {
      renderedWidth = -1;
    },
  };
}

function findingText(source: ReportSource, id: string): { detail: string; fix: string } {
  const reported = source.structuredOutput?.data?.findings;
  const match: Record<string, unknown> = Object(Array.isArray(reported) ? reported.find((item: unknown) => Object(item).id === id) : undefined);
  return { detail: typeof match.detail === "string" ? match.detail : "", fix: typeof match.fix === "string" ? match.fix : "" };
}

export default function qualityGate(pi: ExtensionAPI): void {
  const requests = new Map<string, number>();
  const nudged = new Set<string>();
  const exec: Exec = (command, args, options) => pi.exec(command, args, options);
  const indexSchema: IndexSchema = pi.arktype(INDEX_DEFINITION);
  let gateJob: GateJob | null = null;
  let scopeJob: ScopeJob | null = null;
  let staleWarned = false;

  function cancelJob(): void {
    const job = gateJob;
    gateJob = null;
    job?.clearTimer?.();
    job?.controller.abort();
  }

  pi.registerMessageRenderer(CARD_MESSAGE, (message: { details?: unknown }, options: { expanded: boolean }, theme: Theme) => cardComponent(message.details as Card, options.expanded, theme));

  function showCard(card: Card, note: string): void {
    void Promise.resolve()
      .then(() => pi.sendMessage({ customType: CARD_MESSAGE, content: note, display: true, details: card, attribution: "agent" }, { deliverAs: "aside" }))
      .catch((error: unknown) => pi.logger.debug("quality-gate.card-failed", { error: errorText(error) }));
  }

  function gateReportBlock(run: GateRunData, n: number, root: string | null): StopBlock {
    showCard({ kind: "gate", run: n, root, report: run.report }, `[quality-gate] Showed the user the run ${n} of ${MAX_GATE_RUNS} report card (${run.report.status}: ${run.report.summary}). This note needs no action.`);
    return { decision: "block", reason: GATE_REPORT_REASON(run.report, n) };
  }

  async function warnIfStale(ctx: GateContext): Promise<void> {
    if (staleWarned) return;
    const changed = await staleSource().catch(() => null);
    if (changed === null) return;
    staleWarned = true;
    ctx.ui.notify(`quality-gate: extensions/${changed} changed on disk after this OMP process loaded its extensions, so this session still runs the old code. Restart OMP to load it.`, "warning");
    pi.logger.debug("quality-gate.stale-extension", { changed });
  }

  function gateProgress(ctx: TimerContext, run: number, root: string): { exec: Exec; stop: () => void } {
    const started = Date.now();
    let label = "starting";
    let labelStarted = started;
    const show = () => ctx.ui.setStatus(STATUS_KEY, `quality gate ${run}/${MAX_GATE_RUNS}: ${label}, ${seconds(Date.now() - labelStarted)} (total ${seconds(Date.now() - started)})`);
    const ticker = ctx.setInterval(show, 1_000);
    show();
    return {
      exec: async (command, args, options) => {
        const execStarted = Date.now();
        label = `${command} ${args[0] ?? ""} in ${where(options.cwd, root)}`;
        labelStarted = execStarted;
        show();
        const result = await exec(command, args, options);
        pi.logger.debug("quality-gate.exec", { command, args: args.slice(0, 4), cwd: options.cwd, code: result.code, killed: Boolean(result.killed), durationMs: Date.now() - execStarted });
        return result;
      },
      stop: () => {
        ctx.clearTimer(ticker);
        ctx.ui.setStatus(STATUS_KEY, undefined);
      },
    };
  }

  function startScope(target: ScopeRequest, ctx: TimerContext): ScopeJob {
    const job: ScopeJob = { key: target.key, started: Date.now() };
    scopeJob = job;
    try {
      ctx.setTimeout(async () => {
        ctx.ui.setStatus(STATUS_KEY, "quality gate: computing the review scope");
        job.result = await settle(reviewScope(exec, target.root, target.mode, indexSchema));
        ctx.ui.setStatus(STATUS_KEY, undefined);
      }, 0);
    } catch (error) {
      job.result = { error };
    }
    return job;
  }

  async function scopeFor(target: ScopeRequest, call: StopCall): Promise<Settled<ReviewScope> | null> {
    const job = scopeJob?.key === target.key ? scopeJob : startScope(target, call.ctx);
    await waitWhile(() => scopeJob === job && job.result === undefined, call.deadline, call.signal);
    if (job.result === undefined && Date.now() - job.started > SCOPE_LIMIT_MS) job.result = { error: new Error(`the review scope took longer than ${seconds(SCOPE_LIMIT_MS)}`) };
    return job.result ?? null;
  }

  async function scopeOrBlock(target: ScopeRequest, request: Requester, call: StopCall): Promise<ReviewScope | StopBlock> {
    const settled = await scopeFor(target, call);
    if (settled === null) return { decision: "block", reason: SCOPE_PREPARING_REASON };
    if ("value" in settled) return settled.value;
    scopeJob = null;
    return request(`${target.anchorId}:scope-error`, "Review scope failed", SCOPE_ERROR_REASON(settled.error), "scope-error", SCOPE_BLOCKED_REASON(settled.error));
  }

  async function reviewInputs(target: ResultTarget, cwd: string): Promise<ReviewInputs> {
    const snapshot = await fingerprint(pi, cwd);
    const scope = await reviewScope(exec, target.root ?? (await repoRoot(pi, cwd)), target.mode, indexSchema);
    return { snapshot, scope };
  }

  function recordReviewRuns(results: TaskResult[], toolCallId: string, target: ResultTarget, branch: BranchEntry[], inputs: Settled<ReviewInputs>): string[] {
    const cycle = readCycle(branch.slice(target.index + 1), target.id);
    const suppressions = "value" in inputs ? loadSuppressions(inputs.value.scope.root) : { entries: [], problem: null };
    const runCounts = new Map<ReviewAgent, number>();
    for (const run of cycle.reviewRuns) runCounts.set(run.agent, run.run);
    const recorded: ReviewRunData[] = [];
    const suppressed: string[] = [];
    for (const result of results) {
      const agent = result.agent as ReviewAgent;
      const run = (runCounts.get(agent) ?? 0) + 1;
      runCounts.set(agent, run);
      const report: ReviewReport = "value" in inputs
        ? reviewReport(result, allowedReport(inputs.value.scope, agent, cycle.verdicts, suppressions.entries))
        : { status: "error", findings: [], suppressed: [], problem: `the quality gate could not check this report: ${errorText(inputs.error)}` };
      const entry: ReviewRunData = { markerId: target.id, toolCallId, agent, run, status: report.status, findings: report.findings, problem: report.problem, fingerprint: "value" in inputs ? inputs.value.snapshot : null };
      pi.appendEntry(REVIEW_RUN_ENTRY, entry);
      recorded.push(entry);
      const lines = report.suppressed.map((finding) => `- ${agent} run ${run} ${finding.id}: ${finding.file}:${finding.line} [${finding.rule}] (reason: ${finding.reason})`);
      suppressed.push(...lines);
      showCard({ kind: "review", agent, run, status: report.status, findings: report.findings.map((finding) => ({ ...finding, ...findingText(result, finding.id) })), problem: report.problem, suppressed: lines }, `[plan-review] Showed the user the ${agent} run ${run} report card (${report.status}). This note needs no action.`);
    }
    return reviewNotes(suppressed, suppressions.problem, recorded.filter((entry) => entry.status === "error"));
  }

  function finalize(markerId: string, outcome: FinalOutcome, cycle: CycleState, ctx: GateContext): void {
    pi.appendEntry(FINAL_ENTRY, { markerId, outcome, gateRuns: cycle.gateRuns.length, reviewRuns: cycle.reviewRuns.length });
    const notice = FINAL_NOTICES[outcome];
    ctx.ui.notify(notice.message, notice.level);
  }

  function requester(markerId: string, cycle: CycleState, ctx: GateContext) {
    return (key: string, notice: string, reason: string, unanswered: FinalOutcome, blocked: string) => {
      const count = requests.get(key) ?? 0;
      if (count >= MAX_UNANSWERED_REQUESTS) {
        finalize(markerId, unanswered, cycle, ctx);
        return { decision: "block" as const, reason: blocked };
      }
      requests.set(key, count + 1);
      ctx.ui.notify(notice, "info");
      return { decision: "block" as const, reason };
    };
  }

  async function manualReviewStop(manual: ActiveReview, branch: BranchEntry[], call: StopCall) {
    const cycle = readCycle(branch.slice(manual.index + 1), manual.id);
    const request = requester(manual.id, cycle, call.ctx);
    const latest = latestRuns(cycle);
    const pending = latest.filter((run) => run.status === "fail" && !verdictFor(cycle, run));
    if (pending.length > 0) {
      return request(`${manual.id}:verdict:${cycle.reviewRuns.length}:${cycle.verdicts.length}`, "Review verdicts requested", VERDICT_REQUEST(pending), "verdict-missing", VERDICT_MISSING_REASON(pending));
    }
    const exhausted = latest.find((run) => run.status === "error" && run.run >= MAX_REVIEW_RUNS);
    if (exhausted) {
      finalize(manual.id, "review-error", cycle, call.ctx);
      return { decision: "block" as const, reason: REVIEW_ERROR_REASON(exhausted) };
    }
    const scope = await scopeOrBlock({ anchorId: manual.id, key: manual.id, root: manual.root, mode: manual.mode }, request, call);
    if ("decision" in scope) return scope;
    const due = manualDueItems(latest, scope, cycle);
    if (due.length > 0) {
      const labels = due.map((item) => `${item.agent} ${item.run}/${MAX_REVIEW_RUNS}`);
      return request(`${manual.id}:review:${cycle.reviewRuns.length}`, `Reviews requested: ${labels.join(", ")}`, MANUAL_REVIEW_REQUEST(due, manual), "review-not-run", REVIEW_NOT_RUN_REASON(labels));
    }
    finalize(manual.id, manualOutcome(latest, cycle), cycle, call.ctx);
    return undefined;
  }

  pi.registerTool({
    name: "review_verdict",
    label: "Review Verdict",
    description: "Record your agree/disagree decision on every finding of a failing entropy-review or code-review report during an approved plan's post-implementation review cycle or a /hybrid-review run. Call once per failing report.",
    parameters: pi.arktype({
      agent: "'entropy-review' | 'code-review'",
      run: "number.integer",
      decisions: [{ id: "string", verdict: "'agree' | 'disagree'", reason: "string" }, "[]"],
    }),
    loadMode: "essential",
    approval: "read",
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const { agent, run, decisions } = params as { agent: ReviewAgent; run: number; decisions: Decision[] };
      const branch = ctx.sessionManager.getBranch() as unknown as BranchEntry[];
      const manual = activeManualReview(branch);
      const anchor = manual ?? findPlanMarker(branch);
      if (!anchor) throw new Error("No review cycle is active in this session.");
      const cycle = readCycle(branch.slice(anchor.index + 1), anchor.id);
      if (cycle.finalized) throw new Error("This review cycle has already finished.");
      const latest = cycle.reviewRuns.findLast((entry) => entry.agent === agent);
      if (!latest) throw new Error(`No ${agent} review run has been recorded in this review cycle.`);
      if (latest.run !== run) throw new Error(`The latest ${agent} review run is ${latest.run}; record the verdict for run ${latest.run}.`);
      if (latest.status !== "fail") throw new Error(`${agent} run ${run} reported ${latest.status}; it has no findings to judge.`);
      if (cycle.verdicts.some((verdict) => verdict.agent === agent && verdict.run === run)) throw new Error(`A verdict for ${agent} run ${run} is already recorded.`);

      const expected = latest.findings.map((finding) => finding.id);
      const given = decisions.map((decision) => decision.id);
      const missing = expected.filter((id) => !given.includes(id));
      const unknown = given.filter((id) => !expected.includes(id));
      const duplicated = given.filter((id, index) => given.indexOf(id) !== index);
      const unexplained: string[] = [];
      const agreed: string[] = [];
      const dismissed: VerdictData["dismissed"] = [];
      for (const decision of decisions) {
        if (decision.reason.trim() === "") unexplained.push(decision.id);
        const finding = latest.findings.find((candidate) => candidate.id === decision.id);
        if (!finding) continue;
        if (decision.verdict === "agree") agreed.push(decision.id);
        else dismissed.push({ ...finding, reason: decision.reason });
      }
      if (missing.length + unknown.length + duplicated.length + unexplained.length > 0) {
        throw new Error(`Give exactly one decision with a non-empty reason for each finding of ${agent} run ${run} (${expected.join(", ")}). Missing: ${missing.join(", ") || "none"}. Unknown: ${unknown.join(", ") || "none"}. Duplicated: ${duplicated.join(", ") || "none"}. Without reason: ${unexplained.join(", ") || "none"}.`);
      }

      pi.appendEntry(VERDICT_ENTRY, { markerId: anchor.id, agent, run, agreed, dismissed } satisfies VerdictData);
      const dismissedIds = dismissed.map((finding) => finding.id);
      return {
        content: [{ type: "text", text: manual ? MANUAL_VERDICT_REPLY(agent, run, agreed, dismissed.length) : VERDICT_REPLY(agent, run, agreed, dismissed.length) }],
        details: { agent, run, agreed, dismissed: dismissedIds },
      };
    },
  });

  pi.registerCommand("hybrid-review", {
    description: "Run only the entropy and code reviews (no quality gate, no implementation) on the unstaged diff or the whole repository: /hybrid-review [diff|repo], default diff",
    handler: async (args, ctx) => {
      const requested = args.trim().toLowerCase() || "diff";
      const mode = (["diff", "repo"] as const).find((candidate) => candidate === requested);
      if (mode === undefined) {
        ctx.ui.notify("Usage: /hybrid-review [diff|repo]. diff (default) reviews the unstaged and untracked changes; repo reviews every reviewable file in the repository.", "warning");
        return;
      }
      await ctx.waitForIdle();
      if (latestMode(ctx.sessionManager.getBranch() as unknown as BranchEntry[]) === "plan") {
        ctx.ui.notify("/hybrid-review runs outside plan mode; exit plan mode first.", "warning");
        return;
      }
      const settled = await settle(reviewScope(exec, await repoRoot(pi, ctx.cwd), mode, indexSchema));
      if ("error" in settled) {
        ctx.ui.notify(`/hybrid-review ${mode}: could not compute the review scope: ${errorText(settled.error)}`, "error");
        return;
      }
      const scope = settled.value;
      if (scope.files.length === 0) {
        ctx.ui.notify(`/hybrid-review ${mode}: nothing to review (not a git repository, or no reviewable files in scope).`, "info");
        return;
      }
      const target: ReviewTarget = { id: randomUUID(), mode, root: scope.root };
      pi.appendEntry(MANUAL_REVIEW_ENTRY, target);
      scopeJob = { key: target.id, started: Date.now(), result: { value: scope } };
      requests.set(`${target.id}:review:0`, 1);
      const content = MANUAL_REVIEW_REQUEST(manualDueItems([], scope, readCycle([], target.id)), target);
      await pi.sendMessage({ customType: MANUAL_REQUEST_MESSAGE, content, display: true, attribution: "agent" }, { deliverAs: "followUp", triggerTurn: true });
    },
  });

  pi.on("tool_result", async (event, ctx) => {
    if (event.toolName !== "task") return;

    const details = event.details as { results?: unknown[]; async?: { state: string } } | undefined;
    if (details?.async?.state === "running" || !Array.isArray(details?.results)) return;

    const results = details.results as TaskResult[];
    const reviewResults = results.filter((result) => REVIEW_AGENTS.includes(result.agent as ReviewAgent));
    if (reviewResults.length === 0) return;

    const branch = ctx.sessionManager.getBranch() as unknown as BranchEntry[];
    const target = resultTarget(branch, event.input);
    if (!target) return;

    const inputs = await within(reviewInputs(target, ctx.cwd), HANDLER_BUDGET_MS);
    const notes = recordReviewRuns(reviewResults, event.toolCallId, target, branch, inputs);
    return notes.length > 0 ? { content: [...event.content, ...notes.map((text) => ({ type: "text" as const, text }))] } : undefined;
  });

  pi.on("before_agent_start", async (event, ctx) => {
    const branch = ctx.sessionManager.getBranch() as unknown as BranchEntry[];
    const init = branch.find((entry) => entry.type === "session_init");
    const agent = REVIEW_AGENTS.find((name) => name === init?.agent);
    const match = REVIEW_TASK.exec(String(event.prompt));
    if (agent === undefined || match === null) return;
    const [, root, mode] = match;
    const briefing = await within(reviewBriefing(exec, root, mode as ScopeMode, agent, Date.now() + BRIEFING_BUDGET_MS), HANDLER_BUDGET_MS);
    const content = "value" in briefing ? briefing.value : SCOPE_UNAVAILABLE_BRIEFING(root, briefing.error);
    pi.logger.debug("quality-gate.briefing", { agent, root, chars: content.length, error: "error" in briefing ? errorText(briefing.error) : "" });
    return { message: { customType: REVIEW_SCOPE_MESSAGE, content, display: false, details: { agent, root, mode } } };
  });
  pi.on("session_shutdown", cancelJob);
  pi.on("session_start", async (_event, ctx) => {
    await warnIfStale(ctx);
  });
  pi.on("session_stop", async (event, ctx) => {
    const started = Date.now();
    const decision = await stopDecision(event, ctx);
    pi.logger.debug("quality-gate.stop", { elapsedMs: Date.now() - started, decision: decision?.decision ?? "allow", reason: decision?.reason.slice(0, 160) ?? "" });
    return decision;
  });

  async function stopDecision(event: { signal: AbortSignal }, ctx: StopContext): Promise<StopBlock | undefined> {
    const deadline = Date.now() + STOP_WAIT_MS;
    const call: StopCall = { ctx, deadline, signal: event.signal };
    if (gateJob && gateJob.markerId !== findPlanMarker(ctx.sessionManager.getBranch() as unknown as BranchEntry[])?.id) cancelJob();
    await waitWhile(() => gateJob !== null && !gateJob.failure && (!gateJob.prepared || gateJob.running === true), deadline, event.signal);
    const branch = ctx.sessionManager.getBranch() as unknown as BranchEntry[];
    const marker = findPlanMarker(branch);
    const job = gateJob;
    if (job && (job.failure || !job.prepared || job.running)) {
      return { decision: "block" as const, reason: job.failure ?? (job.running ? GATE_RUNNING_REASON : GATE_PREPARING_REASON) };
    }
    if (event.signal.aborted) return;
    const manual = activeManualReview(branch);
    const manualDecision = manual ? await manualReviewStop(manual, branch, call) : undefined;
    if (manualDecision) return manualDecision;
    if (!marker) return;

    const after = branch.slice(marker.index + 1);
    if (latestMode(after) === "plan") return;
    const cycle = readCycle(after, marker.id);
    if (cycle.finalized) return;
    if (cycle.gateRuns.length === 0 && cycle.reviewRuns.length === 0 && !cycle.unfinishedGateStart && !didWorkSince(after)) return;

    const request = requester(marker.id, cycle, ctx);
    const latest = latestRuns(cycle);

    const pending = latest.filter((run) => run.status === "fail" && !verdictFor(cycle, run));
    if (pending.length > 0) {
      return request(`${marker.id}:verdict:${cycle.reviewRuns.length}:${cycle.verdicts.length}`, "Review verdicts requested", VERDICT_REQUEST(pending), "verdict-missing", VERDICT_MISSING_REASON(pending));
    }

    const reservation: GateJob = gateJob ?? { markerId: marker.id, id: randomUUID(), controller: new AbortController() };
    const active = () => {
      if (gateJob !== reservation || reservation.controller.signal.aborted) return false;
      if (findPlanMarker(ctx.sessionManager.getBranch() as unknown as BranchEntry[])?.id === reservation.markerId) return true;
      cancelJob();
      return false;
    };
    if (!reservation.prepared) {
      gateJob = reservation;
      try {
        const timer = ctx.setTimeout(async () => {
          reservation.clearTimer = undefined;
          if (!active()) return;
          ctx.ui.setStatus(STATUS_KEY, "quality gate: checking the working tree");
          try {
            const current = await fingerprint(pi, ctx.cwd);
            if (!active()) return;
            const root = await repoRoot(pi, ctx.cwd);
            if (active()) reservation.prepared = { current, root };
          } catch (error) {
            if (active()) reservation.prepared = { error };
          } finally {
            ctx.ui.setStatus(STATUS_KEY, undefined);
          }
        }, 0);
        reservation.clearTimer = () => ctx.clearTimer(timer);
      } catch (error) {
        reservation.prepared = { error };
      }
      await waitWhile(() => gateJob === reservation && !reservation.prepared, deadline, event.signal);
      if (gateJob !== reservation || !reservation.prepared) return { decision: "block" as const, reason: GATE_PREPARING_REASON };
    }
    const phaseRuns = cycle.phaseGateRuns.length;
    if ("error" in reservation.prepared) {
      const report = gateFailure(reservation.prepared.error);
      const run: GateRunData = { markerId: marker.id, id: reservation.id, status: report.status, fingerprint: null, report };
      try {
        pi.appendEntry(GATE_RUN_ENTRY, run satisfies GateRunData);
        gateJob = null;
      } catch (persistError) {
        reservation.failure = `[quality-gate] Could not save the failed gate run: ${String(persistError)}. Completion is blocked.`;
        return { decision: "block" as const, reason: reservation.failure };
      }
      return gateReportBlock(run, phaseRuns + 1, null);
    }
    const { current, root } = reservation.prepared;

    const capped = latest.filter((run) => run.run >= MAX_REVIEW_RUNS && (verdictFor(cycle, run)?.agreed.length ?? 0) > 0);
    if (capped.length > 0) {
      gateJob = null;
      finalize(marker.id, "review-cap-reached", cycle, ctx);
      const changedAfterFinalRun = capped.some((run) => run.fingerprint !== current);
      return changedAfterFinalRun ? { decision: "block" as const, reason: REVIEW_CAP_REASON } : undefined;
    }

    const lastGate = cycle.gateRuns.at(-1);
    const gateStale = !lastGate || cycle.unfinishedGateStart || lastGate.fingerprint !== current || (root !== null && current === null);
    if (gateStale && phaseRuns >= MAX_GATE_RUNS) {
      gateJob = null;
      finalize(marker.id, "cap-reached", cycle, ctx);
      return { decision: "block" as const, reason: CAP_REASON };
    }
    if (gateStale) {
      if (root === null) {
        const report: GateReport = {
          status: "findings",
          summary: "not a git repository",
          steps: [],
          blockers: [],
          findings: [{ step: "setup", detail: "Not a git repository; changed files cannot be determined, so no checks ran." }],
          environment: [],
          filesChangedByGate: [],
          durationMs: 0,
        };
        const run: GateRunData = { markerId: marker.id, id: reservation.id, status: report.status, fingerprint: null, report };
        try {
          pi.appendEntry(GATE_RUN_ENTRY, run satisfies GateRunData);
        } catch (error) {
          reservation.failure = `[quality-gate] Could not save the gate report: ${String(error)}. Completion is blocked.`;
          return { decision: "block" as const, reason: reservation.failure };
        }
        gateJob = null;
        cycle.gateRuns.push(run);
        cycle.phaseGateRuns.push(run);
        finalize(marker.id, "findings", cycle, ctx);
        return;
      }

      try {
        pi.appendEntry(GATE_START_ENTRY, { markerId: marker.id, id: reservation.id } satisfies GateStartData);
      } catch (error) {
        reservation.failure = `[quality-gate] Could not record the quality-gate start: ${String(error)}. Completion is blocked.`;
        return { decision: "block" as const, reason: reservation.failure };
      }
      try {
        reservation.running = true;
        const timer = ctx.setTimeout(async () => {
          reservation.clearTimer = undefined;
          if (!active()) return;
          const n = phaseRuns + 1;
          const progress = gateProgress(ctx, n, root);
          let report: GateReport;
          try {
            ctx.ui.notify(`Quality gate: run ${n}/${MAX_GATE_RUNS}`, "info");
            await warnIfStale(ctx);
            report = await runGate(progress.exec, root, marker.timestamp, reservation.controller.signal);
          } catch (error) {
            report = gateFailure(error);
          } finally {
            progress.stop();
          }
          if (!active()) return;
          let post: string | null;
          try {
            post = await fingerprint(pi, ctx.cwd);
          } catch (error) {
            post = null;
            report = gateFailure(error);
          }
          if (!active()) return;
          if (post === null && report.status !== "findings") report = gateFailure(new Error("Could not verify the files after the quality gate"));
          const run: GateRunData = { markerId: marker.id, id: reservation.id, status: report.status, fingerprint: post, report };
          pi.logger.debug("quality-gate.gate-run", { runId: run.id, run: n, status: report.status, summary: report.summary, durationMs: report.durationMs });
          ctx.ui.notify(`Quality gate run ${n}/${MAX_GATE_RUNS}: ${report.status} (${report.summary}; ${seconds(report.durationMs)})`, report.status === "pass" || report.status === "skipped" ? "info" : "warning");
          try {
            pi.appendEntry(GATE_RUN_ENTRY, run satisfies GateRunData);
            gateJob = null;
          } catch (error) {
            reservation.failure = `[quality-gate] Could not save the gate report: ${String(error)}. Completion is blocked.`;
          }
        }, 0);
        reservation.clearTimer = () => ctx.clearTimer(timer);
      } catch (error) {
        reservation.running = false;
        const report = gateFailure(error);
        const run: GateRunData = { markerId: marker.id, id: reservation.id, status: report.status, fingerprint: current, report };
        try {
          pi.appendEntry(GATE_RUN_ENTRY, run satisfies GateRunData);
          gateJob = null;
        } catch (persistError) {
          reservation.failure = `[quality-gate] Could not save the failed gate run: ${String(persistError)}. Completion is blocked.`;
          return { decision: "block" as const, reason: reservation.failure };
        }
        nudged.add(run.id);
        return gateReportBlock(run, phaseRuns + 1, root);
      }
      return { decision: "block" as const, reason: GATE_RUNNING_REASON };
    }
    gateJob = null;
    if (lastGate?.status === "blocked") {
      if (!nudged.has(lastGate.id)) {
        nudged.add(lastGate.id);
        return gateReportBlock(lastGate, phaseRuns, root);
      }
      finalize(marker.id, "blocked", cycle, ctx);
      return;
    } else if (lastGate?.status === "findings" && !nudged.has(lastGate.id)) {
      nudged.add(lastGate.id);
      return gateReportBlock(lastGate, phaseRuns, root);
    }
    if (!lastGate) return;

    const scope = await scopeOrBlock({ anchorId: marker.id, key: `${marker.id}|${String(current)}`, root: current === null ? null : root, mode: "diff" }, request, call);
    if ("decision" in scope) return scope;
    if (scope.files.length === 0) {
      finalize(marker.id, lastGate.status, cycle, ctx);
      return;
    }

    const unimplemented = latest.filter((run) => (verdictFor(cycle, run)?.agreed.length ?? 0) > 0 && run.fingerprint === current);
    if (unimplemented.length > 0) {
      const nudgeKey = `${marker.id}:agreed:${cycle.verdicts.length}`;
      if (!nudged.has(nudgeKey)) {
        nudged.add(nudgeKey);
        return { decision: "block" as const, reason: AGREED_REASON(unimplemented) };
      }
      finalize(marker.id, "review-blocked", cycle, ctx);
      return;
    }

    const due: ReviewItem[] = [];
    for (const agent of REVIEW_AGENTS) {
      const run = latest.find((entry) => entry.agent === agent);
      const needsRun = !run || run.status === "error" || (verdictFor(cycle, run)?.agreed.length ?? 0) > 0;
      if (!needsRun || (agent === "code-review" && !run && scope.code.length === 0)) continue;
      if (run && run.run >= MAX_REVIEW_RUNS) {
        finalize(marker.id, "review-error", cycle, ctx);
        return { decision: "block" as const, reason: REVIEW_ERROR_REASON(run) };
      }
      due.push(reviewItem(agent, run, scope, cycle));
    }
    if (due.length > 0) {
      const labels = due.map((item) => `${item.agent} ${item.run}/${MAX_REVIEW_RUNS}`);
      return request(`${marker.id}:review:${cycle.reviewRuns.length}`, `Reviews requested: ${labels.join(", ")}`, REVIEW_REQUEST(due, { id: marker.id, mode: "diff", root: scope.root }), "review-not-run", REVIEW_NOT_RUN_REASON(labels));
    }

    const anyDismissed = latest.some((run) => run.status === "fail");
    finalize(marker.id, anyDismissed ? "reviews-dismissed" : "reviews-passed", cycle, ctx);
  }
}
