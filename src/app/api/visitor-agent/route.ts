import {
  convertToModelMessages,
  isStepCount,
  streamText,
  type UIMessage,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { NextResponse } from "next/server";
import { createVisitorAgentTools } from "@/lib/agent/visitor/tools";
import { DIGISOL_HOUSE_NAME, DIGISOL_BRAND } from "@/lib/branding";
import { getOpenAIApiKey } from "@/lib/openai";
import { hasAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

const MAX_MESSAGES = 24;
const MAX_OUTPUT_TOKENS = 700;
const MAX_STEPS = 4;

/**
 * Public DigiSol visitor chatbot (Kaylev).
 * POST /api/visitor-agent
 *
 * Restricted tools only: website audit, DigiSol contact lead capture, hub report.
 */
export async function POST(request: Request) {
  if (!getOpenAIApiKey()) {
    return NextResponse.json(
      {
        error: "Visitor chat is temporarily unavailable.",
        code: "missing_api_key",
      },
      { status: 503 },
    );
  }

  if (!hasAdminClient()) {
    return NextResponse.json(
      {
        error: "Visitor chat cannot write to DigiSol Hub yet.",
        code: "missing_supabase",
      },
      { status: 503 },
    );
  }

  let body: { messages?: UIMessage[] };
  try {
    body = (await request.json()) as { messages?: UIMessage[] };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", code: "invalid_json" },
      { status: 400 },
    );
  }

  const messages = Array.isArray(body.messages)
    ? body.messages.slice(-MAX_MESSAGES)
    : [];
  if (messages.length === 0) {
    return NextResponse.json(
      { error: "Provide messages", code: "missing_messages" },
      { status: 400 },
    );
  }

  try {
    const openai = createOpenAI({ apiKey: getOpenAIApiKey() });
    const tools = createVisitorAgentTools();

    const result = streamText({
      model: openai(process.env.OPENAI_AGENT_LIGHT_MODEL?.trim() || "gpt-4o-mini"),
      system: buildVisitorSystemPrompt(),
      messages: await convertToModelMessages(messages),
      tools,
      stopWhen: isStepCount(MAX_STEPS),
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.4,
      maxRetries: 1,
      abortSignal: request.signal,
    });

    return result.toUIMessageStreamResponse({
      headers: {
        "X-Digisol-Agent": "kaylev",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Visitor agent failed";
    console.error("[visitor-agent]", message);
    return NextResponse.json(
      { error: "Visitor chat failed. Please try again.", code: "visitor_agent_error" },
      { status: 502 },
    );
  }
}

function buildVisitorSystemPrompt() {
  return `You are Kaylev, DigiSol's public website assistant on wwwdigisol.com.
Introduce yourself as Kaylev when greeting. Speak as Kaylev in the first person.

## Who DigiSol is
${DIGISOL_HOUSE_NAME} — ${DIGISOL_BRAND.tagline}.
Voice: ${DIGISOL_BRAND.voice}
Audience: ${DIGISOL_BRAND.audience}
Lean on: ${DIGISOL_BRAND.doSay}
Avoid: ${DIGISOL_BRAND.dontSay}

## What DigiSol does (answer from this — do not invent packages or prices)
- Custom website design & Next.js / React engineering (no template bloat)
- Local SEO, Google Ads, and Meta campaigns for Alberta businesses
- DigiSol Hub: CRM contacts, email campaigns, A/B tests, workflows, analytics
- Website audits (SEO + performance) for prospects who share a URL

## Conversation goals
1. Greet warmly as Kaylev and ask what they are looking for (site build, marketing, SEO, audit, or general).
2. Answer clear questions about DigiSol functionality.
3. If they share a website URL, call runVisitorWebsiteAudit, then explain the top findings in plain language.
4. When you have email + what they need, call captureVisitorLead (leadType + requirements).
5. After an audit or lead capture, call reportVisitorFindingsToHub with a short summary for the DigiSol team.

## Hard rules
- DigiSol is the only brand. Never offer to manage another agency's multi-tenant clients.
- Never invent prices, contracts, or guarantee rankings.
- Never ask for passwords or payment card details.
- Keep replies concise (2–5 short paragraphs max). Soft CTA: book a consult or leave email.
- Prefer tools over guessing live audit or CRM results.`;
}
