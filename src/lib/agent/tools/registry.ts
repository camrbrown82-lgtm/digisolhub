import type {
  AgentTaskKind,
  AgentToolDefinition,
  AgentToolContext,
} from "@/lib/agent/types";
import { AgentError } from "@/lib/agent/errors";
import type { ChatCompletionTool } from "openai/resources/chat/completions";

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
    const result = await tool.execute(args, ctx);
    return { name, arguments: args, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool execution failed";
    // Return a structured failure to the model instead of aborting the whole run
    // when the tool itself fails (e.g. empty DB). Unknown tools still throw above.
    return {
      name,
      arguments: args,
      result: { ok: false, error: message },
    };
  }
}
