import { setTimeout as sleep } from "node:timers/promises";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { approvalMessage } from "./lib/approval.ts";
import { classifyCommand, classifyManifest, classifyMcpTool, type Verdict } from "./lib/policy.ts";
import { mcpToolName, mutationTargets, recordInput } from "./lib/tool-args.ts";

const INTENT_WAIT_MS = 25;
const INTENT_WAIT_ATTEMPTS = 10;

function classifyTargets(toolName: string, input: Record<string, unknown>): Verdict | null {
  for (const target of mutationTargets(toolName, input)) {
    const policy = classifyManifest(target.path);
    if (policy) return policy;
  }
  return null;
}

function classifyInput(toolName: string, input: Record<string, unknown>): Verdict | null {
  if (toolName === "bash") return typeof input.command === "string" ? classifyCommand(input.command) : null;
  const name = mcpToolName(toolName, input);
  return name !== null ? classifyMcpTool(name) : classifyTargets(toolName, input);
}

async function waitForIntent(intents: ReadonlyMap<string, string>, toolCallId: string): Promise<string | undefined> {
  for (let attempt = 0; attempt < INTENT_WAIT_ATTEMPTS && !intents.has(toolCallId); attempt++) await sleep(INTENT_WAIT_MS);
  return intents.get(toolCallId);
}

export default function policyGuard(pi: ExtensionAPI): void {
  const intents = new Map<string, string>();

  pi.on("message_update", (event) => {
    const update = event.assistantMessageEvent;
    if (update?.type !== "toolcall_end") return;
    const intent = update.toolCall.arguments?.i;
    if (typeof intent === "string") intents.set(update.toolCall.id, intent.trim());
  });

  pi.on("turn_end", () => {
    intents.clear();
  });

  pi.on("tool_call", async (event, ctx) => {
    const input = recordInput(event.input);
    const policy = classifyInput(event.toolName, input);
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
  });
}
