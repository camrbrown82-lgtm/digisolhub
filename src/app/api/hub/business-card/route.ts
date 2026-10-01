import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { requireHubSession } from "@/lib/auth";
import { brandFromClient, brandKitPrompt } from "@/lib/branding";
import { resolveOfficialLogoFile } from "@/lib/brandLogo";
import { renderBusinessCard } from "@/lib/businessCard";
import { jsonSafeText, jsonSafeValue } from "@/lib/jsonSafe";
import { createOpenAIClient, getOpenAIApiKey, getOpenAITextModel } from "@/lib/openai";
import { posterSocialPack } from "@/lib/posterSocial";
import { renderQrPng } from "@/lib/qrMark";
import { kaylevSourceUrl, siteHostLabel } from "@/lib/site";
import { companySiteUrl, getWorkspaceClient } from "@/lib/workspace";

export const runtime = "nodejs";
export const maxDuration = 60;

function clip(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

async function kaylevLine(companyName: string, brand: ReturnType<typeof brandFromClient>["brand"], fallback: string) {
  if (!getOpenAIApiKey()) return fallback;
  try {
    const completion = await createOpenAIClient().chat.completions.create({
      model: getOpenAITextModel(),
      temperature: 0.3,
      max_tokens: 80,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are Kaylev. Write one line for a printed business card. Return JSON {"line":"..."} only.
The line is at most 12 words, in this company's voice, using only the brand kit.
Do not invent prices, stats, phone numbers, guarantees, people, or a website.
If the tagline already works on a card, use it.`,
        },
        {
          role: "user",
          content: `${brandKitPrompt(companyName, brand, "copy")}\nTagline: ${brand.tagline || "(none)"}`,
        },
      ],
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}") as { line?: unknown };
    const line = clip(parsed.line, 140);
    return line || fallback;
  } catch (err) {
    console.error("Kaylev card line failed", err);
    return fallback;
  }
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
  } | null;
  const personName = clip(body?.personName, 80);
  const personTitle = clip(body?.personTitle, 80);
  const phone = clip(body?.phone, 40);
  const emailRaw = clip(body?.email, 80);
  const email = emailRaw.includes("@") ? emailRaw : "";
  const typedLine = clip(body?.line, 140);
  const fallback = (brand.tagline || "").trim() || companyName;
  const line = typedLine || (await kaylevLine(companyName, brand, fallback));

  try {
    const logo = await resolveOfficialLogoFile(supabase, client);
    const qrPng = await renderQrPng(qrUrl, 720);
    const card = await renderBusinessCard({
      companyName,
      line,
      personName,
      personTitle,
      phone,
      email,
      siteHost: siteHostLabel(siteUrl),
      qrPng,
      logo: logo?.buffer ?? null,
      backgroundColor: brand.backgroundColor,
      textColor: brand.textColor,
      highlightColor: brand.highlightColor || brand.accentColor,
    });

    const pdfDoc = await PDFDocument.create();
    const png = await pdfDoc.embedPng(card);
    const page = pdfDoc.addPage([252, 144]);
    page.drawImage(png, { x: 0, y: 0, width: 252, height: 144 });
    const pdf = Buffer.from(await pdfDoc.save());

    const seriesId = crypto.randomUUID();
    const stamp = Date.now();
    const pngPath = `${stamp}-${seriesId}-card.png`;
    const pdfPath = `${stamp}-${seriesId}-card.pdf`;
    const { error: pngError } = await supabase.storage.from("ai-posters").upload(pngPath, card, {
      contentType: "image/png",
      upsert: false,
    });
    if (pngError) return NextResponse.json({ error: pngError.message }, { status: 400 });
    const pngUrl = supabase.storage.from("ai-posters").getPublicUrl(pngPath).data.publicUrl;
    let pdfUrl = "";
    const { error: pdfError } = await supabase.storage.from("ai-posters").upload(pdfPath, pdf, {
      contentType: "application/pdf",
      upsert: false,
    });
    if (!pdfError) pdfUrl = supabase.storage.from("ai-posters").getPublicUrl(pdfPath).data.publicUrl;

    const social = posterSocialPack({
      companyName,
      tagline: line,
      brief: `Business card. QR opens ${qrUrl}`,
      imageUrl: pngUrl,
      siteUrl,
    });
    const notes = JSON.stringify(
      jsonSafeValue({
        kind: "business-card",
        brief: jsonSafeText(`Business card for ${companyName}`).slice(0, 300),
        qrUrl,
        line,
        seriesId,
        slideIndex: 1,
        slideCount: 1,
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
      filename: `${companyName.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "card"}-business-card.png`,
      mime_type: "image/png",
      kind: "image",
      byte_size: card.length,
      notes,
      client_id: client?.id || null,
      series_id: seriesId,
      slide_index: 1,
      slide_count: 1,
    };
    const { error: insertError } = await supabase.from("assets").insert(row).select("id").single();
    if (insertError) {
      const { error: retryError } = await supabase.from("assets").insert({
        bucket: row.bucket,
        path: row.path,
        public_url: row.public_url,
        filename: row.filename,
        mime_type: row.mime_type,
        kind: row.kind,
        client_id: row.client_id,
        notes: "business-card",
      });
      if (retryError) console.error("Could not save business card row", retryError.message);
    }

    return NextResponse.json({
      url: pngUrl,
      pdfUrl: pdfUrl || undefined,
      qrUrl,
      line,
    });
  } catch (err) {
    console.error("Business card failed", err);
    return NextResponse.json({ error: "Kaylev could not build the card. Try again." }, { status: 500 });
  }
}
