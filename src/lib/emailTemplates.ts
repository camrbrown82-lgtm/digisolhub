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
  "{{company}}": "Company",
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
): MergeVars {
  return {
    name: name?.trim() || "there",
    company: companyName.trim() || "DigiSol",
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
        ? vars.company?.trim() || "DigiSol"
        : vars.logo?.trim() || vars.company?.trim() || "";

  return text
    .replaceAll("{{name}}", vars.name?.trim() || "there")
    .replaceAll("{{company}}", vars.company?.trim() || "DigiSol")
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
    subject: "{{name}}, you're in — let's build",
    body: `Hey {{name}},

Welcome to {{company}}. Glad you're here.

{{tagline}}

Reply with the one thing you want working better in the next 30 days, and we'll come back with a tight plan.

Talk soon,
{{company}}`,
  },
  {
    key: "proposal",
    name: "Proposal follow-up",
    blurb: "Short nudge after you sent a quote or scope.",
    subject: "Quick thought on your {{company}} build",
    body: `Hey {{name}},

Wanted to bump the proposal while it's still fresh.

The piece that usually moves the needle first is the homepage offer plus a faster path to contact. If that still matches what you need, I can lock dates this week.

If the scope should shrink or shift, say the word and I'll recut it.

{{company}}`,
  },
  {
    key: "project_update",
    name: "Project update",
    blurb: "Status note that feels human, not a ticket dump.",
    subject: "This week's progress on {{company}}",
    body: `Hey {{name}},

Quick pulse on the build:

• Shipped: the pages and flows we scoped last week
• Next: polish, tracking, and the launch checklist
• Need from you: a yes/no on the homepage copy

If anything feels off, reply on this thread and I'll adjust before we go further.

{{company}}`,
  },
  {
    key: "invoice",
    name: "Invoice reminder",
    blurb: "Firm, polite, and easy to act on.",
    subject: "Invoice waiting — easy close",
    body: `Hey {{name}},

Friendly reminder that an invoice for {{company}} is sitting in your inbox.

Pay whenever you have 60 seconds — that keeps the next sprint unblocked.

If the bill looks wrong or you need it split, reply here and I'll fix it today.

Thanks,
{{company}}`,
  },
  {
    key: "newsletter",
    name: "Monthly flare",
    blurb: "A punchy update people might actually open.",
    subject: "One change that lifted replies this month",
    body: `Hey {{name}},

Most sites leak leads in the same spot: a clever headline and a timid next step.

We tightened the offer, moved the form up, and made the first reply feel like a conversation — not a ticket.

If you want the same pass on {{company}}, hit reply with "show me" and I'll send a 3-bullet plan.

{{company}}`,
  },
  {
    key: "meeting_recap",
    name: "Meeting recap",
    blurb: "What we decided, what's next, who owns it.",
    subject: "Recap + next step from today",
    body: `Hey {{name}},

Good session. Here's the short version:

• We agreed the site should sell the outcome, not the stack
• I'll draft the homepage and form this week
• You send brand files / logo if anything changed

I'll ping you when there's something to click. If I missed a decision, correct me on this thread.

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
