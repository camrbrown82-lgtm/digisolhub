import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import sharp from "sharp";

sharp.cache(false);
sharp.concurrency(1);
import { PDFDocument } from "pdf-lib";
import { requireHubSession } from "@/lib/auth";
import { brandFromClient, DIGISOL_HOUSE_NAME } from "@/lib/branding";
import { createOpenAIClient, getOpenAIApiKey, openaiErrorMessage } from "@/lib/openai";
import { directScenePrompt, generateSceneBuffer } from "@/lib/poster";
import { resolveOfficialLogoFile } from "@/lib/brandLogo";
import { renderBusinessCard } from "@/lib/businessCard";
import { parseLayoutPieces } from "@/lib/layoutPieces";
import { planBusinessCard } from "@/lib/businessCardDesign";
import { jsonSafeText, jsonSafeValue } from "@/lib/jsonSafe";
import { aiPosterObjectPath, isWorkspaceMediaUrl } from "@/lib/posterSizes";
import { posterSocialPack } from "@/lib/posterSocial";
import { renderQrPng } from "@/lib/qrMark";
import { kaylevSourceUrl, siteHostLabel } from "@/lib/site";
import { companySiteUrl, getWorkspaceClient } from "@/lib/workspace";

export const runtime = "nodejs";
export const maxDuration = 120;

function clip(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

type CardFileRole = "logo" | "emblem" | "award" | "upload";

function cardFiles(raw: unknown) {
  if (!Array.isArray(raw)) return [] as { url: string; role: CardFileRole }[];
  const files: { url: string; role: CardFileRole }[] = [];
  for (const item of raw) {
    if (files.length >= 8) break;
    const url = typeof item === "string" ? item : item && typeof item === "object" ? clip((item as { url?: unknown }).url, 500) : "";
    if (!url) continue;
    const roleRaw = item && typeof item === "object" ? (item as { role?: unknown }).role : "upload";
    const role: CardFileRole = roleRaw === "logo" || roleRaw === "emblem" || roleRaw === "award" ? roleRaw : "upload";
    files.push({ url, role });
  }
  return files;
}

async function readCardImage(url: string) {
  if (url.startsWith("/") && !url.includes("..") && !url.includes("\\")) {
    const root = path.resolve(process.cwd(), "public");
    const file = path.resolve(root, url.replace(/^\/+/, ""));
    if (file !== root && !file.startsWith(root + path.sep)) return null;
    return readFile(file).catch(() => null);
  }
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  const siteFile = host === "wwwdigisol.com" || host === "www.wwwdigisol.com";
  if (!isWorkspaceMediaUrl(url) && !siteFile) return null;
  const response = await fetch(url).catch(() => null);
  if (!response?.ok) return null;
  const type = response.headers.get("content-type") || "";
  if (type && !type.startsWith("image/")) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) return null;
  return bytes;
}

export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const client = await getWorkspaceClient(supabase);
  const { companyName, brand } = brandFromClient(client);
  const siteUrl = companySiteUrl(client);
  const qrUrl = kaylevSourceUrl(siteUrl, "business-card");
  if (!qrUrl) {
    return NextResponse.json(
      { error: "Add this company's domain on Brand first. The QR code needs a website to open." },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    personName?: string;
    personTitle?: string;
    phone?: string;
    email?: string;
    line?: string;
    directions?: string;
    files?: unknown;
    layout?: unknown;
    logoSize?: unknown;
    emblemSize?: unknown;
    layoutOnly?: boolean;
    imageLayout?: boolean;
    url?: string;
    backUrl?: string;
    pdfUrl?: string;
  } | null;
  const emailRaw = clip(body?.email, 160);
  const layoutOnly = body?.layoutOnly === true;
  const directions = clip(body?.directions, 2000);
  const imageLayout = body?.imageLayout === true;
  const reuseFront = aiPosterObjectPath(clip(body?.url, 800));
  const reuseBack = aiPosterObjectPath(clip(body?.backUrl, 800));
  const reusePdf = aiPosterObjectPath(clip(body?.pdfUrl, 800));
  const plan = layoutOnly
    ? {
        reply: "Updated this card.",
        name: clip(body?.personName, 80),
        roles: clip(body?.personTitle, 180) ? [clip(body?.personTitle, 180)] : [],
        details: [clip(body?.phone, 40), emailRaw.includes("@") ? emailRaw : ""].filter(Boolean),
        backHeadline: clip(body?.line, 180),
        backSubline: "",
        headerColor: brand.highlightColor || brand.primaryColor,
        showHeader: true,
        showBadges: true,
        qrFace: "front" as const,
        qrSide: "right" as const,
        emblemSize: Number(body?.emblemSize) || 360,
        awardsFace: "back" as const,
      }
    : await planBusinessCard(companyName, brand, {
    personName: clip(body?.personName, 80),
    personTitle: clip(body?.personTitle, 180),
    phone: clip(body?.phone, 40),
    email: emailRaw.includes("@") ? emailRaw : "",
    line: clip(body?.line, 180),
    directions: clip(body?.directions, 2000),
  });
  const layout = parseLayoutPieces(body?.layout);
  if (layoutOnly && !layout.length) {
    return NextResponse.json({ error: "Add a line of text first." }, { status: 400 });
  }
  const logoSize = Number(body?.logoSize);
  const emblemSize = Number(body?.emblemSize);
  const house = companyName.trim().toLowerCase() === DIGISOL_HOUSE_NAME.toLowerCase();
  const selected = cardFiles(body?.files);
  const logoPick = selected.find((file) => file.role === "logo");
  const emblemPick = selected.find((file) => file.role === "emblem");
  const awardPicks = selected.filter((file) => file.role === "award" || file.role === "upload").slice(0, 4);
  const reply = plan.reply;
  const personName = plan.name;
  const personTitle = plan.roles.join(" · ");
  const phone = plan.details.find((line) => /\d{3}/.test(line) && line.replace(/\D/g, "").length >= 10) || "";
  const email = plan.details.filter((line) => line.includes("@")).join(" · ");
  const line = plan.backHeadline || plan.roles[0] || plan.details[0] || "";

  try {
    let logo: Buffer | null = logoPick ? await readCardImage(logoPick.url) : null;
    if (logoPick && !logo?.length) {
      const official = await resolveOfficialLogoFile(supabase, client);
      logo = official?.buffer ? Buffer.from(official.buffer) : null;
    }
    const emblem = emblemPick ? await readCardImage(emblemPick.url) : null;
    const awards: Buffer[] = [];
    for (const file of awardPicks) {
      const image = await readCardImage(file.url);
      if (image?.length) awards.push(image);
    }
    const qrPng = await renderQrPng(qrUrl, 720);
    const placedImages: { buffer: Buffer; piece: (typeof layout)[number] }[] = [];
    if (imageLayout) {
      for (const piece of layout.filter((item) => item.kind === "image" && item.src)) {
        const file = await readCardImage(piece.src || "");
        if (file) placedImages.push({ buffer: file, piece });
      }
    }
    let scene: Buffer | null = null;
    if (!layoutOnly && directions) {
      if (!getOpenAIApiKey()) {
        return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 503 });
      }
      try {
        scene = await generateSceneBuffer(
          createOpenAIClient(),
          directScenePrompt(directions, {
            backgroundColor: brand.backgroundColor,
            primaryColor: brand.primaryColor,
            highlightColor: brand.highlightColor,
          }),
          "landscape",
          process.env.OPENAI_IMAGE_MODEL,
        );
      } catch (err) {
        return NextResponse.json({ error: openaiErrorMessage(err) }, { status: 502 });
      }
      if (!scene) return NextResponse.json({ error: "No card image came back." }, { status: 502 });
    }
    const freshPicture = Boolean(scene);
    const { front, back, pieces } = await renderBusinessCard({
      scene,
      omitQr: freshPicture && !/\bqr\b/i.test(directions),
      companyName,
      siteHost: siteHostLabel(siteUrl),
      qrPng,
      logo: imageLayout || freshPicture ? null : logo,
      emblem: imageLayout || freshPicture ? null : emblem,
      awards: imageLayout || freshPicture || !plan.showBadges ? [] : awards,
      placedImages,
      backgroundColor: brand.backgroundColor,
      textColor: brand.textColor,
      headerColor: plan.headerColor,
      showHeader: freshPicture ? false : plan.showHeader,
      name: plan.name,
      roles: plan.roles,
      details: plan.details,
      backHeadline: freshPicture
        ? /\bheadline\b/i.test(directions)
          ? plan.backHeadline
          : ""
        : plan.backHeadline || (house ? "Get your free audit & badges" : ""),
      backSubline: plan.backSubline,
      qrFace: plan.qrFace,
      qrSide: plan.qrSide,
      emblemSize: Number.isFinite(emblemSize) ? emblemSize : plan.emblemSize,
      logoSize: Number.isFinite(logoSize) ? logoSize : undefined,
      awardsFace: plan.awardsFace,
      layout: layout.length ? layout : undefined,
    });

    const pdfDoc = await PDFDocument.create();
    for (const side of [front, back]) {
      const embedded = await pdfDoc.embedPng(side);
      const page = pdfDoc.addPage([252, 144]);
      page.drawImage(embedded, { x: 0, y: 0, width: 252, height: 144 });
    }
    const pdf = Buffer.from(await pdfDoc.save());

    const seriesId = crypto.randomUUID();
    const stamp = Date.now();
    const reusing = Boolean(reuseFront && reuseBack);
    const sides = [
      { buffer: front, path: reusing ? reuseFront : `${stamp}-${seriesId}-card-front.png`, label: "front" },
      { buffer: back, path: reusing ? reuseBack : `${stamp}-${seriesId}-card-back.png`, label: "back" },
    ] as const;
    const pngUrls: string[] = [];
    for (const side of sides) {
      const { error: pngError } = await supabase.storage.from("ai-posters").upload(side.path, side.buffer, {
        contentType: "image/png",
        upsert: reusing,
        ...(reusing ? { cacheControl: "0" } : {}),
      });
      if (pngError) return NextResponse.json({ error: pngError.message }, { status: 400 });
      pngUrls.push(supabase.storage.from("ai-posters").getPublicUrl(side.path).data.publicUrl);
    }
    const pngPath = sides[0].path;
    const pngUrl = pngUrls[0];
    const backUrl = pngUrls[1];
    const pdfPath = reusing && reusePdf ? reusePdf : `${stamp}-${seriesId}-card.pdf`;
    let pdfUrl = "";
    const { error: pdfError } = await supabase.storage.from("ai-posters").upload(pdfPath, pdf, {
      contentType: "application/pdf",
      upsert: Boolean(reusing && reusePdf),
      ...(reusing ? { cacheControl: "0" } : {}),
    });
    if (!pdfError) pdfUrl = supabase.storage.from("ai-posters").getPublicUrl(pdfPath).data.publicUrl;

    const social = posterSocialPack({
      companyName,
      tagline: line,
      brief: `Business card. QR opens ${qrUrl}`,
      imageUrl: pngUrl,
      imageUrls: pngUrls,
      siteUrl,
    });
    const notes = JSON.stringify(
      jsonSafeValue({
        kind: "business-card",
        brief: jsonSafeText(`Business card for ${companyName}`).slice(0, 300),
        qrUrl,
        pdfUrl,
        line,
        directions: clip(body?.directions, 2000),
        seriesId,
        slideIndex: 1,
        slideCount: 2,
        backUrl,
        social: jsonSafeValue({
          url: social.url,
          urls: social.urls,
          facebook: social.facebook,
          linkedin: social.linkedin,
          instagram: social.instagram,
          twitter: social.twitter,
          fileBody: social.fileBody,
          hashtags: social.hashtags,
        }),
      }),
    );
    const row = {
      bucket: "ai-posters",
      path: pngPath,
      public_url: pngUrl,
      filename: `${companyName.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "card"}-business-card-front.png`,
      mime_type: "image/png",
      kind: "image",
      byte_size: front.length,
      notes,
      client_id: client?.id || null,
      series_id: seriesId,
      slide_index: 1,
      slide_count: 2,
    };
    const backNotes = JSON.stringify(
      jsonSafeValue({
        kind: "business-card",
        brief: jsonSafeText(`Business card back for ${companyName}`).slice(0, 300),
        qrUrl,
        pdfUrl,
        seriesId,
        slideIndex: 2,
        slideCount: 2,
      }),
    );
    const backRow = {
      ...row,
      path: sides[1].path,
      public_url: backUrl,
      filename: row.filename.replace(/-front\.png$/, "-back.png"),
      byte_size: back.length,
      notes: backNotes,
      slide_index: 2,
    };
    let assetId = "";
    if (reusing) {
      return NextResponse.json({
        url: pngUrl,
        backUrl,
        pdfUrl: pdfUrl || undefined,
        qrUrl,
        line,
        personName,
        personTitle,
        phone,
        email,
        reply,
        pieces,
      });
    }
    await supabase.from("assets").insert(backRow);
    const inserted = await supabase.from("assets").insert(row).select("id").single();
    if (inserted.data?.id) assetId = inserted.data.id as string;
    else {
      const retry = await supabase
        .from("assets")
        .insert({
          bucket: row.bucket,
          path: row.path,
          public_url: row.public_url,
          filename: row.filename,
          mime_type: row.mime_type,
          kind: row.kind,
          client_id: row.client_id,
          notes: "business-card",
        })
        .select("id")
        .single();
      if (retry.data?.id) assetId = retry.data.id as string;
      else console.error("Could not save business card row", inserted.error?.message || retry.error?.message);
    }

    return NextResponse.json({
      id: assetId || undefined,
      url: pngUrl,
      backUrl,
      pdfUrl: pdfUrl || undefined,
      qrUrl,
      line,
      personName,
      personTitle,
      phone,
      email,
      reply,
      pieces,
    });
  } catch (err) {
    console.error("Business card failed", err);
    return NextResponse.json({ error: "Kaylev could not build the card. Try again." }, { status: 500 });
  }
}
