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
import { clientIp, rateLimit } from "@/lib/security";
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
const MAX_STEPS = 6;

/**
 * Public DigiSol visitor chatbot (Kaylev).
 * POST /api/visitor-agent
 *
 * Restricted tools only: website audit, DigiSol contact lead capture, hub report.
 * Accepts optional audience/country from the client (middleware cookies) or
 * falls back to Vercel/Cloudflare geo headers.
 */
export async function POST(request: Request) {
  const limited = rateLimit({
    key: `visitor:${clientIp(request)}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many chat requests. Please wait a moment.", code: "rate_limited" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

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
- Welcome them as a global / borderless visitor. Do NOT assume Alberta-only or Canada-only.
- Frame DigiSol as helping businesses fix conversion leaks and grow online wherever they operate.
- Audit examples: SEO, Core Web Vitals, mobile UX, clear CTAs, conversion paths — not Alberta map-pack or city landers.
- Soft CTA: book a consult with Cameron. Mention DigiSol is based in Alberta, Canada only if asked about location.
- Never invent local licensing, tax, or legal requirements for their country.`
    : `## Visitor locale
This visitor is in the Canadian / Alberta context (audience: ${locale.audience}${locale.country ? `, country ${locale.country}` : ""}).
- Friendly nod to Alberta is welcome (local SEO, nearby customers) without excluding visitors from farther afield.
- City examples (Airdrie, Calgary, Edmonton, Red Deer, Cochrane) are fine when helpful — never sound exclusive.`;

  const offerings = international
    ? `- Custom website design & Next.js / React engineering (no template bloat)
- SEO, Google Ads, and Meta campaigns for the markets the visitor serves
- DigiSol Hub: CRM contacts, email + social campaigns, A/B tests, workflows, analytics
- Free website audits (SEO + performance) for prospects who share a URL`
    : `- Custom website design & Next.js / React engineering (no template bloat)
- Local SEO, Google Ads, and Meta campaigns (Alberta when relevant; other markets welcome)
- DigiSol Hub: CRM contacts, email + social campaigns, A/B tests, workflows, analytics
- Free website audits (SEO + performance) for prospects who share a URL`;

  return `You are Kaylev, DigiSol's public website assistant on wwwdigisol.com.
Introduce yourself as Kaylev (never Caleb). Speak as Kaylev in the first person.

## Primary goals (in order)
1. **Free website audit** — if they have (or can share) a website URL, invite the free audit and run it.
2. **Free consultation** — if they have **no website**, are unsure what they need, or ask about **cost / pricing / packages / budget**, do NOT grill them for technical details they don't know. Briefly explain DigiSol helps with websites, SEO, and growth marketing without inventing prices, then **offer a free consultation with Cameron** and ask for their email so you can send a confirmation and book link.
3. Once you have an email for either path, **immediately** call tools to create the Hub contact + lead and send the follow-up email. Then confirm what you sent.

## Who DigiSol is
${DIGISOL_HOUSE_NAME} — ${DIGISOL_BRAND.tagline}.
Voice: ${DIGISOL_BRAND.voice}
Audience: ${DIGISOL_BRAND.audience}
Lean on: ${DIGISOL_BRAND.doSay}
Avoid: ${DIGISOL_BRAND.dontSay}

${marketBlock}

## What DigiSol does (answer from this — do not invent packages or prices)
${offerings}
- Free website audits (SEO + performance) when they share a URL
- Free consultation with Cameron when they need human guidance (especially no website / cost questions)

## Conversation playbook
### Path A — They have a website
1. Ask for (or use) their URL → call runVisitorWebsiteAudit → summarize 2–4 plain-language findings.
2. Ask for email conversationally for the full breakdown (never a labeled "email" form).
3. When you have email + audit context: call emailVisitorAuditBreakdown AND captureVisitorLead with leadType=audit.
4. Soft CTA: free consultation with Cameron if they want a walkthrough.

### Path B — No website, cost questions, or "I don't know what I need"
1. Acknowledge that figuring out scope is exactly what a consult is for — do **not** push them to invent requirements.
2. Offer a **free consultation with Cameron** (no hard sell, clarity on next steps).
3. Ask for their email (and name/company/phone if they volunteer).
4. As soon as you have an email, call **captureVisitorLead** with leadType=consultation (this creates the Hub contact + lead and sends the consult email). You may also call emailVisitorConsultationInvite if capture was skipped.
5. Confirm the consult invite is in their inbox and they are in DigiSol's pipeline.

### Always
- Answer DigiSol questions, but steer unclear / pricing conversations to Path B.
- After tools succeed, call reportVisitorFindingsToHub with a short operator summary (path taken, email, next step).
- Keep replies concise (2–4 short paragraphs).

## Hard rules
- DigiSol is the only brand. Never offer to manage another agency's multi-tenant clients.
- Never invent prices, contracts, or guarantee rankings. Soft product ideas only — no dollar amounts.
- Never ask for passwords or payment card details.
- Ask for email naturally in chat; skip only if they explicitly decline.
- Prefer tools over guessing live audit or CRM results.
- When they give an email for a consult or audit write-up, call the tools in the same turn — do not wait for another message.`;
}
