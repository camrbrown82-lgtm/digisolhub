import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { emitHubEvent } from "@/lib/events";

type Params = { params: { id: string } };

const RUN_CAP = 50;

export async function POST(request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

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
      .in("id", planTemplateIds);
    if ((found ?? []).length !== planTemplateIds.length) {
      return NextResponse.json(
        { error: "The email plan points at a template that no longer exists. Re-run Kaylev's match." },
        { status: 400 },
      );
    }
  }

  for (const contactId of ids) {
    const overrides = plan[contactId];
    await emitHubEvent("hub/workflow.run", {
      workflowId: params.id,
      contactId,
      ...(overrides && Object.keys(overrides).length
        ? { templateOverrides: overrides }
        : {}),
    });
  }

  return NextResponse.json({ ok: true, queued: ids.length });
}
