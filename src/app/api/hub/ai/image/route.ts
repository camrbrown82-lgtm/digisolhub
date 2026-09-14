import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { brandFromClient } from "@/lib/branding";
import {
  createOpenAIClient,
  getOpenAIApiKey,
  openaiErrorMessage,
  shouldFallbackImageModel,
} from "@/lib/openai";
import {
  imageGenerateBody,
  parsePosterFormat,
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
    let image;
    try {
      image = await openai.images.generate(
        imageGenerateBody(preferred, artDirection, format),
      );
    } catch (err) {
      const triedGptImage = /gpt-image|chatgpt-image/i.test(preferred?.trim() || "");
      if (!triedGptImage && shouldFallbackImageModel(err)) {
        throw err;
      }
      if (triedGptImage && shouldFallbackImageModel(err)) {
        image = await openai.images.generate(
          imageGenerateBody("dall-e-3", artDirection, format),
        );
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
      prompt: artDirection,
      revisedPrompt: first?.revised_prompt,
    });
  } catch (err) {
    console.error("AI poster failed", err);
    return NextResponse.json({ error: openaiErrorMessage(err) }, { status: 502 });
  }
}
