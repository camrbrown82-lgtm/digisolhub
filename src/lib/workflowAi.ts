import { parseAudiencePreset, type AudiencePreset } from "@/lib/contactAudiences";
import { WEBSITE_AUDIT_PAGE_URL } from "@/lib/media";
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
  templates?: WorkflowTemplateRef[];
};

export type WorkflowTemplateRef = {
  id: string;
  name: string;
  subject?: string | null;
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
  - send_template: send an email template. If the brief lists "Available email templates", set data.templateId to the id of the best match (the operator names templates by industry and purpose, e.g. "Restaurant welcome") and set label to that template's name. Only use ids from that list. If nothing fits, leave templateId as "" and put the purpose in label (e.g. "Welcome + book consult").
  - wait: pause. data.duration MUST be like "1h", "2d", "3d", "1w" (Inngest sleep format). Never use minutes under 1h unless "30m".
  - add_tag: apply a CRM tag. data.tag is lowercase kebab, e.g. "warm-lead". Also set data.tagDescription to a short plain-English explanation (why this tag exists / when it is applied).
- Trigger node id MUST be "trigger" with type "trigger" and data.trigger set.
- Action nodes: omit type, set data.action, data.label, and action-specific fields.
- Edges: { id, source, target } connecting the path in order.
- Prefer 4–8 steps. ALWAYS alternate email and wait: welcome send → wait → follow-up send → tag. Do not stack two tags with no email.
- Wait durations must match the timeline. A "1 day" or "break the ice" goal uses duration "1d" between the welcome and the follow-up. Longer nurtures use "2d" or "3d".
- Welcome send label should name the asset: "Welcome + audit video" when the goal mentions a video or audit. The public audit video page is ${WEBSITE_AUDIT_PAGE_URL} — put that URL in the send step label or tagDescription so the operator remembers to include it in the template.
- If the goal mentions a poster, label the send "Welcome + poster" and note which poster in tagDescription.
- You choose the tag names. Do not leave tags blank. Typical progress tags: welcomed, followup-sent, nurtured.
- summary MUST be a numbered step list the operator can read without opening the canvas, for example:
  "1. Welcome email with the website-audit video. 2. Wait 1 day. 3. Follow-up email. 4. Tag nurtured."
- Also return "audience": one of "trades" | "audits" | "leads" | "engaged" | "me" matching who this run is for. "engaged" means contacts who opened or clicked an email or are tagged engaged / warm-lead.
- If the brief includes "Operator audience detail", tailor copy labels and tags to that specific group.
- You design the GRAPH. Hub will pre-load that audience into Will run for. The operator reviews before Run now.

## Tags catalogue (required)
Also return a "tags" array for every tag you use in add_tag steps:
{ "name": "warm-lead", "description": "Opened welcome or engaged — ready for a soft consult nudge." }
Descriptions are 1 sentence, operator-facing. Names must match data.tag exactly.

## Output
Return JSON only:
{
  "name": "short campaign workflow name",
  "trigger": "new_lead|tag_added|email_opened",
  "summary": "numbered steps: 1. … 2. Wait … 3. …",
  "audience": "trades|audits|leads|engaged|me",
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
    brief.templates?.length
      ? [
          "Available email templates (id — name — subject):",
          ...brief.templates.map(
            (row) => `- ${row.id} — ${row.name}${row.subject ? ` — ${row.subject}` : ""}`,
          ),
        ].join("\n")
      : "No saved email templates yet — leave templateId empty.",
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

/** Welcome email should always be followed by a wait so the operator can see cadence. */
function ensureWelcomeWait(graph: WorkflowGraph): WorkflowGraph {
  const nodes = graph.nodes.map((node) => ({
    ...node,
    position: { ...node.position },
    data: { ...(node.data as Record<string, unknown>) },
  }));
  const firstSend = nodes.findIndex(
    (node) => (node.data as { action?: string }).action === "send_template",
  );
  if (firstSend < 0) return graph;
  const next = nodes[firstSend + 1];
  if (next && (next.data as { action?: string }).action === "wait") return graph;

  nodes.splice(firstSend + 1, 0, {
    id: "step-wait-1d",
    position: { x: 160, y: 0 },
    data: { label: "Wait 1 day", action: "wait", duration: "1d" },
  });
  nodes.forEach((node, index) => {
    node.position = { x: 160, y: 40 + index * 120 };
  });
  const edges = [];
  for (let index = 0; index < nodes.length - 1; index += 1) {
    edges.push({
      id: `e-${nodes[index].id}-${nodes[index + 1].id}`,
      source: nodes[index].id,
      target: nodes[index + 1].id,
    });
  }
  return { nodes, edges };
}

/**
 * Keep only template ids that exist for this company. Falls back to matching
 * the step label against template names so "Restaurant welcome" still links.
 */
export function attachWorkflowTemplates(
  graph: WorkflowGraph,
  templates: WorkflowTemplateRef[],
): WorkflowGraph {
  if (templates.length === 0) return graph;
  const byId = new Map(templates.map((row) => [row.id, row]));
  const normalize = (value: string) => value.trim().toLowerCase();
  const nodes = graph.nodes.map((node) => {
    const data = { ...((node.data || {}) as Record<string, unknown>) };
    if (data.action !== "send_template") return node;
    const currentId = String(data.templateId || "");
    let match = byId.get(currentId);
    if (!match) {
      const label = normalize(String(data.label || ""));
      match =
        templates.find((row) => normalize(row.name) === label) ||
        templates.find(
          (row) => normalize(row.name).length >= 8 && label.includes(normalize(row.name)),
        );
    }
    data.templateId = match?.id || "";
    if (match) data.label = match.name;
    return { ...node, data };
  });
  return { ...graph, nodes };
}

export function parseWorkflowAiResponse(content: string): {
  name: string;
  trigger: WorkflowTrigger;
  summary: string;
  audience: AudiencePreset | null;
  tags: AiWorkflowTag[];
  graph: WorkflowGraph;
} {
  const parsed = JSON.parse(content) as {
    name?: string;
    trigger?: string;
    summary?: string;
    audience?: string;
    tags?: unknown;
    graph?: unknown;
  };
  const trigger = WORKFLOW_TRIGGERS.includes(parsed.trigger as WorkflowTrigger)
    ? (parsed.trigger as WorkflowTrigger)
    : "new_lead";

  const graph = ensureWelcomeWait(sanitizeWorkflowGraph(parsed.graph, trigger));
  const summary = (parsed.summary || "").trim().slice(0, 500);
  const triggerNode = graph.nodes.find((node) => node.id === "trigger");
  if (triggerNode && summary) {
    triggerNode.data = {
      ...(triggerNode.data as Record<string, unknown>),
      plan: summary,
    };
  }

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
    summary,
    audience: parseAudiencePreset(parsed.audience),
    tags: Array.from(byName.values()),
    graph,
  };
}
