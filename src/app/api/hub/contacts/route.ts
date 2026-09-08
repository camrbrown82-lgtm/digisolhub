import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { emitHubEvent } from "@/lib/events";

export async function GET() {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const { data, error: queryError } = await supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 400 });
  }
  return NextResponse.json({ contacts: data });
}

export async function POST(request: Request) {
  const { user, supabase, error } = await requireHubSession();
  if (error || !user) return error;

  const body = (await request.json()) as {
    name?: string;
    email?: string;
    company?: string;
    domain?: string;
    phone?: string;
    service?: string;
    source?: string;
    tags?: string[];
  };

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const { data, error: insertError } = await supabase
    .from("contacts")
    .insert({
      name: body.name ?? null,
      email,
      company: body.company ?? null,
      domain: body.domain ?? null,
      phone: body.phone ?? null,
      service: body.service ?? null,
      source: body.source ?? "manual",
      tags: body.tags ?? [],
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  await emitHubEvent("hub/lead.created", { contactId: data.id });
  return NextResponse.json({ id: data.id });
}
