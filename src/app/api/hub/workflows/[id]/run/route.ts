import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { emitHubEvent } from "@/lib/events";

type Params = { params: { id: string } };

const RUN_CAP = 50;

export async function POST(request: Request, { params }: Params) {
  const { error } = await requireHubSession();
  if (error) return error;

  const body = (await request.json()) as {
    contactId?: string;
    contactIds?: string[];
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

  for (const contactId of ids) {
    await emitHubEvent("hub/workflow.run", {
      workflowId: params.id,
      contactId,
    });
  }

  return NextResponse.json({ ok: true, queued: ids.length });
}
