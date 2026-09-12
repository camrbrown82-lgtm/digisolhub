import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
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
  let query = supabase
    .from("assets")
    .select("id, public_url, path, bucket")
    .eq("notes", EMAIL_LOGO_NOTE)
    .order("created_at", { ascending: false })
    .limit(1);
  query = clientId ? query.eq("client_id", clientId) : query.is("client_id", null);

  const { data, error } = await query;
  if (error) return null;
  return (data?.[0] as EmailLogoAsset | undefined) ?? null;
}

export async function getEmailLogoUrl(
  supabase: SupabaseClient,
  clientId?: string | null,
) {
  const asset = await getEmailLogoAsset(supabase, clientId);
  if (asset?.public_url && !asset.public_url.includes("localhost")) {
    return asset.public_url;
  }
  return publicEmailLogoUrl();
}

function readSiteLogoFile(): EmailLogoFile | null {
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
  if (asset?.public_url) {
    try {
      const response = await fetch(asset.public_url);
      if (response.ok) {
        const mime = response.headers.get("content-type") || "image/png";
        return {
          buffer: Buffer.from(await response.arrayBuffer()),
          filename: asset.path.split("/").pop() || "logo.png",
          contentType: mime.split(";")[0] || "image/png",
        };
      }
    } catch {
      // Fall back to the site logo on disk.
    }
  }
  return readSiteLogoFile();
}
