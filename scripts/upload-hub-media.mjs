/**
 * Upload a local media file into DigiSol Hub Files (Supabase storage + assets row).
 *
 * Usage:
 *   node scripts/upload-hub-media.mjs [path-to-file]
 *
 * Defaults to public/media/digisol-website-audit.mp4 and DigiSol workspace.
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */
import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvLocal() {
  const envPath = resolve(root, ".env.local");
  if (!existsSync(envPath)) throw new Error("Missing .env.local");
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(
  /\/$/,
  "",
);
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  "";

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const fileArg =
  process.argv[2] ||
  resolve(root, "public/media/digisol-website-audit.mp4");
const filePath = resolve(fileArg);
if (!existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const NOTES =
  process.env.HUB_MEDIA_NOTES ||
  "DigiSol Website Audit presentation — campaign/email link";
const FILENAME = process.env.HUB_MEDIA_FILENAME || "digisol-website-audit.mp4";
const MIME = process.env.HUB_MEDIA_MIME || "video/mp4";
const KIND = process.env.HUB_MEDIA_KIND || "video";
const CLIENT_NAME = process.env.HUB_MEDIA_CLIENT || "DigiSol";

const buffer = readFileSync(filePath);
const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 12);
const ext = extname(FILENAME) || extname(filePath) || ".mp4";
const storagePath = `hub-media/${hash}-${randomUUID()}${ext}`;

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function resolveClientId() {
  const { data: existing, error } = await supabase
    .from("clients")
    .select("id, name")
    .ilike("name", CLIENT_NAME)
    .maybeSingle();
  if (error) throw error;
  if (existing?.id) return existing.id;

  const { data: created, error: createError } = await supabase
    .from("clients")
    .insert({
      name: CLIENT_NAME,
      domain: "wwwdigisol.com",
      notes: "House brand for DigiSol.",
    })
    .select("id")
    .single();
  if (createError) throw createError;
  return created.id;
}

async function main() {
  const clientId = await resolveClientId();
  console.log(`Client: ${CLIENT_NAME} (${clientId})`);
  console.log(`Uploading ${basename(filePath)} (${buffer.length} bytes) → ${storagePath}`);

  const { error: uploadError } = await supabase.storage.from("assets").upload(storagePath, buffer, {
    contentType: MIME,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from("assets").getPublicUrl(storagePath);

  const { data: existingAsset } = await supabase
    .from("assets")
    .select("id, public_url, path")
    .eq("client_id", clientId)
    .eq("kind", KIND)
    .eq("filename", FILENAME)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let asset;
  if (existingAsset?.id) {
    const { data, error } = await supabase
      .from("assets")
      .update({
        bucket: "assets",
        path: storagePath,
        public_url: publicUrl,
        mime_type: MIME,
        kind: KIND,
        byte_size: buffer.length,
        notes: NOTES,
      })
      .eq("id", existingAsset.id)
      .select("*")
      .single();
    if (error) throw error;
    asset = data;
    if (existingAsset.path && existingAsset.path !== storagePath) {
      await supabase.storage.from("assets").remove([existingAsset.path]);
    }
    console.log("Updated existing Hub Files row.");
  } else {
    const { data, error } = await supabase
      .from("assets")
      .insert({
        bucket: "assets",
        path: storagePath,
        public_url: publicUrl,
        filename: FILENAME,
        mime_type: MIME,
        kind: KIND,
        byte_size: buffer.length,
        notes: NOTES,
        client_id: clientId,
      })
      .select("*")
      .single();
    if (error) throw error;
    asset = data;
    console.log("Inserted new Hub Files row.");
  }

  console.log(JSON.stringify({ id: asset.id, public_url: asset.public_url, notes: asset.notes }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
