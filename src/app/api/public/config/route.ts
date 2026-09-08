import { NextResponse } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: "Supabase URL or anon key is missing on the server." },
      { status: 503 },
    );
  }
  return NextResponse.json({ supabaseUrl, supabaseAnonKey });
}
