"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Edge, Node } from "@xyflow/react";
import {
  type AudiencePreset,
  contactsForPreset,
} from "@/lib/contactAudiences";
import { MicDictateButton, appendDictation } from "@/components/hub/MicDictateButton";
import {
  LEAD_AUDIENCES,
  LEAD_AUDIENCE_LABELS,
  type LeadAudience,
  asLeadAudience,
  leadAudienceOf,
} from "@/lib/workflowGraph";

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

type EmailMatchRow = {
  contactId: string;
  label: string;
  trade: string | null;
  auditScore: number | null;
  steps: Record<string, string>;
  reason: string;
};

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
  templates: initialTemplates = [],
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
  const [audience, setAudience] = useState<LeadAudience>(() =>
    leadAudienceOf(workflow.graph as Parameters<typeof leadAudienceOf>[0]),
  );
  const [enabled, setEnabled] = useState(workflow.enabled);
  const [graph, setGraph] = useState({
    nodes: workflow.graph?.nodes ?? [],
    edges: workflow.graph?.edges ?? [],
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [newTagDraft, setNewTagDraft] = useState("nurture");
  const [templates, setTemplates] = useState<TemplateOption[]>(initialTemplates);
  const [emailDraft, setEmailDraft] = useState<{
    name: string;
    subject: string;
    body: string;
  } | null>(null);
  const [emailDraftBusy, setEmailDraftBusy] = useState(false);
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
  const [emailPlanRows, setEmailPlanRows] = useState<EmailMatchRow[] | null>(null);
  const [emailPlanApproved, setEmailPlanApproved] = useState(false);
  const [matchRules, setMatchRules] = useState("");
  const [matching, setMatching] = useState(false);
  const autoMatchStarted = useRef(false);

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

  const planActive = emailPlanRows !== null;

  const planByContact = useMemo(
    () => new Map((emailPlanRows ?? []).map((row) => [row.contactId, row])),
    [emailPlanRows],
  );

  const contactsMissingEmail = useMemo(
    () =>
      selectedContactIds.filter((contactId) =>
        sendSteps.some((step) => {
          const planned = planActive ? planByContact.get(contactId)?.steps[step.id] : "";
          const fallback = String(
            ((step.data || {}) as Record<string, unknown>).templateId || "",
          );
          return !(planned || fallback);
        }),
      ),
    [selectedContactIds, sendSteps, planActive, planByContact],
  );

  const contactsOutsidePlan = planActive
    ? selectedContactIds.filter((id) => !planByContact.has(id)).length
    : 0;

  const readyToRun =
    selectedContactIds.length > 0 &&
    (sendSteps.length === 0 || contactsMissingEmail.length === 0) &&
    (!planActive || emailPlanApproved);

  async function matchEmails() {
    if (selectedContactIds.length === 0) {
      setStatus("Add contacts to Will run for, then let Kaylev match emails.");
      return;
    }
    if (sendSteps.length === 0) {
      setStatus("Add a Send step first — Kaylev fills Send steps.");
      return;
    }
    setMatching(true);
    setStatus(`Kaylev is matching emails for ${selectedContactIds.length} contact(s)…`);
    try {
      const response = await fetch(`/api/hub/workflows/${workflow.id}/match-emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactIds: selectedContactIds,
          rules: matchRules,
          graph: { nodes: graph.nodes },
        }),
      });
      const json = (await response.json().catch(() => ({}))) as {
        rows?: EmailMatchRow[];
        error?: string;
      };
      if (!response.ok || !json.rows) {
        setStatus(json.error || "Kaylev could not match emails");
        return;
      }
      setEmailPlanRows(json.rows);
      setEmailPlanApproved(false);
      setStatus(
        `Kaylev matched ${json.rows.length} contact(s). Review the emails below, change any you disagree with, then Approve.`,
      );
    } catch {
      setStatus("Kaylev could not match emails — check your connection.");
    } finally {
      setMatching(false);
    }
  }

  function setPlanTemplate(contactId: string, stepId: string, templateId: string) {
    setEmailPlanRows((rows) =>
      (rows ?? []).map((row) =>
        row.contactId === contactId
          ? { ...row, steps: { ...row.steps, [stepId]: templateId } }
          : row,
      ),
    );
    setEmailPlanApproved(false);
  }

  function applyTemplateToAll(stepId: string, templateId: string) {
    if (!templateId) return;
    setEmailPlanRows((rows) =>
      (rows ?? []).map((row) =>
        selectedContactIds.includes(row.contactId)
          ? { ...row, steps: { ...row.steps, [stepId]: templateId } }
          : row,
      ),
    );
    setEmailPlanApproved(false);
  }

  function clearEmailPlan() {
    setEmailPlanRows(null);
    setEmailPlanApproved(false);
    setStatus("Email plan cleared — each Send step uses its own template.");
  }

  useEffect(() => {
    if (autoMatchStarted.current) return;
    if (!initialAudience || selectedContactIds.length === 0) return;
    if (sendSteps.length === 0 || templates.length < 2) return;
    autoMatchStarted.current = true;
    void matchEmails();
    // Only once, when arriving from the AI generator with an audience.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function createEmailForStep() {
    if (!emailDraft) return;
    const name = emailDraft.name.trim();
    if (!name || !emailDraft.subject.trim() || !emailDraft.body.trim()) {
      setStatus("Give the new email a name, subject, and body.");
      return;
    }
    setEmailDraftBusy(true);
    try {
      const response = await fetch("/api/hub/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          subject: emailDraft.subject.trim(),
          html: emailDraft.body,
        }),
      });
      const json = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !json.id) {
        setStatus(json.error || "Could not create the email");
        return;
      }
      const created = { id: json.id, name, subject: emailDraft.subject.trim() };
      setTemplates((list) => [created, ...list]);
      updateSelectedData({ templateId: created.id, label: created.name });
      setEmailDraft(null);
      setStatus(`Created “${name}” and attached it to this step. Save workflow to keep it.`);
    } catch {
      setStatus("Could not create the email — check your connection.");
    } finally {
      setEmailDraftBusy(false);
    }
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
    const graphToSave = {
      ...graph,
      nodes: graph.nodes.map((node) => {
        if (node.type !== "trigger" && !node.data?.trigger) return node;
        const { audience: _previous, ...data } = (node.data || {}) as Record<string, unknown>;
        return {
          ...node,
          data:
            trigger === "new_lead" && audience !== "all" ? { ...data, audience } : data,
        };
      }),
    };
    const response = await fetch(`/api/hub/workflows/${workflow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, trigger, enabled, graph: graphToSave }),
    });
    if (!response.ok) {
      setStatus("Save failed");
    } else if (enabled && sendStepsMissingTemplate.length > 0) {
      setStatus(
        `Saved — but ${sendStepsMissingTemplate.length} send step(s) have no email picked and will be skipped.`,
      );
    } else {
      setStatus("Saved");
    }
    router.refresh();
  }

  async function run() {
    if (selectedContactIds.length === 0) {
      setStatus("Add at least one contact to the run list");
      return;
    }
    if (planActive && !emailPlanApproved) {
      setStatus("Approve Kaylev's email plan (or clear it) before running.");
      return;
    }
    if (contactsMissingEmail.length > 0) {
      setStatus(
        planActive
          ? `${contactsMissingEmail.length} contact(s) still have no email on a Send step — pick one in the plan or re-run Kaylev's match.`
          : `Pick an email template on ${sendStepsMissingTemplate.length} send step(s), or let Kaylev match emails per contact.`,
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
        body: JSON.stringify({
          contactIds: selectedContactIds,
          emailPlan: planActive
            ? Object.fromEntries(
                selectedContactIds
                  .map((id) => [id, planByContact.get(id)?.steps] as const)
                  .filter(
                    (entry): entry is readonly [string, Record<string, string>] =>
                      Boolean(entry[1]),
                  ),
              )
            : undefined,
        }),
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
        {trigger === "new_lead" ? (
          <label className="text-sm">
            Who enters
            <select
              value={audience}
              onChange={(event) => setAudience(asLeadAudience(event.target.value))}
              className="hub-field"
            >
              {LEAD_AUDIENCES.map((id) => (
                <option key={id} value={id}>
                  {LEAD_AUDIENCE_LABELS[id]}
                </option>
              ))}
            </select>
          </label>
        ) : null}
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
              {trigger === "new_lead" ? (
                <p className="text-zinc-500">
                  While Enabled is on, this runs by itself for every new lead that matches
                  Who enters ({LEAD_AUDIENCE_LABELS[audience]}). Each person goes through it
                  once, and only this company&apos;s leads enter. Emails wait until 24 hours
                  after any other email to that person, and the run stops when you move their
                  lead to Qualified or later in the pipeline, or they unsubscribe.
                </p>
              ) : null}
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
              {selectedData.templateId ? (
                <a
                  href={`/hub/email?template=${String(selectedData.templateId)}`}
                  target="_blank"
                  rel="noopener"
                  className="block text-xs text-indigo-300 hover:text-indigo-200"
                >
                  Edit or rename this email in Email ↗
                </a>
              ) : null}
              {emailDraft ? (
                <div className="space-y-2 rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-3">
                  <p className="text-xs font-medium text-white">New custom email</p>
                  <input
                    value={emailDraft.name}
                    onChange={(event) =>
                      setEmailDraft({ ...emailDraft, name: event.target.value })
                    }
                    className="hub-field py-1.5 text-sm"
                    placeholder="Name, e.g. Restaurant welcome"
                  />
                  <input
                    value={emailDraft.subject}
                    onChange={(event) =>
                      setEmailDraft({ ...emailDraft, subject: event.target.value })
                    }
                    className="hub-field py-1.5 text-sm"
                    placeholder="Subject, e.g. {{name}}, a quick idea for your restaurant"
                  />
                  <textarea
                    value={emailDraft.body}
                    onChange={(event) =>
                      setEmailDraft({ ...emailDraft, body: event.target.value })
                    }
                    rows={6}
                    className="hub-field resize-y font-mono text-xs"
                  />
                  <p className="text-[11px] text-zinc-500">
                    Uses this company&apos;s brand kit. Merge fields like {"{{name}}"}{" "}
                    and {"{{logo}}"} work here too.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="hub-btn flex-1 text-xs"
                      disabled={emailDraftBusy}
                      onClick={() => void createEmailForStep()}
                    >
                      {emailDraftBusy ? "Creating…" : "Create & use"}
                    </button>
                    <button
                      type="button"
                      className="hub-btn-secondary text-xs"
                      disabled={emailDraftBusy}
                      onClick={() => setEmailDraft(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="hub-btn-secondary w-full"
                  onClick={() =>
                    setEmailDraft({
                      name: "",
                      subject: "",
                      body: "Hey {{name}},\n\n\n\n{{company}}",
                    })
                  }
                >
                  + Write a new email for this step
                </button>
              )}
              {templates.length === 0 ? (
                <p className="text-xs text-amber-200/90">
                  No templates yet — write one above, or create one under Email.
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
            Click a send step to pick a saved email or write a new one. Nothing
            sends until you click Run now.
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
                : planActive
                  ? emailPlanApproved && contactsMissingEmail.length === 0
                    ? "text-emerald-300/90"
                    : "text-amber-200/90"
                  : sendStepsMissingTemplate.length > 0
                    ? "text-rose-300"
                    : "text-emerald-300/90"
            }
          >
            {sendSteps.length === 0
              ? "○ No Send step yet — Add send, click it, pick an email template"
              : planActive
                ? emailPlanApproved
                  ? contactsMissingEmail.length > 0
                    ? `○ ${contactsMissingEmail.length} contact(s) still need an email in the plan`
                    : `✓ Kaylev's email plan approved for ${selectedContactIds.length} contact(s)`
                  : "○ Review and approve Kaylev's email plan below"
                : sendStepsMissingTemplate.length > 0
                  ? `○ ${sendStepsMissingTemplate.length} send step(s) need a template — or let Kaylev match emails per contact`
                  : `✓ ${sendSteps.length} send step(s) have templates`}
          </li>
          <li className="text-zinc-500">
            Results: Campaigns → Workflow runs · opens in Analytics after you open the email
          </li>
        </ul>

        {sendSteps.length > 0 ? (
          <div className="mt-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-white">Emails per contact</h3>
                <p className="mt-1 max-w-2xl text-xs text-zinc-400">
                  Kaylev picks the best saved email for each company at every Send
                  step — restaurant vs trades, high vs low audit score, new lead vs
                  audit, or your general business email. Nothing sends until you
                  approve.
                </p>
              </div>
              {planActive ? (
                <span
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    emailPlanApproved
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-amber-500/15 text-amber-200"
                  }`}
                >
                  {emailPlanApproved ? "Approved" : "Waiting for approval"}
                </span>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="min-w-[16rem] flex-1 text-xs text-zinc-400">
                <span className="flex items-center justify-between gap-2">
                  Rules for Kaylev (optional)
                  <MicDictateButton
                    onText={(chunk) =>
                      setMatchRules((current) => appendDictation(current, chunk))
                    }
                  />
                </span>
                <input
                  value={matchRules}
                  onChange={(event) => setMatchRules(event.target.value)}
                  className="hub-field mt-1 py-1.5 text-sm"
                  placeholder="e.g. Restaurants under 60 get Restaurant low score; everyone else General business"
                />
              </label>
              <button
                type="button"
                className="hub-btn text-xs"
                onClick={() => void matchEmails()}
                disabled={matching || selectedContactIds.length === 0}
              >
                {matching
                  ? "Kaylev is matching…"
                  : planActive
                    ? `Re-match emails (${selectedContactIds.length})`
                    : `Kaylev: match emails (${selectedContactIds.length})`}
              </button>
            </div>

            {planActive && emailPlanRows ? (
              <div className="mt-3 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {sendSteps.map((step, index) => (
                    <label key={step.id} className="text-xs text-zinc-400">
                      Set everyone · step {index + 1}
                      <select
                        value=""
                        onChange={(event) => applyTemplateToAll(step.id, event.target.value)}
                        className="hub-field mt-1 min-w-[12rem] py-1.5 text-sm"
                      >
                        <option value="">Choose email…</option>
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>

                <div className="max-h-[28rem] overflow-auto rounded-lg border border-zinc-800">
                  <table className="w-full min-w-[40rem] text-left text-xs">
                    <thead className="sticky top-0 bg-zinc-900 text-zinc-400">
                      <tr>
                        <th className="px-3 py-2 font-medium">Company</th>
                        {sendSteps.map((step, index) => (
                          <th key={step.id} className="px-3 py-2 font-medium">
                            Step {index + 1}:{" "}
                            {String(((step.data || {}) as Record<string, unknown>).label || "Send")}
                          </th>
                        ))}
                        <th className="px-3 py-2 font-medium">Why</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {emailPlanRows
                        .filter((row) => selectedContactIds.includes(row.contactId))
                        .map((row) => (
                          <tr key={row.contactId} className="align-top">
                            <td className="px-3 py-2 text-zinc-200">
                              <span className="block font-medium">{row.label}</span>
                              <span className="text-zinc-500">
                                {[
                                  row.trade && row.trade !== "general" ? row.trade : null,
                                  row.auditScore !== null ? `audit ${row.auditScore}` : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ") || "not audited"}
                              </span>
                            </td>
                            {sendSteps.map((step) => (
                              <td key={step.id} className="px-3 py-2">
                                <select
                                  value={row.steps[step.id] || ""}
                                  onChange={(event) =>
                                    setPlanTemplate(row.contactId, step.id, event.target.value)
                                  }
                                  className={`hub-field py-1 text-xs ${
                                    row.steps[step.id] ? "" : "border-rose-400/60"
                                  }`}
                                >
                                  <option value="">No email picked</option>
                                  {templates.map((template) => (
                                    <option key={template.id} value={template.id}>
                                      {template.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            ))}
                            <td className="px-3 py-2 text-zinc-400">{row.reason}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {contactsOutsidePlan > 0 ? (
                  <p className="text-xs text-amber-200/90">
                    {contactsOutsidePlan} contact(s) in Will run for were added after
                    this match and will get each step&apos;s default email. Click
                    Re-match to include them.
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="hub-btn text-xs"
                    disabled={emailPlanApproved || contactsMissingEmail.length > 0}
                    onClick={() => {
                      setEmailPlanApproved(true);
                      setStatus("Email plan approved — click Run now when ready.");
                    }}
                  >
                    {emailPlanApproved ? "Approved ✓" : "Approve email plan"}
                  </button>
                  <button
                    type="button"
                    className="hub-btn-secondary text-xs"
                    onClick={clearEmailPlan}
                  >
                    Clear plan
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

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
            No email templates in Hub yet — click a send step and use Write a new
            email, or create one under Email.
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
