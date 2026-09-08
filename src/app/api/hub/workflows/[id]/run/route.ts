import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { emitHubEvent } from "@/lib/events";

type Params = { params: { id: string } };

export async function POST(request: Request, { params }: Params) {
  const { error } = await requireHubSession();
  if (error) return error;

  const body = (await request.json()) as { contactId?: string };
  if (!body.contactId) {
    return NextResponse.json({ error: "contactId is required" }, { status: 400 });
  }

  await emitHubEvent("hub/workflow.run", {
    workflowId: params.id,
    contactId: body.contactId,
  });

  return NextResponse.json({ ok: true });
}
