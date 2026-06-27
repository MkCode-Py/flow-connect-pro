import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ReactFlowProvider, useReactFlow,
  useNodesState, useEdgesState,
  type Edge, type Node, type OnSelectionChangeParams, type Viewport,
} from "reactflow";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFlowGraph } from "./hooks/useFlowGraph";
import { useGraphAutosave } from "./hooks/useGraphAutosave";
import { EditorTopBar } from "./components/EditorTopBar";
import { FlowCanvas } from "./components/FlowCanvas";
import { MiniInspector } from "./components/MiniInspector";
import { EmptyFlowError } from "./components/EmptyFlowError";
import {
  ensureStartNode, getDisconnectedIds, pickInsertPosition,
} from "./utils/graphUtils";
import { createNode } from "./utils/nodeFactory";
import { setBaseNodeContext } from "./nodes";
import type { FlowGraph, NodeKind } from "./types";

export default function FlowEditorPage() {
  return (
    <ReactFlowProvider>
      <FlowEditorInner />
    </ReactFlowProvider>
  );
}

function FlowEditorInner() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { project, fitView, setViewport } = useReactFlow();

  const query = useFlowGraph(id);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [viewport, setLocalViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [name, setName] = useState("");
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [miniMapVisible, setMiniMapVisible] = useState(true);
  const loadedRef = useRef(false);

  // Carrega graph quando a query resolve (uma vez por id)
  useEffect(() => {
    if (!query.data) return;
    const g = query.data.graph as FlowGraph;
    setNodes(ensureStartNode(g.nodes));
    setEdges(g.edges);
    setLocalViewport(g.viewport);
    setName(query.data.name);
    setViewport(g.viewport);
    loadedRef.current = true;
  }, [query.data?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calcula desconectados e expõe para BaseNode (sem prop drilling no ReactFlow)
  const disconnected = useMemo(() => getDisconnectedIds(nodes, edges), [nodes, edges]);
  useEffect(() => { setBaseNodeContext({ disconnectedIds: disconnected }); }, [disconnected]);

  // Refs sempre atualizados para o autosave ler valor mais recente sem refazer callbacks
  const graphRef = useRef<FlowGraph>({ nodes: [], edges: [], viewport });
  graphRef.current = { nodes, edges, viewport };
  const nameRef = useRef<string>(name);
  nameRef.current = name;

  const autosave = useGraphAutosave({
    flowId: id,
    getGraph: () => graphRef.current,
    getName: () => nameRef.current,
    enabled: loadedRef.current && !!query.data,
  });

  // Marca dirty quando nodes/edges/viewport/nome mudam (após o load inicial)
  const lastSig = useRef<string>("");
  useEffect(() => {
    if (!loadedRef.current) return;
    const sig = JSON.stringify({ n: nodes, e: edges, v: viewport, name });
    if (sig === lastSig.current) return;
    if (lastSig.current === "") { lastSig.current = sig; return; } // baseline
    lastSig.current = sig;
    autosave.markDirty();
  }, [nodes, edges, viewport, name]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sincroniza seleção
  const handleSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    const single = params.nodes.length === 1 ? params.nodes[0] : null;
    setSelectedNode(single);
  }, []);

  // Mantém selectedNode em sincronia com nodes (renomeações etc.)
  useEffect(() => {
    if (!selectedNode) return;
    const fresh = nodes.find((n) => n.id === selectedNode.id) ?? null;
    if (fresh !== selectedNode) setSelectedNode(fresh);
  }, [nodes]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddNode = useCallback((kind: NodeKind, screenCenter: { x: number; y: number }) => {
    const pos = pickInsertPosition(nodes, project(screenCenter));
    const node = createNode(kind, pos);
    setNodes((ns) => [...ns, node]);
    setSelectedNode(node);
  }, [nodes, project, setNodes]);

  const handleConnectEdge = useCallback((edge: Edge) => {
    setEdges((es) => [...es, edge]);
  }, [setEdges]);

  const handleViewportChange = useCallback((v: Viewport) => {
    setLocalViewport((prev) =>
      prev.x === v.x && prev.y === v.y && prev.zoom === v.zoom ? prev : v,
    );
  }, []);

  const handleChangeLabel = useCallback((nodeId: string, label: string) => {
    setNodes((ns) => ns.map((n) =>
      n.id === nodeId ? { ...n, data: { ...n.data, label } } : n,
    ));
  }, [setNodes]);

  const handleDuplicateNode = useCallback((nodeId: string) => {
    const src = nodes.find((n) => n.id === nodeId);
    if (!src) return;
    const kind = src.type as NodeKind;
    if (kind === "start") return;
    const copy = createNode(kind, { x: src.position.x + 40, y: src.position.y + 40 });
    copy.data = structuredClone(src.data ?? copy.data);
    setNodes((ns) => [...ns, copy]);
    setSelectedNode(copy);
  }, [nodes, setNodes]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    if (nodeId === "start") { toast.error("Bloco inicial não pode ser excluído"); return; }
    setNodes((ns) => ns.filter((n) => n.id !== nodeId));
    setEdges((es) => es.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  const handleDuplicateFlow = useCallback(async () => {
    if (!query.data) return;
    const { data, error } = await supabase
      .from("flows")
      .insert({
        owner_id: query.data.owner_id,
        name: `Cópia de ${query.data.name}`,
        folder_id: query.data.folder_id,
        kind: "custom",
        graph: { nodes, edges, viewport } as unknown as never,
        is_active: false,
      })
      .select()
      .single();
    if (error) { toast.error("Erro ao duplicar", { description: error.message }); return; }
    qc.invalidateQueries({ queryKey: ["flows"] });
    toast.success("Fluxo duplicado");
    nav(`/flows/${(data as { id: string }).id}`);
  }, [query.data, nodes, edges, viewport, qc, nav]);

  const handleDeleteFlow = useCallback(async () => {
    if (!query.data) return;
    if (!confirm("Excluir este fluxo? Esta ação não pode ser desfeita.")) return;
    const { error } = await supabase.from("flows").delete().eq("id", query.data.id);
    if (error) { toast.error("Erro ao excluir", { description: error.message }); return; }
    qc.invalidateQueries({ queryKey: ["flows"] });
    toast.success("Fluxo excluído");
    nav("/flows");
  }, [query.data, qc, nav]);

  if (query.isLoading) {
    return (
      <div className="h-[calc(100vh-3rem)] flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return <EmptyFlowError message={query.error instanceof Error ? query.error.message : undefined} />;
  }

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col">
      <EditorTopBar
        name={name}
        onNameChange={setName}
        status={autosave.status}
        lastSavedAt={autosave.lastSavedAt}
        onSave={() => autosave.save()}
        onTest={() =>
          toast.info("Simulador disponível na próxima etapa", {
            description: "O motor de execução e simulador serão entregues na Etapa 5.",
          })
        }
        onDuplicate={handleDuplicateFlow}
        onDelete={handleDeleteFlow}
        onFitView={() => fitView({ padding: 0.3, duration: 240 })}
        onToggleMiniMap={() => setMiniMapVisible((m) => !m)}
        miniMapVisible={miniMapVisible}
      />

      <div className="flex-1 flex min-h-0 relative">
        <FlowCanvas
          nodes={nodes}
          edges={edges}
          miniMapVisible={miniMapVisible}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onSelectionChange={handleSelectionChange}
          onConnectEdge={handleConnectEdge}
          onAddNode={handleAddNode}
          onViewportChange={handleViewportChange}
          defaultViewport={query.data.graph.viewport}
        />
        <MiniInspector
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onChangeLabel={handleChangeLabel}
          onDuplicate={handleDuplicateNode}
          onDelete={handleDeleteNode}
        />
      </div>
    </div>
  );
}
