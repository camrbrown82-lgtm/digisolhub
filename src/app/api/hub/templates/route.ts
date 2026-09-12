import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { STARTER_TEMPLATES, starterKeyOf } from "@/lib/emailTemplates";
import { getActiveClientId } from "@/lib/workspace";

async function ensureStarterTemplates(
  supabase: Awaited<ReturnType<typeof requireHubSession>>["supabase"],
  clientId: string | null,
) {
  let query = supabase.from("email_templates").select("id, grapes_json");
  query = clientId ? query.eq("client_id", clientId) : query.is("client_id", null);
  const { data } = await query;
  const existing = new Set(
    (data ?? [])
      .map((row) => starterKeyOf(row.grapes_json))
      .filter((key): key is NonNullable<typeof key> => Boolean(key)),
  );
  const missing = STARTER_TEMPLATES.filter((row) => !existing.has(row.key));
  if (missing.length === 0) return;

  await supabase.from("email_templates").insert(
    missing.map((row) => ({
      name: row.name,
      subject: row.subject,
      html: row.body,
      grapes_json: { starterKey: row.key },
      client_id: clientId,
    })),
  );
}

export async function GET() {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const clientId = (await getActiveClientId()) || null;
  await ensureStarterTemplates(supabase, clientId);

  let query = supabase
    .from("email_templates")
    .select("*")
    .order("updated_at", { ascending: false });
  if (clientId) query = query.eq("client_id", clientId);

  const { data, error: queryError } = await query;
  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 400 });
  }
  return NextResponse.json({ templates: data });
}

export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const body = (await request.json()) as {
    name?: string;
    subject?: string;
    html?: string;
    grapes_json?: unknown;
  };

  const { data, error: insertError } = await supabase
    .from("email_templates")
    .insert({
      name: body.name?.trim() || "Untitled template",
      subject: body.subject ?? "",
      html: body.html ?? "",
      grapes_json: body.grapes_json ?? null,
      client_id: (await getActiveClientId()) || null,
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }
  return NextResponse.json({ id: data.id });
}
