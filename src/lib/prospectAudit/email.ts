import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProspectAuditSummary } from "@/lib/prospectAudit/summary";
import { sendAuditFollowUpEmail } from "@/lib/prospectAudit/followUpEmail";

export async function sendProspectAuditEmail(input: {
  db: SupabaseClient;
  clientId: string;
  prospectId: string;
  businessName?: string | null;
  email: string;
  trade: string;
  url: string;
  score: number;
  summary: ProspectAuditSummary;
}) {
  const sent = await sendAuditFollowUpEmail({
    db: input.db,
    clientId: input.clientId,
    email: input.email,
    company: input.businessName,
    url: input.url,
    score: input.score,
    summary: input.summary.summary,
    weaknesses: input.summary.weaknesses,
    opener: input.summary.opener,
    subject: input.summary.subject,
    source: "prospect_audit",
  });

  // Keep trade tag on the contact for filtering.
  if (sent.contactId) {
    const { data: existing } = await input.db
      .from("contacts")
      .select("tags")
      .eq("id", sent.contactId)
      .maybeSingle();
    const tags = Array.from(
      new Set([
        ...((existing?.tags as string[] | null) ?? []),
        `trade:${input.trade}`,
        "prospect_audit",
      ]),
    );
    await input.db
      .from("contacts")
      .update({ tags })
      .eq("id", sent.contactId);
  }

  return {
    contactId: sent.contactId,
    sendId: sent.sendId,
    resendId: sent.resendId,
  };
}
