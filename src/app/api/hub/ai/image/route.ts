import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
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
import {
  parsePosterSlides,
  withHouseCtaDetails,
  type PosterSlide,
} from "@/lib/posterBrief";
import { posterSlidesToPdf } from "@/lib/posterPdf";
import { posterSocialPack } from "@/lib/posterSocial";
import { stampOfficialLogo } from "@/lib/stampLogo";
import { getOutboundSiteUrl } from "@/lib/supabase/env";
import { getWorkspaceClient } from "@/lib/workspace";

export const runtime = "nodejs";
export const maxDuration = 120;

async function generatePosterBuffer(
  openai: ReturnType<typeof createOpenAIClient>,
  directed: string,
  format: ReturnType<typeof parsePosterFormat>,
  preferred: string | undefined,
) {
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

  const first = image.data?.[0];
  if (first?.b64_json) return Buffer.from(first.b64_json, "base64");
  if (first?.url) {
    const downloaded = await fetch(first.url);
    if (downloaded.ok) return Buffer.from(await downloaded.arrayBuffer());
  }
  return null;
}

async function saveAsset(supabase: SupabaseClient, row: Record<string, unknown>) {
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
    delete row.series_id;
    delete row.slide_index;
    delete row.slide_count;
    ({ data: asset, error: insertError } = await supabase
      .from("assets")
      .insert(row)
      .select("*")
      .single());
  }
  return { asset, insertError };
}

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
    const siteUrl = getOutboundSiteUrl();
    const parsed = parsePosterSlides(prompt);
    const slides: PosterSlide[] = parsed.slides.map((slide) =>
      withHouseCtaDetails(slide, companyName, siteUrl),
    );
    const openai = createOpenAIClient();
    const preferred = process.env.OPENAI_IMAGE_MODEL;
    const logo = await resolveOfficialLogoFile(supabase, client);
    const seriesId = crypto.randomUUID();

    const directedSlides = await Promise.all(
      slides.map((slide) =>
        writePosterArtDirection(openai, {
          companyName,
          brand,
          brief: prompt,
          format,
          slide,
          slideCount: slides.length,
          context: parsed.context,
          siteUrl,
        }),
      ),
    );

    const images: { buffer: Buffer; directed: string; slide: PosterSlide }[] = [];
    for (let index = 0; index < slides.length; index += 1) {
      const directed = directedSlides[index];
      const buffer = await generatePosterBuffer(openai, directed, format, preferred);
      if (!buffer) {
        return NextResponse.json(
          { error: `No image returned for slide ${index + 1}` },
          { status: 502 },
        );
      }
      let stamped = buffer;
      if (logo?.buffer.length) {
        try {
          stamped = await stampOfficialLogo(buffer, logo.buffer);
        } catch (stampError) {
          console.error("Could not stamp official logo", stampError);
        }
      }
      images.push({ buffer: stamped, directed, slide: slides[index] });
    }

    const uploaded: { path: string; publicUrl: string; directed: string; slide: PosterSlide; buffer: Buffer }[] = [];
    for (let index = 0; index < images.length; index += 1) {
      const image = images[index];
      const path = `${Date.now()}-${seriesId}-s${index + 1}.png`;
      const { error: uploadError } = await supabase.storage
        .from("ai-posters")
        .upload(path, image.buffer, {
          contentType: "image/png",
          upsert: false,
        });
      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 400 });
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("ai-posters").getPublicUrl(path);
      uploaded.push({ ...image, path, publicUrl });
    }

    const publicUrls = uploaded.map((item) => item.publicUrl);

    let pdfUrl = "";
    if (images.length > 1) {
      try {
        const pdf = await posterSlidesToPdf(images.map((image) => image.buffer));
        const pdfPath = `${Date.now()}-${seriesId}.pdf`;
        const { error: pdfError } = await supabase.storage.from("ai-posters").upload(pdfPath, pdf, {
          contentType: "application/pdf",
          upsert: false,
        });
        if (!pdfError) {
          pdfUrl = supabase.storage.from("ai-posters").getPublicUrl(pdfPath).data.publicUrl;
        }
      } catch (pdfError) {
        console.error("Could not build poster PDF", pdfError);
      }
    }

    const social = posterSocialPack({
      companyName,
      tagline: brand.tagline,
      brief: prompt,
      imageUrl: publicUrls[0] || "",
      imageUrls: publicUrls,
      pdfUrl: pdfUrl || undefined,
      siteUrl,
      slides,
    });

    const assets: Record<string, unknown>[] = [];
    for (let index = 0; index < uploaded.length; index += 1) {
      const image = uploaded[index];
      const notes = JSON.stringify({
        kind: "ai-poster",
        brief: prompt,
        prompt: image.directed,
        caption: social.instagram,
        social,
        seriesId,
        slideIndex: index + 1,
        slideCount: uploaded.length,
        pdfUrl: pdfUrl || undefined,
      });
      const row: Record<string, unknown> = {
        bucket: "ai-posters",
        path: image.path,
        public_url: image.publicUrl,
        filename: `poster-${seriesId}-slide-${index + 1}.png`,
        mime_type: "image/png",
        kind: "image",
        byte_size: image.buffer.length,
        notes,
        client_id: client?.id || null,
        prompt: image.directed,
        caption: social.instagram,
        social_pack: social,
        series_id: seriesId,
        slide_index: index + 1,
        slide_count: uploaded.length,
      };
      const { asset, insertError } = await saveAsset(supabase, row);
      if (insertError || !asset) {
        return NextResponse.json(
          { error: insertError?.message || "Could not save poster" },
          { status: 400 },
        );
      }
      assets.push(asset);
    }

    return NextResponse.json({
      asset: assets[0],
      assets,
      urls: publicUrls,
      pdfUrl: pdfUrl || undefined,
      slides: slides.map((slide) => ({
        index: slide.index,
        label: slide.label,
        mustPrint: slide.mustPrint,
      })),
      prompt: directedSlides.join("\n\n---\n\n"),
      social,
      logoStamped: Boolean(logo?.buffer.length),
    });
  } catch (err) {
    console.error("AI poster failed", err);
    return NextResponse.json({ error: openaiErrorMessage(err) }, { status: 502 });
  }
}
