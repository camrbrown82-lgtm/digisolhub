import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { brandFromClient, parseBrand } from "@/lib/branding";
import {
  BRAND_LOGO_NOTE,
  describeLogoFromImage,
  parseLogoStyle,
  persistClientLogo,
  replaceLogoAsset,
  writeLogoArtDirection,
} from "@/lib/brandLogo";
import {
  createOpenAIClient,
  getOpenAIApiKey,
  openaiErrorMessage,
  shouldFallbackImageModel,
} from "@/lib/openai";
import { imageGenerateBody } from "@/lib/poster";
import { getActiveClientId } from "@/lib/workspace";

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
  let style = parseLogoStyle(undefined);
  let clientId = "";
  try {
    const body = (await request.json()) as {
      prompt?: string;
      style?: string;
      clientId?: string;
    };
    prompt = body.prompt?.trim() || "";
    style = parseLogoStyle(body.style);
    clientId = body.clientId?.trim() || "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const id = clientId || (await getActiveClientId());
  if (!id) {
    return NextResponse.json({ error: "Select a company first" }, { status: 400 });
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, branding")
    .eq("id", id)
    .maybeSingle();
  if (!client) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  try {
    const { companyName, brand } = brandFromClient(client);
    const openai = createOpenAIClient();
    const artDirection = await writeLogoArtDirection(openai, {
      companyName,
      brand: parseBrand(client.branding, brand),
      brief: prompt,
      style,
    });

    const preferred = process.env.OPENAI_IMAGE_MODEL;
    let image;
    try {
      image = await openai.images.generate(imageGenerateBody(preferred, artDirection, "square"));
    } catch (err) {
      const triedGptImage = /gpt-image|chatgpt-image/i.test(preferred?.trim() || "");
      if (!triedGptImage && shouldFallbackImageModel(err)) {
        throw err;
      }
      if (triedGptImage && shouldFallbackImageModel(err)) {
        image = await openai.images.generate(
          imageGenerateBody("dall-e-3", artDirection, "square"),
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
      return NextResponse.json({ error: "No logo returned" }, { status: 502 });
    }

    const { publicUrl } = await replaceLogoAsset(supabase, {
      clientId: id,
      buffer,
      filename: `logo-${Date.now()}.png`,
      contentType: "image/png",
      byteSize: buffer.length,
      note: BRAND_LOGO_NOTE,
    });

    let logoDescription = "";
    try {
      logoDescription = await describeLogoFromImage(openai, {
        companyName,
        buffer,
        contentType: "image/png",
      });
    } catch {
      logoDescription = "";
    }

    await persistClientLogo(supabase, id, {
      logoUrl: publicUrl,
      logoDescription,
    });

    return NextResponse.json({
      url: publicUrl,
      prompt: artDirection,
      description: logoDescription,
      revisedPrompt: first?.revised_prompt,
    });
  } catch (err) {
    console.error("AI logo failed", err);
    return NextResponse.json({ error: openaiErrorMessage(err) }, { status: 502 });
  }
}
