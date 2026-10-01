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

type CardCopy = {
  line: string;
  personName: string;
  personTitle: string;
  phone: string;
  email: string;
  reply: string;
};

async function kaylevCard(
  companyName: string,
  brand: ReturnType<typeof brandFromClient>["brand"],
  input: CardCopy & { directions: string },
): Promise<CardCopy> {
  const current: CardCopy = {
    line: input.line || (brand.tagline || "").trim() || companyName,
    personName: input.personName,
    personTitle: input.personTitle,
    phone: input.phone,
    email: input.email,
    reply: input.directions
      ? "I used the details on the form."
      : "Card uses the details on the form.",
  };
  if (!getOpenAIApiKey()) return current;
  try {
    const completion = await createOpenAIClient().chat.completions.create({
      model: getOpenAITextModel(),
      temperature: 0.3,
      max_tokens: 280,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are Kaylev, typesetting one printed business card. Return JSON with keys line, personName, personTitle, phone, email, reply.
Keep each field exactly as given unless the directions say to change or remove it. An empty string removes that field. When a current field says (blank), return an empty string.
line is at most 12 words. reply is one short sentence saying what you changed.
Use only the directions, the fields given, and the brand kit. Do not invent prices, stats, phone numbers, emails, people, or a website.`,
        },
        {
          role: "user",
          content: `${brandKitPrompt(companyName, brand, "copy")}
Tagline: ${brand.tagline || "(none)"}
Current name: ${current.personName || "(blank)"}
Current title: ${current.personTitle || "(blank)"}
Current phone: ${current.phone || "(blank)"}
Current email: ${current.email || "(blank)"}
Current line: ${current.line}
Directions: ${input.directions || "(none — write a short line from the tagline if the current line is only the company name)"}`,
        },
      ],
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}") as Record<string, unknown>;
    const email = clip(parsed.email, 80);
    return {
      line: clip(parsed.line, 140) || current.line,
      personName: clip(parsed.personName, 80),
      personTitle: clip(parsed.personTitle, 80),
      phone: clip(parsed.phone, 40),
      email: email.includes("@") || email === "" ? email : current.email,
      reply: clip(parsed.reply, 240) || current.reply,
    };
  } catch (err) {
    console.error("Kaylev card line failed", err);
    return current;
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
    directions?: string;
  } | null;
  const emailRaw = clip(body?.email, 80);
  const written = await kaylevCard(companyName, brand, {
    personName: clip(body?.personName, 80),
    personTitle: clip(body?.personTitle, 80),
    phone: clip(body?.phone, 40),
    email: emailRaw.includes("@") ? emailRaw : "",
    line: clip(body?.line, 140),
    directions: clip(body?.directions, 800),
    reply: "",
  });
  const { line, personName, personTitle, phone, email, reply } = written;

  try {
    const logo = await resolveOfficialLogoFile(supabase, client);
    const qrPng = await renderQrPng(qrUrl, 720);
    const { front, back } = await renderBusinessCard({
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
    for (const side of [front, back]) {
      const embedded = await pdfDoc.embedPng(side);
      const page = pdfDoc.addPage([252, 144]);
      page.drawImage(embedded, { x: 0, y: 0, width: 252, height: 144 });
    }
    const pdf = Buffer.from(await pdfDoc.save());

    const seriesId = crypto.randomUUID();
    const stamp = Date.now();
    const sides = [
      { buffer: front, path: `${stamp}-${seriesId}-card-front.png`, label: "front" },
      { buffer: back, path: `${stamp}-${seriesId}-card-back.png`, label: "back" },
    ] as const;
    const pngUrls: string[] = [];
    for (const side of sides) {
      const { error: pngError } = await supabase.storage.from("ai-posters").upload(side.path, side.buffer, {
        contentType: "image/png",
        upsert: false,
      });
      if (pngError) return NextResponse.json({ error: pngError.message }, { status: 400 });
      pngUrls.push(supabase.storage.from("ai-posters").getPublicUrl(side.path).data.publicUrl);
    }
    const pngPath = sides[0].path;
    const pngUrl = pngUrls[0];
    const backUrl = pngUrls[1];
    const pdfPath = `${stamp}-${seriesId}-card.pdf`;
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
        directions: clip(body?.directions, 800),
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
    });
  } catch (err) {
    console.error("Business card failed", err);
    return NextResponse.json({ error: "Kaylev could not build the card. Try again." }, { status: 500 });
  }
}
