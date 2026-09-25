import { createHash } from "node:crypto";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

const GATE_AGENT = "quality-gate";
const MAX_GATE_RUNS = 3;
const MAX_UNANSWERED_REQUESTS = 2;
const GATE_RUN_ENTRY = "jpollock.quality-gate.run";
const FINAL_ENTRY = "jpollock.quality-gate.final";
const MUTATING_TOOLS = ["edit", "write", "ast_edit", "apply_patch", "bash", "eval", "task"];
const REVIEW_RUN_ENTRY = "jpollock.quality-gate.review-run";
const VERDICT_ENTRY = "jpollock.quality-gate.verdict";
const REVIEW_AGENTS: readonly ReviewAgent[] = ["entropy-review", "code-review"];
const CYCLE_AGENTS: readonly string[] = [GATE_AGENT, ...REVIEW_AGENTS];
const MAX_REVIEW_RUNS = 5;

type BranchEntry = {
  type: string;
  id: string;
  timestamp: string;
  message?: {
    role?: string;
    synthetic?: boolean;
    content?: unknown;
  };
  customType?: string;
  data?: Record<string, unknown>;
  mode?: string;
};

type PlanMarker = {
  id: string;
  timestamp: string;
  index: number;
};

type FinalOutcome = "pass" | "skipped" | "findings" | "blocked" | "cap-reached" | "gate-not-run" | "gate-error" | "reviews-passed" | "reviews-dismissed" | "review-cap-reached" | "review-blocked" | "review-not-run" | "verdict-missing" | "review-error";

type GateStatus = "pass" | "findings" | "blocked" | "skipped" | "error";

type GateRunData = {
  markerId: string;
  toolCallId: string;
  status: GateStatus;
  fingerprint: string | null;
};
type ReviewAgent = "entropy-review" | "code-review";

type ReviewStatus = "pass" | "fail" | "skipped" | "error";

type Finding = { id: string; file: string; line: number; rule: string };

type ReviewRunData = {
  markerId: string;
  toolCallId: string;
  agent: ReviewAgent;
  run: number;
  status: ReviewStatus;
  findings: Finding[];
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

type ReviewItem = { agent: ReviewAgent; run: number; dismissed: string };

type CycleState = {
  gateRuns: GateRunData[];
  phaseGateRuns: GateRunData[];
  reviewRuns: ReviewRunData[];
  verdicts: VerdictData[];
  finalized: boolean;
};

type TaskResult = {
  agent?: string;
  exitCode?: number;
  aborted?: unknown;
  structuredOutput?: { data?: { status?: unknown; findings?: unknown } };
};
type GateContext = {
  ui: {
    notify(message: string, type?: "info" | "warning" | "error"): void;
  };
};

const FINAL_NOTICES: Record<FinalOutcome, { message: string; level: "info" | "warning" | "error" }> = {
  pass: { message: "Quality gate passed; no unstaged changes to review", level: "info" },
  skipped: { message: "Quality gate skipped; no unstaged changes to review", level: "info" },
  findings: { message: "Quality gate finished with findings; no unstaged changes to review", level: "warning" },
  blocked: { message: "Quality gate blockers reported to the user", level: "warning" },
  "cap-reached": { message: "Quality gate run cap reached", level: "warning" },
  "gate-not-run": { message: "Quality gate was requested but never ran", level: "warning" },
  "gate-error": { message: "Quality gate produced no readable report", level: "error" },
  "reviews-passed": { message: "Reviews passed", level: "info" },
  "reviews-dismissed": { message: "Reviews finished; remaining findings disagreed", level: "info" },
  "review-cap-reached": { message: "Review run cap reached; blockers reported to the user", level: "warning" },
  "review-blocked": { message: "Agreed review findings reported to the user as blockers", level: "warning" },
  "review-not-run": { message: "Reviews were requested but never ran", level: "warning" },
  "verdict-missing": { message: "Review findings never received a verdict", level: "warning" },
  "review-error": { message: "A review agent produced no readable report", level: "error" },
};

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  let text = "";
  for (const block of content) {
    if (block && typeof block === "object" && "type" in block && block.type === "text" && "text" in block) {
      const value = block.text;
      if (typeof value === "string") text += value;
    }
  }
  return text;
}

function findPlanMarker(branch: BranchEntry[]): PlanMarker | null {
  for (let index = branch.length - 1; index >= 0; index--) {
    const entry = branch[index];
    if (entry.type === "reset_boundary") return null;

    if (
      entry.type === "message" &&
      entry.message?.role === "developer" &&
      entry.message.synthetic === true
    ) {
      const text = textOf(entry.message.content);
      if (text.includes("Plan approved.") && text.includes('<plan path="')) {
        return { id: entry.id, timestamp: entry.timestamp, index };
      }
    }

    if (entry.type === "custom_message" && entry.customType === "plan-yolo-handoff") {
      return { id: entry.id, timestamp: entry.timestamp, index };
    }
  }
  return null;
}

function readCycle(after: BranchEntry[], markerId: string): CycleState {
  const cycle: CycleState = { gateRuns: [], phaseGateRuns: [], reviewRuns: [], verdicts: [], finalized: false };
  for (const entry of after) {
    if (entry.type !== "custom" || entry.data?.markerId !== markerId) continue;
    if (entry.customType === GATE_RUN_ENTRY) {
      const run = entry.data as unknown as GateRunData;
      cycle.gateRuns.push(run);
      cycle.phaseGateRuns.push(run);
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

function reviewReportOf(result: TaskResult): { status: ReviewStatus; findings: Finding[] } {
  const unreadable = { status: "error" as const, findings: [] };
  const status = result.structuredOutput?.data?.status;
  const reported = result.structuredOutput?.data?.findings;
  const knownStatus = status === "pass" || status === "fail" || status === "skipped";
  if (result.exitCode !== 0 || result.aborted || !knownStatus || !Array.isArray(reported)) return unreadable;

  const findings: Finding[] = [];
  const ids = new Set<string>();
  for (const item of reported) {
    const { id, file, line, rule } = (item ?? {}) as Record<string, unknown>;
    if (typeof id !== "string" || typeof file !== "string" || typeof line !== "number" || typeof rule !== "string") return unreadable;
    findings.push({ id, file, line, rule });
    ids.add(id);
  }
  if (ids.size !== findings.length || (status === "fail") !== (findings.length > 0)) return unreadable;
  return { status, findings };
}

function planModeActive(after: BranchEntry[]): boolean {
  for (let index = after.length - 1; index >= 0; index--) {
    const entry = after[index];
    if (entry.type === "mode_change") return entry.mode === "plan";
  }
  return false;
}

function isCycleTask(args: unknown): boolean {
  if (!args || typeof args !== "object") return false;
  const value = args as { agent?: unknown; tasks?: unknown };
  if (!Array.isArray(value.tasks)) return typeof value.agent === "string" && CYCLE_AGENTS.includes(value.agent);
  return value.tasks.length > 0 && value.tasks.every((task) =>
    task !== null && typeof task === "object" && "agent" in task && typeof task.agent === "string" && CYCLE_AGENTS.includes(task.agent),
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

async function repoRoot(pi: ExtensionAPI, cwd: string): Promise<string | null> {
  const result = await pi.exec("git", ["rev-parse", "--show-toplevel"], { cwd, timeout: 15_000 });
  return result.code === 0 ? result.stdout.trim() : null;
}

async function hasUnstagedChanges(pi: ExtensionAPI, root: string): Promise<boolean> {
  const [diff, untracked] = await Promise.all([
    pi.exec("git", ["diff", "--quiet"], { cwd: root }),
    pi.exec("git", ["ls-files", "--others", "--exclude-standard"], { cwd: root }),
  ]);
  return diff.code === 1 || (untracked.code === 0 && untracked.stdout.trim() !== "");
}

async function fingerprint(pi: ExtensionAPI, cwd: string): Promise<string | null> {
  const root = await repoRoot(pi, cwd);
  if (root === null) return null;

  const [status, head] = await Promise.all([
    pi.exec("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], { cwd: root }),
    pi.exec("git", ["rev-parse", "HEAD"], { cwd: root }),
  ]);
  if (status.code !== 0 || head.code !== 0) return null;

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

function RUN_REQUEST(n: number, prefix: string, root: string, timestamp: string): string {
  return `[quality-gate] ${prefix}Before finishing this approved plan, run the post-implementation quality gate (run ${n} of 3).\nCall the \`task\` tool once with context "Post-implementation quality gate for an approved plan." and a single item: agent "quality-gate", task "Run the quality gate. repo_root: ${root}. plan_started_at: ${timestamp}. gate_run: ${n}." The gate is blocking; wait for its report, then act on it:\n- pass or skipped: finish with a short summary that includes the gate's summary line.\n- blockers of kind "ci" (ruff, ty, pytest): CI blockers that can never be ignored. Fix them and run the gate again. If one cannot be fixed within this plan, end your turn with an explicit BLOCKED report to the user giving the failing command and error.\n- blockers of kind "config" (no SQLFluff dialect): either add a .sqlfluff (dialect = tsql or databricks) and run the gate again, or report the missing config to the user as a blocker.\n- findings (terraform, sqlfluff lint, biome, rumdl, yamllint, unavailable tools): your call; fix what matters or list them in your summary.\nNever silence tools with suppressions or config changes unless the plan calls for it.`;
}

function BLOCKED_REASON(k: number): string {
  const base = "[quality-gate] The latest quality-gate run reported blockers and no files have changed since. CI blockers (ruff, ty, pytest) can never be ignored.";
  if (k < MAX_GATE_RUNS) {
    return `${base} Fix them and run the gate again (run ${k + 1} of 3), or, if they cannot be fixed within this plan, end your turn with an explicit BLOCKED report to the user listing each blocker, its command, and its error.`;
  }
  return `${base} The gate run cap is reached; end your turn with an explicit BLOCKED report to the user listing each blocker, its command, and its error.`;
}

const CAP_REASON = "[quality-gate] Files changed after the final quality-gate run (3 of 3). Do not run the gate again. End your turn with a summary stating the gate did not re-run after the last changes, listing any unresolved blockers and findings from the last report.";

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

function REVIEW_REQUEST(items: ReviewItem[], root: string): string {
  const taskLines: string[] = [];
  for (const item of items) {
    taskLines.push(`- agent "${item.agent}", task "Review the unstaged changes. repo_root: ${root}. review_run: ${item.run} of ${MAX_REVIEW_RUNS}. dismissed: ${item.dismissed}."`);
  }
  const itemWord = items.length === 1 ? "this item" : "these items";
  return `[plan-review] The quality gate has settled. Before finishing this approved plan, review the unstaged changes.\nCall the \`task\` tool once with context "Post-implementation review of the unstaged changes for an approved plan." and ${itemWord}:\n${taskLines.join("\n")}\nThe review agents are blocking; wait for every report, then act on each:\n- pass or skipped: nothing to do.\n- fail: judge every finding on its merits against the plan and the code, then call \`review_verdict\` once for that report with its agent, its run number, and one decision { id, verdict: "agree" or "disagree", reason } per finding id. Record every verdict before editing files.\n- After the verdicts, implement every agreed finding unless the \`review_verdict\` reply says the review cap is reached, then end your turn: the quality gate re-runs, then only the agents whose findings you agreed with.\n- Suggestions are informational and need no verdict.\nIf you agreed with no finding in these reports, finish with a short summary that includes each report's summary line and every finding you disagreed with in this plan's reviews, with its reason.`;
}

function VERDICT_REQUEST(pending: ReviewRunData[]): string {
  return `[plan-review] Review findings await your verdict: ${runLabels(pending)}. Judge every finding on its merits and call \`review_verdict\` once per listed report, with one decision per finding id, before finishing.`;
}

function AGREED_REASON(unimplemented: ReviewRunData[]): string {
  return `[plan-review] You agreed with findings from ${runLabels(unimplemented)} but no files have changed since. Implement them and end your turn so the quality gate and those reviews re-run, or, if they cannot be implemented within this plan, end your turn with an explicit BLOCKED report to the user listing each agreed finding (agent, id, file:line, rule, fix).`;
}

const REVIEW_CAP_REASON = `[plan-review] Files changed after a final review run (${MAX_REVIEW_RUNS} of ${MAX_REVIEW_RUNS}) whose findings you agreed with. Do not run the gate or the reviews again. End your turn with an explicit BLOCKED report to the user listing each agreed finding from that run (agent, id, file:line, rule, fix) and stating that changes made after it were not re-checked.`;

function VERDICT_REPLY(agent: ReviewAgent, run: number, agreed: string[], disagreed: number): string {
  if (agreed.length === 0) return `[plan-review] Recorded ${agent} run ${run}: all ${disagreed} findings disagreed. Nothing to implement for this agent.`;
  if (run >= MAX_REVIEW_RUNS) return `[plan-review] Recorded ${agent} run ${run} of ${MAX_REVIEW_RUNS}: agreed ${agreed.join(", ")}. The review cap is reached: do not implement them. End your turn with an explicit BLOCKED report to the user listing each agreed finding (agent, id, file:line, rule, fix).`;
  return `[plan-review] Recorded ${agent} run ${run}: agreed ${agreed.join(", ")}; disagreed ${disagreed}. Once every failing report has a verdict, implement the agreed findings and end your turn; the quality gate re-runs, then ${agent}.`;
}

export default function qualityGate(pi: ExtensionAPI): void {
  const requests = new Map<string, number>();
  const nudged = new Set<string>();

  function finalize(markerId: string, outcome: FinalOutcome, cycle: CycleState, ctx: GateContext): void {
    pi.appendEntry(FINAL_ENTRY, { markerId, outcome, gateRuns: cycle.gateRuns.length, reviewRuns: cycle.reviewRuns.length });
    const notice = FINAL_NOTICES[outcome];
    ctx.ui.notify(notice.message, notice.level);
  }

  pi.registerTool({
    name: "review_verdict",
    label: "Review Verdict",
    description: "Record your agree/disagree decision on every finding of a failing entropy-review or code-review report during an approved plan's post-implementation review cycle. Call once per failing report.",
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
      const marker = findPlanMarker(branch);
      if (!marker) throw new Error("No approved plan cycle is active in this session.");
      const cycle = readCycle(branch.slice(marker.index + 1), marker.id);
      if (cycle.finalized) throw new Error("The review cycle for this plan has already finished.");
      const latest = cycle.reviewRuns.findLast((entry) => entry.agent === agent);
      if (!latest) throw new Error(`No ${agent} review run has been recorded for this plan.`);
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

      pi.appendEntry(VERDICT_ENTRY, { markerId: marker.id, agent, run, agreed, dismissed } satisfies VerdictData);
      const dismissedIds = dismissed.map((finding) => finding.id);
      return {
        content: [{ type: "text", text: VERDICT_REPLY(agent, run, agreed, dismissed.length) }],
        details: { agent, run, agreed, dismissed: dismissedIds },
      };
    },
  });

  pi.on("tool_result", async (event, ctx) => {
    if (event.toolName !== "task") return;

    const details = event.details as { results?: unknown[]; async?: { state: string } } | undefined;
    if (details?.async?.state === "running" || !Array.isArray(details?.results)) return;

    const results = details.results as TaskResult[];
    const gateResult = results.findLast((result) => result.agent === GATE_AGENT);
    const reviewResults = results.filter((result) => REVIEW_AGENTS.includes(result.agent as ReviewAgent));
    if (!gateResult && reviewResults.length === 0) return;

    const branch = ctx.sessionManager.getBranch() as unknown as BranchEntry[];
    const marker = findPlanMarker(branch);
    if (!marker) return;

    const snapshot = await fingerprint(pi, ctx.cwd);
    if (gateResult) {
      const reportedStatus = gateResult.structuredOutput?.data?.status;
      const status: GateStatus =
        (reportedStatus === "pass" || reportedStatus === "findings" || reportedStatus === "blocked" || reportedStatus === "skipped") &&
        gateResult.exitCode === 0 &&
        !gateResult.aborted
          ? reportedStatus
          : "error";
      pi.appendEntry(GATE_RUN_ENTRY, { markerId: marker.id, toolCallId: event.toolCallId, status, fingerprint: snapshot } satisfies GateRunData);
    }

    if (reviewResults.length > 0) {
      const cycle = readCycle(branch.slice(marker.index + 1), marker.id);
      const runCounts = new Map<ReviewAgent, number>();
      for (const run of cycle.reviewRuns) runCounts.set(run.agent, run.run);
      for (const result of reviewResults) {
        const agent = result.agent as ReviewAgent;
        const run = (runCounts.get(agent) ?? 0) + 1;
        runCounts.set(agent, run);
        const report = reviewReportOf(result);
        pi.appendEntry(REVIEW_RUN_ENTRY, {
          markerId: marker.id,
          toolCallId: event.toolCallId,
          agent,
          run,
          status: report.status,
          findings: report.findings,
          fingerprint: snapshot,
        } satisfies ReviewRunData);
      }
    }
    return undefined;
  });

  pi.on("session_stop", async (event, ctx) => {
    const branch = ctx.sessionManager.getBranch() as unknown as BranchEntry[];
    const marker = findPlanMarker(branch);
    if (event.signal.aborted || !marker) return;

    const after = branch.slice(marker.index + 1);
    if (planModeActive(after)) return;
    const cycle = readCycle(after, marker.id);
    if (cycle.finalized) return;
    if (cycle.gateRuns.length === 0 && cycle.reviewRuns.length === 0 && !didWorkSince(after)) return;

    const request = (key: string, notice: string, reason: string, unanswered: FinalOutcome) => {
      const count = requests.get(key) ?? 0;
      if (count >= MAX_UNANSWERED_REQUESTS) {
        finalize(marker.id, unanswered, cycle, ctx);
        return undefined;
      }
      requests.set(key, count + 1);
      ctx.ui.notify(notice, "info");
      return { decision: "block" as const, reason };
    };
    const verdictFor = (run: ReviewRunData) =>
      cycle.verdicts.find((verdict) => verdict.agent === run.agent && verdict.run === run.run);
    const latest: ReviewRunData[] = [];
    for (const agent of REVIEW_AGENTS) {
      const run = cycle.reviewRuns.findLast((entry) => entry.agent === agent);
      if (run) latest.push(run);
    }

    const pending = latest.filter((run) => run.status === "fail" && !verdictFor(run));
    if (pending.length > 0) {
      return request(`${marker.id}:verdict:${cycle.reviewRuns.length}:${cycle.verdicts.length}`, "Review verdicts requested", VERDICT_REQUEST(pending), "verdict-missing");
    }

    const current = await fingerprint(pi, ctx.cwd);
    const capped = latest.filter((run) => run.run >= MAX_REVIEW_RUNS && (verdictFor(run)?.agreed.length ?? 0) > 0);
    if (capped.length > 0) {
      finalize(marker.id, "review-cap-reached", cycle, ctx);
      const changedAfterFinalRun = capped.some((run) => run.fingerprint !== current);
      return changedAfterFinalRun ? { decision: "block" as const, reason: REVIEW_CAP_REASON } : undefined;
    }

    const root = await repoRoot(pi, ctx.cwd);
    const lastGate = cycle.gateRuns.at(-1);
    const phaseRuns = cycle.phaseGateRuns.length;
    const gateStale = !lastGate || (lastGate.fingerprint !== null && lastGate.fingerprint !== current);
    const requestGate = (prefix: string) =>
      request(`${marker.id}:gate:${cycle.gateRuns.length}`, `Quality gate: run ${phaseRuns + 1}/${MAX_GATE_RUNS} requested`, RUN_REQUEST(phaseRuns + 1, prefix, root ?? "none", marker.timestamp), "gate-not-run");

    if (gateStale && phaseRuns >= MAX_GATE_RUNS) {
      finalize(marker.id, "cap-reached", cycle, ctx);
      return { decision: "block" as const, reason: CAP_REASON };
    }
    if (!lastGate) return requestGate("");
    if (gateStale) return requestGate(phaseRuns > 0 ? `Files changed after gate run ${phaseRuns}. ` : "Files changed after the reviews. ");
    if (lastGate.status === "blocked") {
      if (!nudged.has(lastGate.toolCallId)) {
        nudged.add(lastGate.toolCallId);
        return { decision: "block" as const, reason: BLOCKED_REASON(phaseRuns) };
      }
      finalize(marker.id, "blocked", cycle, ctx);
      return;
    }
    if (lastGate.status === "error") {
      if (phaseRuns >= MAX_GATE_RUNS) {
        finalize(marker.id, "gate-error", cycle, ctx);
        return;
      }
      return requestGate("The previous gate run returned no readable report. ");
    }

    if (root === null || current === null || !(await hasUnstagedChanges(pi, root))) {
      finalize(marker.id, lastGate.status, cycle, ctx);
      return;
    }

    const unimplemented = latest.filter((run) => (verdictFor(run)?.agreed.length ?? 0) > 0 && run.fingerprint === current);
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
      const needsRun = !run || run.status === "error" || (verdictFor(run)?.agreed.length ?? 0) > 0;
      if (!needsRun) continue;
      if (run && run.run >= MAX_REVIEW_RUNS) {
        finalize(marker.id, "review-error", cycle, ctx);
        return;
      }
      due.push({ agent, run: (run?.run ?? 0) + 1, dismissed: dismissedFor(cycle, agent) });
    }
    if (due.length > 0) {
      const labels = due.map((item) => `${item.agent} ${item.run}/${MAX_REVIEW_RUNS}`);
      return request(`${marker.id}:review:${cycle.reviewRuns.length}`, `Reviews requested: ${labels.join(", ")}`, REVIEW_REQUEST(due, root), "review-not-run");
    }

    const anyDismissed = latest.some((run) => run.status === "fail");
    finalize(marker.id, anyDismissed ? "reviews-dismissed" : "reviews-passed", cycle, ctx);
  });
}
