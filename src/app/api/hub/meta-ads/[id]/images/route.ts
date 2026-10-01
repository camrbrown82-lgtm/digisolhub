import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { brandFromClient } from "@/lib/branding";
import { resolveOfficialLogoFile } from "@/lib/brandLogo";
import { jsonSafeText } from "@/lib/jsonSafe";
import { adsWorkspace, type AdDraftRow } from "@/lib/meta/adDrafts";
import { AD_CTAS, type AdCta } from "@/lib/meta/adOptions";
import { createOpenAIClient, getOpenAIApiKey, shouldFallbackImageModel } from "@/lib/openai";
import { imageGenerateBody, writePosterArtDirection, type PosterFormat } from "@/lib/poster";
import type { PosterSlide } from "@/lib/posterBrief";
import { stampOfficialLogo } from "@/lib/stampLogo";
import { getWorkspaceClient } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const LOOKS = [
  "Facebook and Instagram feed ad, exact 4:5. One huge headline, one short line under it, one solid button. The design fills the frame edge to edge. No badge, no collage, no tiny print.",
  "A second 4:5 feed ad with a different layout: headline across the top, a simple abstract scene in the brand colors in the middle, the short line and button at the bottom. Same words. Still edge to edge.",
];

type Params = { params: { id: string } };

/** POST — make two new feed-sized ad images from this draft's copy. Saved posters stay available too. */
export async function POST(request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;
  const workspace = await adsWorkspace(supabase);
  if ("error" in workspace) return workspace.error;
  if (!getOpenAIApiKey()) return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 400 });

  const { data } = await supabase
    .from("meta_ad_drafts")
    .select("id, headline, primary_text, description, cta, link_url, name")
    .eq("id", params.id)
    .eq("client_id", workspace.clientId)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  const draft = data as Pick<AdDraftRow, "headline" | "primary_text" | "description" | "cta" | "link_url" | "name">;

  const body = (await request.json().catch(() => null)) as {
    headline?: string;
    description?: string;
    cta?: string;
  } | null;
  const headline = (body?.headline || draft.headline).trim().slice(0, 40);
  const description = (body?.description || draft.description).trim().slice(0, 30);
  const ctaKey = (body?.cta || draft.cta) as AdCta;
  const button = AD_CTAS[ctaKey] || "Learn more";
  if (!headline) return NextResponse.json({ error: "Add a headline first." }, { status: 400 });

  const client = await getWorkspaceClient(supabase);
  const { companyName, brand } = brandFromClient(client);
  const site = (draft.link_url || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const openai = createOpenAIClient();
  const logo = await resolveOfficialLogoFile(supabase, client);
  const preferred = process.env.OPENAI_IMAGE_MODEL;
  const made: { url: string; label: string }[] = [];

  for (let index = 0; index < LOOKS.length; index += 1) {
    const slide: PosterSlide = {
      index: 1,
      label: "Ad",
      role: "hook",
      visualIdea: LOOKS[index],
      headline,
      subhead: description,
      body: "",
      mustPrint: [headline, description, button, site].filter(Boolean),
    };
    const directed = await writePosterArtDirection(openai, {
      companyName,
      brand,
      brief: draft.name,
      format: "portrait",
      slide,
      slideCount: 1,
      siteUrl: draft.link_url,
    });
    const buffer = await generate(openai, directed, "portrait", preferred);
    if (!buffer) continue;
    const canvas = {
      format: "portrait" as const,
      backgroundColor: brand.backgroundColor,
      accentColor: brand.highlightColor || brand.accentColor,
    };
    const stamped = await stampOfficialLogo(buffer, logo?.buffer ?? null, canvas).catch(() =>
      stampOfficialLogo(buffer, null, canvas),
    );
    const path = `${Date.now()}-ad-${params.id.slice(0, 8)}-v${index + 1}.png`;
    const { error: uploadError } = await supabase.storage.from("ai-posters").upload(path, stamped, {
      contentType: "image/png",
      upsert: false,
    });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });
    const publicUrl = supabase.storage.from("ai-posters").getPublicUrl(path).data.publicUrl;
    await supabase.from("assets").insert({
      bucket: "ai-posters",
      path,
      public_url: publicUrl,
      filename: `ad-${index + 1}.png`,
      mime_type: "image/png",
      kind: "image",
      client_id: workspace.clientId,
      notes: "ad-creative",
      caption: headline,
    });
    made.push({ url: publicUrl, label: `Version ${index + 1} · 1080×1350` });
  }

  if (made[0]) {
    await supabase
      .from("meta_ad_drafts")
      .update({ poster_url: made[0].url, updated_at: new Date().toISOString() })
      .eq("id", params.id);
  }

  if (!made.length) return NextResponse.json({ error: "No ad image came back." }, { status: 502 });
  return NextResponse.json({ ok: true, images: made });
}

async function generate(
  openai: ReturnType<typeof createOpenAIClient>,
  directed: string,
  format: PosterFormat,
  preferred: string | undefined,
) {
  let image;
  try {
    image = await openai.images.generate(imageGenerateBody(preferred, directed, format));
  } catch (err) {
    if (!shouldFallbackImageModel(err)) throw err;
    image = await openai.images.generate(imageGenerateBody("dall-e-3", jsonSafeText(directed).slice(0, 2500), format));
  }
  const first = image.data?.[0];
  if (first?.b64_json) return Buffer.from(first.b64_json, "base64");
  if (first?.url) {
    const downloaded = await fetch(first.url);
    if (downloaded.ok) return Buffer.from(await downloaded.arrayBuffer());
  }
  return null;
}
