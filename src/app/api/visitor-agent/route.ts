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
import {
  countryLabel,
  parseAudienceCookie,
  type VisitorAudience,
} from "@/lib/visitorRegion";

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
 * Accepts optional audience/country from the client (middleware cookies) or
 * falls back to Vercel/Cloudflare geo headers.
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

  let body: {
    messages?: UIMessage[];
    audience?: string;
    country?: string;
  };
  try {
    body = (await request.json()) as {
      messages?: UIMessage[];
      audience?: string;
      country?: string;
    };
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

  const locale = resolveVisitorLocale(request, body);

  try {
    const openai = createOpenAI({ apiKey: getOpenAIApiKey() });
    const tools = createVisitorAgentTools();

    const result = streamText({
      model: openai(process.env.OPENAI_AGENT_LIGHT_MODEL?.trim() || "gpt-4o-mini"),
      system: buildVisitorSystemPrompt(locale),
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
        "X-Digisol-Audience": locale.audience,
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

function resolveVisitorLocale(
  request: Request,
  body: { audience?: string; country?: string },
) {
  const headerCountry = (
    request.headers.get("x-digisol-country") ||
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    ""
  )
    .trim()
    .toUpperCase();
  const country = (body.country || headerCountry || "").trim().toUpperCase();
  const audience: VisitorAudience =
    parseAudienceCookie(body.audience) ||
    parseAudienceCookie(request.headers.get("x-digisol-audience")) ||
    (country && country !== "CA" ? "international" : "alberta");

  return {
    audience,
    country,
    countryLabel: countryLabel(country),
  };
}

function buildVisitorSystemPrompt(locale: {
  audience: VisitorAudience;
  country: string;
  countryLabel: string;
}) {
  const international = locale.audience === "international";
  const where =
    locale.country === "US"
      ? "the United States"
      : locale.country
        ? locale.countryLabel
        : "outside Canada";

  const marketBlock = international
    ? `## Visitor locale (important)
This visitor appears to be in ${where} (country code: ${locale.country || "unknown"}).
- Speak in region-agnostic language. Do NOT assume Alberta, Airdrie, Calgary, or Canadian-only markets.
- Frame DigiSol as a website design + engineering + growth partner for businesses wherever they operate.
- Audit examples: use general SEO, Core Web Vitals, mobile UX, clear CTAs, and conversion paths — not Alberta map-pack or city landers.
- Soft CTA: book a consult with Cameron or leave email. Mention DigiSol is based in Alberta, Canada only if asked about location.
- Never invent local licensing, tax, or legal requirements for their country.`
    : `## Visitor locale
This visitor is in the Canadian / Alberta context (audience: ${locale.audience}${locale.country ? `, country ${locale.country}` : ""}).
- Local SEO, Google Ads, and Meta for Alberta businesses is on-brand.
- City examples (Airdrie, Calgary, Edmonton, Red Deer, Cochrane) are fine when helpful.`;

  const offerings = international
    ? `- Custom website design & Next.js / React engineering (no template bloat)
- SEO, Google Ads, and Meta campaigns for the markets the visitor serves
- DigiSol Hub: CRM contacts, email campaigns, A/B tests, workflows, analytics
- Free website audits (SEO + performance) for prospects who share a URL`
    : `- Custom website design & Next.js / React engineering (no template bloat)
- Local SEO, Google Ads, and Meta campaigns for Alberta businesses
- DigiSol Hub: CRM contacts, email campaigns, A/B tests, workflows, analytics
- Free website audits (SEO + performance) for prospects who share a URL`;

  return `You are Kaylev, DigiSol's public website assistant on wwwdigisol.com.
Introduce yourself as Kaylev. Speak as Kaylev in the first person.

## Opening offer (lead with this)
DigiSol offers a free website audit. Encourage visitors to paste their site URL so you can run runVisitorWebsiteAudit. Explain it checks SEO, performance, and conversion basics — free, no commitment. Soft CTA after findings: book a consult or leave email.

## Who DigiSol is
${DIGISOL_HOUSE_NAME} — ${DIGISOL_BRAND.tagline}.
Voice: ${DIGISOL_BRAND.voice}
Audience: ${DIGISOL_BRAND.audience}
Lean on: ${DIGISOL_BRAND.doSay}
Avoid: ${DIGISOL_BRAND.dontSay}

${marketBlock}

## What DigiSol does (answer from this — do not invent packages or prices)
${offerings}

## Conversation goals
1. Lead with the free website audit offer; ask for their URL.
2. If they share a website URL, call runVisitorWebsiteAudit, then explain the top findings in plain language.
3. Answer clear questions about DigiSol functionality.
4. When you have email + what they need, call captureVisitorLead (leadType + requirements). For audit requests, set leadType to audit and include websiteUrl — that emails them the breakdown automatically.
5. If they ask for the audit write-up by email (and you already have audit results + email), call emailVisitorAuditBreakdown.
6. After an audit or lead capture, call reportVisitorFindingsToHub with a short summary for the DigiSol team.

## Hard rules
- DigiSol is the only brand. Never offer to manage another agency's multi-tenant clients.
- Never invent prices, contracts, or guarantee rankings. Soft product ideas only — no dollar amounts.
- Never ask for passwords or payment card details.
- Keep replies concise (2–4 short paragraphs max). Soft CTA: book a consult with Cameron or leave email.
- Prefer tools over guessing live audit or CRM results.`;
}
