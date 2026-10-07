import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { parseLayoutPieces } from "@/lib/layoutPieces";
import { blankCanvas, stampLayoutText } from "@/lib/layoutText";
import { aiPosterObjectPath, isWorkspaceMediaUrl } from "@/lib/posterSizes";
import { getWorkspaceClient } from "@/lib/workspace";

export const runtime = "nodejs";
export const maxDuration = 60;

function clip(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

async function readImage(url: string) {
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
  if (!bytes.length || bytes.length > 12 * 1024 * 1024) return null;
  return bytes;
}

export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;
  const body = (await request.json().catch(() => null)) as {
    imageUrl?: unknown;
    width?: unknown;
    height?: unknown;
    color?: unknown;
    background?: unknown;
    pieces?: unknown;
    logoUrl?: unknown;
    replaceUrl?: unknown;
    omitBase?: unknown;
    highlight?: unknown;
  } | null;
  const imageUrl = clip(body?.imageUrl, 800);
  const pieces = parseLayoutPieces(body?.pieces);
  const width = Math.min(1600, Math.max(320, Number(body?.width) || 1080));
  const height = Math.min(1600, Math.max(320, Number(body?.height) || 1080));
  const pictures = pieces.filter((piece) => piece.kind === "image" && piece.src);
  const hasWords = pieces.some((piece) => piece.kind !== "image" && piece.kind !== "logo" && piece.kind !== "emblem" && piece.text.trim());
  if (!pieces.length || (!pictures.length && !hasWords && !pieces.some((piece) => piece.kind === "logo"))) {
    return NextResponse.json({ error: "Add an image or a line of text." }, { status: 400 });
  }
  const background = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(clip(body?.background, 7))
    ? clip(body?.background, 7)
    : "#09090b";
  const images = new Map<string, Buffer>();
  await Promise.all(
    pictures.map(async (piece) => {
      if (!piece.src || images.has(piece.src)) return;
      const file = await readImage(piece.src);
      if (file) images.set(piece.src, file);
    }),
  );
  const omitBase = body?.omitBase === true;
  const source = pictures.length || omitBase ? await blankCanvas(width, height, background) : await readImage(imageUrl);
  if (!source) return NextResponse.json({ error: "That image could not be read." }, { status: 400 });
  const color = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(clip(body?.color, 7)) ? clip(body?.color, 7) : "#f4f4f5";
  const logoUrl = clip(body?.logoUrl, 800);
  const logo = logoUrl ? await readImage(logoUrl) : null;
  const highlight = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(clip(body?.highlight, 7)) ? clip(body?.highlight, 7) : "";
  const stamped = await stampLayoutText(source, width, height, pieces, color, { logo, images, highlight });
  const replacePath = aiPosterObjectPath(clip(body?.replaceUrl, 800));
  const client = await getWorkspaceClient(supabase);
  let filePath = replacePath;
  let existingNotes = "";
  let existingId = "";
  if (replacePath) {
    const { data: existing } = await supabase
      .from("assets")
      .select("id, client_id, notes")
      .eq("bucket", "ai-posters")
      .eq("path", replacePath)
      .maybeSingle();
    const owned = existing && (!existing.client_id || !client?.id || existing.client_id === client.id);
    if (!owned) filePath = "";
    else {
      existingId = existing.id;
      existingNotes = existing.notes || "";
    }
  }
  if (!filePath) filePath = `${Date.now()}-${crypto.randomUUID()}-text.png`;
  const replaced = Boolean(replacePath && filePath === replacePath);
  const { error: uploadError } = await supabase.storage.from("ai-posters").upload(filePath, stamped, {
    contentType: "image/png",
    upsert: replaced,
    cacheControl: "0",
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });
  if (replaced && existingId && existingNotes) {
    try {
      const parsed = JSON.parse(existingNotes) as Record<string, unknown>;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          parsed.pieces = pieces;
          parsed.artworkPlaced = true;
        await supabase
          .from("assets")
          .update({ notes: JSON.stringify(parsed), byte_size: stamped.length })
          .eq("id", existingId);
      }
    } catch {
      /* plain notes stay as they are */
    }
  }
  const url = supabase.storage.from("ai-posters").getPublicUrl(filePath).data.publicUrl;
  if (!replaced) {
    const notes = JSON.stringify({
      kind: "poster",
      pieces,
      artworkPlaced: true,
      artUrl: pictures.find((piece) => piece.cover)?.src || imageUrl || "",
    });
    const row = {
      bucket: "ai-posters",
      path: filePath,
      public_url: url,
      filename: "poster.png",
      mime_type: "image/png",
      kind: "image",
      client_id: client?.id ?? null,
      notes,
      byte_size: stamped.length,
    };
    const inserted = await supabase.from("assets").insert(row).select("id").maybeSingle();
    if (inserted.error) {
      await supabase.from("assets").insert({
        bucket: row.bucket,
        path: row.path,
        public_url: row.public_url,
        filename: row.filename,
        mime_type: row.mime_type,
        kind: row.kind,
        client_id: row.client_id,
        notes: "ai-poster",
      });
    }
  }
  return NextResponse.json({ url, replaced });
}
