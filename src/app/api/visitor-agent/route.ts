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
import { DIGISOL_GUARANTEES, GUARANTEE_FINE_PRINT } from "@/lib/guarantee";
import { GOOGLE_AUTOPILOT_SHORT } from "@/lib/googleAutopilot";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { parseAttributionFromBody } from "@/lib/meta/attribution";
import { getOpenAIApiKey } from "@/lib/openai";
import { clientIp, rateLimit } from "@/lib/security";
import { hasAdminClient } from "@/lib/supabase/admin";
import { PUBLIC_PROJECTS } from "@/lib/projects";
import { TESTIMONIALS } from "@/lib/testimonials";
import {
  DIGISOL_EMAIL,
  DIGISOL_FACEBOOK_URL,
  DIGISOL_GOOGLE_LISTING_URL,
  DIGISOL_INSTAGRAM_HANDLE,
  DIGISOL_INSTAGRAM_URL,
  DIGISOL_PHONE,
  DIGISOL_SITE_URL,
  DIGISOL_TIKTOK_HANDLE,
  DIGISOL_TIKTOK_URL,
  DIGISOL_YOUTUBE_FEATURED_URL,
  DIGISOL_YOUTUBE_URL,
} from "@/lib/site";
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
    lang?: string;
    attribution?: Record<string, unknown>;
  };
  try {
    body = (await request.json()) as typeof body;
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
  const siteLanguage: Locale = isLocale(body.lang) ? body.lang : DEFAULT_LOCALE;

  try {
    const openai = createOpenAI({ apiKey: getOpenAIApiKey() });
    const tools = createVisitorAgentTools({
      attribution:
        body.attribution && typeof body.attribution === "object"
          ? parseAttributionFromBody({ attribution: body.attribution })
          : null,
      language: siteLanguage,
    });

    const result = streamText({
      model: openai(process.env.OPENAI_AGENT_LIGHT_MODEL?.trim() || "gpt-4o-mini"),
      system: buildVisitorSystemPrompt(locale, siteLanguage),
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

function buildVisitorSystemPrompt(
  locale: {
    audience: VisitorAudience;
    country: string;
    countryLabel: string;
  },
  siteLanguage: Locale,
) {
  const languageBlock = `## Language
The visitor is on the ${siteLanguage === "fr" ? "French" : "English"} version of the site.
- Always reply in the language of the visitor's most recent message (English or French). Only when a message is too short to tell (a URL, an email, "ok"), use ${siteLanguage === "fr" ? "French" : "English"}, the site language.
- In French, write Canadian French: use "vous", say "courriel" (never "e-mail" or "mail"), and format prices like "4 500 $".
- Canada is bilingual: treat French and English visitors the same. Quoted guarantee text may be translated faithfully, never embellished.
- When you call captureVisitorLead, emailVisitorConsultationInvite or emailVisitorAuditBreakdown, set language to "fr" if you are chatting in French and "en" if in English, so the email matches. Write the requirements note in that same language.`;

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
4. Cold prospect audits are different from a visitor who just gave you their own email. Never email an address you found on a business website unless that address is conspicuously published on that same site (a visible contact or mailto). Do not guess inboxes, and do not send to personal Gmail/Yahoo addresses scraped off a site. If the published address is missing, say so and do not send.

## Who DigiSol is
${DIGISOL_HOUSE_NAME} — ${DIGISOL_BRAND.tagline}.
Voice: ${DIGISOL_BRAND.voice}
Audience: ${DIGISOL_BRAND.audience}
Lean on: ${DIGISOL_BRAND.doSay}
Avoid: ${DIGISOL_BRAND.dontSay}

## Official DigiSol contact (use these — never invent others)
- Email: ${DIGISOL_EMAIL} (business inbox; prefer this over any personal address)
- Phone: ${DIGISOL_PHONE}
- Website: ${DIGISOL_SITE_URL}
- Facebook Page: ${DIGISOL_FACEBOOK_URL}
- Instagram: @${DIGISOL_INSTAGRAM_HANDLE} (${DIGISOL_INSTAGRAM_URL})
- YouTube: ${DIGISOL_YOUTUBE_URL} (featured video: ${DIGISOL_YOUTUBE_FEATURED_URL})
- TikTok: @${DIGISOL_TIKTOK_HANDLE} (${DIGISOL_TIKTOK_URL})
- Google Business Profile: ${DIGISOL_GOOGLE_LISTING_URL}
## DigiSol guarantee (quote exactly; never promise more, such as refunds)
${DIGISOL_GUARANTEES.map((g) => `- ${g.title}: ${g.body}`).join("\n")}
- Fine print: ${GUARANTEE_FINE_PRINT}

## Client testimonials (the only ones that exist; quote or paraphrase faithfully, never invent others, clients, or results)
${TESTIMONIALS.map((item) => `- ${item.name ? `${item.name}, ${item.company}` : item.company}${item.status === "in_progress" ? " (project still in progress)" : ""}: "${item.quote}"`).join("\n")}

## Client projects currently in beta (the only ones you may name as DigiSol work; don't add details beyond these)
${PUBLIC_PROJECTS.map((project) => `- ${project.company} (${project.status}): ${project.summary} DigiSol's role: ${project.role}${project.url ? ` Site: ${project.url}` : ""}`).join("\n")}

If a visitor asks how to reach DigiSol, share the email/phone above. DigiSol's Facebook presence is a **Page** (not a personal profile).

${marketBlock}

${languageBlock}

## What DigiSol does (answer from this — do not invent packages or prices)
${offerings}
- Free website audits (SEO + performance) when they share a URL
- Free consultation with Cameron when they need human guidance (especially no website / cost questions)
- Weekly Google setup check: ${GOOGLE_AUTOPILOT_SHORT} The client keeps ownership and just adds DigiSol as a user. Don't quote a price for it; offer a consult.

## Conversation playbook
### Path A — They have a website
1. Ask for (or use) their URL → call runVisitorWebsiteAudit → summarize 2–4 plain-language findings.
2. Ask for email conversationally for the full breakdown (never a labeled "email" form).
3. When you have email + audit context: call **captureVisitorLead** with leadType=audit and websiteUrl. It saves the Hub contact + lead and emails the breakdown in one step. Do not also call emailVisitorAuditBreakdown, or they get two copies. Use emailVisitorAuditBreakdown only if capture already ran earlier in the chat and they ask for the write-up again.
4. Soft CTA: free consultation with Cameron if they want a walkthrough.

### Path B — No website, cost questions, or "I don't know what I need"
1. Acknowledge that figuring out scope is exactly what a consult is for — do **not** push them to invent requirements.
2. Offer a **free consultation with Cameron** (no hard sell, clarity on next steps).
3. Ask for their email (and name/company/phone if they volunteer).
4. As soon as you have an email, call **captureVisitorLead** with leadType=consultation (this creates the Hub contact + lead and sends the consult email). Only call emailVisitorConsultationInvite if captureVisitorLead failed — never both.
- Each visitor gets at most one DigiSol email per 24 hours. If a tool says already_emailed_recently, tell them the email is already in their inbox (check spam) — do not retry.
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
