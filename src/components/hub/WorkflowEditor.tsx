"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Edge, Node } from "@xyflow/react";
import {
  type AudiencePreset,
  contactsForPreset,
} from "@/lib/contactAudiences";
import { MicDictateButton, appendDictation } from "@/components/hub/MicDictateButton";

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

type ContactOption = {
  id: string;
  email: string;
  name: string | null;
  company?: string | null;
  tags?: string[] | null;
  source?: string | null;
  audited?: boolean;
  engaged?: boolean;
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
  operatorEmails = [],
  initialAudience = null,
}: {
  workflow: Workflow;
  contacts: ContactOption[];
  templates?: TemplateOption[];
  knownTags?: string[];
  /** Hub operator emails — used for “Add me”. */
  operatorEmails?: string[];
  /** From AI generator (?audience=trades|audits|leads|engaged|me). */
  initialAudience?: AudiencePreset | null;
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
    setGraph((current) => {
      // Avoid re-render loops when the canvas echoes the same graph.
      if (
        current.nodes === next.nodes &&
        current.edges === next.edges
      ) {
        return current;
      }
      const sameShape =
        current.nodes.length === next.nodes.length &&
        current.edges.length === next.edges.length &&
        current.nodes.every((node, i) => {
          const other = next.nodes[i];
          return (
            other &&
            node.id === other.id &&
            node.position?.x === other.position?.x &&
            node.position?.y === other.position?.y &&
            JSON.stringify(node.data) === JSON.stringify(other.data)
          );
        }) &&
        current.edges.every((edge, i) => {
          const other = next.edges[i];
          return (
            other &&
            edge.id === other.id &&
            edge.source === other.source &&
            edge.target === other.target
          );
        });
      return sameShape ? current : next;
    });
  }, []);

  const operatorSet = useMemo(
    () =>
      new Set(
        operatorEmails.map((email) => email.trim().toLowerCase()).filter(Boolean),
      ),
    [operatorEmails],
  );

  const [extraContacts, setExtraContacts] = useState<ContactOption[]>([]);
  const [addingMyself, setAddingMyself] = useState(false);

  const allContacts = useMemo(
    () => [...extraContacts, ...contacts],
    [extraContacts, contacts],
  );

  const myselfContacts = useMemo(
    () =>
      allContacts.filter((contact) =>
        operatorSet.has(contact.email.trim().toLowerCase()),
      ),
    [allContacts, operatorSet],
  );

  // Start empty unless the AI (or a link) named an audience. Prevents
  // accidentally queuing every audited company.
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(() => {
    if (!initialAudience) return [];
    return contactsForPreset(contacts, initialAudience, operatorEmails).map(
      (contact) => contact.id,
    );
  });
  const [audienceQuery, setAudienceQuery] = useState("");
  const [audienceTag, setAudienceTag] = useState("");
  const [audienceScope, setAudienceScope] = useState<"all" | "audited">("all");
  const [status, setStatus] = useState("");
  const [running, setRunning] = useState(false);

  const selectedNode = useMemo(
    () => graph.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [graph.nodes, selectedNodeId],
  );
  const selectedData = (selectedNode?.data || {}) as Record<string, unknown>;
  const selectedAction = String(selectedData.action || "");

  const planText = useMemo(() => {
    const triggerNode = graph.nodes.find((node) => node.id === "trigger");
    const plan = (triggerNode?.data as { plan?: string } | undefined)?.plan;
    return typeof plan === "string" ? plan.trim() : "";
  }, [graph.nodes]);

  const tagSuggestions = useMemo(() => {
    const fromNodes = graph.nodes
      .map((node) => String((node.data as { tag?: string } | undefined)?.tag || ""))
      .filter(Boolean);
    return Array.from(new Set([...knownTags, ...fromNodes])).sort();
  }, [graph.nodes, knownTags]);

  const auditedContacts = useMemo(
    () => allContacts.filter((contact) => contact.audited),
    [allContacts],
  );

  const filteredContacts = useMemo(() => {
    const q = audienceQuery.trim().toLowerCase();
    return allContacts.filter((contact) => {
      if (audienceScope === "audited" && !contact.audited) return false;
      const tags = Array.isArray(contact.tags) ? contact.tags : [];
      if (audienceTag && !tags.includes(audienceTag)) return false;
      if (!q) return true;
      const hay =
        `${contact.name || ""} ${contact.company || ""} ${contact.email} ${tags.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allContacts, audienceQuery, audienceTag, audienceScope]);

  const selectedSet = useMemo(
    () => new Set(selectedContactIds),
    [selectedContactIds],
  );

  function toggleContact(id: string) {
    setSelectedContactIds((current) =>
      current.includes(id)
        ? current.filter((row) => row !== id)
        : [...current, id],
    );
  }

  function removeContact(id: string) {
    setSelectedContactIds((current) => current.filter((row) => row !== id));
  }

  function selectFiltered() {
    setSelectedContactIds((current) =>
      Array.from(new Set([...current, ...filteredContacts.map((c) => c.id)])),
    );
  }

  function selectAllAudited() {
    setAudienceScope("audited");
    setSelectedContactIds(auditedContacts.map((contact) => contact.id));
  }

  function loadAudience(preset: AudiencePreset) {
    const matched = contactsForPreset(allContacts, preset, operatorEmails);
    setAudienceScope("all");
    setSelectedContactIds(matched.map((contact) => contact.id));
    const labels: Record<AudiencePreset, string> = {
      trades: "trades prospect audits",
      audits: "all prospect audits",
      leads: "new leads",
      engaged: "engaged contacts",
      me: "you",
    };
    setStatus(
      matched.length
        ? `Run list set to ${matched.length} ${labels[preset]}.`
        : `No contacts in ${labels[preset]} yet.`,
    );
  }

  async function addMeToRun() {
    const wanted = Array.from(
      new Set(
        operatorEmails
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean),
      ),
    );
    if (wanted.length === 0) {
      setStatus("No Hub login email is configured, so I cannot add you.");
      return;
    }

    const have = new Map(
      myselfContacts.map((contact) => [
        contact.email.trim().toLowerCase(),
        contact.id,
      ]),
    );
    const ids = wanted
      .map((email) => have.get(email))
      .filter((id): id is string => Boolean(id));
    const missing = wanted.filter((email) => !have.has(email));

    if (missing.length === 0) {
      setAudienceScope("all");
      setSelectedContactIds((current) => Array.from(new Set([...current, ...ids])));
      setStatus(
        `Added you to this run (${wanted.join(", ")}). Remove anyone else in Will run for if you only want a self-test.`,
      );
      return;
    }

    setAddingMyself(true);
    setStatus(`Adding ${missing.join(", ")} to this run…`);
    try {
      const createdIds = [...ids];
      for (const email of missing) {
        const response = await fetch("/api/hub/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            name: "Cameron Brown",
            company: "DigiSol",
            source: "manual",
            tags: ["operator", "self_test"],
          }),
        });
        const json = (await response.json().catch(() => ({}))) as {
          id?: string;
          error?: string;
        };
        if (!response.ok || !json.id) {
          setStatus(
            json.error ||
              `Could not add ${email}. Open Contacts and confirm that address is there.`,
          );
          continue;
        }
        const created: ContactOption = {
          id: json.id,
          email,
          name: "Cameron Brown",
          company: "DigiSol",
          tags: ["operator", "self_test"],
          audited: false,
        };
        setExtraContacts((current) =>
          current.some((row) => row.id === created.id)
            ? current
            : [created, ...current],
        );
        createdIds.push(created.id);
      }
      if (createdIds.length === 0) return;
      setAudienceScope("all");
      setSelectedContactIds((current) =>
        Array.from(new Set([...current, ...createdIds])),
      );
      setStatus(
        `Added ${wanted.join(", ")} to Will run for. Click Run now when the list looks right.`,
      );
    } finally {
      setAddingMyself(false);
    }
  }

  function clearAudience() {
    setSelectedContactIds([]);
  }

  const sendSteps = useMemo(
    () =>
      graph.nodes.filter((node) => {
        const data = (node.data || {}) as Record<string, unknown>;
        return data.action === "send_template";
      }),
    [graph.nodes],
  );

  const sendStepsMissingTemplate = useMemo(
    () =>
      sendSteps.filter((node) => {
        const data = (node.data || {}) as Record<string, unknown>;
        return !String(data.templateId || "").trim();
      }),
    [sendSteps],
  );

  const readyToRun =
    selectedContactIds.length > 0 &&
    (sendSteps.length === 0 || sendStepsMissingTemplate.length === 0);

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
    if (selectedContactIds.length === 0) {
      setStatus("Add at least one contact to the run list");
      return;
    }
    if (sendStepsMissingTemplate.length > 0) {
      setStatus(
        `Pick an email template on ${sendStepsMissingTemplate.length} send step(s) before running`,
      );
      return;
    }
    if (sendSteps.length === 0) {
      setStatus(
        "This graph has no Send step — only tags/waits will run. Add send + template to get a real email.",
      );
    }
    setRunning(true);
    setStatus("Saving & queuing…");
    try {
      await save();
      const response = await fetch(`/api/hub/workflows/${workflow.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: selectedContactIds }),
      });
      const json = (await response.json().catch(() => ({}))) as {
        queued?: number;
        error?: string;
      };
      if (!response.ok) {
        setStatus(json.error || "Could not queue run");
        return;
      }
      setStatus(
        `Queued ${json.queued ?? selectedContactIds.length} contact${
          (json.queued ?? selectedContactIds.length) === 1 ? "" : "s"
        } — watch Campaigns → Workflow runs, and your inbox if a Send step is included.`,
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm">
          <span className="flex items-center justify-between gap-2">
            Name
            <MicDictateButton
              onText={(chunk) => setName((current) => appendDictation(current, chunk))}
            />
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="hub-field mt-1.5"
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
            <span className="flex items-center justify-between gap-2">
              New tag
              <MicDictateButton
                onText={(chunk) =>
                  setNewTagDraft((current) => appendDictation(current, chunk))
                }
              />
            </span>
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
                <span className="flex items-center justify-between gap-2">
                  Tag name
                  <MicDictateButton
                    onText={(chunk) =>
                      updateSelectedData({
                        tag: appendDictation(String(selectedData.tag || ""), chunk),
                      })
                    }
                  />
                </span>
                <input
                  value={String(selectedData.tag || "")}
                  list="workflow-tag-suggestions"
                  onChange={(event) => updateSelectedData({ tag: event.target.value })}
                  className="hub-field mt-1.5"
                  placeholder="warm-lead"
                />
              </label>
              <label className="block text-sm text-zinc-300">
                <span className="flex items-center justify-between gap-2">
                  Tag description
                  <MicDictateButton
                    onText={(chunk) =>
                      updateSelectedData({
                        tagDescription: appendDictation(
                          String(selectedData.tagDescription || ""),
                          chunk,
                        ),
                      })
                    }
                  />
                </span>
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
                <span className="flex items-center justify-between gap-2">
                  Step label
                  <MicDictateButton
                    onText={(chunk) =>
                      updateSelectedData({
                        label: appendDictation(String(selectedData.label || ""), chunk),
                      })
                    }
                  />
                </span>
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

      {planText ? (
        <div className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 p-4">
          <h2 className="text-sm font-semibold text-white">Plan to review</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-indigo-100">
            {planText}
          </p>
          <p className="mt-2 text-xs text-zinc-400">
            Send steps still need an email template. Nothing sends until you
            click Run now.
          </p>
        </div>
      ) : null}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Run audience</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Pick one audience, then remove anyone who should not get this
              run. <span className="text-zinc-300">Add me</span> puts your
              Yahoo/Gmail contact on the list without clearing the rest.
            </p>
          </div>
          <p className="text-xs text-zinc-400">
            {selectedContactIds.length} selected
            {myselfContacts.length ? ` · ${myselfContacts.length} you` : ""}
            {auditedContacts.length
              ? ` · ${auditedContacts.length} audited`
              : ""}
            {allContacts.length ? ` · ${allContacts.length} total` : ""}
          </p>
        </div>

        <ul className="mt-3 space-y-1 text-xs text-zinc-400">
          <li
            className={
              selectedContactIds.length > 0 ? "text-emerald-300/90" : "text-amber-200/90"
            }
          >
            {selectedContactIds.length > 0
              ? `✓ ${selectedContactIds.length} contact(s) in Will run for`
              : "○ Nobody selected yet — click Add me, or pick Trades / Audits / New leads"}
          </li>
          <li
            className={
              sendSteps.length === 0
                ? "text-amber-200/90"
                : sendStepsMissingTemplate.length > 0
                  ? "text-rose-300"
                  : "text-emerald-300/90"
            }
          >
            {sendSteps.length === 0
              ? "○ No Send step yet — Add send, click it, pick an email template"
              : sendStepsMissingTemplate.length > 0
                ? `○ ${sendStepsMissingTemplate.length} send step(s) need a template`
                : `✓ ${sendSteps.length} send step(s) have templates`}
          </li>
          <li className="text-zinc-500">
            Results: Campaigns → Workflow runs · opens in Analytics after you open the email
          </li>
        </ul>

        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-xs text-zinc-400">
            Show
            <select
              value={audienceScope}
              onChange={(event) =>
                setAudienceScope(event.target.value as "all" | "audited")
              }
              className="hub-field mt-1 min-w-[10rem] py-1.5 text-sm"
            >
              <option value="audited">Audited companies</option>
              <option value="all">All contacts</option>
            </select>
          </label>
          <label className="text-xs text-zinc-400">
            <span className="flex items-center justify-between gap-2">
              Search
              <MicDictateButton
                onText={(chunk) =>
                  setAudienceQuery((current) => appendDictation(current, chunk))
                }
              />
            </span>
            <input
              value={audienceQuery}
              onChange={(event) => setAudienceQuery(event.target.value)}
              className="hub-field mt-1 min-w-[14rem] py-1.5 text-sm"
              placeholder="Name, company, email, tag"
            />
          </label>
          <label className="text-xs text-zinc-400">
            Tag filter
            <select
              value={audienceTag}
              onChange={(event) => setAudienceTag(event.target.value)}
              className="hub-field mt-1 min-w-[10rem] py-1.5 text-sm"
            >
              <option value="">Any tag</option>
              {knownTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="hub-btn text-xs"
            onClick={() => void addMeToRun()}
            disabled={addingMyself}
          >
            {addingMyself ? "Adding you…" : "Add me"}
          </button>
          <button
            type="button"
            className="hub-btn-secondary text-xs"
            onClick={() => loadAudience("trades")}
          >
            Trades audits
          </button>
          <button
            type="button"
            className="hub-btn-secondary text-xs"
            onClick={() => loadAudience("audits")}
          >
            All prospect audits
          </button>
          <button
            type="button"
            className="hub-btn-secondary text-xs"
            onClick={() => loadAudience("leads")}
          >
            New leads
          </button>
          <button
            type="button"
            className="hub-btn-secondary text-xs"
            onClick={() => loadAudience("engaged")}
            title="Opened or clicked an email, or tagged engaged / warm-lead"
          >
            Engaged
          </button>
          <button
            type="button"
            className="hub-btn-secondary text-xs"
            onClick={() => loadAudience("me")}
          >
            Only me
          </button>
          <button
            type="button"
            className="hub-btn-secondary text-xs"
            onClick={selectAllAudited}
            disabled={auditedContacts.length === 0}
          >
            Add all audited ({auditedContacts.length})
          </button>
          <button
            type="button"
            className="hub-btn-secondary text-xs"
            onClick={selectFiltered}
          >
            Add filtered ({filteredContacts.length})
          </button>
          <button
            type="button"
            className="hub-btn-secondary text-xs"
            onClick={clearAudience}
            disabled={selectedContactIds.length === 0}
          >
            Clear run list
          </button>
          <button
            type="button"
            className="hub-btn"
            onClick={() => void run()}
            disabled={running || !readyToRun}
          >
            {running
              ? "Queuing…"
              : `Run now (${selectedContactIds.length})`}
          </button>
        </div>

        {templates.length === 0 ? (
          <p className="mt-3 text-xs text-amber-200/90">
            No email templates in Hub yet — create one under Email before a Send
            step can deliver mail.
          </p>
        ) : null}

        {myselfContacts.length === 0 && operatorEmails.length > 0 ? (
          <p className="mt-3 text-xs text-amber-200/90">
            Click <strong>Add me</strong> to put {operatorEmails.join(" and ")} on
            this run. Hub creates the CRM row if it is missing.
          </p>
        ) : null}
        {operatorEmails.length === 0 ? (
          <p className="mt-3 text-xs text-amber-200/90">
            Set HUB_ALLOWED_EMAIL in Vercel to your login email so Add me knows
            who you are.
          </p>
        ) : null}

        {status ? (
          <p className="mt-3 text-sm text-indigo-300">{status}</p>
        ) : null}

        {auditedContacts.length === 0 ? (
          <p className="mt-3 text-xs text-amber-200/90">
            No audited prospect companies linked to CRM contacts yet. Run
            prospect audits, or switch Show → All contacts.
          </p>
        ) : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Available contacts
            </p>
            <ul className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/40 p-2">
              {filteredContacts.length === 0 ? (
                <li className="px-2 py-3 text-sm text-zinc-500">
                  No contacts match this filter.
                </li>
              ) : (
                filteredContacts.map((contact) => {
                  const checked = selectedSet.has(contact.id);
                  const tags = Array.isArray(contact.tags) ? contact.tags : [];
                  return (
                    <li key={contact.id}>
                      <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-800/60">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked}
                          onChange={() => toggleContact(contact.id)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="block truncate text-sm text-white">
                              {contact.company || contact.name || contact.email}
                            </span>
                            {contact.audited ? (
                              <span className="shrink-0 rounded-full border border-emerald-500/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300">
                                Audited
                              </span>
                            ) : null}
                          </span>
                          <span className="block truncate text-xs text-zinc-500">
                            {[contact.name, contact.email]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                          {tags.length > 0 ? (
                            <span className="mt-0.5 block truncate text-[11px] text-zinc-600">
                              {tags.slice(0, 4).join(" · ")}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Will run for
            </p>
            <ul className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/40 p-2">
              {selectedContactIds.length === 0 ? (
                <li className="px-2 py-3 text-sm text-zinc-500">
                  Empty — Add all audited, or check contacts on the left.
                </li>
              ) : (
                selectedContactIds.map((id) => {
                  const contact = allContacts.find((row) => row.id === id);
                  if (!contact) return null;
                  return (
                    <li
                      key={id}
                      className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">
                        {contact.company || contact.name || contact.email}
                        {contact.audited ? (
                          <span className="ml-2 text-[10px] uppercase text-emerald-400">
                            audited
                          </span>
                        ) : null}
                        <span className="text-zinc-500">
                          {" "}
                          · {contact.email}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="shrink-0 rounded-md border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300 hover:border-rose-400/60 hover:text-rose-200"
                        onClick={() => removeContact(id)}
                      >
                        Remove
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      </div>
      <p className="text-xs text-zinc-500">
        Click any tag step to rename it. Save when you&apos;re done — enabled workflows
        apply these tags when they run automatically on their trigger.
      </p>
    </div>
  );
}
