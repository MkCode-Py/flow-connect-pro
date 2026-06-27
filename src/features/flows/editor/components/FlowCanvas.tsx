import { useCallback, useMemo, useRef } from "react";
import ReactFlow, {
  Background, BackgroundVariant, Controls, MiniMap,
  type Connection, type Edge, type EdgeChange, type Node,
  type NodeChange, type OnConnect, type OnEdgesChange, type OnNodesChange,
  type OnSelectionChangeParams, type Viewport, addEdge,
} from "reactflow";
import { nodeTypes } from "../nodes";
import { defaultEdgeOptions, edgeTypes } from "../edges";
import { NODE_META } from "../utils/nodeMeta";
import { isValidConnection } from "../utils/graphUtils";
import type { NodeKind } from "../types";
import { NodePalette } from "./NodePalette";
import { toast } from "sonner";

type Props = {
  nodes: Node[];
  edges: Edge[];
  miniMapVisible: boolean;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onSelectionChange: (params: OnSelectionChangeParams) => void;
  onConnectEdge: (edge: Edge) => void;
  onAddNode: (kind: NodeKind, screenCenter: { x: number; y: number }) => void;
  onViewportChange: (v: Viewport) => void;
  defaultViewport: Viewport;
};

export function FlowCanvas({
  nodes, edges, miniMapVisible, onNodesChange, onEdgesChange,
  onSelectionChange, onConnectEdge, onAddNode, onViewportChange, defaultViewport,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleConnect: OnConnect = useCallback(
    (c: Connection) => {
      if (!isValidConnection(c, nodes)) {
        toast.error("Conexão inválida", {
          description: "Esses blocos não podem ser conectados dessa forma.",
        });
        return;
      }
      // duplicação
      const exists = edges.some(
        (e) =>
          e.source === c.source &&
          e.target === c.target &&
          (e.sourceHandle ?? null) === (c.sourceHandle ?? null),
      );
      if (exists) return;
      const next = addEdge({ ...c }, edges);
      const added = next[next.length - 1];
      onConnectEdge(added);
    },
    [edges, nodes, onConnectEdge],
  );

  // bloqueia delete do nó start no source change
  const guardedOnNodesChange: OnNodesChange = useCallback((changes) => {
    const filtered: NodeChange[] = [];
    let blocked = false;
    for (const ch of changes) {
      if (ch.type === "remove" && ch.id === "start") { blocked = true; continue; }
      filtered.push(ch);
    }
    if (blocked) {
      toast.error("Bloco inicial não pode ser excluído");
    }
    onNodesChange(filtered);
  }, [onNodesChange]);

  // bloqueia delete de edges nada — passa direto
  const guardedOnEdgesChange: OnEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);
  }, [onEdgesChange]);

  const handleAddFromPalette = useCallback((kind: NodeKind) => {
    const meta = NODE_META[kind];
    if (meta.unique) {
      toast.error("Esse bloco só pode existir uma vez no fluxo");
      return;
    }
    const rect = wrapperRef.current?.getBoundingClientRect();
    const center = rect
      ? { x: rect.width / 2 - 120, y: rect.height / 2 - 60 }
      : { x: 320, y: 200 };
    onAddNode(kind, center);
  }, [onAddNode]);

  const minimapColor = useMemo(
    () => (n: Node) => `hsl(var(--node-${NODE_META[n.type as NodeKind]?.tone ?? "content"}))`,
    [],
  );

  return (
    <div ref={wrapperRef} className="flex-1 relative bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        defaultViewport={defaultViewport}
        onNodesChange={guardedOnNodesChange}
        onEdgesChange={guardedOnEdgesChange}
        onConnect={handleConnect}
        onSelectionChange={onSelectionChange}
        onMoveEnd={(_e, v) => onViewportChange(v)}
        isValidConnection={(c) => isValidConnection(c as Connection, nodes)}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={["Backspace", "Delete"]}
        minZoom={0.2}
        maxZoom={2}
        snapToGrid
        snapGrid={[12, 12]}
        fitViewOptions={{ padding: 0.3 }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.4}
          color="hsl(var(--border-strong))"
        />
        <Controls position="bottom-right" showInteractive={false} />
        {miniMapVisible && (
          <MiniMap
            pannable
            zoomable
            nodeColor={minimapColor}
            maskColor="hsl(var(--background) / 0.6)"
            position="top-right"
          />
        )}
      </ReactFlow>

      <NodePalette onAdd={handleAddFromPalette} />
    </div>
  );
}
