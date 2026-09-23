import type OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
} from "openai/resources/chat/completions";
import { brandKitPrompt } from "@/lib/branding";
import { BRAND_COPY_TEMPERATURE, createOpenAIClient } from "@/lib/openai";
import { AgentError } from "@/lib/agent/errors";
import {
  resolveAgentTask,
  resolveComplexity,
  routeAgentModel,
} from "@/lib/agent/modelRouter";
import { resolveMaxTokens, resolveMaxToolRounds } from "@/lib/agent/tokenCaps";
import {
  ensureBuiltinAgentTools,
  executeAgentTool,
  toOpenAITools,
} from "@/lib/agent/tools";
import type {
  AgentRequestBody,
  AgentRunResult,
  AgentToolContext,
} from "@/lib/agent/types";

function buildSystemPrompt(ctx: AgentToolContext, task: string) {
  const kit = brandKitPrompt(ctx.companyName, ctx.brand, "copy");
  return `You are DigiSol Hub's Master Agent for the Working-on company only.

Task mode: ${task}

## Cross-section architecture
You hop Hub sections by calling tools — never invent CRM, analytics, brand, or send results:
1. Analytics → fetchAnalytics (traffic, drop-offs, email + pipeline health)
2. Branding → getCompanyProfile (voice, tone, doSay/dontSay, colors, logo)
3. Campaigns → generateCampaignWorkflow (audience segment + workflow graph + A/B copy)
4. Integrations → runWebsiteAudit (URL SEO/perf) and dispatchAutomatedEmail (Resend)

Suggested flow for strategy asks: fetchAnalytics → getCompanyProfile → generateCampaignWorkflow → (optional) runWebsiteAudit on the company domain → only then propose dispatchAutomatedEmail.

## Brand lock
${kit}

## Hard rules
- Prefer tools over guesses. If a tool fails, say what is missing.
- Do not invent invoices, prices, legal claims, or another company's branding.
- Never ask to draw a logo; stamp/use the official logo on file.
- Email merge tags only when writing copy: {{name}}, {{company}}, {{logo}}, etc.
- dispatchAutomatedEmail is dry-run unless confirmSend=true. Never set confirmSend=true unless the user clearly asked to send.
- Keep answers concise and operator-actionable.`;
}

function parseRequest(body: AgentRequestBody) {
  const prompt = body.prompt?.trim() || "";
  const history = (body.messages ?? [])
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim(),
    )
    .slice(-12)
    .map((m) => ({
      role: m.role,
      content: m.content.trim(),
    }));

  if (!prompt && history.length === 0) {
    throw new AgentError("Provide a prompt or messages for the agent", 400, "missing_prompt");
  }

  return { prompt, history, context: body.context ?? {} };
}

/**
 * Run a cost-capped agent loop with optional OpenAI tool calls.
 */
export async function runAgent(
  body: AgentRequestBody,
  ctx: AgentToolContext,
): Promise<AgentRunResult> {
  ensureBuiltinAgentTools();

  const { prompt, history, context } = parseRequest(body);
  const task = resolveAgentTask(body.task, prompt || history.at(-1)?.content || "");
  const complexity = resolveComplexity(task, prompt || history.at(-1)?.content || "");
  const model = routeAgentModel(complexity);
  const maxTokens = resolveMaxTokens(task, complexity);
  const maxToolRounds = resolveMaxToolRounds(body.maxToolRounds);

  const openai = createOpenAIClient();
  const tools = toOpenAITools(task);

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt(ctx, task) },
    ...history,
  ];

  if (prompt) {
    const contextBlock =
      Object.keys(context).length > 0
        ? `\n\nClient context (JSON):\n${JSON.stringify(context).slice(0, 4000)}`
        : "";
    messages.push({
      role: "user",
      content: `${prompt}${contextBlock}`,
    });
  }

  const toolTrace: AgentRunResult["toolCalls"] = [];
  let promptTokens = 0;
  let completionTokens = 0;
  let rounds = 0;
  let finalContent = "";

  for (let round = 0; round <= maxToolRounds; round += 1) {
    rounds = round + 1;

    const allowTools = tools.length > 0 && round < maxToolRounds;
    const completion = await openai.chat.completions.create({
      model,
      temperature: BRAND_COPY_TEMPERATURE,
      max_tokens: maxTokens,
      messages,
      ...(allowTools
        ? { tools, tool_choice: "auto" as const }
        : tools.length > 0
          ? { tools, tool_choice: "none" as const }
          : {}),
    });

    promptTokens += completion.usage?.prompt_tokens ?? 0;
    completionTokens += completion.usage?.completion_tokens ?? 0;

    const choice = completion.choices[0];
    if (!choice) {
      throw new AgentError("OpenAI returned no choices", 502, "empty_completion");
    }

    const assistantMessage = choice.message;
    messages.push(assistantMessage);

    const toolCalls = assistantMessage.tool_calls ?? [];
    if (toolCalls.length === 0 || round >= maxToolRounds) {
      finalContent = (assistantMessage.content || "").trim();
      break;
    }

    for (const call of toolCalls) {
      if (call.type !== "function") continue;
      const executed = await executeAgentTool(
        call.function.name,
        call.function.arguments,
        ctx,
        task,
      );
      toolTrace.push(executed);

      const toolMessage: ChatCompletionToolMessageParam = {
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(executed.result).slice(0, 12_000),
      };
      messages.push(toolMessage);
    }
  }

  if (!finalContent && toolTrace.length > 0) {
    // Last round exhausted on tools — force a short synthesis without tools.
    const synthesis = await openai.chat.completions.create({
      model,
      temperature: BRAND_COPY_TEMPERATURE,
      max_tokens: Math.min(maxTokens, 600),
      messages: [
        ...messages,
        {
          role: "user",
          content:
            "Tools are done. Reply with the final answer only — no further tool calls.",
        },
      ],
    });
    promptTokens += synthesis.usage?.prompt_tokens ?? 0;
    completionTokens += synthesis.usage?.completion_tokens ?? 0;
    rounds += 1;
    finalContent = (synthesis.choices[0]?.message?.content || "").trim();
  }

  if (!finalContent) {
    throw new AgentError("Agent produced an empty response", 502, "empty_response");
  }

  return {
    task,
    complexity,
    model,
    maxTokens,
    content: finalContent,
    toolCalls: toolTrace,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      rounds,
    },
  };
}

/** Expose the client factory type for tests / future streaming. */
export type AgentOpenAI = OpenAI;
