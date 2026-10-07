import { NextResponse } from "next/server";
import sharp from "sharp";

sharp.cache(false);
sharp.concurrency(1);
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireHubSession } from "@/lib/auth";
import { brandFromClient } from "@/lib/branding";
import { fetchLogoBuffer, resolveOfficialLogoFile } from "@/lib/brandLogo";
import {
  createOpenAIClient,
  getOpenAIApiKey,
  openaiErrorMessage,
  shouldFallbackImageModel,
} from "@/lib/openai";
import {
  imageGenerateBody,
  parsePosterFormat,
  posterEditableLines,
  writePosterArtDirection,
} from "@/lib/poster";
import { imagePiece, piecesFromCopy, piecesFromRoles, withArtworkPiece, type LayoutPiece } from "@/lib/layoutPieces";
import { stampLayoutText } from "@/lib/layoutText";
import { POSTER_CANVAS } from "@/lib/posterSizes";
import { jsonSafeText, jsonSafeValue } from "@/lib/jsonSafe";
import {
  parsePosterSlides,
  withHouseCtaDetails,
  type PosterSlide,
} from "@/lib/posterBrief";
import { posterSlidesToPdf } from "@/lib/posterPdf";
import { renderBadgePng, resolvePosterBadge } from "@/lib/posterBadge";
import { posterSocialPack } from "@/lib/posterSocial";
import { renderQrPng } from "@/lib/qrMark";
import { kaylevSourceUrl } from "@/lib/site";
import { badgeWidthFor, fitInto } from "@/lib/stampLogo";
import { companyPublishedFacts } from "@/lib/publishedFacts";
import { companySiteUrl, getWorkspaceClient } from "@/lib/workspace";

export const runtime = "nodejs";
export const maxDuration = 120;

async function generatePosterBuffer(
  openai: ReturnType<typeof createOpenAIClient>,
  directed: string,
  format: ReturnType<typeof parsePosterFormat>,
  preferred: string | undefined,
) {
  let image;
  try {
    image = await openai.images.generate(imageGenerateBody(preferred, directed, format));
  } catch (err) {
    if (shouldFallbackImageModel(err)) {
      image = await openai.images.generate(
        imageGenerateBody("dall-e-3", jsonSafeText(directed).slice(0, 2500), format),
      );
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

async function storePosterPng(supabase: SupabaseClient, path: string, buffer: Buffer) {
  const png = await sharp(buffer).png().toBuffer();
  const { error } = await supabase.storage.from("ai-posters").upload(path, png, {
    contentType: "image/png",
    upsert: false,
  });
  if (error) return "";
  return supabase.storage.from("ai-posters").getPublicUrl(path).data.publicUrl;
}

async function saveAsset(supabase: SupabaseClient, row: Record<string, unknown>) {
  const attempts: Record<string, unknown>[] = [
    row,
    Object.fromEntries(
      Object.entries(row).filter(
        ([key]) =>
          !["prompt", "caption", "social_pack", "series_id", "slide_index", "slide_count", "archived_at"].includes(key),
      ),
    ),
    {
      bucket: row.bucket,
      path: row.path,
      public_url: row.public_url,
      filename: row.filename,
      mime_type: row.mime_type,
      kind: row.kind,
      client_id: row.client_id,
      notes: "ai-poster",
    },
  ];

  let asset;
  let insertError;
  for (const attempt of attempts) {
    ({ data: asset, error: insertError } = await supabase
      .from("assets")
      .insert(attempt)
      .select("*")
      .single());
    if (!insertError && asset) return { asset, insertError: null };
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
  let includeQr = false;
  try {
    const body = (await request.json()) as { prompt?: string; format?: string; qr?: boolean };
    prompt = body.prompt?.trim() || "";
    format = parsePosterFormat(body.format);
    includeQr = body.qr === true;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  try {
    const client = await getWorkspaceClient(supabase);
    const { companyName, brand } = brandFromClient(client);
    const siteUrl = companySiteUrl(client);
    const publishedFacts = await companyPublishedFacts(client);
    const qrUrl = includeQr ? kaylevSourceUrl(siteUrl, "poster") : "";
    if (includeQr && !qrUrl) {
      return NextResponse.json(
        { error: "Add this company's domain on Brand first. The QR code needs a website to open." },
        { status: 400 },
      );
    }
    const qrPng = qrUrl ? await renderQrPng(qrUrl) : null;
    const parsed = parsePosterSlides(prompt);
    const slides: PosterSlide[] = parsed.slides.map((slide) =>
      withHouseCtaDetails(slide, companyName, siteUrl),
    );
    const openai = createOpenAIClient();
    const preferred = process.env.OPENAI_IMAGE_MODEL;
    const logo = await resolveOfficialLogoFile(supabase, client);
    const wantsEmblem = slides.some((slide) => slide.placeEmblem);
    const emblemFile =
      wantsEmblem && brand.secondaryLogoUrl.trim()
        ? await fetchLogoBuffer(brand.secondaryLogoUrl.trim())
        : null;
    const emblem = emblemFile?.buffer?.length ? emblemFile.buffer : null;
    const { badge, warning: badgeWarning } = await resolvePosterBadge(supabase, client, prompt).catch(() => ({
      badge: null,
      warning: "Could not load the award badge.",
    }));
    const badgePng = badge
      ? await renderBadgePng(badge.award, badgeWidthFor(format)).catch((badgeError) => {
          console.error("Could not render award badge", badgeError);
          return null;
        })
      : null;
    const seriesId = crypto.randomUUID();

    const [directedSlides, copyLines] = await Promise.all([
      Promise.all(
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
            badgeFacts: badgePng ? badge?.facts : undefined,
            publishedFacts,
          }),
        ),
      ),
      Promise.all(slides.map((slide) => posterEditableLines(openai, slide, companyName, brand.voice))),
    ]);

    const images: {
      buffer: Buffer;
      art: Buffer;
      directed: string;
      slide: PosterSlide;
      pieces: LayoutPiece[];
    }[] = [];
    for (let index = 0; index < slides.length; index += 1) {
      const directed = directedSlides[index];
      const buffer = await generatePosterBuffer(openai, directed, format, preferred);
      if (!buffer) {
        return NextResponse.json(
          { error: `No image returned for slide ${index + 1}` },
          { status: 502 },
        );
      }
      const frame = POSTER_CANVAS[format];
      const scene = await fitInto(buffer, frame.width, frame.height);
      const stamp = `${Date.now()}-${seriesId}-s${index + 1}`;
      const overlays: LayoutPiece[] = [];
      const pictures = new Map<string, Buffer>();
      const slidePlan = slides[index];
      if (logo?.buffer?.length) {
        const src = await storePosterPng(supabase, `${stamp}-logo.png`, logo.buffer);
        if (src) {
          pictures.set(src, logo.buffer);
          overlays.push(
            imagePiece(
              "logo",
              "Logo",
              src,
              Math.round(frame.height * (slidePlan.placeLogo ? 0.08 : 0.07)),
              slidePlan.placeLogo ? 30 : 6,
              2,
            ),
          );
        }
      }
      if (slidePlan.placeEmblem && emblem?.length) {
        const src = await storePosterPng(supabase, `${stamp}-emblem.png`, emblem);
        if (src) {
          pictures.set(src, emblem);
          overlays.push(imagePiece("emblem", "Badge", src, Math.round(frame.height * 0.24), 35, 36));
        }
      }
      if (badgePng) {
        const src = await storePosterPng(supabase, `${stamp}-badge.png`, badgePng);
        if (src) {
          pictures.set(src, badgePng);
          overlays.push(imagePiece("badge", "Award badge", src, Math.round(frame.height * 0.18), 6, 78));
        }
      }
      if (qrPng) {
        const src = await storePosterPng(supabase, `${stamp}-qr.png`, qrPng);
        if (src) {
          pictures.set(src, qrPng);
          overlays.push(imagePiece("qr", "QR code", src, Math.round(frame.height * 0.12), 78, 82));
        }
      }
      const textPieces = slidePlan.copyLines?.length
        ? piecesFromRoles(slidePlan.copyLines, siteUrl)
        : piecesFromCopy(copyLines[index] || [], siteUrl);
      const pieces = [...overlays, ...textPieces];
      const typed = pieces.length
        ? await stampLayoutText(scene, frame.width, frame.height, pieces, brand.textColor, {
            highlight: brand.highlightColor,
            images: pictures,
          }).catch((typeError) => {
            console.error("Could not typeset poster copy", typeError);
            return scene;
          })
        : scene;
      images.push({ buffer: typed, art: scene, directed, slide: slides[index], pieces });
    }

    const uploaded: {
      path: string;
      publicUrl: string;
      artUrl: string;
      directed: string;
      slide: PosterSlide;
      pieces: LayoutPiece[];
      byteSize: number;
    }[] = [];
    for (let index = 0; index < images.length; index += 1) {
      const image = images[index];
      const stamp = Date.now();
      const artPath = `${stamp}-${seriesId}-s${index + 1}-art.png`;
      const path = `${stamp}-${seriesId}-s${index + 1}.png`;
      const { error: artError } = await supabase.storage.from("ai-posters").upload(artPath, image.art, {
        contentType: "image/png",
        upsert: false,
      });
      if (artError) {
        return NextResponse.json({ error: artError.message }, { status: 400 });
      }
      const artUrl = supabase.storage.from("ai-posters").getPublicUrl(artPath).data.publicUrl;
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
      uploaded.push({
        path,
        publicUrl,
        artUrl,
        directed: image.directed,
        slide: image.slide,
        pieces: withArtworkPiece(image.pieces, artUrl, POSTER_CANVAS[format].height),
        byteSize: image.buffer.length,
      });
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
    images.forEach((image) => {
      image.buffer = Buffer.alloc(0);
    });

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
    let saveWarning = "";
    for (let index = 0; index < uploaded.length; index += 1) {
      const image = uploaded[index];
      const notes = JSON.stringify(
        jsonSafeValue({
          kind: "ai-poster",
          brief: jsonSafeText(prompt).slice(0, 1500),
          prompt: jsonSafeText(image.directed).slice(0, 1500),
          artUrl: image.artUrl,
          pieces: image.pieces,
          artworkPlaced: true,
          caption: social.instagram,
          social: jsonSafeValue({
            url: social.url,
            urls: social.urls,
            pdfUrl: social.pdfUrl || "",
            facebook: social.facebook,
            linkedin: social.linkedin,
            instagram: social.instagram,
            twitter: social.twitter,
            fileBody: social.fileBody,
            hashtags: social.hashtags,
          }),
          seriesId,
          slideIndex: index + 1,
          slideCount: uploaded.length,
          pdfUrl: pdfUrl || "",
        }),
      );
      const row: Record<string, unknown> = {
        bucket: "ai-posters",
        path: image.path,
        public_url: image.publicUrl,
        filename: `poster-${seriesId}-slide-${index + 1}.png`,
        mime_type: "image/png",
        kind: "image",
        byte_size: image.byteSize,
        notes,
        client_id: client?.id || null,
        caption: social.instagram,
        social_pack: jsonSafeValue({
          url: social.url,
          urls: social.urls,
          pdfUrl: social.pdfUrl || "",
          facebook: social.facebook,
          linkedin: social.linkedin,
          instagram: social.instagram,
          twitter: social.twitter,
          fileBody: social.fileBody,
          hashtags: social.hashtags,
        }),
        series_id: seriesId,
        slide_index: index + 1,
        slide_count: uploaded.length,
      };
      const { asset, insertError } = await saveAsset(supabase, row);
      if (insertError) saveWarning = insertError.message;
      if (asset) assets.push(asset);
    }

    return NextResponse.json({
      asset: assets[0] || { public_url: publicUrls[0] },
      assets,
      urls: publicUrls,
      pdfUrl: pdfUrl || undefined,
      slides: uploaded.map((image) => ({
        index: image.slide.index,
        label: image.slide.label,
        mustPrint: image.slide.mustPrint,
        artUrl: image.artUrl,
        pieces: image.pieces,
      })),
      prompt: directedSlides.join("\n\n---\n\n"),
      social,
      qrUrl: qrUrl || undefined,
      logoStamped: Boolean(logo?.buffer.length),
      badgeAdded: Boolean(badgePng),
      warning: [saveWarning, badgeWarning].filter(Boolean).join(" ") || undefined,
    });
  } catch (err) {
    console.error("AI poster failed", err);
    return NextResponse.json({ error: openaiErrorMessage(err) }, { status: 502 });
  }
}
