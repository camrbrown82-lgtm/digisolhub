import { NextResponse } from "next/server";
import sharp from "sharp";
import { requireHubSession } from "@/lib/auth";
import { brandFromClient } from "@/lib/branding";
import { resolveOfficialLogoFile } from "@/lib/brandLogo";
import { createOpenAIClient, getOpenAIApiKey, openaiErrorMessage } from "@/lib/openai";
import { imagePiece, withArtworkPiece, type LayoutPiece } from "@/lib/layoutPieces";
import { stampLayoutText } from "@/lib/layoutText";
import { directScenePrompt, generateSceneBuffer } from "@/lib/poster";
import { POSTER_CANVAS, aiPosterObjectPath } from "@/lib/posterSizes";
import { fitInto } from "@/lib/stampLogo";
import { getWorkspaceClient } from "@/lib/workspace";

export const runtime = "nodejs";
export const maxDuration = 120;

/** One square social image drawn from the request. The logo is its own removable layer. */
export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;
  if (!getOpenAIApiKey()) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as {
    prompt?: string;
    replaceUrl?: string;
    artUrl?: string;
  } | null;
  const prompt = body?.prompt?.trim().slice(0, 1500) || "";
  if (prompt.length < 8) {
    return NextResponse.json({ error: "Say what the image should show." }, { status: 400 });
  }

  const client = await getWorkspaceClient(supabase);
  const { brand } = brandFromClient(client);
  const openai = createOpenAIClient();
  let buffer: Buffer | null = null;
  try {
    buffer = await generateSceneBuffer(
      openai,
      directScenePrompt(prompt, {
        backgroundColor: brand.backgroundColor,
        primaryColor: brand.primaryColor,
        highlightColor: brand.highlightColor,
      }),
      "square",
      process.env.OPENAI_IMAGE_MODEL,
    );
  } catch (err) {
    return NextResponse.json({ error: openaiErrorMessage(err) }, { status: 502 });
  }
  if (!buffer) return NextResponse.json({ error: "No image came back." }, { status: 502 });

  const frame = POSTER_CANVAS.square;
  const scene = await fitInto(buffer, frame.width, frame.height);
  const logo = await resolveOfficialLogoFile(supabase, client);
  const overlays: LayoutPiece[] = [];
  const pictures = new Map<string, Buffer>();
  if (logo?.buffer?.length) {
    const logoPath = `${Date.now()}-social-logo.png`;
    const png = await sharp(logo.buffer).png().toBuffer();
    const { error: logoError } = await supabase.storage.from("ai-posters").upload(logoPath, png, {
      contentType: "image/png",
      upsert: false,
    });
    if (!logoError) {
      const src = supabase.storage.from("ai-posters").getPublicUrl(logoPath).data.publicUrl;
      pictures.set(src, logo.buffer);
      overlays.push(imagePiece("logo", "Logo", src, Math.round(frame.height * 0.1), 6, 3));
    }
  }
  const typed = overlays.length
    ? await stampLayoutText(scene, frame.width, frame.height, overlays, brand.textColor, {
        highlight: brand.highlightColor,
        images: pictures,
      }).catch(() => scene)
    : scene;
  const copyPieces = overlays;

  const reusePublic = aiPosterObjectPath(body?.replaceUrl);
  const reuseArt = aiPosterObjectPath(body?.artUrl);
  let reusing = false;
  if (reusePublic && reuseArt && reusePublic !== reuseArt) {
    const { data: existing } = await supabase
      .from("assets")
      .select("id, client_id")
      .eq("bucket", "ai-posters")
      .eq("path", reusePublic)
      .maybeSingle();
    reusing = Boolean(existing && (!existing.client_id || !client?.id || existing.client_id === client.id));
  }
  const stamp = Date.now();
  const artPath = reusing ? reuseArt : `${stamp}-social-art.png`;
  const path = reusing ? reusePublic : `${stamp}-social.png`;
  const { error: artError } = await supabase.storage.from("ai-posters").upload(artPath, scene, {
    contentType: "image/png",
    upsert: reusing,
    ...(reusing ? { cacheControl: "0" } : {}),
  });
  if (artError) return NextResponse.json({ error: artError.message }, { status: 400 });
  const { error: uploadError } = await supabase.storage.from("ai-posters").upload(path, typed, {
    contentType: "image/png",
    upsert: reusing,
    ...(reusing ? { cacheControl: "0" } : {}),
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });
  const { data: stored } = supabase.storage.from("ai-posters").getPublicUrl(path);
  const artUrl = supabase.storage.from("ai-posters").getPublicUrl(artPath).data.publicUrl;
  const pieces = withArtworkPiece(copyPieces, artUrl, frame.height);
  const notes = JSON.stringify({ kind: "social-studio", artUrl, pieces, artworkPlaced: true });
  if (reusing) {
    await supabase
      .from("assets")
      .update({ byte_size: typed.length, caption: prompt.slice(0, 160), notes })
      .eq("bucket", "ai-posters")
      .eq("path", path);
  } else {
    const { error: insertError } = await supabase.from("assets").insert({
      bucket: "ai-posters",
      path,
      public_url: stored.publicUrl,
      filename: path,
      mime_type: "image/png",
      kind: "image",
      byte_size: typed.length,
      client_id: client?.id || null,
      caption: prompt.slice(0, 160),
      notes,
    });
    if (insertError) console.error("Could not save social image", insertError.message);
  }

  return NextResponse.json({
    url: stored.publicUrl,
    artUrl,
    pieces,
    label: prompt.slice(0, 80),
  });
}
