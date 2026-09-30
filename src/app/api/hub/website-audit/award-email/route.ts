import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { awardEmailContent } from "@/lib/awardEmail";
import { recordAward } from "@/lib/awardRegistry";
import { DIGISOL_BRAND, DIGISOL_HOUSE_NAME } from "@/lib/branding";
import { findOrCreateContactForSend, sendEmailToContact } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOutboundSiteUrl } from "@/lib/supabase/env";
import { requireWorkspaceClientId } from "@/lib/tenantGuard";
import { awardDate, awardEmbedHtml, awardLinks, loadAward } from "@/lib/websiteAward";
import { ensureDigisolClient } from "@/lib/workspace";

export const dynamic = "force-dynamic";

/** POST { auditId, to, name? } — email the company its award, sent by DigiSol. */
export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;
  const { clientId, error: workspaceError } = await requireWorkspaceClientId(supabase);
  if (workspaceError) return workspaceError;

  const body = (await request.json().catch(() => null)) as { auditId?: string; to?: string; name?: string } | null;
  const to = (body?.to || "").trim().toLowerCase();
  if (!body?.auditId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "Add a valid email address." }, { status: 400 });
  }

  const { data: owned } = await supabase
    .from("website_audits")
    .select("id")
    .eq("id", body.auditId)
    .eq("client_id", clientId)
    .maybeSingle();
  if (!owned) return NextResponse.json({ error: "Audit not found for this company." }, { status: 404 });

  const award = await loadAward(createAdminClient(), body.auditId);
  if (award.state !== "valid") {
    return NextResponse.json({ error: "This audit hasn't earned a current award." }, { status: 409 });
  }

  try {
    const contact = await findOrCreateContactForSend(supabase, {
      email: to,
      clientId,
      companyName: award.companyName,
    });
    if (contact.unsubscribed_at) {
      return NextResponse.json({ error: `${to} has unsubscribed, so the award email wasn't sent.` }, { status: 409 });
    }
    const base = getOutboundSiteUrl();
    const links = awardLinks(base, award.auditId);
    const { subject, html } = awardEmailContent({
      companyName: award.companyName,
      recipientName: body.name || contact.name,
      score: award.score,
      date: awardDate(award.auditedAt),
      addBadgeUrl: links.add,
      badgeUrl: links.badgePng,
      embedHtml: awardEmbedHtml(base, award.auditId, award.companyName, award.score),
    });
    // The award comes from DigiSol, so it goes out in DigiSol's kit rather than the company's.
    const houseId = await ensureDigisolClient(supabase);
    const sent = await sendEmailToContact({
      contactId: contact.id,
      contact,
      subject,
      html,
      db: supabase,
      clientId: houseId || null,
      companyName: DIGISOL_HOUSE_NAME,
      brand: DIGISOL_BRAND,
    });
    await recordAward(createAdminClient(), {
      id: award.auditId,
      source: "hub",
      companyName: award.companyName,
      url: award.site,
      score: award.score,
      auditId: award.auditId,
      clientId,
      contactId: contact.id,
      sentTo: to,
      sentAt: new Date().toISOString(),
      awardedAt: award.auditedAt,
    });
    return NextResponse.json({ ok: true, sendId: sent.sendId ?? null });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not send the award email." },
      { status: 502 },
    );
  }
}
