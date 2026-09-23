import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { runWebsiteAudit } from "@/lib/agent/websiteAudit";
import { ensureWebsiteAuditSchema } from "@/lib/ensureWebsiteAuditSchema";
import { getWorkspaceClient, resolveClientId } from "@/lib/workspace";

export async function GET() {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  const clientId = (await resolveClientId(supabase)) || null;
  let query = supabase
    .from("website_audits")
    .select("id, client_id, url, final_url, score, ttfb_ms, total_ms, report, created_at")
    .order("created_at", { ascending: false })
    .limit(1);
  if (clientId) query = query.eq("client_id", clientId);

  const { data, error: queryError } = await query.maybeSingle();
  if (queryError) {
    return NextResponse.json({ audit: null, error: queryError.message });
  }
  return NextResponse.json({ audit: data });
}

export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  await ensureWebsiteAuditSchema().catch(() => null);

  const body = (await request.json().catch(() => null)) as {
    url?: string;
  } | null;

  const active = await getWorkspaceClient(supabase);
  const clientId = (await resolveClientId(supabase)) || active?.id || null;
  let url = body?.url?.trim() || "";
  if (!url && active?.domain) {
    url = active.domain.startsWith("http")
      ? active.domain
      : `https://${active.domain}`;
  }
  if (!url) {
    return NextResponse.json(
      { error: "Provide a URL or set a company domain under Working on." },
      { status: 400 },
    );
  }

  const audit = await runWebsiteAudit(url);

  const { data: saved, error: saveError } = await supabase
    .from("website_audits")
    .insert({
      client_id: clientId,
      url: audit.url,
      final_url: audit.finalUrl,
      score: audit.score,
      ttfb_ms: audit.metrics.ttfbMs,
      total_ms: audit.metrics.totalMs,
      report: audit.report,
      raw: {
        seo: audit.seo,
        metrics: audit.metrics,
        issues: audit.issues,
        status: audit.status,
      },
    })
    .select("id, client_id, url, final_url, score, ttfb_ms, total_ms, report, created_at")
    .maybeSingle();

  if (saveError) {
    // Table may not exist yet — still return the live audit for the UI.
    return NextResponse.json({
      audit: {
        id: null,
        url: audit.url,
        final_url: audit.finalUrl,
        score: audit.score,
        ttfb_ms: audit.metrics.ttfbMs,
        total_ms: audit.metrics.totalMs,
        report: audit.report,
        created_at: new Date().toISOString(),
      },
      live: audit,
      persisted: false,
      warning: saveError.message,
    });
  }

  return NextResponse.json({ audit: saved, live: audit, persisted: true });
}
