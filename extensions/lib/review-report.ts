import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formatRanges, overlapsChanges, SKILLS_DIR, type LineRange, type ReviewScope } from "./review-scope.ts";
import type { Suppression } from "./review-suppressions.ts";
import { loadKbSkills } from "./skills.ts";

export type ReviewStatus = "pass" | "fail" | "skipped" | "error";
export type Finding = { id: string; file: string; line: number; rule: string };
type SuppressedFinding = Finding & { reason: string };
type ReportData = { status?: unknown; summary?: unknown; findings?: unknown };
export type ReportSource = { exitCode?: number; aborted?: unknown; structuredOutput?: { data?: ReportData } };
export type ReviewReport = { status: ReviewStatus; findings: Finding[]; suppressed: SuppressedFinding[]; problem: string | null };
export type AllowedReport = { changed: Map<string, LineRange[]>; kb: Map<string, string[]>; dismissed: Finding[]; suppressions: Suppression[] };
type Reported = Finding & { kb: string };

const REPORT_STATUSES = ["pass", "fail", "skipped"];
const REPORTED_TEXT_FIELDS = ["id", "file", "kb", "rule"];
const NOTHING_IN_SCOPE = "Nothing in scope.";

export function allowedReport(scope: ReviewScope, agent: string, verdicts: Array<{ agent: string; dismissed: Finding[] }>, suppressions: Suppression[]): AllowedReport {
  const names = agent === "code-review" ? scope.code : scope.entropy;
  const sources: Array<[string, string]> = [];
  for (const skill of loadKbSkills(SKILLS_DIR).skills.filter((item) => names.includes(item.name))) {
    sources.push([`skill://${skill.name}`, join(skill.dir, "SKILL.md")]);
    for (const topic of skill.topics) sources.push([`skill://${skill.name}/${topic.file}`, join(skill.dir, topic.file)]);
  }
  return {
    changed: new Map(scope.files.map((file) => [file.path, file.ranges])),
    kb: new Map(sources.map(([uri, file]) => [uri, readFileSync(file, "utf8").split(/\r?\n/)])),
    dismissed: verdicts.filter((verdict) => verdict.agent === agent).flatMap((verdict) => verdict.dismissed),
    suppressions: suppressions.filter((entry) => entry.agent === agent),
  };
}

function isReported(value: unknown): value is Reported {
  const item: Record<string, unknown> = Object(value);
  return Number.isInteger(item.line) && REPORTED_TEXT_FIELDS.every((field) => typeof item[field] === "string");
}

function readProblem(source: ReportSource, data: ReportData): string | null {
  const checks: Array<[boolean, string]> = [
    [source.exitCode !== 0 || Boolean(source.aborted), "the review agent did not finish cleanly"],
    [!REPORT_STATUSES.includes(String(data.status)), `status ${String(data.status)} is not pass, fail, or skipped`],
    [!Array.isArray(data.findings) || !data.findings.every(isReported), "findings are missing or lack id, file, integer line, kb, or rule"],
  ];
  return checks.find(([failed]) => failed)?.[1] ?? null;
}

function consistencyProblem(data: ReportData, status: string, findings: Reported[], changed: Map<string, LineRange[]>): string | null {
  if ((status === "fail") !== (findings.length > 0)) return `status ${status} contradicts ${findings.length} findings`;
  if (status === "skipped" && data.summary === NOTHING_IN_SCOPE && changed.size > 0) return `the report says nothing is in scope, but the gate's review scope has ${changed.size} files; the reviewer likely never received the review briefing`;
  return new Set(findings.map((finding) => finding.id)).size === findings.length ? null : "finding ids repeat";
}

function locationProblem(finding: Reported, changed: Map<string, LineRange[]>): string | null {
  const ranges = changed.get(finding.file) ?? [];
  if (overlapsChanges(ranges, finding.line, finding.line)) return null;
  return `${finding.id}: ${finding.file}:${finding.line} is outside the review scope (in scope: ${formatRanges(ranges) || "none"})`;
}

function citationProblem(finding: Reported, kb: Map<string, string[]>): string | null {
  const lines = kb.get(finding.kb);
  const rule = finding.rule.trim();
  if (lines === undefined) return `${finding.id}: ${finding.kb} is not a knowledge base this review may cite`;
  if (rule !== "" && lines.some((line) => line.includes(rule))) return null;
  return `${finding.id}: rule is not verbatim text from one line of ${finding.kb}`;
}

function validationProblem(source: ReportSource, data: ReportData, status: string, findings: Reported[], allowed: AllowedReport): string | null {
  const problem = readProblem(source, data);
  if (problem !== null) return problem;
  const consistency = consistencyProblem(data, status, findings, allowed.changed);
  if (consistency !== null) return consistency;
  const candidates = findings.flatMap((finding) => [locationProblem(finding, allowed.changed), citationProblem(finding, allowed.kb)]);
  const problems = candidates.filter((candidate) => candidate !== null);
  return problems.length > 0 ? problems.join("; ") : null;
}

function matchesRule(finding: Reported, entry: { file: string; rule: string }): boolean {
  const rule = finding.rule.trim();
  return entry.file === finding.file && (entry.rule.includes(rule) || rule.includes(entry.rule.trim()));
}

function partitionFindings(findings: Reported[], allowed: AllowedReport): { kept: Finding[]; suppressed: SuppressedFinding[] } {
  const kept: Finding[] = [];
  const suppressed: SuppressedFinding[] = [];
  for (const finding of findings) {
    if (allowed.dismissed.some((entry) => matchesRule(finding, entry))) continue;
    const { id, file, line, rule } = finding;
    const suppression = allowed.suppressions.find((entry) => matchesRule(finding, entry));
    if (suppression) suppressed.push({ id, file, line, rule, reason: suppression.reason });
    else kept.push({ id, file, line, rule });
  }
  return { kept, suppressed };
}

export function reviewReport(source: ReportSource, allowed: AllowedReport): ReviewReport {
  const data: ReportData = Object(source.structuredOutput?.data);
  const status = String(data.status);
  const findings = data.findings as Reported[];
  const problem = validationProblem(source, data, status, findings, allowed);
  if (problem !== null) return { status: "error", findings: [], suppressed: [], problem };
  const { kept, suppressed } = partitionFindings(findings, allowed);
  if (kept.length > 0) return { status: "fail", findings: kept, suppressed, problem: null };
  if (status === "skipped") return { status: "skipped", findings: kept, suppressed, problem: null };
  return { status: "pass", findings: kept, suppressed, problem: null };
}
