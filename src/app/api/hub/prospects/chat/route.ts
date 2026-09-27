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
import { prospectHostKey } from "@/lib/prospectAudit/seedCatalog";
import { resolveClientId } from "@/lib/workspace";

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
      "trade": "hvac|plumbing|electrical|roofing|dental|legal|restaurant|retail|general",
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
- catalog is only when they ask for several from the Alberta list ("3 Calgary HVAC", "a few plumbers in Edmonton") and did not name specific sites.
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
  if (parsed.catalog && (parsed.catalog.trade || parsed.catalog.city)) {
    for (const seed of catalogSeeds({
      trade: parsed.catalog.trade,
      city: parsed.catalog.city,
      limit: parsed.catalog.limit,
      usedHosts,
    })) {
      items.push({
        kind: "audit",
        businessName: seed.businessName,
        url: seed.url,
        trade: seed.trade,
        city: seed.city,
        source: "prospect_audit",
      });
    }
  }

  if (items.length === 0) {
    return NextResponse.json({
      reply:
        "Tell me the business, the trade, and the website. Trades go under Prospect audits — trades. Other audits go under Prospect audits — other. Facebook or form inquiries go under New leads. I will not invent a site.",
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
