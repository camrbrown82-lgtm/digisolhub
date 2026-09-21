import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { resolveClientId } from "@/lib/workspace";

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

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    subject?: string;
    html?: string;
    grapes_json?: unknown;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid template payload" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") patch.name = body.name.trim() || "Untitled template";
  if (typeof body.subject === "string") patch.subject = body.subject;
  if (typeof body.html === "string") patch.html = body.html;
  if ("grapes_json" in body) patch.grapes_json = body.grapes_json ?? null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to save" }, { status: 400 });
  }

  const clientId = await resolveClientId(supabase);
  let query = supabase.from("email_templates").update(patch).eq("id", params.id);
  if (clientId) query = query.eq("client_id", clientId);

  const { data, error: updateError } = await query.select("id").maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }
  if (!data?.id) {
    // Template may belong to another/missing company — re-home to Working on.
    const { data: moved, error: moveError } = await supabase
      .from("email_templates")
      .update({ ...patch, client_id: clientId || null })
      .eq("id", params.id)
      .select("id")
      .maybeSingle();
    if (moveError || !moved?.id) {
      return NextResponse.json(
        {
          error:
            "Could not save this template for the current company. Pick DigiSol under Working on, then try Save again.",
        },
        { status: 404 },
      );
    }
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
