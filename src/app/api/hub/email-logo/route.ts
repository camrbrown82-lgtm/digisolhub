import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import {
  EMAIL_LOGO_NOTE,
  getEmailLogoAsset,
  getEmailLogoUrl,
} from "@/lib/emailLogo";
import { persistClientLogo } from "@/lib/brandLogo";
import { resolveClientId } from "@/lib/workspace";

export async function GET() {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const clientId = await resolveClientId(supabase);
  const url = await getEmailLogoUrl(supabase, clientId || null);
  if (url) return NextResponse.redirect(url);
  return NextResponse.json({ error: "This company has no logo yet" }, { status: 404 });
}

export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "A logo file is required" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Upload a PNG, JPEG, or similar image" }, { status: 400 });
  }

  const clientId = (await resolveClientId(supabase)) || null;
  const ext = file.name.split(".").pop() || "png";
  const path = `logos/${clientId || "shared"}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("email-images")
    .upload(path, buffer, {
      contentType: file.type || "image/png",
      upsert: false,
    });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("email-images").getPublicUrl(path);

  const previous = await getEmailLogoAsset(supabase, clientId);
  const { error: insertError } = await supabase.from("assets").insert({
    bucket: "email-images",
    path,
    public_url: publicUrl,
    filename: file.name,
    mime_type: file.type || "image/png",
    kind: "image",
    byte_size: file.size,
    notes: EMAIL_LOGO_NOTE,
    client_id: clientId,
  });
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  if (previous?.id) {
    await supabase.from("assets").delete().eq("id", previous.id);
  }

  if (clientId) {
    try {
      await persistClientLogo(supabase, clientId, { logoUrl: publicUrl });
    } catch {
      // Asset is already saved; branding write is best-effort.
    }
  }

  return NextResponse.json({ ok: true, url: publicUrl });
}

export async function DELETE() {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const clientId = (await resolveClientId(supabase)) || null;
  const asset = await getEmailLogoAsset(supabase, clientId);
  if (asset?.id) {
    await supabase.from("assets").delete().eq("id", asset.id);
  }
  return NextResponse.json({ ok: true, url: await getEmailLogoUrl(supabase, clientId) });
}
