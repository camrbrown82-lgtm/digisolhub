"use client";

import { useCallback, useEffect, useMemo } from "react";
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

export function WorkflowCanvas({
  initialNodes,
  initialEdges,
  selectedNodeId,
  onChange,
  onSelectNode,
}: Props) {
  const seeded = useMemo(() => withStepType(initialNodes), [initialNodes]);
  const [nodes, setNodes, onNodesChange] = useNodesState(seeded);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes((current) => {
      const incoming = withStepType(initialNodes);
      if (
        current.length !== incoming.length ||
        current.some((node) => !incoming.find((row) => row.id === node.id))
      ) {
        return incoming;
      }
      return current.map((node) => {
        const fresh = incoming.find((row) => row.id === node.id);
        if (!fresh) return node;
        return {
          ...node,
          data: fresh.data,
          type: "workflowStep",
        };
      });
    });
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  useEffect(() => {
    onChange({ nodes, edges });
  }, [nodes, edges, onChange]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((current) => addEdge(connection, current));
    },
    [setEdges],
  );

  return (
    <div className="h-[calc(100dvh-14rem)] min-h-[28rem] w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      <ReactFlow
        nodes={nodes.map((node) => ({
          ...node,
          selected: node.id === selectedNodeId,
        }))}
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
