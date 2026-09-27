/**
 * Shared “audited prospect company” detection for workflow audience scoping.
 * Matches Hub prospect audits linked to CRM contacts + prospect_audit tags/sources.
 */
export const AUDITED_PROSPECT_STATUSES = [
  "audited",
  "emailed",
  "promoted",
] as const;

export const AUDITED_CONTACT_TAG_RE =
  /^(prospect_audit|cold_prospect|audit_followup|prospect_audit_engaged)$/i;

export function isAuditedContact(opts: {
  id: string;
  tags?: string[] | null;
  source?: string | null;
  auditedIds: Set<string>;
}) {
  if (opts.auditedIds.has(opts.id)) return true;
  const source = (opts.source || "").toLowerCase();
  if (
    source === "prospect_audit" ||
    source === "prospect_audit_engaged" ||
    source.includes("audit")
  ) {
    return true;
  }
  const tags = opts.tags ?? [];
  return tags.some((tag) => AUDITED_CONTACT_TAG_RE.test(tag));
}

export function audienceLooksAuditedOnly(text: string | null | undefined) {
  const t = (text || "").toLowerCase();
  if (!t.trim()) return false;
  return (
    /\baudited\b/.test(t) ||
    t.includes("prospect_audit") ||
    t.includes("cold_prospect") ||
    (t.includes("audit") && (t.includes("only") || t.includes("prospect")))
  );
}
