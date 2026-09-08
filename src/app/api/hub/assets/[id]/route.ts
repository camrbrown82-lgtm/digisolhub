import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";

type Params = { params: { id: string } };

export async function DELETE(_request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const { data: asset, error: lookupError } = await supabase
    .from("assets")
    .select("id, bucket, path")
    .eq("id", params.id)
    .single();

  if (lookupError || !asset) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (asset.bucket && asset.path) {
    await supabase.storage.from(asset.bucket).remove([asset.path]);
  }

  const { error: deleteError } = await supabase.from("assets").delete().eq("id", params.id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
