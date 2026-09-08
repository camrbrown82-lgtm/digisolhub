import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { emitHubEvent } from "@/lib/events";

type Params = { params: { id: string } };

export async function GET(_request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const { data, error: queryError } = await supabase
    .from("contacts")
    .select("*, notes(*)")
    .eq("id", params.id)
    .single();

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 404 });
  }
  return NextResponse.json({ contact: data });
}

export async function PATCH(request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const body = (await request.json()) as Record<string, unknown>;
  const previous = await supabase
    .from("contacts")
    .select("tags")
    .eq("id", params.id)
    .single();

  const { error: updateError } = await supabase
    .from("contacts")
    .update(body)
    .eq("id", params.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  const nextTags = Array.isArray(body.tags) ? (body.tags as string[]) : [];
  const prevTags = previous.data?.tags ?? [];
  const added = nextTags.find((tag) => !prevTags.includes(tag));
  if (added) {
    await emitHubEvent("hub/tag.added", { contactId: params.id, tag: added });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const { error: deleteError } = await supabase
    .from("contacts")
    .delete()
    .eq("id", params.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
