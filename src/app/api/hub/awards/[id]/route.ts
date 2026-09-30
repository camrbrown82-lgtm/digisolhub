import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { ensureWebsiteAwardsSchema } from "@/lib/ensureWebsiteAwardsSchema";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { workspaceIsDigisol } from "@/lib/workspace";

export const dynamic = "force-dynamic";

/** PATCH { featured } — show or hide a winner on the public /awards page. DigiSol workspace only. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;
  if (!(await workspaceIsDigisol(supabase))) {
    return NextResponse.json({ error: "Switch Working on to DigiSol to manage awards." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { featured?: boolean } | null;
  if (typeof body?.featured !== "boolean") {
    return NextResponse.json({ error: "Send { featured: true | false }." }, { status: 400 });
  }

  await ensureWebsiteAwardsSchema();
  const db = hasAdminClient() ? createAdminClient() : supabase;
  const { data, error: updateError } = await db
    .from("website_awards")
    .update({ featured: body.featured })
    .eq("id", params.id)
    .select("id")
    .maybeSingle();
  if (updateError || !data) {
    return NextResponse.json({ error: updateError?.message || "Award not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
