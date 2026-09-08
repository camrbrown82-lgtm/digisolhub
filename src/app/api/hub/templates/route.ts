import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";

export async function GET() {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const { data, error: queryError } = await supabase
    .from("email_templates")
    .select("*")
    .order("updated_at", { ascending: false });

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
      subject: body.subject ?? "Hello from DigiSol",
      html: body.html ?? "",
      grapes_json: body.grapes_json ?? null,
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }
  return NextResponse.json({ id: data.id });
}
