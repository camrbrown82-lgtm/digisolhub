"use client";

import { useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

type Props = {
  initialNodes: Node[];
  initialEdges: Edge[];
  onChange: (graph: { nodes: Node[]; edges: Edge[] }) => void;
};

export function WorkflowCanvas({ initialNodes, initialEdges, onChange }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    onChange({ nodes, edges });
  }, [nodes, edges, onChange]);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((current) => addEdge(connection, current));
  }, [setEdges]);

  return (
    <div className="h-[calc(100dvh-12rem)] min-h-[28rem] w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
