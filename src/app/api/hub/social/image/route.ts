import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { brandFromClient, brandImagePrompt } from "@/lib/branding";
import { resolveOfficialLogoFile } from "@/lib/brandLogo";
import { createOpenAIClient, getOpenAIApiKey, openaiErrorMessage, shouldFallbackImageModel } from "@/lib/openai";
import { imageGenerateBody } from "@/lib/poster";
import { renderBadgePng, resolvePosterBadge } from "@/lib/posterBadge";
import { artFormatFor, badgeWidthFor, stampOfficialLogo } from "@/lib/stampLogo";
import { getWorkspaceClient } from "@/lib/workspace";

export const runtime = "nodejs";
export const maxDuration = 120;

/** One square social image for the Working-on company, with its official logo and badge stamped on. */
export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;
  if (!getOpenAIApiKey()) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { prompt?: string } | null;
  const prompt = body?.prompt?.trim().slice(0, 1500) || "";
  if (prompt.length < 8) {
    return NextResponse.json({ error: "Say what the image should show." }, { status: 400 });
  }

  const client = await getWorkspaceClient(supabase);
  const { companyName, brand } = brandFromClient(client);
  const brief = /\bbadge\b/i.test(prompt) ? prompt : `${prompt}\nInclude the website excellence award badge.`;
  const artFormat = artFormatFor("square", true);
  const directed = brandImagePrompt(companyName, brand, brief, artFormat);
  const openai = createOpenAIClient();
  const preferred = process.env.OPENAI_IMAGE_MODEL;

  let buffer: Buffer | null = null;
  try {
    const image = await openai.images.generate(imageGenerateBody(preferred, directed, artFormat));
    const first = image.data?.[0];
    if (first?.b64_json) buffer = Buffer.from(first.b64_json, "base64");
    else if (first?.url) {
      const downloaded = await fetch(first.url);
      if (downloaded.ok) buffer = Buffer.from(await downloaded.arrayBuffer());
    }
  } catch (err) {
    if (!shouldFallbackImageModel(err)) {
      return NextResponse.json({ error: openaiErrorMessage(err) }, { status: 502 });
    }
    try {
      const image = await openai.images.generate(imageGenerateBody("dall-e-3", directed.slice(0, 2500), artFormat));
      const first = image.data?.[0];
      if (first?.b64_json) buffer = Buffer.from(first.b64_json, "base64");
    } catch (fallbackErr) {
      return NextResponse.json({ error: openaiErrorMessage(fallbackErr) }, { status: 502 });
    }
  }
  if (!buffer) return NextResponse.json({ error: "No image came back." }, { status: 502 });

  const logo = await resolveOfficialLogoFile(supabase, client);
  const { badge } = await resolvePosterBadge(supabase, client, brief).catch(() => ({ badge: null }));
  const badgePng = badge ? await renderBadgePng(badge.award, badgeWidthFor("square")).catch(() => null) : null;
  const stamped = await stampOfficialLogo(buffer, logo?.buffer ?? null, {
    format: "square",
    backgroundColor: brand.backgroundColor,
    accentColor: brand.highlightColor || brand.accentColor,
    textColor: brand.textColor,
    badge: badgePng,
  }).catch(() => buffer!);

  const path = `${Date.now()}-social.png`;
  const { error: uploadError } = await supabase.storage.from("ai-posters").upload(path, stamped, {
    contentType: "image/png",
    upsert: false,
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });
  const { data: stored } = supabase.storage.from("ai-posters").getPublicUrl(path);
  const { error: insertError } = await supabase.from("assets").insert({
    bucket: "ai-posters",
    path,
    public_url: stored.publicUrl,
    filename: path,
    mime_type: "image/png",
    kind: "image",
    byte_size: stamped.length,
    client_id: client?.id || null,
    caption: prompt.slice(0, 160),
    notes: "social-studio",
  });
  if (insertError) console.error("Could not save social image", insertError.message);

  return NextResponse.json({
    url: stored.publicUrl,
    label: prompt.slice(0, 80),
  });
}
