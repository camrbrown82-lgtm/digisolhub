import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { starterBrandForCompany } from "@/lib/branding";
import { signUpClientContact } from "@/lib/clientOnboarding";
import { recordClientWin } from "@/lib/clientWins";

export async function GET() {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const { data, error: queryError } = await supabase
    .from("clients")
    .select("*")
    .order("name");

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 400 });
  }
  return NextResponse.json({ clients: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const body = (await request.json()) as {
    name?: string;
    domain?: string;
    notes?: string;
    contactName?: string;
    contactEmail?: string;
    startOnboarding?: boolean;
  };
  const contactEmail = body.contactEmail?.trim() || "";
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return NextResponse.json({ error: "Add a valid contact email, or leave it empty." }, { status: 400 });
  }
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Company name is required" }, { status: 400 });
  }

  const { data, error: insertError } = await supabase
    .from("clients")
    .insert({
      name,
      domain: body.domain?.trim() || null,
      notes: body.notes?.trim() || null,
      branding: starterBrandForCompany(name),
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }
  await recordClientWin(supabase, data.id).catch(() => null);
  if (!contactEmail) return NextResponse.json({ id: data.id });
  try {
    const signup = await signUpClientContact(supabase, {
      clientId: data.id,
      email: contactEmail,
      name: body.contactName,
      startOnboarding: body.startOnboarding !== false,
    });
    return NextResponse.json({ id: data.id, ...signup });
  } catch (err) {
    return NextResponse.json({
      id: data.id,
      warning: `Company created, but the contact wasn't added: ${err instanceof Error ? err.message : "unknown error"}`,
    });
  }
}
