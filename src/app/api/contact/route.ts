import { NextResponse } from "next/server";
import { getWeb3FormsAccessKey } from "@/lib/supabase/env";
import { hasAdminClient } from "@/lib/supabase/admin";
import { normalizeLead, upsertLead } from "@/lib/leads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const OWNER_EMAIL = "cam.r.brown82@gmail.com";

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const accessKey = getWeb3FormsAccessKey();

  if (accessKey) {
    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        access_key: accessKey,
        subject: "DigiSol consultation request",
        from_name: "DigiSol Website",
        name: body.name,
        email: body.email,
        replyto: body.email,
        business: body.company,
        service: body.service,
        message: body.message,
        to_notify: OWNER_EMAIL,
        botcheck: body.botcheck,
      }),
    });
    const result = (await response.json()) as { success?: boolean; message?: string };
    if (!response.ok || !result.success) {
      return NextResponse.json(
        { error: result.message || "Could not send the request." },
        { status: 400 },
      );
    }
  }

  if (hasAdminClient()) {
    try {
      await upsertLead(
        normalizeLead({
          ...body,
          source: "web3forms",
        }),
      );
    } catch (error) {
      console.error("Lead ingest failed", error);
    }
  }

  if (!accessKey && !hasAdminClient()) {
    return NextResponse.json(
      { error: "Contact delivery is not configured." },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}
