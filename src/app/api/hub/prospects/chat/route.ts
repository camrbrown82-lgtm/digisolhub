import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import {
  createOpenAIClient,
  getOpenAIApiKey,
  getOpenAITextModel,
} from "@/lib/openai";
import {
  catalogSeeds,
  enqueueFromChat,
  type ChatProspectItem,
} from "@/lib/prospectAudit/enqueueFromChat";
import {
  DISCOVERY_OTHER_SECTORS,
  DISCOVERY_TRADE_SECTORS,
  discoverProspects,
} from "@/lib/prospectAudit/discover";
import { prospectHostKey } from "@/lib/prospectAudit/seedCatalog";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { resolveClientId } from "@/lib/workspace";

export const maxDuration = 120;

type ChatMessage = { role?: string; content?: string };

export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  if (!getOpenAIApiKey()) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as { messages?: ChatMessage[] };
  const messages = (body.messages || [])
    .filter((row) => row && (row.role === "user" || row.role === "assistant"))
    .slice(-8)
    .map((row) => ({
      role: row.role as "user" | "assistant",
      content: String(row.content || "").slice(0, 2000),
    }))
    .filter((row) => row.content.trim());

  const latest = [...messages].reverse().find((row) => row.role === "user");
  if (!latest) {
    return NextResponse.json({ error: "Say who you want audited." }, { status: 400 });
  }

  const clientId = await resolveClientId(supabase);
  if (!clientId) {
    return NextResponse.json({ error: "No workspace selected" }, { status: 400 });
  }

  const openai = createOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: getOpenAITextModel(),
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You file DigiSol Hub prospect-audit requests into contact sections.
Return JSON only:
{
  "items": [
    {
      "kind": "audit" | "lead",
      "businessName": "string",
      "url": "https://... or empty",
      "email": "only if the user stated an email, else empty",
      "trade": "${[...DISCOVERY_TRADE_SECTORS, ...DISCOVERY_OTHER_SECTORS, "general"].join("|")}",
      "city": "Alberta city or empty",
      "source": "facebook|form|website|prospect_audit"
    }
  ],
  "catalog": { "trade": "hvac", "city": "Calgary", "limit": 3 } or null
}
Rules:
- kind "audit" when they want a website audited. kind "lead" for organic inquiries (Facebook, a form, just curious) with no audit.
- Never invent a website or email. Leave url empty if they did not say it.
- Trades (hvac, plumbing, electrical, roofing, mechanical) are prospect-audit trades. Other industries stay audits but are not trades.
- catalog is when they ask you to find or search for several businesses by sector and/or city ("3 Calgary HVAC", "find 5 dentists in Red Deer", "5 Calgary med spas", "search other sectors") and did not name specific sites. Use trade "general" when no sector is given. Limit defaults to 5, max 10.
- Map plain names to trade slugs: dentistry → dental, plumbers → plumbing, electricians → electrical, roofing and siding → roofing, restaurants → restaurant, med spas → medspa, physio clinics → physio, healthcare → healthcare, private surgery clinics → surgery, home care and senior living → homecare, e-commerce → ecommerce, mortgage companies → mortgage, oil and gas → oilgas, small business and startups → smb, construction → construction.
- If they only chat with no businesses, return items: [] and catalog: null.`,
      },
      ...messages,
    ],
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    return NextResponse.json({ error: "Kaylev returned an empty plan." }, { status: 502 });
  }

  let parsed: {
    items?: ChatProspectItem[];
    catalog?: { trade?: string; city?: string; limit?: number } | null;
  };
  try {
    parsed = JSON.parse(content) as typeof parsed;
  } catch {
    return NextResponse.json(
      { error: "Could not read that request. Name the business and the website." },
      { status: 502 },
    );
  }

  const items = Array.isArray(parsed.items) ? parsed.items : [];
  const { data: existing } = await supabase
    .from("prospects")
    .select("url")
    .eq("client_id", clientId)
    .limit(2000);
  const usedHosts = new Set(
    (existing ?? []).map((row) => prospectHostKey(String(row.url || ""))),
  );
  const searchNotes: string[] = [];
  if (parsed.catalog) {
    const limit = Math.min(10, Math.max(1, parsed.catalog.limit || 5));
    const seeds = catalogSeeds({
      trade: parsed.catalog.trade,
      city: parsed.catalog.city,
      limit,
      usedHosts,
    });
    for (const seed of seeds) {
      usedHosts.add(prospectHostKey(seed.url));
      items.push({
        kind: "audit",
        businessName: seed.businessName,
        url: seed.url,
        trade: seed.trade,
        city: seed.city,
        source: "prospect_audit",
      });
    }

    if (seeds.length < limit) {
      const trade = (parsed.catalog.trade || "").trim().toLowerCase();
      const city = (parsed.catalog.city || "").trim();
      const discovery = await discoverProspects(
        hasAdminClient() ? createAdminClient() : supabase,
        clientId,
        {
          usedHosts,
          want: limit - seeds.length,
          maxSearches: 2,
          sectors: trade && trade !== "general" ? [trade] : undefined,
          cities: city ? [city] : undefined,
        },
      );
      for (const p of discovery.prospects.slice(0, limit - seeds.length)) {
        items.push({
          kind: "audit",
          businessName: p.businessName,
          url: p.url,
          trade: p.trade,
          city: p.city,
          source: "prospect_audit",
        });
      }
      if (discovery.searches.length) {
        searchNotes.push(
          `Searched the web for ${discovery.searches
            .map((s) => `${s.sector} in ${s.city}`)
            .join(", ")} and kept ${discovery.prospects.length} with a published email.`,
        );
      }
    }
  }

  if (items.length === 0) {
    return NextResponse.json({
      reply: searchNotes.length
        ? `${searchNotes.join(" ")} Nothing new to file this time. Ask again and I will search the next cities.`
        : "Tell me the business, the trade, and the website, or ask me to find some (\"find 5 dentists in Red Deer\"). Trades go under Prospect audits — trades. Other audits go under Prospect audits — other. Facebook or form inquiries go under New leads. I will not invent a site.",
      added: [],
    });
  }

  const result = await enqueueFromChat(supabase, clientId, items);
  const lines = result.added.map((row) => {
    const where = row.queuedAudit
      ? `${row.section}, queued for audit`
      : row.section;
    return `${row.name} → ${where}`;
  });
  const reply = [
    ...searchNotes,
    lines.length
      ? `Filed ${lines.length}:\n${lines.join("\n")}`
      : "Nothing new was filed.",
    result.needsWebsite.length
      ? `Still need a website before these can be audited: ${result.needsWebsite.join(", ")}.`
      : "",
    result.skipped.length ? result.skipped.join(" ") : "",
    "They show in Contacts under that section. Run audits now when you want the emails to go out — this chat only files them.",
  ]
    .filter(Boolean)
    .join("\n\n");

  return NextResponse.json({ reply, ...result });
}
