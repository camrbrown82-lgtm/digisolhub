import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";

type Params = { params: { id: string } };

export async function POST(request: Request, { params }: Params) {
  const { user, supabase, error } = await requireHubSession();
  if (error || !user) return error;

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
