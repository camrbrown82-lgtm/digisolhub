import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { requireWorkspaceClientId } from "@/lib/tenantGuard";

const MAX_IDS = 1000;
const CHUNK = 200;

/** POST { ids } — deletes those contacts, only inside the Working-on company. */
export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const workspace = await requireWorkspaceClientId(supabase);
  if (workspace.error) return workspace.error;

  const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = Array.from(
    new Set(
      (Array.isArray(body?.ids) ? body.ids : [])
        .map((id) => (typeof id === "string" ? id.trim() : ""))
        .filter((id) => /^[0-9a-f-]{36}$/i.test(id)),
    ),
  );
  if (!ids.length) {
    return NextResponse.json({ error: "Select at least one contact." }, { status: 400 });
  }
  if (ids.length > MAX_IDS) {
    return NextResponse.json({ error: `Delete up to ${MAX_IDS} contacts at a time.` }, { status: 400 });
  }

  let deleted = 0;
  for (let index = 0; index < ids.length; index += CHUNK) {
    const { error: deleteError, count } = await supabase
      .from("contacts")
      .delete({ count: "exact" })
      .in("id", ids.slice(index, index + CHUNK))
      .eq("client_id", workspace.clientId);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message, deleted }, { status: 400 });
    }
    deleted += count ?? 0;
  }

  return NextResponse.json({ ok: true, deleted });
}
