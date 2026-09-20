import { NextResponse } from "next/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { subscribeToDispatch } from "@/lib/dispatchMail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  if (!hasAdminClient()) {
    return NextResponse.json(
      { error: "Newsletter signup is not configured yet." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    name?: string;
    email?: string;
    company?: string;
    botcheck?: string;
  };

  if (body.botcheck) {
    return NextResponse.json({ ok: true });
  }

  const name = body.name?.trim() || "";
  const email = body.email?.trim().toLowerCase() || "";
  if (!name) {
    return NextResponse.json({ error: "Add your name" }, { status: 400 });
  }
  if (!validEmail(email)) {
    return NextResponse.json({ error: "Add a valid email" }, { status: 400 });
  }

  try {
    await subscribeToDispatch(createAdminClient(), {
      name,
      email,
      company: body.company,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not subscribe right now.",
      },
      { status: 400 },
    );
  }
}
