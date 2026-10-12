import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { mergeBrand, parseBrand, starterBrandForCompany } from "@/lib/branding";
import { deleteCompany } from "@/lib/deleteCompany";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { HUB_CLIENT_COOKIE, getActiveClientId } from "@/lib/workspace";

type Params = { params: { id: string } };

function brandedClient(data: {
  id: string;
  name: string;
  domain: string | null;
  notes: string | null;
  branding: unknown;
}) {
  return {
    ...data,
    branding: parseBrand(data.branding, starterBrandForCompany(data.name)),
  };
}

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
  return NextResponse.json({ client: brandedClient(data) });
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
  if (body.branding !== undefined) {
    const { data: current } = await supabase
      .from("clients")
      .select("name, branding")
      .eq("id", params.id)
      .maybeSingle();
    update.branding = mergeBrand(
      current?.branding,
      body.branding,
      starterBrandForCompany(
        typeof update.name === "string" ? update.name : current?.name,
      ),
    );
  }

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

  return NextResponse.json({ client: brandedClient(data) });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireHubSession();
  if (error) return error;
  if (!hasAdminClient()) {
    return NextResponse.json({ error: "Company delete needs the Hub database key." }, { status: 400 });
  }

  try {
    const result = await deleteCompany(createAdminClient(), params.id);
    if ("missing" in result) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    if ("protected" in result) {
      return NextResponse.json({ error: "DigiSol stays. Remove another company instead." }, { status: 400 });
    }
    revalidatePath("/hub", "layout");
    const response = NextResponse.json({ ok: true, name: result.name });
    if ((await getActiveClientId()) === params.id) {
      response.cookies.delete(HUB_CLIENT_COOKIE);
    }
    return response;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not delete the company" },
      { status: 400 },
    );
  }
}
