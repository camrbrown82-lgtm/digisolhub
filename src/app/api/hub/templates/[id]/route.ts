import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { resolveClientId, workspaceIsDigisol } from "@/lib/workspace";

type Params = { params: { id: string } };

export async function GET(_request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const clientId = await resolveClientId(supabase);
  if (!clientId) {
    return NextResponse.json({ error: "Template not found for this company" }, { status: 404 });
  }
  const query = supabase.from("email_templates").select("*").eq("id", params.id);
  const { data, error: queryError } = await ((await workspaceIsDigisol(supabase))
    ? query.or(`client_id.eq.${clientId},client_id.is.null`)
    : query.eq("client_id", clientId)
  ).maybeSingle();

  if (queryError || !data) {
    return NextResponse.json(
      { error: queryError?.message || "Template not found for this company" },
      { status: 404 },
    );
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
  if (!clientId) {
    return NextResponse.json({ error: "Pick a company under Working on first." }, { status: 400 });
  }

  const { data, error: updateError } = await supabase
    .from("email_templates")
    .update(patch)
    .eq("id", params.id)
    .eq("client_id", clientId)
    .select("id")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }
  if (!data?.id) {
    // Legacy templates saved before companies existed can be claimed; another company's can't.
    const { data: claimed, error: claimError } = await supabase
      .from("email_templates")
      .update({ ...patch, client_id: clientId })
      .eq("id", params.id)
      .is("client_id", null)
      .select("id")
      .maybeSingle();
    if (claimError || !claimed?.id) {
      return NextResponse.json(
        { error: "This template belongs to another company. Switch Working on to that company to edit it." },
        { status: 404 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const clientId = await resolveClientId(supabase);
  const { data, error: deleteError } = await supabase
    .from("email_templates")
    .delete()
    .eq("id", params.id)
    .eq("client_id", clientId)
    .select("id");

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }
  if (!data?.length) {
    return NextResponse.json({ error: "Template not found for this company" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
