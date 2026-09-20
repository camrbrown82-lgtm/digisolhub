import type { SupabaseClient } from "@supabase/supabase-js";
import type OpenAI from "openai";
import {
  type CompanyBrand,
  DIGISOL_BRAND,
  DIGISOL_HOUSE_NAME,
  brandKitPrompt,
  parseBrand,
} from "@/lib/branding";
import { EMAIL_LOGO_NOTE, defaultEmailLogoUrl, readSiteLogoFile } from "@/lib/emailLogo";
import { getSiteUrl } from "@/lib/supabase/env";
import { LOGO_STYLES, type LogoStyle, parseLogoStyle } from "@/lib/logoStyles";

export { LOGO_STYLES, parseLogoStyle };
export type { LogoStyle };

export const BRAND_LOGO_NOTE = "brand-logo";
export const BRAND_LOGO_BUCKET = "email-images";
export const MAX_LOGO_BYTES = 8 * 1024 * 1024;

export type BrandLogoAsset = {
  id: string;
  public_url: string | null;
  path: string;
  bucket: string;
};

export function isUsableLogoUrl(url?: string | null) {
  const value = url?.trim() || "";
  if (!value) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  if (value.includes("localhost") || value.includes("127.0.0.1")) return false;
  return /^https?:\/\//i.test(value);
}

export async function getBrandLogoAsset(
  supabase: SupabaseClient,
  clientId?: string | null,
) {
  for (const note of [BRAND_LOGO_NOTE, EMAIL_LOGO_NOTE]) {
    let query = supabase
      .from("assets")
      .select("id, public_url, path, bucket")
      .eq("notes", note)
      .order("created_at", { ascending: false })
      .limit(1);
    query = clientId ? query.eq("client_id", clientId) : query.is("client_id", null);
    const { data, error } = await query;
    if (error) continue;
    const row = data?.[0] as BrandLogoAsset | undefined;
    if (row?.public_url) return row;
  }
  return null;
}

export function resolveBrandLogoUrl(input: {
  brand: CompanyBrand;
  companyName: string;
  assetUrl?: string | null;
}) {
  if (isUsableLogoUrl(input.brand.logoUrl)) return input.brand.logoUrl.trim();
  if (isUsableLogoUrl(input.assetUrl)) return input.assetUrl!.trim();
  if (input.companyName.toLowerCase() === DIGISOL_HOUSE_NAME.toLowerCase()) {
    return `${getSiteUrl()}/logo.jpg`;
  }
  return "";
}

export async function getBrandLogoUrl(
  supabase: SupabaseClient,
  client: { id?: string | null; name?: string | null; branding?: unknown } | null,
) {
  const companyName = client?.name?.trim() || DIGISOL_HOUSE_NAME;
  const brand = parseBrand(client?.branding);
  const asset = await getBrandLogoAsset(supabase, client?.id || null);
  return resolveBrandLogoUrl({
    brand,
    companyName,
    assetUrl: asset?.public_url,
  });
}

export async function fetchLogoBuffer(url: string) {
  const resolved = url.startsWith("/") ? `${getSiteUrl()}${url}` : url;
  try {
    const response = await fetch(resolved);
    if (!response.ok) return null;
    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get("content-type")?.split(";")[0] || "image/png",
      filename: resolved.split("/").pop()?.split("?")[0] || "logo.png",
    };
  } catch {
    return null;
  }
}

export async function resolveOfficialLogoFile(
  supabase: SupabaseClient,
  client: { id?: string | null; name?: string | null; branding?: unknown } | null,
) {
  const url = await getBrandLogoUrl(supabase, client);
  if (url) {
    const fetched = await fetchLogoBuffer(url);
    if (fetched?.buffer.length) return fetched;
  }
  const house =
    (client?.name || DIGISOL_HOUSE_NAME).toLowerCase() === DIGISOL_HOUSE_NAME.toLowerCase();
  if (!house) return null;
  const disk = readSiteLogoFile();
  if (disk) return disk;
  return fetchLogoBuffer("https://wwwdigisol.com/logo.jpg");
}

export async function describeLogoFromImage(
  openai: OpenAI,
  input: { companyName: string; buffer: Buffer; contentType: string },
) {
  const mime = input.contentType.startsWith("image/") ? input.contentType : "image/png";
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_EMAIL_MODEL || "gpt-4o-mini",
    temperature: 0.15,
    messages: [
      {
        role: "system",
        content:
          "Describe a company logo so an image model can redraw it exactly. Output 70-140 words. Name shapes, letterforms, colors (hex when obvious), spacing, and background. No marketing language, no invented extra icons.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Official logo for ${input.companyName}. Describe only what is visible.`,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mime};base64,${input.buffer.toString("base64")}`,
            },
          },
        ],
      },
    ],
  });
  return completion.choices[0]?.message?.content?.trim().slice(0, 800) || "";
}

export async function writeLogoArtDirection(
  openai: OpenAI,
  input: {
    companyName: string;
    brand: CompanyBrand;
    brief: string;
    style: LogoStyle;
  },
) {
  const styleLine =
    input.style === "wordmark"
      ? "A custom wordmark only. No icon."
      : input.style === "lettermark"
        ? "A 1-3 letter monogram. No full company name unless the letters are the name."
        : input.style === "emblem"
          ? "A contained emblem or badge that can include the name."
          : "A simple icon lockup plus the company name as a wordmark.";

  const fallback = [
    `Design the official logo for "${input.companyName}".`,
    styleLine,
    input.brief ? `Creative brief: ${input.brief}` : "",
    input.brand.tagline ? `Tagline context only, do not print unless asked: ${input.brand.tagline}` : "",
    `Palette: primary ${input.brand.primaryColor}, secondary ${input.brand.secondaryColor}, accent ${input.brand.accentColor}, background ${input.brand.backgroundColor}.`,
    input.brand.fonts ? `Lettering feel: ${input.brand.fonts.split(",")[0]}` : "",
    input.brand.visualStyle ? `Visual style: ${input.brand.visualStyle}` : "",
    "Single centered logo, generous padding, flat studio background matching the brand background, crisp vector-like edges, print-ready.",
    "No mockups, no business cards, no devices, no watermarks, no people, no extra slogan unless the brief asks for it.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_EMAIL_MODEL || "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `You write one image-generation prompt for a professional company logo. Output the prompt only.

Rules:
- Spell the company name exactly.
- Use only the given hex colors.
- Flat background, centered mark, no mockup, no scene.
- ${styleLine}
- Crisp, original, usable as a real brand mark.
- Do not copy DigiSol or any other company unless that is the named brand.`,
        },
        {
          role: "user",
          content: `${brandKitPrompt(input.companyName, input.brand, "logo")}
Style: ${input.style}
Brief: ${input.brief || "(none — make a clean, confident mark)"}`,
        },
      ],
    });
    return completion.choices[0]?.message?.content?.trim().slice(0, 3900) || fallback;
  } catch {
    return fallback;
  }
}

async function loadClientBrand(supabase: SupabaseClient, clientId: string) {
  const { data } = await supabase
    .from("clients")
    .select("name, branding")
    .eq("id", clientId)
    .maybeSingle();
  const house = (data?.name || "").toLowerCase() === DIGISOL_HOUSE_NAME.toLowerCase();
  return parseBrand(data?.branding, house ? DIGISOL_BRAND : undefined);
}

export async function persistClientLogo(
  supabase: SupabaseClient,
  clientId: string,
  input: { logoUrl: string; logoDescription?: string },
) {
  const brand = await loadClientBrand(supabase, clientId);
  const { error } = await supabase
    .from("clients")
    .update({
      branding: {
        ...brand,
        logoUrl: input.logoUrl,
        logoDescription: input.logoDescription?.trim() || brand.logoDescription,
      },
    })
    .eq("id", clientId);
  if (error) throw new Error(error.message);
}

export async function clearClientLogo(supabase: SupabaseClient, clientId: string) {
  const brand = await loadClientBrand(supabase, clientId);
  await supabase
    .from("clients")
    .update({
      branding: {
        ...brand,
        logoUrl: "",
        logoDescription: "",
      },
    })
    .eq("id", clientId);
}

export async function replaceLogoAsset(
  supabase: SupabaseClient,
  input: {
    clientId: string | null;
    buffer: Buffer;
    filename: string;
    contentType: string;
    byteSize: number;
    note?: string;
  },
) {
  const ext = input.filename.split(".").pop()?.toLowerCase() || "png";
  const path = `logos/${input.clientId || "shared"}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(BRAND_LOGO_BUCKET)
    .upload(path, input.buffer, {
      contentType: input.contentType || "image/png",
      upsert: false,
    });
  if (uploadError) throw new Error(uploadError.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from(BRAND_LOGO_BUCKET).getPublicUrl(path);

  const previous = await getBrandLogoAsset(supabase, input.clientId);
  const { data, error: insertError } = await supabase
    .from("assets")
    .insert({
      bucket: BRAND_LOGO_BUCKET,
      path,
      public_url: publicUrl,
      filename: input.filename,
      mime_type: input.contentType || "image/png",
      kind: "image",
      byte_size: input.byteSize,
      notes: input.note || BRAND_LOGO_NOTE,
      client_id: input.clientId,
    })
    .select("id, public_url, path, bucket")
    .single();
  if (insertError) throw new Error(insertError.message);

  if (previous?.id) {
    await supabase.from("assets").delete().eq("id", previous.id);
  }

  return { asset: data as BrandLogoAsset, publicUrl };
}

export function defaultBrandLogoUrl() {
  return defaultEmailLogoUrl();
}
