import { type GetStepTools } from "inngest";
import { inngest } from "@/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmailToContact } from "@/lib/email";

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

async function runGraph(opts: {
  workflowId: string;
  contactId: string;
  graph: Graph;
  step: StepTools;
}) {
  const admin = createAdminClient();
  const nodes = opts.graph.nodes ?? [];
  const edges = opts.graph.edges ?? [];
  const start =
    nodes.find((node) => node.type === "trigger" || node.data?.trigger) ?? nodes[0];
  if (!start) return;

  const { data: run } = await admin
    .from("workflow_runs")
    .insert({
      workflow_id: opts.workflowId,
      contact_id: opts.contactId,
      status: "running",
      log: [],
    })
    .select("id")
    .single();

  const log: string[] = [];
  const visited = new Set<string>();
  let current: FlowNode | undefined = start;

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    const action = current.data?.action;
    const duration = current.data?.duration || "1h";

    if (action === "wait") {
      await opts.step.sleep(`wait-${current.id}`, duration);
      log.push(`waited ${duration}`);
    } else if (action === "send_template" && current.data?.templateId) {
      const templateId = current.data.templateId;
      await opts.step.run(`send-${current.id}`, async () => {
        await sendEmailToContact({
          contactId: opts.contactId,
          templateId,
        });
      });
      log.push(`sent template ${templateId}`);
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
    } else {
      log.push(`node ${current.id}`);
    }

    const edge = edges.find((item) => item.source === current?.id);
    current = edge ? nodes.find((node) => node.id === edge.target) : undefined;
  }

  if (run?.id) {
    await admin
      .from("workflow_runs")
      .update({
        status: "completed",
        log,
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
  }
}

export const runWorkflowsOnLead = inngest.createFunction(
  { id: "run-workflows-on-lead", triggers: [{ event: "hub/lead.created" }] },
  async ({ event, step }) => {
    await executeMatchingWorkflows(
      "hub/lead.created",
      event.data.contactId as string,
      step,
    );
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
    await runGraph({
      workflowId: workflow.id,
      contactId: event.data.contactId as string,
      graph: (workflow.graph ?? {}) as Graph,
      step,
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
  const admin = createAdminClient();
  const { data: workflows } = await admin
    .from("workflows")
    .select("id, graph, trigger")
    .eq("enabled", true)
    .eq("trigger", trigger);

  for (const workflow of workflows ?? []) {
    await runGraph({
      workflowId: workflow.id,
      contactId,
      graph: (workflow.graph ?? {}) as Graph,
      step,
    });
  }
}

export const functions = [
  runWorkflowsOnLead,
  runWorkflowsOnTag,
  runWorkflowsOnOpen,
  runSingleWorkflow,
];
