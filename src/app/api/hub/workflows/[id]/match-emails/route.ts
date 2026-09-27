import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import {
  createOpenAIClient,
  getOpenAIApiKey,
  getOpenAITextModel,
} from "@/lib/openai";
import { resolveClientId } from "@/lib/workspace";

type Params = { params: { id: string } };

const MATCH_CAP = 50;
const BATCH_SIZE = 15;

type SendStep = { id: string; label: string; templateId: string };

type ContactFacts = {
  id: string;
  label: string;
  email: string;
  company: string | null;
  source: string | null;
  service: string | null;
  tags: string[];
  trade: string | null;
  city: string | null;
  auditScore: number | null;
  auditSummary: string | null;
};

export type EmailMatchRow = {
  contactId: string;
  label: string;
  trade: string | null;
  auditScore: number | null;
  steps: Record<string, string>;
  reason: string;
};

const SYSTEM_PROMPT = `You are Kaylev, DigiSol Hub's campaign assistant. You pick which saved email template each contact should get at each Send step of a workflow.

Rules:
- Only use template ids from the provided list. Never invent ids.
- The operator names templates by industry, audience, and audit result (e.g. "Restaurant low audit score", "Trades high audit", "General business"). Match on those words.
- Industry: use the contact's trade, company name, tags, and service. Restaurants, cafes, bars, and food service are "restaurant". HVAC, plumbing, electrical, roofing, mechanical, and contractors are "trades".
- Audit score is out of 100. Treat 70+ as high and under 70 as low unless the operator rules say otherwise. No score means not audited — prefer a lead or general template.
- Organic leads (forms, Facebook, chat, consult) get lead templates when one exists.
- When no specific template fits, use the general/business template that fits everyone. If none exists, use the step's current default.
- Follow the operator rules exactly when they are given.
- Different Send steps can get different templates (e.g. welcome vs follow-up) when names make that clear.
- reason: under 15 words, plain English, e.g. "Restaurant, audit score 42 → low-score restaurant email".

Return JSON only:
{ "assignments": [ { "contactId": "...", "steps": { "<stepId>": "<templateId>" }, "reason": "..." } ] }`;

function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request: Request, { params }: Params) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  if (!getOpenAIApiKey()) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured, so Kaylev cannot match emails." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    contactIds?: string[];
    rules?: string;
    graph?: { nodes?: Array<{ id?: string; data?: Record<string, unknown> }> };
  } | null;

  const contactIds = Array.from(
    new Set((body?.contactIds ?? []).map((id) => String(id || "").trim()).filter(Boolean)),
  ).slice(0, MATCH_CAP);
  if (contactIds.length === 0) {
    return NextResponse.json({ error: "Add contacts to the run list first." }, { status: 400 });
  }

  const clientId = await resolveClientId(supabase);

  const { data: workflow } = await supabase
    .from("workflows")
    .select("id, name, graph")
    .eq("id", params.id)
    .single();
  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  // Prefer the unsaved graph from the editor so new steps count.
  const graphNodes = (body?.graph?.nodes ??
    (workflow.graph as { nodes?: Array<{ id?: string; data?: Record<string, unknown> }> })
      ?.nodes ??
    []) as Array<{ id?: string; data?: Record<string, unknown> }>;
  const sendSteps: SendStep[] = graphNodes
    .filter((node) => node.id && node.data?.action === "send_template")
    .map((node) => ({
      id: String(node.id),
      label: String(node.data?.label || "Send email"),
      templateId: String(node.data?.templateId || ""),
    }));
  if (sendSteps.length === 0) {
    return NextResponse.json(
      { error: "This workflow has no Send steps to fill." },
      { status: 400 },
    );
  }
  const plan = String(
    graphNodes.find((node) => node.id === "trigger")?.data?.plan || "",
  ).slice(0, 600);

  let templatesQuery = supabase
    .from("email_templates")
    .select("id, name, subject, html")
    .order("updated_at", { ascending: false })
    .limit(60);
  if (clientId) templatesQuery = templatesQuery.eq("client_id", clientId);

  let contactsQuery = supabase
    .from("contacts")
    .select("id, name, email, company, source, service, tags")
    .in("id", contactIds);
  if (clientId) contactsQuery = contactsQuery.eq("client_id", clientId);

  const [{ data: templateRows }, { data: contactRows }, { data: prospectRows }] =
    await Promise.all([
      templatesQuery,
      contactsQuery,
      supabase
        .from("prospects")
        .select("contact_id, business_name, trade, city, audit_score, audit_summary")
        .in("contact_id", contactIds),
    ]);

  const templates = (templateRows ?? []).map((row) => ({
    id: row.id as string,
    name: (row.name as string) || "Untitled template",
    subject: (row.subject as string | null) || "",
    preview: stripHtml(String(row.html || "")).slice(0, 220),
  }));
  if (templates.length === 0) {
    return NextResponse.json(
      { error: "No email templates for this company yet — create them under Email first." },
      { status: 400 },
    );
  }
  const templateIds = new Set(templates.map((row) => row.id));

  const prospectByContact = new Map<string, Record<string, unknown>>();
  for (const row of prospectRows ?? []) {
    const id = row.contact_id as string | null;
    if (id && !prospectByContact.has(id)) prospectByContact.set(id, row);
  }

  const facts: ContactFacts[] = (contactRows ?? []).map((row) => {
    const prospect = prospectByContact.get(row.id as string);
    const company =
      (row.company as string | null) || (prospect?.business_name as string | null) || null;
    return {
      id: row.id as string,
      label: company || (row.name as string | null) || (row.email as string),
      email: row.email as string,
      company,
      source: (row.source as string | null) ?? null,
      service: (row.service as string | null) ?? null,
      tags: Array.isArray(row.tags) ? (row.tags as string[]).slice(0, 12) : [],
      trade: (prospect?.trade as string | null) ?? null,
      city: (prospect?.city as string | null) ?? null,
      auditScore:
        typeof prospect?.audit_score === "number" ? (prospect.audit_score as number) : null,
      auditSummary: prospect?.audit_summary
        ? String(prospect.audit_summary).slice(0, 160)
        : null,
    };
  });

  const templateBlock = templates
    .map(
      (row) =>
        `- ${row.id} | ${row.name} | subject: ${row.subject || "—"} | preview: ${row.preview || "—"}`,
    )
    .join("\n");
  const stepBlock = sendSteps
    .map(
      (step, index) =>
        `- ${step.id} | step ${index + 1}: ${step.label} | default template: ${step.templateId || "none"}`,
    )
    .join("\n");
  const rules = body?.rules?.trim().slice(0, 800) || "";

  const openai = createOpenAIClient();
  const batches: ContactFacts[][] = [];
  for (let index = 0; index < facts.length; index += BATCH_SIZE) {
    batches.push(facts.slice(index, index + BATCH_SIZE));
  }

  const results = await Promise.all(
    batches.map(async (batch) => {
      const contactBlock = batch
        .map((row) =>
          JSON.stringify({
            contactId: row.id,
            company: row.company,
            email: row.email,
            source: row.source,
            service: row.service,
            tags: row.tags,
            trade: row.trade,
            city: row.city,
            auditScore: row.auditScore,
            auditSummary: row.auditSummary,
          }),
        )
        .join("\n");
      try {
        const completion = await openai.chat.completions.create({
          model: getOpenAITextModel(),
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                `Workflow: ${workflow.name}`,
                plan ? `Workflow plan: ${plan}` : null,
                rules ? `Operator rules: ${rules}` : null,
                "",
                "Send steps (id | step | default):",
                stepBlock,
                "",
                "Email templates (id | name | subject | preview):",
                templateBlock,
                "",
                "Contacts (one JSON per line):",
                contactBlock,
              ]
                .filter((line) => line !== null)
                .join("\n"),
            },
          ],
        });
        const content = completion.choices[0]?.message?.content || "{}";
        const parsed = JSON.parse(content) as {
          assignments?: Array<{
            contactId?: string;
            steps?: Record<string, string>;
            reason?: string;
          }>;
        };
        return parsed.assignments ?? [];
      } catch {
        return [];
      }
    }),
  );

  const byContact = new Map(
    results.flat().map((row) => [String(row.contactId || ""), row]),
  );

  const rows: EmailMatchRow[] = facts.map((contact) => {
    const suggestion = byContact.get(contact.id);
    const steps: Record<string, string> = {};
    for (const step of sendSteps) {
      const picked = suggestion?.steps?.[step.id];
      steps[step.id] =
        picked && templateIds.has(picked)
          ? picked
          : templateIds.has(step.templateId)
            ? step.templateId
            : "";
    }
    return {
      contactId: contact.id,
      label: contact.label,
      trade: contact.trade,
      auditScore: contact.auditScore,
      steps,
      reason: suggestion?.reason
        ? String(suggestion.reason).slice(0, 140)
        : "No suggestion — kept the step default. Pick one below.",
    };
  });

  return NextResponse.json({
    rows,
    steps: sendSteps.map(({ id, label }) => ({ id, label })),
    templates: templates.map(({ id, name, subject }) => ({ id, name, subject })),
  });
}
