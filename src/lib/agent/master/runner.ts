import type {
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
} from "openai/resources/chat/completions";
import { brandKitPrompt } from "@/lib/branding";
import { BRAND_COPY_TEMPERATURE, createOpenAIClient } from "@/lib/openai";
import { AgentError } from "@/lib/agent/errors";
import {
  assertCompanyAllowed,
  type AgentAccessScope,
} from "@/lib/agent/master/accessScope";
import {
  MASTER_DECISION_MODEL,
  MASTER_HELPER_MODEL,
  clampMasterMaxTokens,
  clampMasterToolRounds,
} from "@/lib/agent/master/limits";
import { MASTER_TOOL_SCHEMAS } from "@/lib/agent/master/schemas";
import {
  executeMasterTool,
  type MasterToolContext,
} from "@/lib/agent/master/tools";
import { resolveCompanyScope } from "@/lib/agent/master/companyScope";

export type MasterAgentRequest = {
  prompt?: string;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
  /** Optional company to prefer when tools omit companyId. */
  companyId?: string;
  context?: Record<string, unknown>;
  maxToolRounds?: number;
  maxTokens?: number;
};

export type MasterAgentResult = {
  content: string;
  model: string;
  helperModel: string;
  maxTokens: number;
  companyId: string;
  companyName: string;
  accessMode: AgentAccessScope["mode"];
  toolCalls: Array<{
    name: string;
    arguments: Record<string, unknown>;
    result: unknown;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    rounds: number;
  };
};

function buildSystemPrompt(
  companyName: string,
  brandPrompt: string,
  companyId: string,
  access: AgentAccessScope,
) {
  return `You are DigiSol Hub's Master AI Agent. You govern a multi-company digital hub.

Working-on / default companyId: ${companyId}
Default company name: ${companyName}

## ${access.promptBlock}

## Tools (call them — never invent live data)
1. getCompanyProfile(companyId) — brand tone, voice, tagline, colors, words to avoid, visual sizes
2. runWebsiteAudit(url) — SEO/structural performance + strengths/weaknesses report
3. fetchCompanyAnalytics(companyId) — traffic, conversion, weak points (GA4 when DigiSol)
4. generateCampaignWorkflow(companyId, campaignGoal) — A/B structure + workflow (email/cold_call/etc.)
5. dispatchEmailCampaign(campaignId, variantData) — Resend send; dry-run unless confirmSend=true

## Suggested decision loop
fetchCompanyAnalytics → getCompanyProfile → generateCampaignWorkflow → optional runWebsiteAudit → propose dispatch only when asked to send.

## Brand lock for default company
${brandPrompt}

## Hard rules
- Pass the correct companyId for multi-company ops; do not mix brands.
- In company_locked mode, never request another company's data.
- Never set confirmSend=true unless the user explicitly asked to send.
- No invented invoices, prices, legal claims, or logos.
- Keep answers operator-actionable and concise.`;
}

/**
 * Master Agent decision loop: gpt-4o + tool calling, gpt-4o-mini for light synthesis.
 */
export async function runMasterAgent(
  body: MasterAgentRequest,
  ctx: MasterToolContext,
): Promise<MasterAgentResult> {
  const prompt = body.prompt?.trim() || "";
  const history = (body.messages ?? [])
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim(),
    )
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.trim() }));

  if (!prompt && history.length === 0) {
    throw new AgentError("Provide a prompt or messages", 400, "missing_prompt");
  }

  const requestedCompanyId = (body.companyId || ctx.workspaceClientId).trim();
  if (body.companyId) {
    assertCompanyAllowed(ctx.access, requestedCompanyId);
  }

  const scope = await resolveCompanyScope(
    ctx.supabase,
    requestedCompanyId,
    ctx.workspaceClientId,
    ctx.access,
  );
  const brandPrompt = brandKitPrompt(scope.companyName, scope.brand, "copy");

  const maxTokens = clampMasterMaxTokens(body.maxTokens);
  const helperMaxTokens = clampMasterMaxTokens(body.maxTokens, true);
  const maxToolRounds = clampMasterToolRounds(body.maxToolRounds);
  const openai = createOpenAIClient();

  const toolCtx: MasterToolContext = {
    ...ctx,
    workspaceClientId: scope.companyId,
  };

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: buildSystemPrompt(
        scope.companyName,
        brandPrompt,
        scope.companyId,
        ctx.access,
      ),
    },
    ...history,
  ];

  if (prompt) {
    const contextBlock =
      body.context && Object.keys(body.context).length > 0
        ? `\n\nOperator context (JSON):\n${JSON.stringify(body.context).slice(0, 4000)}`
        : "";
    messages.push({
      role: "user",
      content: `${prompt}${contextBlock}`,
    });
  }

  const toolTrace: MasterAgentResult["toolCalls"] = [];
  let promptTokens = 0;
  let completionTokens = 0;
  let rounds = 0;
  let finalContent = "";

  for (let round = 0; round <= maxToolRounds; round += 1) {
    rounds = round + 1;
    const allowTools = round < maxToolRounds;

    const completion = await openai.chat.completions.create({
      model: MASTER_DECISION_MODEL,
      temperature: BRAND_COPY_TEMPERATURE,
      max_tokens: maxTokens,
      messages,
      tools: MASTER_TOOL_SCHEMAS,
      tool_choice: allowTools ? "auto" : "none",
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
    if (toolCalls.length === 0 || !allowTools) {
      finalContent = (assistantMessage.content || "").trim();
      break;
    }

    for (const call of toolCalls) {
      if (call.type !== "function") continue;
      const executed = await executeMasterTool(
        call.function.name,
        call.function.arguments,
        toolCtx,
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

  if (!finalContent) {
    const synthesis = await openai.chat.completions.create({
      model: MASTER_HELPER_MODEL,
      temperature: BRAND_COPY_TEMPERATURE,
      max_tokens: helperMaxTokens,
      messages: [
        ...messages,
        {
          role: "user",
          content:
            "Tools are complete. Write the final operator-facing answer only — no tool calls.",
        },
      ],
    });
    promptTokens += synthesis.usage?.prompt_tokens ?? 0;
    completionTokens += synthesis.usage?.completion_tokens ?? 0;
    rounds += 1;
    finalContent = (synthesis.choices[0]?.message?.content || "").trim();
  }

  if (!finalContent) {
    throw new AgentError("Master agent produced an empty response", 502, "empty_response");
  }

  return {
    content: finalContent,
    model: MASTER_DECISION_MODEL,
    helperModel: MASTER_HELPER_MODEL,
    maxTokens,
    companyId: scope.companyId,
    companyName: scope.companyName,
    accessMode: ctx.access.mode,
    toolCalls: toolTrace,
    usage: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      rounds,
    },
  };
}
