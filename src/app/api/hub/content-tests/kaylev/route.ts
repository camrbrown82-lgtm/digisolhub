import { NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { requireHubSession } from "@/lib/auth";
import { brandFromClient, brandKitPrompt, DIGISOL_HOUSE_NAME } from "@/lib/branding";
import { channelInfo, isContentTestChannel } from "@/lib/contentTests";
import { loadContentTests } from "@/lib/contentTestData";
import { dispatchUrl, getDispatchIssue } from "@/lib/dispatch";
import { ensureContentTestSchema } from "@/lib/ensureContentTestSchema";
import { getOpenAIApiKey } from "@/lib/openai";
import { parsePosterMeta } from "@/lib/posterSocial";
import { companyPublishedFacts } from "@/lib/publishedFacts";
import { getWorkspaceClient, resolveClientId } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const KAYLEV_TEST_MODEL = process.env.OPENAI_CONTENT_TEST_MODEL?.trim() || "gpt-4.1-mini";

const planSchema = z.object({
  name: z.string().describe("Short test name, e.g. 'Launch issue: proof vs offer'"),
  hypothesis: z.string().describe("One sentence: what A vs B tests and what we expect"),
  variants: z
    .array(
      z.object({
        variant: z.enum(["A", "B"]),
        label: z.string().describe("2-4 word angle name"),
        angle: z.string().describe("What makes this variant different"),
        body: z.string().describe("Ready-to-post social/ad copy. No link; the Hub appends the tracking link."),
        assetId: z
          .string()
          .nullable()
          .describe("Id of a provided asset that matches what is being promoted, or null"),
        visualIdea: z
          .string()
          .describe("The poster/image this variant needs: headline on the visual, layout, and what it shows"),
        emailSubject: z.string().nullable().describe("Subject line if email is a channel, else null"),
      }),
    )
    .describe("Exactly two items: variant A, then variant B"),
  channelTips: z.array(z.object({ channel: z.string(), tip: z.string() })),
  measure: z.string().describe("Primary metric that decides the winner and why"),
  duration: z.string().describe("How long to run and minimum sample before calling it"),
  checklist: z.array(z.string()).describe("Step-by-step launch checklist"),
});

const analysisSchema = z.object({
  summary: z.string(),
  winner: z.enum(["A", "B", "none"]),
  confidence: z.enum(["low", "medium", "high"]),
  why: z.string(),
  actions: z.array(z.string()),
  nextTest: z.string().describe("The next A/B test to run based on what was learned"),
});

function model() {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  return createOpenAI({ apiKey })(KAYLEV_TEST_MODEL);
}

export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;
  if (!getOpenAIApiKey()) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 503 });
  }
  await ensureContentTestSchema().catch(() => null);
  const active = await getWorkspaceClient(supabase);
  const clientId = (await resolveClientId(supabase)) || active?.id || null;
  const { companyName, brand } = brandFromClient(active);
  const isDigisol = companyName.toLowerCase() === DIGISOL_HOUSE_NAME.toLowerCase();
  const brandPrompt = brandKitPrompt(companyName, brand, "copy");
  const siteFacts = await companyPublishedFacts(active);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  try {
    if (body?.mode === "analyze") {
      return await analyze(body, { supabase, clientId, companyName, brandPrompt, isDigisol, siteFacts });
    }
    return await plan(body ?? {}, { supabase, clientId, companyName, brandPrompt, isDigisol, siteFacts });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Kaylev couldn't finish that." },
      { status: 502 },
    );
  }
}

type Ctx = {
  supabase: Awaited<ReturnType<typeof requireHubSession>>["supabase"];
  clientId: string | null;
  companyName: string;
  brandPrompt: string;
  isDigisol: boolean;
  siteFacts: string;
};

async function plan(body: Record<string, unknown>, ctx: Ctx) {
  const goal = typeof body.goal === "string" ? body.goal.trim().slice(0, 1000) : "";
  const channels = (Array.isArray(body.channels) ? body.channels : []).filter(
    (c): c is string => typeof c === "string" && isContentTestChannel(c),
  );
  const assetIds = (Array.isArray(body.assetIds) ? body.assetIds : []).filter(
    (id): id is string => typeof id === "string",
  );
  const templateIds = (Array.isArray(body.templateIds) ? body.templateIds : []).filter(
    (id): id is string => typeof id === "string",
  );
  const issue =
    ctx.isDigisol && typeof body.dispatchSlug === "string" ? getDispatchIssue(body.dispatchSlug) : undefined;
  let landingUrl = typeof body.landingUrl === "string" ? body.landingUrl.trim() : "";
  if (issue && !landingUrl) landingUrl = dispatchUrl(issue.slug);
  if (!goal && !issue) {
    return NextResponse.json({ error: "Tell Kaylev the goal, or pick a Dispatch issue." }, { status: 400 });
  }

  const [assetsRes, templatesRes] = await Promise.all([
    assetIds.length
      ? ctx.supabase
          .from("assets")
          .select("id, filename, mime_type, notes")
          .in("id", assetIds)
          .eq("client_id", ctx.clientId)
      : Promise.resolve({ data: [] }),
    templateIds.length
      ? ctx.supabase.from("email_templates").select("id, name, subject").in("id", templateIds)
      : Promise.resolve({ data: [] }),
  ]);
  const assets = ((assetsRes.data ?? []) as { id: string; filename: string | null; mime_type: string | null; notes: string | null }[]).map(
    (row) => {
      const meta = parsePosterMeta(row.notes);
      return {
        id: row.id,
        name: row.filename || "file",
        type: meta?.kind === "poster" || meta?.brief ? "AI poster" : row.mime_type || "file",
        about: (meta?.caption || meta?.brief || "").slice(0, 300),
      };
    },
  );
  const templates = (templatesRes.data ?? []) as { id: string; name: string | null; subject: string | null }[];

  const { output, usage } = await generateText({
    model: model(),
    output: Output.object({ schema: planSchema }),
    maxOutputTokens: 2500,
    system: `You are Kaylev, the marketing assistant inside the DigiSol Hub, planning an A/B test for ${ctx.companyName}.
This test belongs to ${ctx.companyName} only. Use only its brand kit, voice, and facts. Never mention DigiSol unless ${ctx.companyName} is DigiSol.
${ctx.brandPrompt}
Rules:
- A and B must differ in ONE clear variable (hook, offer framing, proof, format, or visual) so the result teaches something.
- Copy is ready to post: short, platform-aware, max 3 hashtags, one clear call to action, no links (the Hub adds a tracking link per channel), no invented prices, stats, or claims beyond the source material and the published site facts.
${ctx.siteFacts}
- Only use assetId values from the provided asset list, and only when the asset is about the same thing being promoted. Never attach an asset about a different topic, issue, or offer; use null instead.
- Always write visualIdea for the poster/image each variant should use, based on the source material. If testing copy, both variants use the same visual.
- Plain, confident Canadian English.`,
    prompt: [
      `Goal: ${goal || "Drive readers to the newsletter issue and convert them to leads."}`,
      `Channels: ${channels.map((c) => channelInfo(c)?.label || c).join(", ") || "Facebook, Instagram"}`,
      landingUrl ? `Landing page: ${landingUrl}` : "",
      issue
        ? `Newsletter issue to promote: "${issue.title}"\nSummary: ${issue.excerpt}\nSections: ${issue.sections.map((s) => s.heading).join("; ")}${issue.cta ? `\nOffer: ${issue.cta.heading}. ${issue.cta.body}` : ""}\nThis is a newsletter test: both variants share the newsletter's own preview card as the visual (issue title, volume, and offer), so the ONLY variable is the post copy. Get people to read this issue. Set assetId to null unless an asset is provided, and set visualIdea to "Newsletter preview card".`
        : "",
      assets.length
        ? `Assets available (id | name | type | about):\n${assets.map((a) => `${a.id} | ${a.name} | ${a.type} | ${a.about}`).join("\n")}`
        : issue
          ? ""
          : "No assets selected; set assetId to null and describe the visual in visualIdea.",
      templates.length
        ? `Email templates in play: ${templates.map((t) => `${t.name} (subject: ${t.subject || "none"})`).join("; ")}`
        : "",
      typeof body.notes === "string" && body.notes.trim() ? `Operator notes: ${body.notes.trim().slice(0, 600)}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  });

  const validAssets = new Set(assets.map((a) => a.id));
  return NextResponse.json({
    plan: {
      ...output,
      landingUrl,
      variants: (["A", "B"] as const).flatMap((variant) => {
        const v = output.variants.find((row) => row.variant === variant);
        return v ? [{ ...v, assetId: v.assetId && validAssets.has(v.assetId) ? v.assetId : null }] : [];
      }),
    },
    tokens: (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0),
  });
}

async function analyze(body: Record<string, unknown>, ctx: Ctx) {
  const testId = typeof body.testId === "string" ? body.testId : "";
  const load = await loadContentTests(ctx.supabase, ctx.clientId, { useGa4: ctx.isDigisol, limit: 50 });
  const item = load.tests.find((t) => t.test.id === testId);
  if (!item) return NextResponse.json({ error: "Test not found for this company." }, { status: 404 });

  const lines = item.results.map((r) => {
    const variant = item.variants.find((v) => v.variant === r.variant);
    const channels = r.byChannel
      .map(
        (c) =>
          `  ${channelInfo(c.channel)?.label || c.channel}: visits ${c.sessions}, engaged ${c.engaged}, conversions ${c.keyEvents}, leads ${c.leads}, impressions ${c.impressions}, clicks ${c.clicks}, engagements ${c.engagements}, spend $${c.spend}`,
      )
      .join("\n");
    return `Variant ${r.variant} (${variant?.label || ""}): ${variant?.body?.slice(0, 400) || "(no copy)"}\nAsset: ${variant?.asset?.filename || "none"}\nPosts published: ${r.posts.filter((p) => p.status === "published").length}\n${channels}`;
  });

  const { output } = await generateText({
    model: model(),
    output: Output.object({ schema: analysisSchema }),
    maxOutputTokens: 1200,
    system: `You are Kaylev in the DigiSol Hub, reading A/B test results for ${ctx.companyName}. Be honest about sample size: with fewer than ~3 leads and ~60 visits or clicks per variant, confidence is low and the winner is usually "none". Leads beat conversions, which beat engaged visits, clicks, and raw visits. Give concrete next actions.`,
    prompt: `Test: ${item.test.name}\nHypothesis: ${item.test.hypothesis || "n/a"}\nChannels: ${item.test.channels.join(", ")}\nStarted: ${item.test.created_at}\nGA4 visits tracked: ${load.gaConfigured ? "yes" : "no (leads and manual ad numbers only)"}\n\n${lines.join("\n\n")}`,
  });

  const kaylev = {
    analysis: `${output.summary}\n\n${output.why}`,
    recommendation: output.winner === "none" ? "Keep running" : `Variant ${output.winner} (${output.confidence} confidence)`,
    actions: output.actions,
    nextTest: output.nextTest,
    analyzedAt: new Date().toISOString(),
  };
  await ctx.supabase.from("content_tests").update({ kaylev }).eq("id", item.test.id);
  return NextResponse.json({ analysis: output, kaylev });
}

