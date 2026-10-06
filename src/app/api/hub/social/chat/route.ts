import { NextResponse } from "next/server";
import { routeAgentModel } from "@/lib/agent/modelRouter";
import { requireHubSession } from "@/lib/auth";
import { brandFromClient } from "@/lib/branding";
import { adsWorkspace } from "@/lib/meta/adDrafts";
import { createOpenAIClient, getOpenAIApiKey, openaiErrorMessage } from "@/lib/openai";
import { companyPublishedFacts } from "@/lib/publishedFacts";
import { DIGISOL_SITE_URL, kaylevAuditUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ChatMessage = { role: "user" | "assistant"; content: string };

const CHANNELS = new Set(["facebook", "instagram"]);

function draftsOf(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      const item = row as { channel?: unknown; body?: unknown };
      const channel = typeof item.channel === "string" ? item.channel : "";
      const body = typeof item.body === "string" ? item.body.trim() : "";
      if (!CHANNELS.has(channel) || body.length < 8) return null;
      return { channel: channel as "facebook" | "instagram", body: body.slice(0, 2000) };
    })
    .filter((row): row is { channel: "facebook" | "instagram"; body: string } => Boolean(row))
    .slice(0, 2);
}

/** Kaylev turns the conversation into Facebook and Instagram drafts. Nothing is posted. */
export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;
  const workspace = await adsWorkspace(supabase);
  if ("error" in workspace) return workspace.error;
  if (!getOpenAIApiKey()) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { messages?: ChatMessage[] } | null;
  const messages = (body?.messages ?? [])
    .filter((message) => message && (message.role === "user" || message.role === "assistant"))
    .map((message) => ({
      role: message.role,
      content: String(message.content || "").trim().slice(0, 4000),
    }))
    .filter((message) => message.content)
    .slice(-12);
  if (!messages.some((message) => message.role === "user")) {
    return NextResponse.json({ error: "Say what you want to post." }, { status: 400 });
  }

  const { companyName, brand } = brandFromClient(workspace.client);
  const pricingUrl = `${DIGISOL_SITE_URL}/pricing`;
  const published = await companyPublishedFacts(workspace.client);
  let written: { reply?: unknown; drafts?: unknown } = {};
  try {
    const completion = await createOpenAIClient().chat.completions.create({
      model: routeAgentModel("complex"),
      temperature: 0.6,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are Kaylev, writing social posts for ${companyName}. Speak as Kaylev in the first person. Kaylev is a boy (he/him).
The user's message is the assignment. Execute it. Write every offer, percent, date, promo code, city, and link they name, exactly as they gave it. The brand kit controls voice only. It does not block a promo, discount, or price they just told you to post. Never refuse. Never say an offer has to be in the brand kit.
Return JSON:
reply: 1 to 3 sentences. Say what you wrote. Never say logos, badges, or images are handled elsewhere. If they are only asking a question and did not ask for a post, answer it and leave drafts and visual empty.
drafts: when they want a post, this array must contain the posts. Each has channel ("facebook" or "instagram") and body (the exact caption to publish). Include both channels unless they named only one.
visual: a short art brief for one square image, or an empty string. Set it whenever they ask for a picture, poster, logo, or badge, and also whenever a new post would be clearer with an image. Describe the headline and offer to print. Do not ask the image model to draw a logo or badge. The official logo and the award badge are stamped on after the art is made.
Facebook: a hook, then the offer in their words, then the link they asked for on its own line. If they ask for the pricing page, use ${pricingUrl}. If they name another page, use that. If they name no link, use ${kaylevAuditUrl()}. At most 2 hashtags.
Instagram: no URL in the caption. Include the offer and code. End with "Link in bio." and 4 relevant hashtags.
If they ask for the discount, promo, or offer on the site, use the published facts below even when they did not restate the code or dates. Do not invent any other price, code, or date. Do not drop ones they did give you.

${published}
Voice: ${brand.voice}
Audience: ${brand.audience}
Lean on: ${brand.doSay}
Never use: ${brand.dontSay}
Posts go to ${companyName}'s own Facebook Page and Instagram feed. The public site is ${DIGISOL_SITE_URL}.`,
        },
        ...messages,
      ],
    });
    written = JSON.parse(completion.choices[0]?.message?.content || "{}") as {
      reply?: unknown;
      drafts?: unknown;
    };
  } catch (err) {
    return NextResponse.json({ error: openaiErrorMessage(err) }, { status: 502 });
  }

  const reply =
    typeof written.reply === "string" && written.reply.trim()
      ? written.reply.trim().slice(0, 1200)
      : "Here's a draft. Tell me what to change, or post it when it sounds like you.";
  const visual =
    typeof (written as { visual?: unknown }).visual === "string"
      ? (written as { visual: string }).visual.trim().slice(0, 1500)
      : "";
  return NextResponse.json({ reply, drafts: draftsOf(written.drafts), visual });
}
