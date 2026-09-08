import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { HUB_CLIENT_COOKIE } from "@/lib/workspace";

export async function POST(request: Request) {
  const { error } = await requireHubSession();
  if (error) return error;

  const body = (await request.json()) as { clientId?: string };
  const clientId = (body.clientId ?? "").trim();
  const response = NextResponse.json({ ok: true, clientId });
  if (!clientId) {
    response.cookies.delete(HUB_CLIENT_COOKIE);
  } else {
    response.cookies.set(HUB_CLIENT_COOKIE, clientId, {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}
