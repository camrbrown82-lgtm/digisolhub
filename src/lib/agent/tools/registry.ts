import type {
  AgentTaskKind,
  AgentToolDefinition,
  AgentToolContext,
} from "@/lib/agent/types";
import { AgentError } from "@/lib/agent/errors";
import {
  checkAgentBudget,
  estimateToolCost,
  recordAgentUsage,
} from "@/lib/agent/budget";
import type { ChatCompletionTool } from "openai/resources/chat/completions";

const HEAVY_TOOLS = new Set([
  "runWebsiteAudit",
  "generateCampaignWorkflow",
  "dispatchAutomatedEmail",
]);

const registry = new Map<string, AgentToolDefinition>();

export function registerAgentTool(tool: AgentToolDefinition) {
  if (registry.has(tool.name)) {
    throw new Error(`Agent tool already registered: ${tool.name}`);
  }
  registry.set(tool.name, tool);
}

export function getAgentTool(name: string) {
  return registry.get(name);
}

export function listAgentTools(task?: AgentTaskKind): AgentToolDefinition[] {
  const all = Array.from(registry.values());
  if (!task) return all;
  return all.filter((tool) => !tool.tasks?.length || tool.tasks.includes(task));
}

export function toOpenAITools(task?: AgentTaskKind): ChatCompletionTool[] {
  return listAgentTools(task).map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

export async function executeAgentTool(
  name: string,
  rawArgs: string,
  ctx: AgentToolContext,
  task: AgentTaskKind,
): Promise<{ name: string; arguments: Record<string, unknown>; result: unknown }> {
  const tool = getAgentTool(name);
  if (!tool) {
    throw new AgentError(`Unknown tool: ${name}`, 400, "unknown_tool");
  }
  if (tool.tasks?.length && !tool.tasks.includes(task)) {
    throw new AgentError(
      `Tool "${name}" is not available for task "${task}"`,
      400,
      "tool_not_allowed",
    );
  }

  let args: Record<string, unknown> = {};
  try {
    args = rawArgs?.trim() ? (JSON.parse(rawArgs) as Record<string, unknown>) : {};
  } catch {
    throw new AgentError(
      `Tool "${name}" received invalid JSON arguments`,
      400,
      "invalid_tool_args",
    );
  }

  try {
    if (HEAVY_TOOLS.has(name)) {
      const confirmSend = args.confirmSend === true;
      if (!(name === "dispatchAutomatedEmail" && !confirmSend)) {
        const emails =
          name === "dispatchAutomatedEmail" && confirmSend
            ? Math.min(
                15,
                Array.isArray(args.contactIds) ? args.contactIds.length || 1 : 1,
              )
            : undefined;
        await checkAgentBudget(
          ctx.clientId,
          estimateToolCost(name, { emails }),
          {
            supabase: ctx.supabase,
            userId: ctx.userId,
            toolName: name,
            invocation: "manual",
            throwOnDeny: true,
          },
        );
      }
    }

    const result = await tool.execute(args, ctx);

    if (HEAVY_TOOLS.has(name)) {
      const confirmSend = args.confirmSend === true;
      if (!(name === "dispatchAutomatedEmail" && !confirmSend)) {
        const emails =
          name === "dispatchAutomatedEmail" && confirmSend
            ? Math.min(
                15,
                Array.isArray(args.contactIds) ? args.contactIds.length || 1 : 1,
              )
            : undefined;
        await recordAgentUsage(
          ctx.clientId,
          { ...estimateToolCost(name, { emails }), toolName: name },
          { supabase: ctx.supabase, userId: ctx.userId, invocation: "manual" },
        );
      }
    }

    return { name, arguments: args, result };
  } catch (err) {
    if (err instanceof AgentError) throw err;
    const message = err instanceof Error ? err.message : "Tool execution failed";
    return {
      name,
      arguments: args,
      result: { ok: false, error: message },
    };
  }
}
