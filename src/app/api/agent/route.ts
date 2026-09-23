import {
  convertToModelMessages,
  isStepCount,
  streamText,
  type UIMessage,
} from "ai";
import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { toAgentHttpError } from "@/lib/agent/errors";
import {
  buildDigisolSystemPrompt,
  createDigisolAgentTools,
  createDigisolLanguageModel,
  describeDigisolModelRoute,
  digisolModelId,
  logAgentActivity,
  resolveDigisolMaxOutputTokens,
  resolveDigisolMaxSteps,
  resolveDigisolModelTier,
  resolveDigisolScope,
  type DigisolModelTier,
} from "@/lib/agent/digisol";
import { ensureAgentActivityLogSchema } from "@/lib/ensureAgentActivityLogSchema";
import { ensureClientAiWalletSchema } from "@/lib/ensureClientAiWalletSchema";
import { getOpenAIApiKey } from "@/lib/openai";
import {
  checkAgentBudget,
  estimateToolCost,
  recordAgentUsage,
} from "@/lib/agent/budget";

export const runtime = "nodejs";
export const maxDuration = 60;

type AgentRequestBody = {
  prompt?: string;
  messages?: UIMessage[] | Array<{ role: "user" | "assistant"; content: string }>;
  /** Force model tier: light → gpt-4o-mini, orchestration → gpt-4o */
  tier?: DigisolModelTier;
  maxOutputTokens?: number;
  maxSteps?: number;
  context?: Record<string, unknown>;
};

/**
 * DigiSol Master AI Agent — single-operator streaming tool loop.
 * POST /api/agent
 *
 * Body: { prompt?, messages?, tier?, maxOutputTokens?, maxSteps?, context? }
 */
export async function POST(request: Request) {
  const { supabase, user, error } = await requireHubSession();
  if (error) return error;

  if (!getOpenAIApiKey()) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY is not configured. Add it in Vercel Production and .env.local, then redeploy.",
        code: "missing_api_key",
      },
      { status: 503 },
    );
  }

  let body: AgentRequestBody;
  try {
    body = (await request.json()) as AgentRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", code: "invalid_json" },
      { status: 400 },
    );
  }

  try {
    await Promise.all([
      ensureAgentActivityLogSchema().catch(() => null),
      ensureClientAiWalletSchema().catch(() => null),
    ]);

    const scope = await resolveDigisolScope(supabase, user!.id);
    const promptText = extractPromptText(body);
    if (!promptText && !(body.messages && body.messages.length > 0)) {
      return NextResponse.json(
        { error: "Provide a prompt or messages", code: "missing_prompt" },
        { status: 400 },
      );
    }

    // Cost routing: light drafting → gpt-4o-mini; campaign/tool orchestration → gpt-4o
    const finalTier = resolveDigisolModelTier(promptText, body.tier);
    const maxOutputTokens = resolveDigisolMaxOutputTokens(
      finalTier,
      body.maxOutputTokens,
    );
    const maxSteps = resolveDigisolMaxSteps(body.maxSteps);
    const modelId = digisolModelId(finalTier);
    const model = createDigisolLanguageModel(finalTier);
    const tools = createDigisolAgentTools(scope);
    const route = describeDigisolModelRoute(finalTier);

    // Pre-flight wallet check — DigiSol uses internal bootstrap allotment.
    await checkAgentBudget(
      scope.clientId,
      estimateToolCost(
        finalTier === "orchestration" ? "agent_orchestration" : "agent_light",
        { tokens: maxOutputTokens },
      ),
      {
        supabase,
        userId: user!.id,
        toolName: "streamText",
        invocation: "manual",
        throwOnDeny: true,
      },
    );

    await logAgentActivity({
      supabase,
      userId: user!.id,
      clientId: scope.clientId,
      action: "agent:run_started",
      status: "started",
      model: modelId,
      input: {
        tier: finalTier,
        maxOutputTokens,
        maxSteps,
        promptPreview: promptText.slice(0, 500),
        contextKeys: body.context ? Object.keys(body.context) : [],
      },
      metadata: route,
    });

    const messages = await buildModelMessages(body, promptText);

    const result = streamText({
      model,
      system: buildDigisolSystemPrompt(scope),
      messages,
      tools,
      // Tools available on both tiers; light prompts rarely invoke them.
      // Hard step cap prevents runaway multi-step cost.
      stopWhen: isStepCount(maxSteps),
      maxOutputTokens,
      temperature: 0.35,
      maxRetries: 2,
      abortSignal: request.signal,
      onError: async ({ error: streamError }) => {
        const message =
          streamError instanceof Error ? streamError.message : "stream error";
        await logAgentActivity({
          supabase,
          userId: user!.id,
          clientId: scope.clientId,
          action: "agent:run_error",
          status: "error",
          model: modelId,
          errorMessage: message,
        });
      },
      onFinish: async ({ text, usage, steps, finishReason }) => {
        const promptTokens = usage?.inputTokens ?? 0;
        const completionTokens = usage?.outputTokens ?? 0;
        await recordAgentUsage(
          scope.clientId,
          {
            tokens: promptTokens + completionTokens,
            promptTokens,
            completionTokens,
            toolCalls: 1,
            model: modelId,
            toolName: "streamText",
          },
          { supabase, userId: user!.id, invocation: "manual" },
        );
        await logAgentActivity({
          supabase,
          userId: user!.id,
          clientId: scope.clientId,
          action: "agent:run_finished",
          status: "finished",
          model: modelId,
          output: {
            finishReason,
            textPreview: (text || "").slice(0, 1500),
            steps: steps?.length ?? 0,
            usage: {
              promptTokens,
              completionTokens,
              totalTokens: promptTokens + completionTokens,
            },
          },
          metadata: {
            ...route,
            maxOutputTokens,
            maxSteps,
          },
        });
      },
    });

    return result.toUIMessageStreamResponse({
      headers: {
        "X-Digisol-Operator": "DigiSol",
        "X-Digisol-Model": modelId,
        "X-Digisol-Model-Tier": finalTier,
        "X-Digisol-Max-Output-Tokens": String(maxOutputTokens),
        "X-Digisol-Max-Steps": String(maxSteps),
      },
    });
  } catch (err) {
    const { status, body: errorBody } = toAgentHttpError(err);
    return NextResponse.json(errorBody, { status });
  }
}

function extractPromptText(body: AgentRequestBody): string {
  if (body.prompt?.trim()) return body.prompt.trim();
  const messages = body.messages ?? [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (!msg || msg.role !== "user") continue;
    if ("content" in msg && typeof msg.content === "string") {
      return msg.content.trim();
    }
    if ("parts" in msg && Array.isArray(msg.parts)) {
      const text = msg.parts
        .filter(
          (p): p is { type: "text"; text: string } =>
            !!p &&
            typeof p === "object" &&
            "type" in p &&
            (p as { type: string }).type === "text" &&
            "text" in p,
        )
        .map((p) => p.text)
        .join("\n")
        .trim();
      if (text) return text;
    }
  }
  return "";
}

async function buildModelMessages(body: AgentRequestBody, promptText: string) {
  const raw = body.messages;
  if (raw && raw.length > 0) {
    const first = raw[0];
    if (first && "parts" in first) {
      return convertToModelMessages(raw as UIMessage[]);
    }
    return (raw as Array<{ role: "user" | "assistant"; content: string }>)
      .filter(
        (m) =>
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim(),
      )
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content.trim() }));
  }

  const contextBlock =
    body.context && Object.keys(body.context).length > 0
      ? `\n\nOperator context (non-secret):\n${JSON.stringify(body.context).slice(0, 2000)}`
      : "";

  return [{ role: "user" as const, content: `${promptText}${contextBlock}` }];
}
