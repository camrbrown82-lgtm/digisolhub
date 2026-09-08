import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";

type Params = { params: { id: string } };

export async function GET(_request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const { data, error: queryError } = await supabase
    .from("email_templates")
    .select("*")
    .eq("id", params.id)
    .single();

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 404 });
  }
  return NextResponse.json({ template: data });
}

export async function PATCH(request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const body = (await request.json()) as Record<string, unknown>;
  const { error: updateError } = await supabase
    .from("email_templates")
    .update(body)
    .eq("id", params.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const { error: deleteError } = await supabase
    .from("email_templates")
    .delete()
    .eq("id", params.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
