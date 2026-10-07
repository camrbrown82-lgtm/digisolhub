import { NextResponse } from "next/server";
import sharp from "sharp";
import { requireHubSession } from "@/lib/auth";
import { brandFromClient } from "@/lib/branding";
import { resolveOfficialLogoFile } from "@/lib/brandLogo";
import { adsWorkspace, type AdDraftRow } from "@/lib/meta/adDrafts";
import { AD_CTAS, type AdCta } from "@/lib/meta/adOptions";
import { createOpenAIClient, getOpenAIApiKey, openaiErrorMessage } from "@/lib/openai";
import { imagePiece, piecesFromCopy, withArtworkPiece, type LayoutPiece } from "@/lib/layoutPieces";
import { stampLayoutText } from "@/lib/layoutText";
import { directScenePrompt, generateSceneBuffer } from "@/lib/poster";
import { POSTER_CANVAS } from "@/lib/posterSizes";
import { fitInto } from "@/lib/stampLogo";
import { getWorkspaceClient } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Params = { params: { id: string } };

/** POST — make two new feed-sized ad images from this draft's copy. Saved posters stay available too. */
export async function POST(request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;
  const workspace = await adsWorkspace(supabase);
  if ("error" in workspace) return workspace.error;
  if (!getOpenAIApiKey()) return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 400 });

  const { data } = await supabase
    .from("meta_ad_drafts")
    .select("id, headline, primary_text, description, cta, link_url, name, brief")
    .eq("id", params.id)
    .eq("client_id", workspace.clientId)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  const draft = data as Pick<AdDraftRow, "headline" | "primary_text" | "description" | "cta" | "link_url" | "name" | "brief">;

  const body = (await request.json().catch(() => null)) as {
    headline?: string;
    description?: string;
    cta?: string;
  } | null;
  const headline = (body?.headline || draft.headline).trim().slice(0, 40);
  const description = (body?.description || draft.description).trim().slice(0, 30);
  const ctaKey = (body?.cta || draft.cta) as AdCta;
  const button = AD_CTAS[ctaKey] || "Learn more";
  if (!headline) return NextResponse.json({ error: "Add a headline first." }, { status: 400 });

  const client = await getWorkspaceClient(supabase);
  const { brand } = brandFromClient(client);
  const openai = createOpenAIClient();
  const logo = await resolveOfficialLogoFile(supabase, client);
  const made: { url: string; artUrl: string; label: string; pieces: LayoutPiece[] }[] = [];
  const ask = [draft.brief, draft.primary_text, headline].filter(Boolean).join(". ");

  for (let index = 0; index < 2; index += 1) {
    const request = index === 0 ? ask : `${ask}. A different composition of that same request.`;
    let buffer: Buffer | null = null;
    try {
      buffer = await generateSceneBuffer(
        openai,
        directScenePrompt(request, {
          backgroundColor: brand.backgroundColor,
          primaryColor: brand.primaryColor,
          highlightColor: brand.highlightColor,
        }),
        "portrait",
        process.env.OPENAI_IMAGE_MODEL,
      );
    } catch (err) {
      if (!made.length && index === 1) {
        return NextResponse.json({ error: openaiErrorMessage(err) }, { status: 502 });
      }
      continue;
    }
    if (!buffer) continue;
    const frame = POSTER_CANVAS.portrait;
    const scene = await fitInto(buffer, frame.width, frame.height);
    const overlays: LayoutPiece[] = [];
    const pictures = new Map<string, Buffer>();
    if (logo?.buffer?.length) {
      const logoPath = `${params.id}-ad-v${index + 1}-logo.png`;
      const png = await sharp(logo.buffer).png().toBuffer();
      const { error: logoError } = await supabase.storage.from("ai-posters").upload(logoPath, png, {
        contentType: "image/png",
        upsert: true,
        cacheControl: "0",
      });
      if (!logoError) {
        const src = supabase.storage.from("ai-posters").getPublicUrl(logoPath).data.publicUrl;
        pictures.set(src, logo.buffer);
        overlays.push(imagePiece("logo", "Logo", src, Math.round(frame.height * 0.07), 6, 2));
      }
    }
    const copyPieces = [...overlays, ...piecesFromCopy([headline, description, button].filter(Boolean), draft.link_url)];
    const stamped = copyPieces.length
      ? await stampLayoutText(scene, frame.width, frame.height, copyPieces, brand.textColor, {
          highlight: brand.highlightColor,
          images: pictures,
        }).catch(() => scene)
      : scene;
    const artPath = `${params.id}-ad-v${index + 1}-art.png`;
    const path = `${params.id}-ad-v${index + 1}.png`;
    const { error: artError } = await supabase.storage.from("ai-posters").upload(artPath, scene, {
      contentType: "image/png",
      upsert: true,
      cacheControl: "0",
    });
    if (artError) return NextResponse.json({ error: artError.message }, { status: 400 });
    const { error: uploadError } = await supabase.storage.from("ai-posters").upload(path, stamped, {
      contentType: "image/png",
      upsert: true,
      cacheControl: "0",
    });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });
    const publicUrl = supabase.storage.from("ai-posters").getPublicUrl(path).data.publicUrl;
    const artUrl = supabase.storage.from("ai-posters").getPublicUrl(artPath).data.publicUrl;
    const pieces = withArtworkPiece(copyPieces, artUrl, frame.height);
    const notes = JSON.stringify({ kind: "ad-creative", draftId: params.id, artUrl, pieces, artworkPlaced: true });
    const { data: existing } = await supabase
      .from("assets")
      .select("id")
      .eq("bucket", "ai-posters")
      .eq("path", path)
      .maybeSingle();
    if (existing?.id) {
      await supabase.from("assets").update({ byte_size: stamped.length, caption: headline, notes }).eq("id", existing.id);
    } else {
      await supabase.from("assets").insert({
        bucket: "ai-posters",
        path,
        public_url: publicUrl,
        filename: `ad-${index + 1}.png`,
        mime_type: "image/png",
        kind: "image",
        byte_size: stamped.length,
        client_id: workspace.clientId,
        notes,
        caption: headline,
      });
    }
    made.push({ url: publicUrl, artUrl, label: `Version ${index + 1} · 1080×1350`, pieces });
  }

  if (made[0]) {
    await supabase
      .from("meta_ad_drafts")
      .update({ poster_url: made[0].url, updated_at: new Date().toISOString() })
      .eq("id", params.id);
  }

  if (!made.length) return NextResponse.json({ error: "No ad image came back." }, { status: 502 });
  return NextResponse.json({ ok: true, images: made });
}
