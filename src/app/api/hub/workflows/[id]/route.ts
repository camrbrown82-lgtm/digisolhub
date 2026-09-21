import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { ensureTagDescriptionSchema } from "@/lib/ensureTagSchema";

type Params = { params: { id: string } };

export async function GET(_request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const { data, error: queryError } = await supabase
    .from("workflows")
    .select("*")
    .eq("id", params.id)
    .single();

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 404 });
  }
  return NextResponse.json({ workflow: data });
}

export async function PATCH(request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    trigger?: string;
    enabled?: boolean;
    graph?: {
      nodes?: Array<{
        data?: {
          action?: string;
          tag?: string;
          tagDescription?: string;
        };
      }>;
    };
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid workflow payload" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.trigger === "string") patch.trigger = body.trigger;
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (body.graph) patch.graph = body.graph;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("workflows")
    .update(patch)
    .eq("id", params.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  // Keep Hub tag catalogue in sync when tag steps are edited.
  if (body.graph?.nodes) {
    await ensureTagDescriptionSchema().catch(() => null);
    for (const node of body.graph.nodes) {
      const data = node.data;
      if (data?.action !== "add_tag" || !data.tag) continue;
      const name = String(data.tag)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .slice(0, 40);
      if (!name) continue;
      const description = String(data.tagDescription || "").trim().slice(0, 240);
      const { data: existing } = await supabase
        .from("tags")
        .select("id")
        .ilike("name", name)
        .maybeSingle();
      if (existing?.id) {
        if (description) {
          await supabase
            .from("tags")
            .update({ description })
            .eq("id", existing.id);
        }
      } else {
        await supabase.from("tags").insert({
          name,
          description: description || null,
          color: "#6366f1",
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
