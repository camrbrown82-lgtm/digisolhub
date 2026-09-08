import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { inferFileKind, isFileKind, MAX_FILE_BYTES } from "@/lib/files";
import { getActiveClientId } from "@/lib/workspace";

const BUCKETS = ["assets", "email-images", "ai-posters"] as const;

async function registerAsset(
  supabase: Awaited<ReturnType<typeof requireHubSession>>["supabase"],
  input: {
    file: File;
    bucket: string;
    kind?: string;
    notes?: string;
  },
) {
  if (input.file.size > MAX_FILE_BYTES) {
    throw new Error(`${input.file.name} is larger than 20MB`);
  }
  if (!BUCKETS.includes(input.bucket as (typeof BUCKETS)[number])) {
    throw new Error("Invalid bucket");
  }

  const kind = isFileKind(input.kind ?? "")
    ? input.kind
    : inferFileKind(input.file.name, input.file.type);
  const ext = input.file.name.split(".").pop() || "bin";
  const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await input.file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from(input.bucket).upload(path, buffer, {
    contentType: input.file.type || "application/octet-stream",
    upsert: false,
  });
  if (uploadError) throw new Error(uploadError.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from(input.bucket).getPublicUrl(path);

  const { data, error: insertError } = await supabase
    .from("assets")
    .insert({
      bucket: input.bucket,
      path,
      public_url: publicUrl,
      filename: input.file.name,
      mime_type: input.file.type || null,
      kind,
      byte_size: input.file.size,
      notes: input.notes?.trim() || null,
      client_id: (await getActiveClientId()) || null,
    })
    .select("*")
    .single();

  if (insertError) throw new Error(insertError.message);
  return data;
}

export async function GET() {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const clientId = await getActiveClientId();
  let query = supabase.from("assets").select("*").order("created_at", { ascending: false });
  if (clientId) query = query.eq("client_id", clientId);
  const { data, error: queryError } = await query;

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 400 });
  }
  return NextResponse.json({ assets: data });
}

export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  if ((request.headers.get("content-type") ?? "").includes("application/json")) {
    const body = (await request.json()) as {
      bucket?: string;
      path?: string;
      public_url?: string;
      filename?: string;
      mime_type?: string;
      kind?: string;
      byte_size?: number;
      notes?: string;
    };
    const bucket = body.bucket || "assets";
    if (!BUCKETS.includes(bucket as (typeof BUCKETS)[number]) || !body.path || !body.filename) {
      return NextResponse.json({ error: "File metadata is incomplete" }, { status: 400 });
    }
    const kind = isFileKind(body.kind ?? "")
      ? body.kind
      : inferFileKind(body.filename, body.mime_type ?? "");
    const { data, error: insertError } = await supabase
      .from("assets")
      .insert({
        bucket,
        path: body.path,
        public_url: body.public_url ?? null,
        filename: body.filename,
        mime_type: body.mime_type ?? null,
        kind,
        byte_size: body.byte_size ?? null,
        notes: body.notes?.trim() || null,
        client_id: (await getActiveClientId()) || null,
      })
      .select("*")
      .single();
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }
    return NextResponse.json({ asset: data, assets: [data], failed: [] });
  }

  const form = await request.formData();
  const bucket = String(form.get("bucket") ?? "assets");
  const kind = String(form.get("kind") ?? "");
  const notes = String(form.get("notes") ?? "");
  const files = form
    .getAll("file")
    .concat(form.getAll("files"))
    .filter((item): item is File => item instanceof File && item.size > 0);

  if (files.length === 0) {
    return NextResponse.json({ error: "At least one file is required" }, { status: 400 });
  }

  const uploaded = [];
  const failed: { filename: string; error: string }[] = [];
  for (const file of files.slice(0, 25)) {
    try {
      uploaded.push(await registerAsset(supabase, { file, bucket, kind, notes }));
    } catch (err) {
      failed.push({
        filename: file.name,
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }

  if (uploaded.length === 0) {
    return NextResponse.json(
      { error: failed[0]?.error || "Upload failed", failed },
      { status: 400 },
    );
  }

  return NextResponse.json({
    asset: uploaded[0],
    assets: uploaded,
    failed,
  });
}
