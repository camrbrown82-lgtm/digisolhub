import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DIGISOL_HOUSE_NAME } from "@/lib/branding";
import { getOutboundSiteUrl, getSiteUrl } from "@/lib/supabase/env";

export const EMAIL_LOGO_NOTE = "email-logo";
export const EMAIL_LOGO_CID = "digisol-logo";

export type EmailLogoAsset = {
  id: string;
  public_url: string | null;
  path: string;
  bucket: string;
};

export type EmailLogoFile = {
  buffer: Buffer;
  filename: string;
  contentType: string;
};

export function defaultEmailLogoUrl() {
  return `${getSiteUrl()}/logo.jpg`;
}

export function publicEmailLogoUrl() {
  return `${getOutboundSiteUrl()}/logo.jpg`;
}

export async function getEmailLogoAsset(
  supabase: SupabaseClient,
  clientId?: string | null,
) {
  for (const note of ["brand-logo", EMAIL_LOGO_NOTE]) {
    let query = supabase
      .from("assets")
      .select("id, public_url, path, bucket")
      .eq("notes", note)
      .order("created_at", { ascending: false })
      .limit(1);
    query = clientId ? query.eq("client_id", clientId) : query.is("client_id", null);

    const { data, error } = await query;
    if (error) continue;
    const row = (data?.[0] as EmailLogoAsset | undefined) ?? null;
    if (row?.public_url) return row;
  }
  return null;
}

/** The site logo on disk is DigiSol's, so only the house company (or legacy rows with no company) may fall back to it. */
async function companyLogoFallback(supabase: SupabaseClient, clientId?: string | null) {
  if (!clientId) return { isHouse: true, brandLogoUrl: "" };
  const { data } = await supabase
    .from("clients")
    .select("name, branding")
    .eq("id", clientId)
    .maybeSingle();
  const brandLogoUrl = String((data?.branding as { logoUrl?: string } | null)?.logoUrl || "").trim();
  return {
    isHouse: (data?.name || "").trim().toLowerCase() === DIGISOL_HOUSE_NAME.toLowerCase(),
    brandLogoUrl: brandLogoUrl.includes("localhost") ? "" : brandLogoUrl,
  };
}

/** Empty string when the company has no logo; emails then show the company name instead. */
export async function getEmailLogoUrl(
  supabase: SupabaseClient,
  clientId?: string | null,
) {
  const asset = await getEmailLogoAsset(supabase, clientId);
  if (asset?.public_url && !asset.public_url.includes("localhost")) {
    return asset.public_url;
  }
  const fallback = await companyLogoFallback(supabase, clientId);
  if (fallback.brandLogoUrl) return fallback.brandLogoUrl;
  return fallback.isHouse ? publicEmailLogoUrl() : "";
}

export function readSiteLogoFile(): EmailLogoFile | null {
  const publicDir = join(process.cwd(), "public");
  for (const item of [
    { file: "logo.jpg", contentType: "image/jpeg" },
    { file: "logo.png", contentType: "image/png" },
    { file: "logo.webp", contentType: "image/webp" },
  ]) {
    const path = join(publicDir, item.file);
    if (existsSync(path)) {
      return {
        buffer: readFileSync(path),
        filename: item.file,
        contentType: item.contentType,
      };
    }
  }
  return null;
}

export async function resolveEmailLogoFile(
  supabase: SupabaseClient,
  clientId?: string | null,
): Promise<EmailLogoFile | null> {
  const asset = await getEmailLogoAsset(supabase, clientId);
  const fromAsset = asset?.public_url
    ? await fetchLogoFile(asset.public_url, asset.path.split("/").pop() || "logo.png")
    : null;
  if (fromAsset) return fromAsset;
  const fallback = await companyLogoFallback(supabase, clientId);
  if (fallback.brandLogoUrl) {
    const fromBrand = await fetchLogoFile(
      fallback.brandLogoUrl,
      fallback.brandLogoUrl.split("/").pop()?.split("?")[0] || "logo.png",
    );
    if (fromBrand) return fromBrand;
  }
  return fallback.isHouse ? readSiteLogoFile() : null;
}

async function fetchLogoFile(url: string, filename: string): Promise<EmailLogoFile | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const mime = response.headers.get("content-type") || "image/png";
    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      filename,
      contentType: mime.split(";")[0] || "image/png",
    };
  } catch {
    return null;
  }
}
