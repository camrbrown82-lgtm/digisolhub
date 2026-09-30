import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { snapshotSite, toSiteUrl } from "@/lib/competitive/analyze";
import { BRAND_WORDING_KEYS, brandFromClient, DIGISOL_HOUSE_NAME, type BrandWording } from "@/lib/branding";
import { routeAgentModel } from "@/lib/agent/modelRouter";
import { BRAND_COPY_TEMPERATURE, createOpenAIClient, getOpenAIApiKey, openaiErrorMessage } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

const FIELD_GUIDE = `Return JSON with exactly these string keys:
- "tagline": one short line, at most 8 words.
- "voice": 2-4 sentences on how the brand talks, with one short example line in quotes.
- "audience": 1-2 sentences naming who buys, where they are, and what they want.
- "doSay": 8-14 words or short phrases to lean on, comma-separated.
- "dontSay": 6-12 words or phrases to avoid, comma-separated (cliches, off-brand claims, competitor-speak).
- "visualStyle": 1-2 sentences on materials, lighting, and mood for posters. Say "the brand colors" instead of naming colors; colors are set separately.
- "extra": 2-4 short factual notes: offer, proof points, service area, products. Only facts from the input; leave out anything you'd have to guess.`;

/** POST { clientId, description?, useWebsite? } — suggested wording for a company's brand kit. Never touches colors. */
export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;
  if (!getOpenAIApiKey()) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as
    | { clientId?: string; description?: string; useWebsite?: boolean }
    | null;
  if (!body?.clientId) return NextResponse.json({ error: "Missing company." }, { status: 400 });

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, domain, branding")
    .eq("id", body.clientId)
    .maybeSingle();
  if (!client) return NextResponse.json({ error: "Company not found." }, { status: 404 });

  const { companyName, brand } = brandFromClient(client);
  const description = (body.description || "").trim().slice(0, 3000);

  let website = "";
  if (body.useWebsite !== false && client.domain) {
    const snap = await Promise.race([
      snapshotSite(companyName, toSiteUrl(String(client.domain)), "light").catch(() => null),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 25000)),
    ]);
    if (snap?.ok) {
      website = [
        snap.title ? `Title: ${snap.title}` : "",
        snap.metaDescription ? `Description: ${snap.metaDescription}` : "",
        snap.h1 ? `Main heading: ${snap.h1}` : "",
        snap.excerpt,
        ...(snap.pages ?? []).slice(0, 3).map((p) => `${p.title}: ${p.text.slice(0, 600)}`),
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 5000);
    }
  }
  if (!description && !website) {
    return NextResponse.json(
      { error: "Describe the business in a few sentences, or add its domain so the website can be read." },
      { status: 400 },
    );
  }

  const house = companyName.toLowerCase() === DIGISOL_HOUSE_NAME.toLowerCase();
  const current = BRAND_WORDING_KEYS.map((key) => `${key}: ${brand[key] || "(empty)"}`).join("\n");

  try {
    const completion = await createOpenAIClient().chat.completions.create({
      model: routeAgentModel("complex"),
      temperature: BRAND_COPY_TEMPERATURE,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You write the wording section of a brand kit for ${companyName} only.${
            house ? "" : ` This is not DigiSol: never use DigiSol's voice, tagline, or claims.`
          } Plain, specific, human language. No agency filler (synergy, leverage, world-class, cutting-edge, unlock).
Keep what already works in the current kit and sharpen it; follow the owner's description over the website when they differ.
${FIELD_GUIDE}`,
        },
        {
          role: "user",
          content: [
            `Company: ${companyName}${client.domain ? ` (${client.domain})` : ""}`,
            description ? `Owner's description:\n${description}` : "",
            website ? `From the website:\n${website}` : "",
            `Current kit wording:\n${current}`,
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      ],
    });
    const raw = JSON.parse(completion.choices[0]?.message?.content || "{}") as Record<string, unknown>;
    const suggestions = Object.fromEntries(
      BRAND_WORDING_KEYS.map((key) => [key, typeof raw[key] === "string" ? String(raw[key]).trim() : ""]),
    ) as BrandWording;
    return NextResponse.json({ suggestions, readWebsite: Boolean(website) });
  } catch (err) {
    return NextResponse.json({ error: openaiErrorMessage(err) }, { status: 502 });
  }
}
