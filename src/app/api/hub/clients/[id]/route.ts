import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { parseBrand } from "@/lib/branding";

type Params = { params: { id: string } };

export async function GET(_request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const { data, error: queryError } = await supabase
    .from("clients")
    .select("id, name, domain, notes, branding")
    .eq("id", params.id)
    .maybeSingle();

  if (queryError || !data) {
    return NextResponse.json({ error: queryError?.message || "Company not found" }, { status: 404 });
  }
  return NextResponse.json({ client: { ...data, branding: parseBrand(data.branding) } });
}

export async function PATCH(request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const body = (await request.json()) as {
    name?: string;
    domain?: string;
    notes?: string;
    branding?: unknown;
  };

  const update: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();
  if (typeof body.domain === "string") update.domain = body.domain.trim() || null;
  if (typeof body.notes === "string") update.notes = body.notes.trim() || null;
  if (body.branding !== undefined) update.branding = parseBrand(body.branding);

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error: updateError } = await supabase
    .from("clients")
    .update(update)
    .eq("id", params.id)
    .select("id, name, domain, notes, branding")
    .single();

  if (updateError || !data) {
    return NextResponse.json(
      { error: updateError?.message || "Could not save brand" },
      { status: 400 },
    );
  }

  return NextResponse.json({ client: { ...data, branding: parseBrand(data.branding) } });
}
