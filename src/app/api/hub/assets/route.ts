import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";

export async function GET() {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const { data, error: queryError } = await supabase
    .from("assets")
    .select("*")
    .order("created_at", { ascending: false });

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 400 });
  }
  return NextResponse.json({ assets: data });
}

export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const form = await request.formData();
  const file = form.get("file");
  const bucket = String(form.get("bucket") ?? "assets");
  const allowed = ["assets", "email-images", "ai-posters"];

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }
  if (!allowed.includes(bucket)) {
    return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "bin";
  const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  const { data, error: insertError } = await supabase
    .from("assets")
    .insert({
      bucket,
      path,
      public_url: publicUrl,
      filename: file.name,
      mime_type: file.type,
    })
    .select("*")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({ asset: data });
}
