export type StarterKey =
  | "welcome"
  | "proposal"
  | "project_update"
  | "invoice"
  | "newsletter"
  | "meeting_recap";

export type StarterTemplate = {
  key: StarterKey;
  name: string;
  blurb: string;
  subject: string;
  body: string;
};

export const TEMPLATE_VARIABLES = [
  "{{name}}",
  "{{company}}",
  "{{contact_company}}",
  "{{logo}}",
  "{{tagline}}",
  "{{primary}}",
  "{{secondary}}",
  "{{accent}}",
  "{{background}}",
  "{{text}}",
  "{{highlight}}",
  "{{fonts}}",
] as const;

export const TEMPLATE_VARIABLE_HINTS: Record<(typeof TEMPLATE_VARIABLES)[number], string> = {
  "{{name}}": "Contact name",
  "{{company}}": "Your brand (Working on)",
  "{{contact_company}}": "Recipient company",
  "{{logo}}": "Official logo",
  "{{tagline}}": "Tagline",
  "{{primary}}": "Primary color",
  "{{secondary}}": "Secondary color",
  "{{accent}}": "Accent color",
  "{{background}}": "Background",
  "{{text}}": "Text color",
  "{{highlight}}": "Highlight color",
  "{{fonts}}": "Fonts",
};

export type MergeVars = {
  name?: string;
  company?: string;
  contactCompany?: string;
  logo?: string;
  tagline?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  highlightColor?: string;
  fonts?: string;
};

export function mergeVarsFromBrand(
  companyName: string,
  brand: {
    tagline?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
    highlightColor?: string;
    fonts?: string;
  },
  name?: string,
  logo?: string,
  contactCompany?: string | null,
): MergeVars {
  return {
    name: name?.trim() || "there",
    company: companyName.trim(),
    contactCompany: contactCompany?.trim() || companyName.trim(),
    logo,
    tagline: brand.tagline?.trim() || "",
    primaryColor: brand.primaryColor || "",
    secondaryColor: brand.secondaryColor || "",
    accentColor: brand.accentColor || "",
    backgroundColor: brand.backgroundColor || "",
    textColor: brand.textColor || "",
    highlightColor: brand.highlightColor || "",
    fonts: brand.fonts || "",
  };
}

export function renderMergeFields(
  text: string,
  vars: MergeVars,
  opts?: { logoAs?: "token" | "value" | "company" },
) {
  const logoMode = opts?.logoAs ?? "token";
  const logoReplacement =
    logoMode === "token"
      ? "{{logo}}"
      : logoMode === "company"
        ? vars.company?.trim() || ""
        : vars.logo?.trim() || vars.company?.trim() || "";

  return text
    .replaceAll("{{name}}", vars.name?.trim() || "there")
    .replaceAll("{{company}}", vars.company?.trim() || "")
    .replaceAll(
      "{{contact_company}}",
      vars.contactCompany?.trim() || vars.company?.trim() || "",
    )
    .replaceAll("{{tagline}}", vars.tagline?.trim() || "")
    .replaceAll("{{primary}}", vars.primaryColor?.trim() || "")
    .replaceAll("{{secondary}}", vars.secondaryColor?.trim() || "")
    .replaceAll("{{accent}}", vars.accentColor?.trim() || "")
    .replaceAll("{{background}}", vars.backgroundColor?.trim() || "")
    .replaceAll("{{text}}", vars.textColor?.trim() || "")
    .replaceAll("{{highlight}}", vars.highlightColor?.trim() || "")
    .replaceAll("{{fonts}}", vars.fonts?.trim() || "")
    .replaceAll("{{logo}}", logoReplacement);
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    key: "welcome",
    name: "Welcome",
    blurb: "Warm first touch after a new lead or kickoff.",
    subject: "Welcome to {{company}}, {{name}}",
    body: `Hey {{name}},

Welcome to {{company}}. Glad you're here.

{{tagline}}

If there's anything you're looking for, just reply to this email and we'll help you out.

Talk soon,
{{company}}`,
  },
  {
    key: "proposal",
    name: "Quote follow-up",
    blurb: "Short nudge after you sent a quote or offer.",
    subject: "Following up on your quote",
    body: `Hey {{name}},

Just checking in on the quote we sent while it's still fresh.

If it looks good, reply and we'll get you booked in. If anything should change, tell us what and we'll adjust it.

{{company}}`,
  },
  {
    key: "project_update",
    name: "Status update",
    blurb: "Status note that feels human, not a ticket dump.",
    subject: "An update from {{company}}",
    body: `Hey {{name}},

A quick update from us:

• Done: 
• Next: 
• Need from you: 

If anything looks off, reply on this thread and we'll sort it out.

{{company}}`,
  },
  {
    key: "invoice",
    name: "Invoice reminder",
    blurb: "Firm, polite, and easy to act on.",
    subject: "Invoice waiting — easy close",
    body: `Hey {{name}},

Friendly reminder that an invoice for {{company}} is sitting in your inbox.

It only takes a minute to pay, and it keeps everything moving.

If the bill looks wrong or you need it split, reply here and I'll fix it today.

Thanks,
{{company}}`,
  },
  {
    key: "newsletter",
    name: "Monthly news",
    blurb: "A punchy update people might actually open.",
    subject: "What's new at {{company}} this month",
    body: `Hey {{name}},

Here's what's new at {{company}} this month:

• 
• 
• 

Reply any time. We read every message.

{{company}}`,
  },
  {
    key: "meeting_recap",
    name: "Meeting recap",
    blurb: "What we decided, what's next, who owns it.",
    subject: "Recap + next step from today",
    body: `Hey {{name}},

Thanks for the time today. Here's the short version:

• We agreed: 
• We'll do next: 
• You'll send: 

If I missed anything, correct me on this thread.

{{company}}`,
  },
];

export function starterKeyOf(value: unknown): StarterKey | null {
  if (!value || typeof value !== "object") return null;
  const key = (value as { starterKey?: string }).starterKey;
  return STARTER_TEMPLATES.some((row) => row.key === key)
    ? (key as StarterKey)
    : null;
}
