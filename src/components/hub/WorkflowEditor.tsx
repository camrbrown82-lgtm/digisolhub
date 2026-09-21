"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Edge, Node } from "@xyflow/react";

const WorkflowCanvas = dynamic(
  () => import("@/components/hub/WorkflowCanvas").then((mod) => mod.WorkflowCanvas),
  { ssr: false, loading: () => <p className="text-sm text-zinc-500">Loading canvas…</p> },
);

type Workflow = {
  id: string;
  name: string;
  trigger: string;
  enabled: boolean;
  graph: { nodes?: Node[]; edges?: Edge[] };
};

type TemplateOption = { id: string; name: string; subject: string | null };

let nodeCount = 0;

function slugTag(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function WorkflowEditor({
  workflow,
  contacts,
  templates = [],
  knownTags = [],
}: {
  workflow: Workflow;
  contacts: { id: string; email: string; name: string | null }[];
  templates?: TemplateOption[];
  knownTags?: string[];
}) {
  const router = useRouter();
  const [name, setName] = useState(workflow.name);
  const [trigger, setTrigger] = useState(workflow.trigger);
  const [enabled, setEnabled] = useState(workflow.enabled);
  const [graph, setGraph] = useState({
    nodes: workflow.graph?.nodes ?? [],
    edges: workflow.graph?.edges ?? [],
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [newTagDraft, setNewTagDraft] = useState("nurture");
  const persistGraph = useCallback((next: { nodes: Node[]; edges: Edge[] }) => {
    setGraph(next);
  }, []);
  const [contactId, setContactId] = useState(contacts[0]?.id ?? "");
  const [status, setStatus] = useState("");

  const selectedNode = useMemo(
    () => graph.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [graph.nodes, selectedNodeId],
  );
  const selectedData = (selectedNode?.data || {}) as Record<string, unknown>;
  const selectedAction = String(selectedData.action || "");

  const tagSuggestions = useMemo(() => {
    const fromNodes = graph.nodes
      .map((node) => String((node.data as { tag?: string } | undefined)?.tag || ""))
      .filter(Boolean);
    return Array.from(new Set([...knownTags, ...fromNodes])).sort();
  }, [graph.nodes, knownTags]);

  function updateSelectedData(patch: Record<string, unknown>) {
    if (!selectedNodeId) return;
    setGraph((current) => ({
      ...current,
      nodes: current.nodes.map((node) => {
        if (node.id !== selectedNodeId) return node;
        const nextData = { ...(node.data || {}), ...patch };
        const action = String(nextData.action || "");
        if (action === "add_tag" && typeof nextData.tag === "string") {
          const tag = slugTag(nextData.tag) || "nurture";
          nextData.tag = tag;
          nextData.label = `Add tag: ${tag}`;
        }
        if (
          action === "add_tag" &&
          typeof nextData.tagDescription === "string"
        ) {
          nextData.tagDescription = nextData.tagDescription.trim().slice(0, 240);
        }
        if (action === "wait" && typeof nextData.duration === "string") {
          nextData.label = `Wait ${nextData.duration}`;
        }
        if (action === "send_template" && typeof nextData.templateId === "string") {
          const template = templates.find((row) => row.id === nextData.templateId);
          if (template) nextData.label = template.name;
        }
        return { ...node, data: nextData };
      }),
    }));
  }

  function addNode(kind: "send_template" | "wait" | "add_tag", tagValue?: string) {
    nodeCount += 1;
    const id = `${kind}-${Date.now()}-${nodeCount}`;
    const tag = slugTag(tagValue || newTagDraft) || "nurture";
    const data =
      kind === "wait"
        ? { label: "Wait 1 day", action: kind, duration: "1d" }
        : kind === "add_tag"
          ? {
              label: `Add tag: ${tag}`,
              action: kind,
              tag,
              tagDescription: "",
            }
          : {
              label: templates[0]?.name || "Send email",
              action: kind,
              templateId: templates[0]?.id || "",
            };
    const node: Node = {
      id,
      type: "workflowStep",
      position: { x: 160, y: 40 + graph.nodes.length * 120 },
      data,
    };

    // Auto-link from the last node when the path is linear.
    const last = graph.nodes[graph.nodes.length - 1];
    const nextEdges = last
      ? [
          ...graph.edges,
          {
            id: `e-${last.id}-${id}`,
            source: last.id,
            target: id,
          },
        ]
      : graph.edges;

    setGraph((current) => ({
      nodes: [...current.nodes, node],
      edges: nextEdges,
    }));
    setSelectedNodeId(id);
    setStatus(kind === "add_tag" ? `Added tag step “${tag}” — edit it on the right.` : "Step added");
  }

  function removeSelected() {
    if (!selectedNodeId || selectedData.trigger) return;
    setGraph((current) => ({
      nodes: current.nodes.filter((node) => node.id !== selectedNodeId),
      edges: current.edges.filter(
        (edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId,
      ),
    }));
    setSelectedNodeId(null);
    setStatus("Step removed");
  }

  async function save() {
    const response = await fetch(`/api/hub/workflows/${workflow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, trigger, enabled, graph }),
    });
    setStatus(response.ok ? "Saved" : "Save failed");
    router.refresh();
  }

  async function run() {
    await save();
    const response = await fetch(`/api/hub/workflows/${workflow.id}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId }),
    });
    setStatus(response.ok ? "Queued in Inngest" : "Could not queue run");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="hub-field"
          />
        </label>
        <label className="text-sm">
          Trigger
          <select
            value={trigger}
            onChange={(event) => setTrigger(event.target.value)}
            className="hub-field"
          >
            <option value="new_lead">New lead</option>
            <option value="tag_added">Tag added</option>
            <option value="email_opened">Email opened</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          Enabled
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <button
          type="button"
          className="hub-btn-secondary"
          onClick={() => addNode("send_template")}
        >
          Add send
        </button>
        <button type="button" className="hub-btn-secondary" onClick={() => addNode("wait")}>
          Add wait
        </button>
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2">
          <label className="text-xs text-zinc-400">
            New tag
            <input
              value={newTagDraft}
              onChange={(event) => setNewTagDraft(event.target.value)}
              list="workflow-tag-suggestions"
              className="hub-field mt-1 min-w-[10rem] py-1.5 text-sm"
              placeholder="warm-lead"
            />
          </label>
          <button
            type="button"
            className="hub-btn-secondary"
            onClick={() => addNode("add_tag", newTagDraft)}
          >
            Add tag step
          </button>
        </div>
        <button type="button" className="hub-btn" onClick={() => void save()}>
          Save workflow
        </button>
      </div>

      <datalist id="workflow-tag-suggestions">
        {tagSuggestions.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <WorkflowCanvas
          initialNodes={graph.nodes}
          initialEdges={graph.edges}
          selectedNodeId={selectedNodeId}
          onChange={persistGraph}
          onSelectNode={setSelectedNodeId}
        />

        <aside className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="text-sm font-semibold text-white">Step settings</h2>
          {!selectedNode ? (
            <p className="mt-3 text-sm text-zinc-500">
              Click a step on the canvas to edit it. Use <strong>Add tag step</strong>{" "}
              to place a tag, then change the tag name here anytime.
            </p>
          ) : selectedData.trigger ? (
            <div className="mt-3 space-y-2 text-sm text-zinc-300">
              <p>Trigger node</p>
              <p className="text-zinc-500">
                Fires on: {String(selectedData.label || trigger)}. Change the workflow
                trigger above if needed.
              </p>
            </div>
          ) : selectedAction === "add_tag" ? (
            <div className="mt-3 space-y-3">
              <label className="block text-sm text-zinc-300">
                Tag name
                <input
                  value={String(selectedData.tag || "")}
                  list="workflow-tag-suggestions"
                  onChange={(event) => updateSelectedData({ tag: event.target.value })}
                  className="hub-field mt-1.5"
                  placeholder="warm-lead"
                />
              </label>
              <label className="block text-sm text-zinc-300">
                Tag description
                <textarea
                  value={String(selectedData.tagDescription || "")}
                  onChange={(event) =>
                    updateSelectedData({ tagDescription: event.target.value })
                  }
                  rows={3}
                  className="hub-field mt-1.5 min-h-[72px]"
                  placeholder="When this tag is applied and what it means for follow-up…"
                />
              </label>
              <p className="text-xs text-zinc-500">
                AI fills this when it generates a workflow. Edit anytime — save
                writes it back onto the step.
              </p>
              {tagSuggestions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {tagSuggestions.slice(0, 12).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-emerald-400 hover:text-white"
                      onClick={() => updateSelectedData({ tag })}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                className="hub-btn-secondary w-full"
                onClick={removeSelected}
              >
                Remove tag step
              </button>
            </div>
          ) : selectedAction === "wait" ? (
            <div className="mt-3 space-y-3">
              <label className="block text-sm text-zinc-300">
                Wait duration
                <select
                  value={String(selectedData.duration || "1d")}
                  onChange={(event) =>
                    updateSelectedData({ duration: event.target.value })
                  }
                  className="hub-field mt-1.5"
                >
                  <option value="30m">30 minutes</option>
                  <option value="1h">1 hour</option>
                  <option value="6h">6 hours</option>
                  <option value="1d">1 day</option>
                  <option value="2d">2 days</option>
                  <option value="3d">3 days</option>
                  <option value="1w">1 week</option>
                </select>
              </label>
              <button
                type="button"
                className="hub-btn-secondary w-full"
                onClick={removeSelected}
              >
                Remove wait step
              </button>
            </div>
          ) : selectedAction === "send_template" ? (
            <div className="mt-3 space-y-3">
              <label className="block text-sm text-zinc-300">
                Email template
                <select
                  value={String(selectedData.templateId || "")}
                  onChange={(event) =>
                    updateSelectedData({ templateId: event.target.value })
                  }
                  className="hub-field mt-1.5"
                >
                  <option value="">Select template…</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                      {template.subject ? ` — ${template.subject}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-zinc-300">
                Step label
                <input
                  value={String(selectedData.label || "")}
                  onChange={(event) => updateSelectedData({ label: event.target.value })}
                  className="hub-field mt-1.5"
                />
              </label>
              {templates.length === 0 ? (
                <p className="text-xs text-amber-200/90">
                  No templates yet — create one under Email, then pick it here.
                </p>
              ) : null}
              <button
                type="button"
                className="hub-btn-secondary w-full"
                onClick={removeSelected}
              >
                Remove send step
              </button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">Unknown step type.</p>
          )}
        </aside>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          Test contact
          <select
            value={contactId}
            onChange={(event) => setContactId(event.target.value)}
            className="hub-field min-w-64"
          >
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name || contact.email}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="hub-btn"
          onClick={() => void run()}
          disabled={!contactId}
        >
          Run now
        </button>
        {status ? <p className="text-sm text-indigo-300">{status}</p> : null}
      </div>
      <p className="text-xs text-zinc-500">
        Click any tag step to rename it. Save when you&apos;re done — enabled workflows
        apply these tags when they run.
      </p>
    </div>
  );
}
