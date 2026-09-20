import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { brandFromClient } from "@/lib/branding";
import { resolveOfficialLogoFile } from "@/lib/brandLogo";
import {
  createOpenAIClient,
  getOpenAIApiKey,
  openaiErrorMessage,
  shouldFallbackImageModel,
} from "@/lib/openai";
import {
  imageGenerateBody,
  parsePosterFormat,
  resolveImageModel,
  writePosterArtDirection,
} from "@/lib/poster";
import { posterSocialPack } from "@/lib/posterSocial";
import { stampOfficialLogo } from "@/lib/stampLogo";
import { getOutboundSiteUrl } from "@/lib/supabase/env";
import { getWorkspaceClient } from "@/lib/workspace";

export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  if (!getOpenAIApiKey()) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY is not configured. Add it in Vercel Production and .env.local, then redeploy.",
      },
      { status: 503 },
    );
  }

  let prompt = "";
  let format = parsePosterFormat(undefined);
  try {
    const body = (await request.json()) as { prompt?: string; format?: string };
    prompt = body.prompt?.trim() || "";
    format = parsePosterFormat(body.format);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  try {
    const client = await getWorkspaceClient(supabase);
    const { companyName, brand } = brandFromClient(client);
    const openai = createOpenAIClient();
    const artDirection = await writePosterArtDirection(openai, {
      companyName,
      brand,
      brief: prompt,
      format,
    });
    const directed = [
      artDirection,
      `Palette only: ${brand.primaryColor}, ${brand.secondaryColor}, ${brand.accentColor}, ${brand.backgroundColor}.`,
      `Leave the top 20% empty ${brand.backgroundColor} space. Do not draw a logo or the letters of "${companyName}".`,
      brand.tagline ? `Headline may use: "${brand.tagline}".` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const preferred = process.env.OPENAI_IMAGE_MODEL;
    const resolved = resolveImageModel(preferred);
    let image;
    try {
      image = await openai.images.generate(imageGenerateBody(preferred, directed, format));
    } catch (err) {
      const triedGptImage = /gpt-image|chatgpt-image/i.test(resolved);
      if (triedGptImage && shouldFallbackImageModel(err)) {
        image = await openai.images.generate(imageGenerateBody("dall-e-3", directed, format));
      } else {
        throw err;
      }
    }

    let buffer: Buffer | null = null;
    const first = image.data?.[0];
    if (first?.b64_json) {
      buffer = Buffer.from(first.b64_json, "base64");
    } else if (first?.url) {
      const downloaded = await fetch(first.url);
      if (downloaded.ok) {
        buffer = Buffer.from(await downloaded.arrayBuffer());
      }
    }

    if (!buffer) {
      return NextResponse.json({ error: "No image returned" }, { status: 502 });
    }

    const logo = await resolveOfficialLogoFile(supabase, client);
    if (logo?.buffer.length) {
      try {
        buffer = await stampOfficialLogo(buffer, logo.buffer);
      } catch (stampError) {
        console.error("Could not stamp official logo", stampError);
      }
    }

    const path = `${Date.now()}-${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("ai-posters")
      .upload(path, buffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("ai-posters").getPublicUrl(path);

    const social = posterSocialPack({
      companyName,
      tagline: brand.tagline,
      brief: prompt,
      imageUrl: publicUrl,
      siteUrl: getOutboundSiteUrl(),
    });
    const notes = JSON.stringify({
      kind: "ai-poster",
      brief: prompt,
      prompt: directed,
      caption: social.instagram,
      social,
    });

    const row: Record<string, unknown> = {
      bucket: "ai-posters",
      path,
      public_url: publicUrl,
      filename: `poster-${Date.now()}.png`,
      mime_type: "image/png",
      kind: "image",
      byte_size: buffer.length,
      notes,
      client_id: client?.id || null,
      prompt: directed,
      caption: social.instagram,
      social_pack: social,
    };

    let asset;
    let insertError;
    ({ data: asset, error: insertError } = await supabase
      .from("assets")
      .insert(row)
      .select("*")
      .single());

    if (insertError) {
      delete row.prompt;
      delete row.caption;
      delete row.social_pack;
      ({ data: asset, error: insertError } = await supabase
        .from("assets")
        .insert(row)
        .select("*")
        .single());
    }

    if (insertError || !asset) {
      return NextResponse.json(
        { error: insertError?.message || "Could not save poster" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      asset: { ...asset, social_pack: social, caption: social.instagram, prompt: directed },
      prompt: directed,
      revisedPrompt: first?.revised_prompt,
      social,
      logoStamped: Boolean(logo?.buffer.length),
    });
  } catch (err) {
    console.error("AI poster failed", err);
    return NextResponse.json({ error: openaiErrorMessage(err) }, { status: 502 });
  }
}
