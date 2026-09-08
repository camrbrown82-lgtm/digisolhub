import { NextResponse } from "next/server";
import { supabaseEnvStatus } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const status = supabaseEnvStatus();
  return NextResponse.json({
    connected: status.url && status.anon && status.serviceRole,
    url: status.url,
    anon: status.anon,
    serviceRole: status.serviceRole,
  });
}
