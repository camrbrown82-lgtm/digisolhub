import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { assertContactInWorkspace, requireWorkspaceClientId } from "@/lib/tenantGuard";

type Params = { params: { id: string } };

export async function POST(request: Request, { params }: Params) {
  const { user, supabase, error } = await requireHubSession();
  if (error || !user) return error;
  const { clientId, error: workspaceError } = await requireWorkspaceClientId(supabase);
  if (workspaceError) return workspaceError;
  if (!(await assertContactInWorkspace(supabase, params.id, clientId))) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const body = (await request.json()) as { body?: string };
  if (!body.body?.trim()) {
    return NextResponse.json({ error: "Note is required" }, { status: 400 });
  }

  const { error: insertError } = await supabase.from("notes").insert({
    contact_id: params.id,
    body: body.body.trim(),
    created_by: user.id,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
