import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import {
  BRAND_LOGO_NOTE,
  MAX_LOGO_BYTES,
  clearClientLogo,
  describeLogoFromImage,
  getBrandLogoAsset,
  persistClientLogo,
  replaceLogoAsset,
} from "@/lib/brandLogo";
import { createOpenAIClient, getOpenAIApiKey } from "@/lib/openai";
import { getActiveClientId } from "@/lib/workspace";

async function resolveClientId(
  supabase: Awaited<ReturnType<typeof requireHubSession>>["supabase"],
  requested?: string | null,
) {
  const id = requested?.trim() || (await getActiveClientId());
  if (!id) return null;
  const { data } = await supabase.from("clients").select("id, name").eq("id", id).maybeSingle();
  return data ? { id: data.id as string, name: (data.name as string) || "Company" } : null;
}

export async function GET() {
  const { supabase, error } = await requireHubSession();
  if (error) return error;
  const client = await resolveClientId(supabase);
  if (!client) return NextResponse.json({ url: "" });
  const asset = await getBrandLogoAsset(supabase, client.id);
  return NextResponse.json({ url: asset?.public_url || "" });
}

export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Drop or choose a logo image" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Upload a PNG, JPEG, WebP, or similar image" }, { status: 400 });
  }
  if (file.size > MAX_LOGO_BYTES) {
    return NextResponse.json({ error: "Logo must be 8MB or smaller" }, { status: 400 });
  }

  const client = await resolveClientId(supabase, String(form.get("clientId") || ""));
  if (!client) {
    return NextResponse.json({ error: "Select a company first" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const { publicUrl } = await replaceLogoAsset(supabase, {
      clientId: client.id,
      buffer,
      filename: file.name || "logo.png",
      contentType: file.type || "image/png",
      byteSize: file.size,
      note: BRAND_LOGO_NOTE,
    });

    let logoDescription = "";
    if (getOpenAIApiKey()) {
      try {
        logoDescription = await describeLogoFromImage(createOpenAIClient(), {
          companyName: client.name,
          buffer,
          contentType: file.type || "image/png",
        });
      } catch {
        logoDescription = "";
      }
    }

    await persistClientLogo(supabase, client.id, {
      logoUrl: publicUrl,
      logoDescription,
    });

    return NextResponse.json({
      ok: true,
      url: publicUrl,
      description: logoDescription,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not save logo" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  let clientId = "";
  try {
    const body = (await request.json()) as { clientId?: string };
    clientId = body.clientId?.trim() || "";
  } catch {
    clientId = "";
  }

  const client = await resolveClientId(supabase, clientId);
  if (!client) {
    return NextResponse.json({ error: "Select a company first" }, { status: 400 });
  }

  const asset = await getBrandLogoAsset(supabase, client.id);
  if (asset?.id) {
    await supabase.from("assets").delete().eq("id", asset.id);
  }
  await clearClientLogo(supabase, client.id);
  return NextResponse.json({ ok: true, url: "" });
}
