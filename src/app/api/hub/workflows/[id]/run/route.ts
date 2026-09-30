import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { emitHubEvent } from "@/lib/events";
import { assertRowInWorkspace, requireWorkspaceClientId } from "@/lib/tenantGuard";

type Params = { params: { id: string } };

const RUN_CAP = 50;

export async function POST(request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;
  const { clientId, error: workspaceError } = await requireWorkspaceClientId(supabase);
  if (workspaceError) return workspaceError;
  if (!(await assertRowInWorkspace(supabase, "workflows", params.id, clientId))) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    contactId?: string;
    contactIds?: string[];
    /** Approved per-contact picks: contactId → send step id → template id. */
    emailPlan?: Record<string, Record<string, string>>;
  };

  const ids = Array.from(
    new Set(
      [
        ...(Array.isArray(body.contactIds) ? body.contactIds : []),
        body.contactId,
      ]
        .map((id) => String(id || "").trim())
        .filter(Boolean),
    ),
  ).slice(0, RUN_CAP);

  if (ids.length === 0) {
    return NextResponse.json(
      { error: "Select at least one contact to run" },
      { status: 400 },
    );
  }

  const { data: contactRows } = await supabase
    .from("contacts")
    .select("id, unsubscribed_at")
    .in("id", ids)
    .eq("client_id", clientId);
  const inWorkspace = new Set((contactRows ?? []).map((row) => row.id as string));
  const unsubscribed = new Set(
    (contactRows ?? [])
      .filter((row) => row.unsubscribed_at)
      .map((row) => row.id as string),
  );
  const runIds = ids.filter((id) => inWorkspace.has(id) && !unsubscribed.has(id));
  if (inWorkspace.size === 0) {
    return NextResponse.json(
      { error: "None of the selected contacts belong to this company." },
      { status: 404 },
    );
  }
  if (runIds.length === 0) {
    return NextResponse.json(
      { error: "Everyone selected has unsubscribed — Kaylev won't email them." },
      { status: 400 },
    );
  }

  const plan =
    body.emailPlan && typeof body.emailPlan === "object" ? body.emailPlan : {};
  const planTemplateIds = Array.from(
    new Set(
      ids.flatMap((id) =>
        Object.values(plan[id] ?? {}).filter(
          (value): value is string => typeof value === "string" && Boolean(value),
        ),
      ),
    ),
  );
  if (planTemplateIds.length) {
    const { data: found } = await supabase
      .from("email_templates")
      .select("id")
      .in("id", planTemplateIds)
      .eq("client_id", clientId);
    if ((found ?? []).length !== planTemplateIds.length) {
      return NextResponse.json(
        { error: "The email plan points at a template that no longer exists. Re-run Kaylev's match." },
        { status: 400 },
      );
    }
  }

  for (const contactId of runIds) {
    const overrides = plan[contactId];
    await emitHubEvent("hub/workflow.run", {
      workflowId: params.id,
      contactId,
      ...(overrides && Object.keys(overrides).length
        ? { templateOverrides: overrides }
        : {}),
    });
  }

  return NextResponse.json({
    ok: true,
    queued: runIds.length,
    skippedUnsubscribed: unsubscribed.size,
  });
}
