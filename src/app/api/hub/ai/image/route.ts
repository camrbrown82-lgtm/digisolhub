import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireHubSession } from "@/lib/auth";

export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as { prompt?: string };
  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_IMAGE_MODEL || "dall-e-3";

  const image = await openai.images.generate({
    model,
    prompt,
    size: "1024x1024",
    response_format: "b64_json",
  });

  const b64 = image.data?.[0]?.b64_json;
  if (!b64) {
    return NextResponse.json({ error: "No image returned" }, { status: 502 });
  }

  const buffer = Buffer.from(b64, "base64");
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
    })
    .select("*")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({ asset, revisedPrompt: image.data?.[0]?.revised_prompt });
}
