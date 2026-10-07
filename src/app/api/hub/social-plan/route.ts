import { NextResponse } from "next/server";
import { routeAgentModel } from "@/lib/agent/modelRouter";
import { requireHubSession } from "@/lib/auth";
import { brandFromClient, brandKitPrompt } from "@/lib/branding";
import { ACTIVE_SOCIAL_CHANNELS } from "@/lib/campaignChannels";
import { ensureAnalyticsSocialSchema } from "@/lib/ensureAnalyticsSocialSchema";
import { ensureMetaSchema } from "@/lib/ensureMetaSchema";
import { adsWorkspace } from "@/lib/meta/adDrafts";
import { AD_CTAS, AD_OBJECTIVES } from "@/lib/meta/adOptions";
import { maxDailyBudget } from "@/lib/meta/ads";
import { metaPixelId } from "@/lib/meta/config";
import { createOpenAIClient, getOpenAIApiKey, openaiErrorMessage } from "@/lib/openai";
import { isBusinessCardAsset } from "@/lib/posterArchive";
import { isStoredPosterUrl } from "@/lib/posterSizes";
import { isDigisolSiteUrl, kaylevAuditUrl } from "@/lib/site";
import { dailyFromWeekly, planItems } from "@/lib/social/weekPlan";
import { companyPublishedFacts } from "@/lib/publishedFacts";
import { companySiteUrl } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST { brief, weeklyBudget } — draft a week of posts plus one ad. Nothing is published yet. */
export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;
  const workspace = await adsWorkspace(supabase);
  if ("error" in workspace) return workspace.error;
  if (!getOpenAIApiKey()) return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 400 });
  await Promise.all([ensureAnalyticsSocialSchema().catch(() => null), ensureMetaSchema().catch(() => null)]);

  const body = (await request.json().catch(() => null)) as { brief?: string; weeklyBudget?: number } | null;
  const brief = body?.brief?.trim().slice(0, 2000) || "";
  if (brief.length < 10) return NextResponse.json({ error: "Say what this week should promote." }, { status: 400 });
  const maxDaily = maxDailyBudget();
  const weekly = Math.min(maxDaily * 7, Math.max(0, Math.round(Number(body?.weeklyBudget) || 0)));
  const daily = dailyFromWeekly(weekly, maxDaily);

  const { data: posterRows } = await supabase
    .from("assets")
    .select("public_url, filename, notes")
    .eq("bucket", "ai-posters")
    .eq("client_id", workspace.clientId)
    .order("created_at", { ascending: false })
    .limit(12);
  const posters = (posterRows ?? [])
    .filter((row) => !isBusinessCardAsset(row))
    .map((row) => row.public_url as string)
    .filter(isStoredPosterUrl);
  const { companyName, brand } = brandFromClient(workspace.client);
  const site = companySiteUrl(workspace.client);
  const published = await companyPublishedFacts(workspace.client);
  const leadsOk = Boolean(metaPixelId());
  const channels = ACTIVE_SOCIAL_CHANNELS.join(", ");

  let written: Record<string, unknown> = {};
  try {
    const completion = await createOpenAIClient().chat.completions.create({
      model: routeAgentModel("complex"),
      temperature: 0.5,
      max_tokens: 1400,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You plan one week of social media for ${companyName}. Return JSON:
summary: 1 sentence of the plan
why: 2 sentences on which platform and which cities will work best, and why
posts: exactly 3 objects, each with channel (one of ${channels}), dayOffset (0, 2 or 4), hour (8-20, Mountain Time), body (the full post, at most 400 characters), posterIndex (0 to ${Math.max(0, posters.length - 1)}), reason (one short sentence)
ad: one object with name, objective (${leadsOk ? Object.keys(AD_OBJECTIVES).join(" or ") : "OUTCOME_TRAFFIC only"}), headline (max 40 characters), primaryText${site && isDigisolSiteUrl(site) ? " (mention the free website audit — the click opens Kaylev)" : ""}, description (max 30 characters), cta (one of ${Object.keys(AD_CTAS).join(", ")}), linkPath (a path on ${site || "the site"}), locations (1-4 city names, or one province, not a city plus the province that contains it), ageMin, ageMax, posterIndex, reason

Posts publish to the company's Facebook Page and Instagram feed. Ads run on Facebook and Instagram in the cities you name. Do not plan Groups, Stories, TikTok, or LinkedIn ads.
Offers, codes, dates, prices, and links in the brief are required. Write them. If the brief asks for the discount or offer on the site, use the published facts below. Do not drop them because they are not in the brand kit. Do not invent any other stat or price.

${published}

${brandKitPrompt(companyName, brand, "copy")}`,
        },
        {
          role: "user",
          content: `Weekly ad budget: $${weekly} (about $${daily} a day). Posting is free.\nBrief: ${brief}\nPosters available: ${posters.length}`,
        },
      ],
    });
    written = JSON.parse(completion.choices[0]?.message?.content || "{}") as Record<string, unknown>;
  } catch (err) {
    return NextResponse.json({ error: openaiErrorMessage(err) }, { status: 502 });
  }

  const posts = Array.isArray(written.posts) ? written.posts : [];
  const ad = written.ad && typeof written.ad === "object" ? (written.ad as Record<string, unknown>) : null;
  const withPoster = (index: unknown) => posters[Math.max(0, Math.min(posters.length - 1, Number(index) || 0))] || "";
  const path = ad && typeof ad.linkPath === "string" && ad.linkPath.startsWith("/") ? ad.linkPath : "/";
  const items = planItems(
    [
      ...posts.map((post, index) => {
        const row = post as Record<string, unknown>;
        return { ...row, id: `post-${index + 1}`, kind: "post", posterUrl: withPoster(row.posterIndex) };
      }),
      ad
        ? {
            ...ad,
            id: "ad",
            kind: "ad",
            posterUrl: withPoster(ad.posterIndex),
            linkUrl:
              site && isDigisolSiteUrl(site) ? kaylevAuditUrl() : site ? `${site.replace(/\/$/, "")}${path}` : "",
            included: weekly > 0,
          }
        : null,
    ].filter(Boolean),
    posters,
    site,
  );

  const { data, error: insertError } = await supabase
    .from("social_plans")
    .insert({
      client_id: workspace.clientId,
      status: "draft",
      brief,
      weekly_budget: weekly,
      summary: String(written.summary || "").slice(0, 400),
      why: String(written.why || "").slice(0, 600),
      items,
    })
    .select("id, status, brief, weekly_budget, summary, why, items, error, created_at, approved_at")
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  return NextResponse.json({ ok: true, plan: data, dailyBudget: daily, maxWeekly: maxDaily * 7 });
}
