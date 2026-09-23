import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import {
  HUB_CLIENT_COOKIE,
  getActiveClientId,
  listClients,
  resolveClientId,
} from "@/lib/workspace";

export async function GET() {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const cookieId = await getActiveClientId();
  const resolvedId = await resolveClientId(supabase);
  const clients = await listClients(supabase);
  const response = NextResponse.json({
    clientId: resolvedId,
    cookieId,
    repaired: Boolean(cookieId && cookieId !== resolvedId),
    clients,
  });

  // Clear / repair stale Working-on cookie after a deleted company.
  if (cookieId && cookieId !== resolvedId) {
    if (resolvedId) {
      response.cookies.set(HUB_CLIENT_COOKIE, resolvedId, {
        path: "/",
        sameSite: "lax",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 365,
      });
    } else {
      response.cookies.delete(HUB_CLIENT_COOKIE);
    }
  }

  return response;
}

export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const body = (await request.json()) as { clientId?: string };
  const clientId = (body.clientId ?? "").trim();

  if (clientId) {
    const { data } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .maybeSingle();
    if (!data?.id) {
      return NextResponse.json(
        { error: "That company is gone. Pick DigiSol (or another) under Working on." },
        { status: 400 },
      );
    }
  }

  const response = NextResponse.json({ ok: true, clientId });
  if (!clientId) {
    response.cookies.delete(HUB_CLIENT_COOKIE);
  } else {
    response.cookies.set(HUB_CLIENT_COOKIE, clientId, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}
