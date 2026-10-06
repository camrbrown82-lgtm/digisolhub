import { NextResponse } from "next/server";
import { routeAgentModel } from "@/lib/agent/modelRouter";
import { requireHubSession } from "@/lib/auth";
import { brandFromClient, brandKitPrompt } from "@/lib/branding";
import { ensureMetaSchema } from "@/lib/ensureMetaSchema";
import { adsWorkspace, DRAFT_COLUMNS, draftFields } from "@/lib/meta/adDrafts";
import { AD_CTAS, AD_OBJECTIVES, maxDailyBudget } from "@/lib/meta/ads";
import { createOpenAIClient, getOpenAIApiKey, openaiErrorMessage } from "@/lib/openai";
import { digisolAdsLandingUrl, isDigisolSiteUrl } from "@/lib/site";
import { companyPublishedFacts } from "@/lib/publishedFacts";
import { companySiteUrl } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST { brief, dailyBudget?, posterUrl?, objective? } — the robot writes a campaign draft. Nothing goes to Meta yet. */
export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;
  const workspace = await adsWorkspace(supabase);
  if ("error" in workspace) return workspace.error;
  if (!getOpenAIApiKey()) return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 400 });
  await ensureMetaSchema().catch(() => null);

  const body = (await request.json().catch(() => null)) as
    | { brief?: string; dailyBudget?: number; posterUrl?: string; objective?: string }
    | null;
  const brief = body?.brief?.trim().slice(0, 2000) || "";
  if (brief.length < 10) return NextResponse.json({ error: "Tell the robot what the ad is for." }, { status: 400 });

  const { companyName, brand } = brandFromClient(workspace.client);
  const site = companySiteUrl(workspace.client);
  const digisolAd = Boolean(site && isDigisolSiteUrl(site));
  const published = await companyPublishedFacts(workspace.client);

  let written: Record<string, unknown> = {};
  try {
    const completion = await createOpenAIClient().chat.completions.create({
      model: routeAgentModel("complex"),
      temperature: 0.5,
      max_tokens: 900,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You set up one Facebook and Instagram ad campaign for ${companyName}. Return JSON with exactly these keys:
name: short internal campaign name with the month, e.g. "Website builds · Oct 2026"
objective: one of ${Object.keys(AD_OBJECTIVES).join(", ")} (leads when the goal is enquiries or quotes)
headline: at most 40 characters
primary_text: 1-3 short sentences, at most 220 characters, ending on one clear next step
description: at most 30 characters
cta: one of ${Object.keys(AD_CTAS).join(", ")}
link_path: ${digisolAd ? `"/" only. Facebook and Instagram ads open https://wwwdigisol.com/ so the visitor sees the site, then clicks Get a free website audit or asks Kaylev. Mention that free audit in primary_text. Never use /contact or ?kaylev=audit.` : `the page path on ${site || "the website"} to send people to, e.g. "/"`}
locations: array of 1-5 place names the brief targets, defaulting to where the company works. List the cities, or one province, or one country — not a city together with the province or country that contains it
age_min, age_max: integers between 18 and 65. Use the ages of people who would actually buy this offer. Use 18 and 65 only when the offer is for every adult.

The brief is the assignment. If it asks for the discount, promo, or offer on the site, write the published facts below. Fit them in the character limits: keep the code and the website-build percent. Do not invent any other price, stat, guarantee, or refund.

${published}

${brandKitPrompt(companyName, brand, "copy")}`,
        },
        { role: "user", content: brief },
      ],
    });
    written = JSON.parse(completion.choices[0]?.message?.content || "{}") as Record<string, unknown>;
  } catch (err) {
    return NextResponse.json({ error: openaiErrorMessage(err) }, { status: 502 });
  }

  const path = typeof written.link_path === "string" && written.link_path.startsWith("/") ? written.link_path : "/";
  const linkUrl =
    site && isDigisolSiteUrl(site) ? digisolAdsLandingUrl() : site ? `${site.replace(/\/$/, "")}${path}` : "";
  const fields = draftFields({
    ...written,
    ...(body?.objective ? { objective: body.objective } : {}),
    daily_budget: body?.dailyBudget || 20,
    poster_url: body?.posterUrl || "",
    link_url: linkUrl,
  });

  const { data, error: insertError } = await supabase
    .from("meta_ad_drafts")
    .insert({
      ...fields,
      name: fields.name || `Campaign · ${new Date().toLocaleDateString("en-CA")}`,
      client_id: workspace.clientId,
      brief,
      status: "draft",
    })
    .select(DRAFT_COLUMNS)
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ ok: true, draft: data, maxDailyBudget: maxDailyBudget() });
}
