/**
 * Hub contact sections — one person can belong to one primary audience
 * so workflows can target a demographic without mixing the whole CRM.
 */

export type ContactAudienceId =
  | "prospect_trades"
  | "prospect_audit"
  | "new_leads"
  | "operator"
  | "other";

export type AudiencePreset = "trades" | "audits" | "leads" | "engaged" | "me";

export const AUDIENCE_PRESETS: AudiencePreset[] = [
  "trades",
  "audits",
  "leads",
  "engaged",
  "me",
];

export const CONTACT_AUDIENCE_SECTIONS: {
  id: ContactAudienceId;
  label: string;
  hint: string;
}[] = [
  {
    id: "prospect_trades",
    label: "Prospect audits — trades",
    hint: "Cold website audits for trade businesses (HVAC, mechanical, and similar).",
  },
  {
    id: "prospect_audit",
    label: "Prospect audits — other",
    hint: "Audited companies that are not tagged as a trade.",
  },
  {
    id: "new_leads",
    label: "New leads",
    hint: "Organic inquiries — forms, Facebook, Kaylev chat, consult requests.",
  },
  {
    id: "operator",
    label: "You (testing)",
    hint: "Your own CRM rows so you can run a workflow on yourself.",
  },
  {
    id: "other",
    label: "Other contacts",
    hint: "Everyone else in the workspace.",
  },
];

const TRADE_RE =
  /\b(trade|hvac|plumb|electr|roof|furnace|mechanic|heating|cooling|hvac)\b|trade:/i;

const AUDIT_TAG_RE =
  /^(prospect_audit|cold_prospect|audit_followup|prospect_audit_engaged|audit_strong|audit_needs_work)$/i;

export function classifyContact(input: {
  email?: string | null;
  tags?: string[] | null;
  source?: string | null;
  service?: string | null;
  company?: string | null;
  audited?: boolean;
  operatorEmails?: string[];
}): ContactAudienceId {
  const email = (input.email || "").trim().toLowerCase();
  const operators = new Set(
    (input.operatorEmails || []).map((row) => row.trim().toLowerCase()),
  );
  if (email && operators.has(email)) return "operator";

  const tags = input.tags || [];
  const blob = [
    ...tags,
    input.source || "",
    input.service || "",
    input.company || "",
  ]
    .join(" ")
    .toLowerCase();

  const isAudit =
    Boolean(input.audited) ||
    /prospect_audit|cold_prospect|audit/.test((input.source || "").toLowerCase()) ||
    tags.some((tag) => AUDIT_TAG_RE.test(tag) || /prospect_audit|cold_prospect/i.test(tag));

  const isTrade =
    tags.some((tag) => /^trade:/i.test(tag)) || TRADE_RE.test(blob);

  if (isAudit && isTrade) return "prospect_trades";
  if (isAudit) return "prospect_audit";

  const source = (input.source || "").toLowerCase();
  const organic =
    source === "visitor_chat" ||
    source === "website" ||
    source === "facebook" ||
    source === "form" ||
    source === "manual" ||
    tags.some((tag) =>
      /^(lead|visitor_chat|consultation|facebook|new_lead)$/i.test(tag),
    );
  if (organic) return "new_leads";
  return "other";
}

const ENGAGED_TAG_RE =
  /^(engaged|prospect_audit_engaged|warm[-_]?lead|opened|clicked|replied|consulted|consult[-_]?booked)$/i;

/** Opened or clicked a tracked email, or carries an engagement tag. */
export function isEngagedContact(input: {
  tags?: string[] | null;
  engaged?: boolean;
}) {
  return Boolean(input.engaged) || (input.tags || []).some((tag) => ENGAGED_TAG_RE.test(tag));
}

export function contactsForPreset<
  T extends Parameters<typeof classifyContact>[0] & { engaged?: boolean },
>(
  contacts: T[],
  preset: AudiencePreset,
  operatorEmails: string[] = [],
) {
  return contacts.filter((contact) => {
    const id = classifyContact({ ...contact, operatorEmails });
    if (preset === "engaged") return id !== "operator" && isEngagedContact(contact);
    if (preset === "me") return id === "operator";
    if (preset === "trades") return id === "prospect_trades";
    if (preset === "audits") {
      return id === "prospect_trades" || id === "prospect_audit";
    }
    if (preset === "leads") return id === "new_leads";
    return false;
  });
}

export function parseAudiencePreset(value: string | null | undefined): AudiencePreset | null {
  return AUDIENCE_PRESETS.includes(value as AudiencePreset)
    ? (value as AudiencePreset)
    : null;
}
