import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { brandFromClient } from "@/lib/branding";
import {
  fetchLogoBuffer,
  getBrandLogoAsset,
  resolveBrandLogoUrl,
} from "@/lib/brandLogo";
import {
  createOpenAIClient,
  getOpenAIApiKey,
  openaiErrorMessage,
  shouldFallbackImageModel,
} from "@/lib/openai";
import {
  imageEditBody,
  imageGenerateBody,
  parsePosterFormat,
  resolveImageModel,
  writePosterArtDirection,
} from "@/lib/poster";
import { getActiveClient, getActiveClientId } from "@/lib/workspace";

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
    const active = await getActiveClient(supabase);
    const { companyName, brand } = brandFromClient(active);
    const openai = createOpenAIClient();
    const artDirection = await writePosterArtDirection(openai, {
      companyName,
      brand,
      brief: prompt,
      format,
    });

    const preferred = process.env.OPENAI_IMAGE_MODEL;
    const resolved = resolveImageModel(preferred);
    const logoAsset = await getBrandLogoAsset(supabase, active?.id || null);
    const logoUrl = resolveBrandLogoUrl({
      brand,
      companyName,
      assetUrl: logoAsset?.public_url,
    });
    const logo = logoUrl ? await fetchLogoBuffer(logoUrl) : null;
    const logoFile = logo
      ? new File([new Uint8Array(logo.buffer)], logo.filename, {
          type: logo.contentType,
        })
      : null;
    const directed = logo
      ? `${artDirection}\nUse the official ${companyName} logo exactly as described. Do not invent a replacement mark.`
      : artDirection;

    let image;
    const generate = (model?: string) =>
      openai.images.generate(imageGenerateBody(model ?? preferred, directed, format));

    try {
      if (logoFile && /gpt-image|chatgpt-image/i.test(resolved)) {
        try {
          image = await openai.images.edit(
            imageEditBody(
              preferred,
              `${directed}\nThe attached image is the official logo. Place that exact mark; do not redesign it.`,
              format,
              logoFile,
            ),
          );
        } catch {
          image = await generate();
        }
      } else {
        image = await generate();
      }
    } catch (err) {
      const triedGptImage = /gpt-image|chatgpt-image/i.test(preferred?.trim() || "");
      if (!triedGptImage && shouldFallbackImageModel(err)) {
        throw err;
      }
      if (triedGptImage && shouldFallbackImageModel(err)) {
        image = await generate("dall-e-3");
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

    const { data: asset, error: insertError } = await supabase
      .from("assets")
      .insert({
        bucket: "ai-posters",
        path,
        public_url: publicUrl,
        filename: `poster-${Date.now()}.png`,
        mime_type: "image/png",
        kind: "image",
        client_id: (await getActiveClientId()) || null,
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({
      asset,
      prompt: directed,
      revisedPrompt: first?.revised_prompt,
    });
  } catch (err) {
    console.error("AI poster failed", err);
    return NextResponse.json({ error: openaiErrorMessage(err) }, { status: 502 });
  }
}
