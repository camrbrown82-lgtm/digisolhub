import {
  TRIGGER_LABELS,
  WORKFLOW_ACTIONS,
  WORKFLOW_TRIGGERS,
  type WorkflowTrigger,
  sanitizeWorkflowGraph,
  type WorkflowGraph,
} from "@/lib/workflowGraph";

export type WorkflowBrief = {
  goal: string;
  timeline?: string;
  audience?: string;
  offer?: string;
  triggerHint?: string;
  notes?: string;
  companyName?: string;
  tagGuidance?: string;
};

export type AiWorkflowTag = {
  name: string;
  description: string;
};

export const WORKFLOW_BUILDER_SYSTEM_PROMPT = `You are DigiSol Hub's expert custom workflow architect for Alberta SMBs.

You ONLY design automations for DigiSol's visual workflow builder (React Flow). You know this product deeply.

## DigiSol workflow engine (hard constraints)
- One linear path only: trigger → step → step → … (no branches, no loops, no conditions).
- Allowed triggers (exact strings): ${WORKFLOW_TRIGGERS.join(", ")}.
  - new_lead: fires when a lead is created (consult form, Hub lead, etc.)
  - tag_added: fires when a CRM tag is applied
  - email_opened: fires when a tracked email is opened
- Allowed actions (exact strings in data.action): ${WORKFLOW_ACTIONS.join(", ")}.
  - send_template: send an email template. Leave templateId as "". Put the purpose in label (e.g. "Welcome + book consult").
  - wait: pause. data.duration MUST be like "1h", "2d", "3d", "1w" (Inngest sleep format). Never use minutes under 1h unless "30m".
  - add_tag: apply a CRM tag. data.tag is lowercase kebab, e.g. "warm-lead". Also set data.tagDescription to a short plain-English explanation (why this tag exists / when it is applied).
- Trigger node id MUST be "trigger" with type "trigger" and data.trigger set.
- Action nodes: omit type, set data.action, data.label, and action-specific fields.
- Edges: { id, source, target } connecting the path in order.
- Prefer 3–7 steps. Match the user's timeline (e.g. 7-day nurture ⇒ waits that sum sensibly).
- ALWAYS include at least one add_tag step that marks progress (e.g. after welcome, or at the end as "nurtured").
- DigiSol positioning: website design + local SEO + CRO + consult booking. Soft CTAs, not spammy urgency.
- Labels: short, operator-friendly, Canadian English.

## Tags catalogue (required)
Also return a "tags" array for every tag you use in add_tag steps:
{ "name": "warm-lead", "description": "Opened welcome or engaged — ready for a soft consult nudge." }
Descriptions are 1 sentence, operator-facing. Names must match data.tag exactly.

## Output
Return JSON only:
{
  "name": "short campaign workflow name",
  "trigger": "new_lead|tag_added|email_opened",
  "summary": "1-2 sentence plan for the human",
  "tags": [ { "name": "...", "description": "..." } ],
  "graph": {
    "nodes": [ ... ],
    "edges": [ ... ]
  }
}

Trigger labels for data.label on the trigger node: ${Object.entries(TRIGGER_LABELS)
  .map(([k, v]) => `${k}=${v}`)
  .join("; ")}.

Never invent unsupported actions (no SMS, no webhooks, no if/else, no A/B). Never include secrets.`;

export function buildWorkflowUserPrompt(brief: WorkflowBrief) {
  return [
    `Company: ${brief.companyName || "DigiSol client"}`,
    `Primary goal: ${brief.goal}`,
    brief.timeline ? `Timeline / cadence: ${brief.timeline}` : null,
    brief.audience ? `Audience: ${brief.audience}` : null,
    brief.offer ? `Offer / CTA: ${brief.offer}` : null,
    brief.triggerHint
      ? `Preferred trigger (hint): ${brief.triggerHint}`
      : "Choose the best DigiSol trigger for this goal.",
    brief.tagGuidance
      ? `Tag guidance from operator: ${brief.tagGuidance}`
      : "Invent clear CRM tags with descriptions that match the nurture stages.",
    brief.notes ? `Extra notes: ${brief.notes}` : null,
    "",
    "Design the best DigiSol Hub workflow graph AND the tag catalogue for this brief.",
  ]
    .filter(Boolean)
    .join("\n");
}

function slugTag(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function parseWorkflowAiResponse(content: string): {
  name: string;
  trigger: WorkflowTrigger;
  summary: string;
  tags: AiWorkflowTag[];
  graph: WorkflowGraph;
} {
  const parsed = JSON.parse(content) as {
    name?: string;
    trigger?: string;
    summary?: string;
    tags?: unknown;
    graph?: unknown;
  };
  const trigger = WORKFLOW_TRIGGERS.includes(parsed.trigger as WorkflowTrigger)
    ? (parsed.trigger as WorkflowTrigger)
    : "new_lead";

  const graph = sanitizeWorkflowGraph(parsed.graph, trigger);

  const fromPayload: AiWorkflowTag[] = [];
  if (Array.isArray(parsed.tags)) {
    for (const item of parsed.tags) {
      if (!item || typeof item !== "object") continue;
      const row = item as { name?: string; description?: string };
      const name = slugTag(row.name || "");
      if (!name) continue;
      fromPayload.push({
        name,
        description: String(row.description || "").trim().slice(0, 240),
      });
    }
  }

  // Also collect tags from graph nodes (with descriptions on the node).
  const fromGraph: AiWorkflowTag[] = [];
  for (const node of graph.nodes) {
    const data = (node.data || {}) as {
      action?: string;
      tag?: string;
      tagDescription?: string;
    };
    if (data.action !== "add_tag" || !data.tag) continue;
    fromGraph.push({
      name: slugTag(data.tag),
      description: String(data.tagDescription || "").trim().slice(0, 240),
    });
  }

  const byName = new Map<string, AiWorkflowTag>();
  for (const tag of [...fromPayload, ...fromGraph]) {
    if (!tag.name) continue;
    const existing = byName.get(tag.name);
    if (!existing || (!existing.description && tag.description)) {
      byName.set(tag.name, tag);
    }
  }

  // Ensure every add_tag node has a description when catalogue has one.
  for (const node of graph.nodes) {
    const data = (node.data || {}) as Record<string, unknown>;
    if (data.action !== "add_tag") continue;
    const name = slugTag(String(data.tag || ""));
    const catalog = byName.get(name);
    if (catalog?.description && !data.tagDescription) {
      data.tagDescription = catalog.description;
      data.label = `Add tag: ${name}`;
      node.data = data;
    }
  }

  return {
    name: (parsed.name || "AI workflow").trim().slice(0, 120),
    trigger,
    summary: (parsed.summary || "").trim().slice(0, 500),
    tags: Array.from(byName.values()),
    graph,
  };
}
