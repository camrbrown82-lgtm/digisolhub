"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

type Props = {
  initialNodes: Node[];
  initialEdges: Edge[];
  selectedNodeId: string | null;
  onChange: (graph: { nodes: Node[]; edges: Edge[] }) => void;
  onSelectNode: (nodeId: string | null) => void;
};

function nodeTitle(data: Record<string, unknown>) {
  const action = String(data.action || "");
  if (data.trigger) return String(data.label || "Trigger");
  if (action === "add_tag") {
    const tag = String(data.tag || "").trim();
    return tag ? `Tag: ${tag}` : "Add tag";
  }
  if (action === "wait") {
    return `Wait ${String(data.duration || "1d")}`;
  }
  if (action === "send_template") {
    return String(data.label || "Send email");
  }
  return String(data.label || "Step");
}

function WorkflowStepNode({ data, selected }: NodeProps) {
  const record = (data || {}) as Record<string, unknown>;
  const action = String(record.action || (record.trigger ? "trigger" : "step"));
  const accent =
    action === "trigger"
      ? "border-indigo-400/50 bg-indigo-500/15"
      : action === "add_tag"
        ? "border-emerald-400/40 bg-emerald-500/10"
        : action === "wait"
          ? "border-amber-400/40 bg-amber-500/10"
          : "border-sky-400/40 bg-sky-500/10";

  return (
    <div
      className={`min-w-[160px] rounded-xl border px-3 py-2 shadow-lg ${accent} ${
        selected ? "ring-2 ring-indigo-400" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-zinc-400" />
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
        {action === "trigger"
          ? "Trigger"
          : action === "add_tag"
            ? "Tag"
            : action === "wait"
              ? "Wait"
              : "Email"}
      </p>
      <p className="mt-0.5 text-sm font-medium text-white">{nodeTitle(record)}</p>
      {action === "add_tag" && record.tagDescription ? (
        <p className="mt-1 max-w-[200px] text-[11px] leading-snug text-zinc-400">
          {String(record.tagDescription).slice(0, 90)}
          {String(record.tagDescription).length > 90 ? "…" : ""}
        </p>
      ) : null}
      <Handle type="source" position={Position.Bottom} className="!bg-zinc-400" />
    </div>
  );
}

const nodeTypes = { workflowStep: WorkflowStepNode };

function withStepType(nodes: Node[]): Node[] {
  return nodes.map((node) => ({
    ...node,
    type: "workflowStep",
    data: { ...(node.data || {}) },
  }));
}

/** Stable identity for graph content (ignore React Flow selection/measured fields). */
function graphFingerprint(nodes: Node[], edges: Edge[]) {
  return JSON.stringify({
    nodes: nodes.map((n) => ({
      id: n.id,
      position: n.position,
      data: n.data,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
    })),
  });
}

export function WorkflowCanvas({
  initialNodes,
  initialEdges,
  selectedNodeId,
  onChange,
  onSelectNode,
}: Props) {
  const seededNodes = useMemo(() => withStepType(initialNodes), [initialNodes]);
  const [nodes, setNodes, onNodesChange] = useNodesState(seededNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const syncedFp = useRef(graphFingerprint(seededNodes, initialEdges));
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Parent → canvas (sidebar / Add step). No-op when content already matches.
  useEffect(() => {
    const incoming = withStepType(initialNodes);
    const fp = graphFingerprint(incoming, initialEdges);
    if (fp === syncedFp.current) return;
    syncedFp.current = fp;
    setNodes(incoming);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Canvas → parent. Skip when fingerprint already matches what we last synced
  // (stops setNodes → onChange → setGraph → setNodes loops).
  useEffect(() => {
    const fp = graphFingerprint(nodes, edges);
    if (fp === syncedFp.current) return;
    syncedFp.current = fp;
    onChangeRef.current({ nodes, edges });
  }, [nodes, edges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((current) => addEdge(connection, current));
    },
    [setEdges],
  );

  const displayNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId,
      })),
    [nodes, selectedNodeId],
  );

  return (
    <div className="h-[calc(100dvh-14rem)] min-h-[28rem] w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      <ReactFlow
        nodes={displayNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_event, node) => onSelectNode(node.id)}
        onPaneClick={() => onSelectNode(null)}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
