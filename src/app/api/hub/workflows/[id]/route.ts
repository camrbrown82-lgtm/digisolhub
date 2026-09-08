import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";

type Params = { params: { id: string } };

export async function GET(_request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const { data, error: queryError } = await supabase
    .from("workflows")
    .select("*")
    .eq("id", params.id)
    .single();

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 404 });
  }
  return NextResponse.json({ workflow: data });
}

export async function PATCH(request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const body = (await request.json()) as Record<string, unknown>;
  const { error: updateError } = await supabase
    .from("workflows")
    .update(body)
    .eq("id", params.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
