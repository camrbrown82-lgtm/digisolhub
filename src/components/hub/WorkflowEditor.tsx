"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
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

let nodeCount = 0;

export function WorkflowEditor({
  workflow,
  contacts,
}: {
  workflow: Workflow;
  contacts: { id: string; email: string; name: string | null }[];
}) {
  const router = useRouter();
  const [name, setName] = useState(workflow.name);
  const [trigger, setTrigger] = useState(workflow.trigger);
  const [enabled, setEnabled] = useState(workflow.enabled);
  const [graph, setGraph] = useState({
    nodes: workflow.graph?.nodes ?? [],
    edges: workflow.graph?.edges ?? [],
  });
  const persistGraph = useCallback(
    (next: { nodes: Node[]; edges: Edge[] }) => {
      setGraph(next);
    },
    [],
  );
  const [contactId, setContactId] = useState(contacts[0]?.id ?? "");
  const [status, setStatus] = useState("");
  const [canvasKey, setCanvasKey] = useState(0);

  function addNode(kind: "send_template" | "wait" | "add_tag") {
    nodeCount += 1;
    const id = `${kind}-${Date.now()}-${nodeCount}`;
    const labels = {
      send_template: "Send template",
      wait: "Wait",
      add_tag: "Add tag",
    };
    const data =
      kind === "wait"
        ? { label: "Wait 1 day", action: kind, duration: "1d" }
        : kind === "add_tag"
          ? { label: "Add tag", action: kind, tag: "nurture" }
          : { label: labels[kind], action: kind, templateId: "" };
    const node: Node = {
      id,
      position: { x: 80, y: 80 + graph.nodes.length * 90 },
      data,
    };
    setGraph((current) => ({ ...current, nodes: [...current.nodes, node] }));
    setCanvasKey((value) => value + 1);
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
      <div className="flex flex-wrap gap-2">
        <button type="button" className="hub-btn-secondary" onClick={() => addNode("send_template")}>
          Add send
        </button>
        <button type="button" className="hub-btn-secondary" onClick={() => addNode("wait")}>
          Add wait
        </button>
        <button type="button" className="hub-btn-secondary" onClick={() => addNode("add_tag")}>
          Add tag
        </button>
        <button type="button" className="hub-btn" onClick={save}>
          Save workflow
        </button>
      </div>
      <WorkflowCanvas
        key={canvasKey}
        initialNodes={graph.nodes}
        initialEdges={graph.edges}
        onChange={persistGraph}
      />
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
        <button type="button" className="hub-btn" onClick={run} disabled={!contactId}>
          Run now
        </button>
        {status ? <p className="text-sm text-indigo-300">{status}</p> : null}
      </div>
      <p className="text-xs text-zinc-500">
        For send/wait steps, edit node data in the saved JSON after adding a template ID.
        Wait duration uses Inngest sleep strings such as <code>1d</code> or <code>2h</code>.
      </p>
    </div>
  );
}
