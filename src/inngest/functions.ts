import { type GetStepTools } from "inngest";
import { inngest } from "@/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmailToContact } from "@/lib/email";
import { isMailScannerContact } from "@/lib/mailScanner";
import { contactMatchesAudience, leadAudienceOf } from "@/lib/workflowGraph";

type FlowNode = {
  id: string;
  type?: string;
  data?: {
    label?: string;
    trigger?: string;
    action?: string;
    templateId?: string;
    tag?: string;
    duration?: string;
  };
};

type FlowEdge = {
  id: string;
  source: string;
  target: string;
};

type Graph = {
  nodes?: FlowNode[];
  edges?: FlowEdge[];
};

type StepTools = GetStepTools<typeof inngest>;

const triggerMap: Record<string, string> = {
  "hub/lead.created": "new_lead",
  "hub/tag.added": "tag_added",
  "hub/email.opened": "email_opened",
};

/** Pipeline stages where you're handling the lead yourself, so automatic emails stop. */
const HANDS_ON_STAGES = ["qualified", "meeting", "proposal", "won", "lost"];

/** Automatic workflow emails never land within this long of any other email to the same person. */
const MIN_EMAIL_GAP_MS = 24 * 60 * 60 * 1000;

type SendBlock = "missing" | "unsubscribed" | "mail_scanner" | "hands_on";

async function sendBlockFor(
  admin: ReturnType<typeof createAdminClient>,
  contactId: string,
  automatic: boolean,
): Promise<SendBlock | null> {
  const { data: contact } = await admin
    .from("contacts")
    .select("id, unsubscribed_at, tags")
    .eq("id", contactId)
    .maybeSingle();
  if (!contact) return "missing";
  if (contact.unsubscribed_at) return "unsubscribed";
  if (isMailScannerContact(contact.tags as string[] | null)) return "mail_scanner";
  if (automatic) {
    const { count } = await admin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("contact_id", contactId)
      .in("stage", HANDS_ON_STAGES);
    if ((count ?? 0) > 0) return "hands_on";
  }
  return null;
}

const SEND_BLOCK_LOG: Record<SendBlock, string> = {
  missing: "stopped: contact was removed",
  unsubscribed: "stopped: contact unsubscribed — no more emails",
  mail_scanner: "stopped: their mail is read by a security scanner — no more emails",
  hands_on: "stopped: lead moved past Contacted in the pipeline — you're handling it",
};

async function runGraph(opts: {
  workflowId: string;
  contactId: string;
  graph: Graph;
  step: StepTools;
  templateOverrides?: Record<string, string>;
  /** Started by a trigger (not the Run button): applies email spacing and pipeline stops. */
  automatic?: boolean;
}) {
  const automatic = opts.automatic === true;
  const admin = createAdminClient();
  const nodes = opts.graph.nodes ?? [];
  const edges = opts.graph.edges ?? [];
  const start =
    nodes.find((node) => node.type === "trigger" || node.data?.trigger) ??
    nodes[0];
  if (!start) return;

  // Inngest replays this function from the top after every step, so the run
  // row must be created inside a step or each replay inserts a duplicate.
  const runId = await opts.step.run(`run-record-${opts.workflowId}`, async () => {
    const { data } = await admin
      .from("workflow_runs")
      .insert({
        workflow_id: opts.workflowId,
        contact_id: opts.contactId,
        status: "running",
        log: [],
      })
      .select("id")
      .single();
    return (data?.id as string | undefined) ?? null;
  });

  const log: string[] = [];
  const visited = new Set<string>();
  let current: FlowNode | undefined = start;
  let failed = false;
  let stopped = false;

  try {
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      const action = current.data?.action;
      const duration = current.data?.duration || "1h";

      if (action === "wait") {
        if (runId) {
          const snapshot = [...log, `waiting ${duration}`];
          await opts.step.run(`progress-${current.id}`, async () => {
            await admin.from("workflow_runs").update({ log: snapshot }).eq("id", runId);
          });
        }
        await opts.step.sleep(`wait-${current.id}`, duration);
        log.push(`waited ${duration}`);
      } else if (action === "send_template") {
        const templateId = String(
          opts.templateOverrides?.[current.id] || current.data?.templateId || "",
        ).trim();
        if (!templateId) {
          log.push(`skipped send ${current.id}: no template selected`);
        } else {
          if (automatic) {
            const gate = await opts.step.run(`gate-${current.id}`, async () => {
              const block = await sendBlockFor(admin, opts.contactId, true);
              if (block) return { block, holdUntil: null };
              const { data: last } = await admin
                .from("sends")
                .select("created_at")
                .eq("contact_id", opts.contactId)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              const earliest = last?.created_at
                ? new Date(last.created_at as string).getTime() + MIN_EMAIL_GAP_MS
                : 0;
              return {
                block: null,
                holdUntil: earliest > Date.now() ? new Date(earliest).toISOString() : null,
              };
            });
            if (gate.block) {
              log.push(SEND_BLOCK_LOG[gate.block]);
              stopped = true;
              break;
            }
            if (gate.holdUntil) {
              if (runId) {
                const snapshot = [...log, `holding until ${gate.holdUntil} (24h email gap)`];
                await opts.step.run(`hold-progress-${current.id}`, async () => {
                  await admin.from("workflow_runs").update({ log: snapshot }).eq("id", runId);
                });
              }
              await opts.step.sleepUntil(`hold-${current.id}`, gate.holdUntil);
              log.push(`held until ${gate.holdUntil} (24h email gap)`);
            }
          }
          const outcome = await opts.step.run(`send-${current.id}`, async () => {
            const block = await sendBlockFor(admin, opts.contactId, automatic);
            if (block) return block;
            await sendEmailToContact({
              contactId: opts.contactId,
              templateId,
            });
            return "sent" as const;
          });
          if (outcome !== "sent") {
            log.push(SEND_BLOCK_LOG[outcome]);
            stopped = true;
            break;
          }
          log.push(`sent template ${templateId}`);
        }
      } else if (action === "add_tag" && current.data?.tag) {
        const tag = current.data.tag;
        await opts.step.run(`tag-${current.id}`, async () => {
          const { data: contact } = await admin
            .from("contacts")
            .select("tags")
            .eq("id", opts.contactId)
            .single();
          const tags = Array.from(new Set([...(contact?.tags ?? []), tag]));
          await admin.from("contacts").update({ tags }).eq("id", opts.contactId);
        });
        log.push(`tagged ${tag}`);
      } else if (current.data?.trigger) {
        log.push(`trigger ${current.data.trigger}`);
      } else {
        log.push(`node ${current.id}`);
      }

      const edge = edges.find((item) => item.source === current?.id);
      current = edge
        ? nodes.find((node) => node.id === edge.target)
        : undefined;
    }
  } catch (err) {
    failed = true;
    log.push(
      `failed: ${err instanceof Error ? err.message : "unknown error"}`,
    );
  }

  if (runId) {
    await opts.step.run(`run-finish-${opts.workflowId}`, async () => {
      await admin
        .from("workflow_runs")
        .update({
          status: failed ? "failed" : stopped ? "stopped" : "completed",
          log,
          finished_at: new Date().toISOString(),
        })
        .eq("id", runId);
    });
  }

  if (failed) {
    throw new Error(log[log.length - 1] || "Workflow run failed");
  }
}

export const runWorkflowsOnLead = inngest.createFunction(
  {
    id: "run-workflows-on-lead",
    // Several capture paths can report the same new lead within seconds; start it once.
    idempotency: "event.data.contactId",
    triggers: [{ event: "hub/lead.created" }],
  },
  async ({ event, step }) => {
    await executeMatchingWorkflows(
      "hub/lead.created",
      event.data.contactId as string,
      step,
    );
  },
);

/**
 * Website form and Google Ads leads alert Cameron as they arrive. Kaylev chat leads
 * and audited prospects who click are reported here, once per contact.
 */
export const alertOwnerOnLead = inngest.createFunction(
  {
    id: "alert-owner-on-lead",
    idempotency: "event.data.contactId",
    triggers: [{ event: "hub/lead.created" }],
  },
  async ({ event, step }) => {
    const contactId = event.data.contactId as string | null;
    if (!contactId) return { skipped: "no_contact" };
    return step.run("send-alert", async () => {
      const admin = createAdminClient();
      const { data: contact } = await admin
        .from("contacts")
        .select("id, name, email, phone, company, service, source, tags, notes_preview")
        .eq("id", contactId)
        .maybeSingle();
      if (!contact) return { skipped: "missing" };
      const tags = (contact.tags as string[] | null) ?? [];
      const audited =
        tags.includes("prospect_audit_engaged") ||
        String(contact.source || "").startsWith("prospect_audit");
      const chat = !audited && contact.source === "visitor_chat";
      if (!audited && !chat) return { skipped: "alerted_at_capture_or_manual" };
      const { sendLeadAlert } = await import("@/lib/leadAlert");
      const result = await sendLeadAlert({
        sourceLabel: audited ? "Audited prospect clicked" : "Kaylev chat",
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
        service: contact.service,
        message: contact.notes_preview,
        contactId: contact.id,
        note: audited
          ? "They clicked a link in the website audit DigiSol emailed them. Good moment to call."
          : "They left their details with Kaylev on the website.",
      });
      if (!result.ok) throw new Error(result.message || "Lead alert failed");
      return { sent: true };
    });
  },
);

export const runWorkflowsOnTag = inngest.createFunction(
  { id: "run-workflows-on-tag", triggers: [{ event: "hub/tag.added" }] },
  async ({ event, step }) => {
    await executeMatchingWorkflows(
      "hub/tag.added",
      event.data.contactId as string,
      step,
    );
  },
);

export const runWorkflowsOnOpen = inngest.createFunction(
  { id: "run-workflows-on-open", triggers: [{ event: "hub/email.opened" }] },
  async ({ event, step }) => {
    await executeMatchingWorkflows(
      "hub/email.opened",
      event.data.contactId as string,
      step,
    );
  },
);

export const runSingleWorkflow = inngest.createFunction(
  { id: "run-single-workflow", triggers: [{ event: "hub/workflow.run" }] },
  async ({ event, step }) => {
    const admin = createAdminClient();
    const { data: workflow } = await admin
      .from("workflows")
      .select("id, graph")
      .eq("id", event.data.workflowId)
      .single();
    if (!workflow) return;
    const contactId = event.data.contactId as string;
    // Backfills enroll existing contacts as if a trigger had fired: spacing, pipeline stops, once only.
    const automatic = event.data.automatic === true;
    if (automatic) {
      const enrolled = await step.run("already-enrolled", async () => {
        const { count } = await admin
          .from("workflow_runs")
          .select("id", { count: "exact", head: true })
          .eq("workflow_id", workflow.id)
          .eq("contact_id", contactId)
          .in("status", ["running", "completed"]);
        return (count ?? 0) > 0;
      });
      if (enrolled) return { skipped: "already_enrolled" };
    }
    await runGraph({
      workflowId: workflow.id,
      contactId,
      graph: (workflow.graph ?? {}) as Graph,
      step,
      automatic,
      templateOverrides:
        event.data.templateOverrides && typeof event.data.templateOverrides === "object"
          ? (event.data.templateOverrides as Record<string, string>)
          : undefined,
    });
  },
);

async function executeMatchingWorkflows(
  eventName: string,
  contactId: string,
  step: StepTools,
) {
  if (!contactId) return;
  const trigger = triggerMap[eventName];

  // Resolved once in a step so replays keep the same list even if workflows are edited mid-run.
  const workflows = (await step.run(`find-workflows-${trigger}`, async () => {
    const admin = createAdminClient();
    const { data: contact } = await admin
      .from("contacts")
      .select("id, client_id, source, tags, unsubscribed_at")
      .eq("id", contactId)
      .maybeSingle();
    if (!contact || contact.unsubscribed_at) return [];
    if (isMailScannerContact(contact.tags as string[] | null)) return [];

    // A company's workflows only ever run for that company's contacts.
    let query = admin
      .from("workflows")
      .select("id, graph")
      .eq("enabled", true)
      .eq("trigger", trigger);
    query = contact.client_id
      ? query.eq("client_id", contact.client_id)
      : query.is("client_id", null);
    const { data } = await query;

    let matches = (data ?? []).filter(
      (workflow) =>
        trigger !== "new_lead" ||
        contactMatchesAudience(contact, leadAudienceOf(workflow.graph as Graph)),
    );
    if (matches.length === 0) return [];

    const { data: prior } = await admin
      .from("workflow_runs")
      .select("workflow_id")
      .eq("contact_id", contactId)
      .in(
        "workflow_id",
        matches.map((workflow) => workflow.id),
      );
    const alreadyRan = new Set((prior ?? []).map((row) => row.workflow_id as string));
    matches = matches.filter((workflow) => !alreadyRan.has(workflow.id));

    return matches.map((workflow) => ({
      id: workflow.id as string,
      graph: (workflow.graph ?? {}) as Graph,
    }));
  })) as Array<{ id: string; graph: Graph }>;

  for (const workflow of workflows) {
    await runGraph({
      workflowId: workflow.id,
      contactId,
      graph: workflow.graph,
      step,
      automatic: true,
    });
  }
}

export const sendDispatchIssues = inngest.createFunction(
  {
    id: "send-dispatch-issues",
    triggers: [{ cron: "TZ=America/Edmonton 0 10 * * *" }],
  },
  async () => {
    const { createAdminClient, hasAdminClient } = await import(
      "@/lib/supabase/admin"
    );
    const { sendNewDispatchIssues } = await import("@/lib/dispatchMail");
    if (!hasAdminClient()) return { skipped: true };
    return sendNewDispatchIssues(createAdminClient());
  },
);

export const functions = [
  runWorkflowsOnLead,
  alertOwnerOnLead,
  runWorkflowsOnTag,
  runWorkflowsOnOpen,
  runSingleWorkflow,
  sendDispatchIssues,
];
