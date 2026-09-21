import type { Edge, Node } from "@xyflow/react";

export const WORKFLOW_TRIGGERS = [
  "new_lead",
  "tag_added",
  "email_opened",
] as const;

export type WorkflowTrigger = (typeof WORKFLOW_TRIGGERS)[number];

export const WORKFLOW_ACTIONS = [
  "send_template",
  "wait",
  "add_tag",
] as const;

export type WorkflowAction = (typeof WORKFLOW_ACTIONS)[number];

export type WorkflowGraph = {
  nodes: Node[];
  edges: Edge[];
};

export const TRIGGER_LABELS: Record<WorkflowTrigger, string> = {
  new_lead: "New lead",
  tag_added: "Tag added",
  email_opened: "Email opened",
};

export function emptyWorkflowGraph(
  trigger: WorkflowTrigger = "new_lead",
): WorkflowGraph {
  return {
    nodes: [
      {
        id: "trigger",
        type: "trigger",
        position: { x: 80, y: 80 },
        data: {
          label: TRIGGER_LABELS[trigger],
          trigger,
        },
      },
    ],
    edges: [],
  };
}

function asTrigger(value: unknown): WorkflowTrigger {
  return WORKFLOW_TRIGGERS.includes(value as WorkflowTrigger)
    ? (value as WorkflowTrigger)
    : "new_lead";
}

function asAction(value: unknown): WorkflowAction | null {
  return WORKFLOW_ACTIONS.includes(value as WorkflowAction)
    ? (value as WorkflowAction)
    : null;
}

function cleanDuration(value: unknown) {
  const raw = String(value ?? "1d").trim().toLowerCase();
  if (/^\d+[smhdw]$/.test(raw)) return raw;
  if (/^\d+\s*day/.test(raw)) return `${parseInt(raw, 10) || 1}d`;
  if (/^\d+\s*hour/.test(raw)) return `${parseInt(raw, 10) || 1}h`;
  return "1d";
}

/** Normalize model output into a runnable DigiSol React Flow graph. */
export function sanitizeWorkflowGraph(
  raw: unknown,
  fallbackTrigger: WorkflowTrigger = "new_lead",
): WorkflowGraph {
  const source =
    raw && typeof raw === "object"
      ? (raw as { nodes?: unknown[]; edges?: unknown[]; trigger?: unknown })
      : {};
  const trigger = asTrigger(source.trigger ?? fallbackTrigger);
  const nodesIn = Array.isArray(source.nodes) ? source.nodes : [];
  const edgesIn = Array.isArray(source.edges) ? source.edges : [];

  const nodes: Node[] = [
    {
      id: "trigger",
      type: "trigger",
      position: { x: 160, y: 40 },
      data: { label: TRIGGER_LABELS[trigger], trigger },
    },
  ];

  let actionIndex = 0;
  for (const item of nodesIn) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const data =
      row.data && typeof row.data === "object"
        ? (row.data as Record<string, unknown>)
        : row;
    if (row.type === "trigger" || data.trigger) continue;
    const action = asAction(data.action ?? row.action);
    if (!action) continue;
    actionIndex += 1;
    const id =
      typeof row.id === "string" && row.id !== "trigger"
        ? row.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48) || `step-${actionIndex}`
        : `step-${actionIndex}`;
    const label =
      typeof data.label === "string" && data.label.trim()
        ? data.label.trim().slice(0, 80)
        : action === "wait"
          ? `Wait ${cleanDuration(data.duration)}`
          : action === "add_tag"
            ? `Add tag: ${String(data.tag || "nurture").slice(0, 40)}`
            : "Send email";
    const nodeData: Record<string, unknown> = {
      label,
      action,
    };
    if (action === "wait") nodeData.duration = cleanDuration(data.duration);
    if (action === "add_tag") {
      nodeData.tag = String(data.tag || "nurture")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .slice(0, 40) || "nurture";
      if (typeof data.tagDescription === "string" && data.tagDescription.trim()) {
        nodeData.tagDescription = data.tagDescription.trim().slice(0, 240);
      } else if (typeof data.description === "string" && data.description.trim()) {
        nodeData.tagDescription = data.description.trim().slice(0, 240);
      }
    }
    if (action === "send_template") {
      // Template IDs are filled in the editor — keep a note in the label.
      nodeData.templateId =
        typeof data.templateId === "string" ? data.templateId : "";
    }
    nodes.push({
      id,
      position: { x: 160, y: 40 + actionIndex * 120 },
      data: nodeData,
    });
  }

  if (nodes.length === 1) {
    // Sensible default nurture if the model returned nothing usable.
    nodes.push(
      {
        id: "step-1",
        position: { x: 160, y: 160 },
        data: {
          label: "Welcome email",
          action: "send_template",
          templateId: "",
        },
      },
      {
        id: "step-2",
        position: { x: 160, y: 280 },
        data: { label: "Wait 2 days", action: "wait", duration: "2d" },
      },
      {
        id: "step-3",
        position: { x: 160, y: 400 },
        data: {
          label: "Follow-up email",
          action: "send_template",
          templateId: "",
        },
      },
      {
        id: "step-4",
        position: { x: 160, y: 520 },
        data: { label: "Add tag: nurtured", action: "add_tag", tag: "nurtured" },
      },
    );
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges: Edge[] = [];
  const seen = new Set<string>();

  for (const item of edgesIn) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const sourceId = String(row.source || "");
    const targetId = String(row.target || "");
    if (!nodeIds.has(sourceId) || !nodeIds.has(targetId) || sourceId === targetId) {
      continue;
    }
    const key = `${sourceId}->${targetId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({
      id: typeof row.id === "string" ? row.id : `e-${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId,
    });
  }

  // Guarantee a single linear path if edges were missing/broken.
  if (edges.length === 0 && nodes.length > 1) {
    for (let i = 0; i < nodes.length - 1; i += 1) {
      edges.push({
        id: `e-${nodes[i].id}-${nodes[i + 1].id}`,
        source: nodes[i].id,
        target: nodes[i + 1].id,
      });
    }
  }

  return { nodes, edges };
}
