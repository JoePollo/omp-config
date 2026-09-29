export type BranchEntry = {
  type: string;
  id: string;
  timestamp: string;
  message?: {
    role?: string;
    synthetic?: boolean;
    content?: unknown;
    toolCallId?: string;
    toolName?: string;
    isError?: boolean;
    details?: unknown;
  };
  customType?: string;
  data?: Record<string, unknown>;
  details?: Record<string, unknown>;
  firstKeptEntryId?: string;
  task?: unknown;
  agent?: string;
  mode?: string;
};

type PlanMarker = {
  id: string;
  timestamp: string;
  index: number;
};

export type Exec = (command: string, args: string[], options: { cwd: string; timeout?: number; signal?: AbortSignal }) => Promise<{ stdout: string; stderr: string; code: number; killed?: boolean }>;

export function execBudget(deadline: number, capMs: number): number {
  return Math.max(1, Math.min(capMs, deadline - Date.now()));
}

export function textOf(content: unknown): string {
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

export function latestMode(entries: readonly BranchEntry[]): string {
  for (let index = entries.length - 1; index >= 0; index--) {
    if (entries[index].type === "mode_change") return entries[index].mode ?? "none";
  }
  return "none";
}

export function findPlanMarker(branch: readonly BranchEntry[]): PlanMarker | null {
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

export function isTaskSession(branch: readonly BranchEntry[]): boolean {
  return branch.some((entry) => entry.type === "session_init" && typeof entry.task === "string");
}
