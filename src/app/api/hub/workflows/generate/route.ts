import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import {
  AUDITED_PROSPECT_STATUSES,
  audienceLooksAuditedOnly,
  isAuditedContact,
} from "@/lib/auditedContacts";
import { parseAudiencePreset, type AudiencePreset } from "@/lib/contactAudiences";
import { brandFromClient } from "@/lib/branding";
import { ensureTagDescriptionSchema } from "@/lib/ensureTagSchema";
import {
  createOpenAIClient,
  getOpenAIApiKey,
  getOpenAITextModel,
} from "@/lib/openai";
import {
  WORKFLOW_BUILDER_SYSTEM_PROMPT,
  attachWorkflowTemplates,
  buildWorkflowUserPrompt,
  parseWorkflowAiResponse,
  type WorkflowTemplateRef,
} from "@/lib/workflowAi";
import { resolveClientId, getWorkspaceClient } from "@/lib/workspace";

export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  if (!getOpenAIApiKey()) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY is not configured. Add it in Vercel Production and .env.local, then redeploy.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    goal?: string;
    timeline?: string;
    audience?: string;
    audienceDetail?: string;
    audiencePreset?: "audited" | "custom" | AudiencePreset;
    offer?: string;
    triggerHint?: string;
    notes?: string;
    tagGuidance?: string;
    save?: boolean;
  };

  const goal = body.goal?.trim();
  if (!goal) {
    return NextResponse.json(
      {
        error:
          "Describe the campaign goal so the workflow builder can plan steps.",
      },
      { status: 400 },
    );
  }

  await ensureTagDescriptionSchema().catch(() => null);

  const active = await getWorkspaceClient(supabase);
  const clientId = await resolveClientId(supabase);
  const { companyName } = brandFromClient(active);
  const openai = createOpenAIClient();

  let templatesQuery = supabase
    .from("email_templates")
    .select("id, name, subject")
    .order("updated_at", { ascending: false })
    .limit(40);
  if (clientId) templatesQuery = templatesQuery.eq("client_id", clientId);
  const { data: templateRows } = await templatesQuery;
  const templates: WorkflowTemplateRef[] = (templateRows ?? []).map((row) => ({
    id: row.id as string,
    name: (row.name as string) || "Untitled template",
    subject: (row.subject as string | null) ?? null,
  }));

  const preset = parseAudiencePreset(body.audiencePreset);
  const audienceDetail = body.audienceDetail?.trim().slice(0, 400) || "";
  const auditedOnly =
    body.audiencePreset === "audited" ||
    preset === "audits" ||
    preset === "trades" ||
    audienceLooksAuditedOnly(body.audience) ||
    audienceLooksAuditedOnly(audienceDetail) ||
    audienceLooksAuditedOnly(body.notes);

  let audienceLine = body.audience?.trim() || "";
  let auditedCount = 0;
  let auditedSample: string[] = [];

  if (auditedOnly && clientId) {
    const [{ data: contacts }, { data: prospects }] = await Promise.all([
      supabase
        .from("contacts")
        .select("id, name, company, email, tags, source")
        .eq("client_id", clientId)
        .is("unsubscribed_at", null)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("prospects")
        .select("contact_id, business_name")
        .eq("client_id", clientId)
        .not("contact_id", "is", null)
        .in("audit_status", [...AUDITED_PROSPECT_STATUSES])
        .limit(500),
    ]);

    const auditedIds = new Set(
      (prospects ?? [])
        .map((row) => row.contact_id as string | null)
        .filter((id): id is string => Boolean(id)),
    );

    const auditedContacts = (contacts ?? []).filter((row) =>
      isAuditedContact({
        id: row.id as string,
        tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
        source: (row.source as string | null) ?? null,
        auditedIds,
      }),
    );

    auditedCount = auditedContacts.length;
    auditedSample = auditedContacts
      .slice(0, 8)
      .map(
        (row) =>
          (row.company as string) ||
          (row.name as string) ||
          (row.email as string),
      )
      .filter(Boolean);

    audienceLine = [
      "HARD LOCK — audited DigiSol prospect companies ONLY.",
      `${auditedCount} CRM contacts currently match (prospect audit / prospect_audit tags).`,
      auditedSample.length
        ? `Sample: ${auditedSample.join("; ")}.`
        : "No audited contacts linked yet — still design for that audience only.",
      "Do NOT design for the full CRM, DigiSol staff, or random leads.",
      "The operator will multi-select these audited contacts in the workflow Run audience panel.",
      preset === "trades"
        ? "Narrow to TRADE businesses only (HVAC, plumbing, electrical, mechanical). Return audience \"trades\"."
        : "Return audience \"audits\".",
    ].join(" ");
  } else if (preset === "leads") {
    audienceLine =
      "Organic new leads only — forms, Facebook, Kaylev chat, consult requests. Not prospect-audit companies.";
  } else if (preset === "engaged") {
    audienceLine =
      "Engaged contacts only — people who opened or clicked a tracked email, or are tagged engaged / warm-lead / prospect_audit_engaged. They already know us: skip cold intros and move toward a consult. Return audience \"engaged\".";
  } else if (preset === "me") {
    audienceLine =
      "Self-test only. Design the same steps the operator will run on themselves first. Do not target the full CRM.";
  } else if (!audienceLine && !audienceDetail) {
    audienceLine = "Workspace CRM contacts (operator will pick run audience)";
  }

  if (audienceDetail) {
    audienceLine = [audienceLine, `Operator audience detail: ${audienceDetail}`]
      .filter(Boolean)
      .join(" ");
  }

  const completion = await openai.chat.completions.create({
    model: getOpenAITextModel(),
    temperature: 0.35,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: WORKFLOW_BUILDER_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildWorkflowUserPrompt({
          goal,
          timeline: body.timeline?.trim(),
          audience: audienceLine,
          offer: body.offer?.trim(),
          triggerHint: body.triggerHint?.trim(),
          notes: [
            body.notes?.trim(),
            auditedOnly
              ? "Audience lock confirmed: audited prospect companies only. Summary must say the run list is audited contacts, not the whole CRM."
              : "",
          ]
            .filter(Boolean)
            .join("\n"),
          tagGuidance: body.tagGuidance?.trim(),
          companyName,
          templates,
        }),
      },
    ],
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    return NextResponse.json(
      { error: "AI returned an empty workflow" },
      { status: 502 },
    );
  }

  let plan;
  try {
    plan = parseWorkflowAiResponse(content);
    plan.graph = attachWorkflowTemplates(plan.graph, templates);
  } catch {
    return NextResponse.json(
      {
        error:
          "Could not parse the AI workflow. Try again with a clearer goal.",
      },
      { status: 502 },
    );
  }

  if (body.save === false) {
    return NextResponse.json({
      workflow: plan,
      tags: plan.tags,
      saved: false,
      audience: { auditedOnly, auditedCount },
    });
  }

  for (const tag of plan.tags) {
    const { data: existing } = await supabase
      .from("tags")
      .select("id, description")
      .ilike("name", tag.name)
      .maybeSingle();
    if (existing?.id) {
      if (tag.description) {
        await supabase
          .from("tags")
          .update({ description: tag.description })
          .eq("id", existing.id);
      }
    } else {
      await supabase.from("tags").insert({
        name: tag.name,
        description: tag.description || null,
        color: "#6366f1",
      });
    }
  }

  const { data, error: insertError } = await supabase
    .from("workflows")
    .insert({
      name: plan.name,
      trigger: plan.trigger,
      graph: plan.graph,
      enabled: false,
      client_id: clientId || null,
    })
    .select("id, name, trigger, enabled, updated_at")
    .single();

  if (insertError || !data) {
    return NextResponse.json(
      { error: insertError?.message || "Could not save workflow" },
      { status: 400 },
    );
  }

  const audienceKey: AudiencePreset | null =
    preset ||
    plan.audience ||
    (auditedOnly ? (preset === "trades" ? "trades" : "audits") : null);

  const audienceNote =
    audienceKey === "trades"
      ? " Will run for is set to trades prospect audits — review the list before Run now."
      : audienceKey === "audits"
        ? ` Will run for is set to prospect audits${auditedCount ? ` (${auditedCount})` : ""} — review the list before Run now.`
        : audienceKey === "leads"
          ? " Will run for is set to new leads — review the list before Run now."
          : audienceKey === "engaged"
            ? " Will run for is set to engaged contacts (opened, clicked, or tagged engaged) — review the list before Run now."
            : audienceKey === "me"
              ? " Will run for is set to you — review, then Run now."
              : " Run list starts empty. Use Add me, Trades audits, All prospect audits, New leads, or Engaged.";

  const sendNodes = plan.graph.nodes.filter(
    (node) => (node.data as { action?: string }).action === "send_template",
  );
  const linkedSends = sendNodes.filter(
    (node) => (node.data as { templateId?: string }).templateId,
  ).length;
  const templateNote = sendNodes.length
    ? ` Linked ${linkedSends} of ${sendNodes.length} send steps to your email templates.`
    : "";

  return NextResponse.json({
    id: data.id,
    workflow: data,
    summary: `${plan.summary || "Workflow created."}${audienceNote}${templateNote}`,
    tags: plan.tags,
    saved: true,
    audience: audienceKey,
  });
}
