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
import { InspectorPanel } from "./components/InspectorPanel";
import { EmptyFlowError } from "./components/EmptyFlowError";
import {
  ensureStartNode, getDisconnectedIds, pickInsertPosition,
} from "./utils/graphUtils";
import { createNode } from "./utils/nodeFactory";
import { applyNodeData, syncDynamicHandles } from "./utils/updateNodeData";
import { removeEdgesForHandle } from "./utils/edgeCleanup";
import { mergeNodeData } from "./utils/nodeDataDefaults";
import { setBaseNodeContext } from "./nodes";
import { FlowSimulatorPanel } from "./components/simulator/FlowSimulatorPanel";
import type { AnyNodeData, FlowGraph, NodeKind } from "./types";

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

  const disconnected = useMemo(() => getDisconnectedIds(nodes, edges), [nodes, edges]);
  useEffect(() => { setBaseNodeContext({ disconnectedIds: disconnected }); }, [disconnected]);

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

  const lastSig = useRef<string>("");
  useEffect(() => {
    if (!loadedRef.current) return;
    const sig = JSON.stringify({ n: nodes, e: edges, v: viewport, name });
    if (sig === lastSig.current) return;
    if (lastSig.current === "") { lastSig.current = sig; return; }
    lastSig.current = sig;
    autosave.markDirty();
  }, [nodes, edges, viewport, name]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    const single = params.nodes.length === 1 ? params.nodes[0] : null;
    setSelectedNode(single);
  }, []);

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

  /** Commit do Inspector: aplica data validada, sincroniza handles dinâmicos
   * e remove edges órfãs caso a opção/saída tenha sido removida. */
  const handleCommitNodeData = useCallback((nodeId: string, data: AnyNodeData) => {
    const target = nodes.find((n) => n.id === nodeId);
    if (!target) return;
    const kind = target.type as NodeKind;
    const synced = syncDynamicHandles(kind, data);

    setNodes((ns) => applyNodeData(ns, nodeId, synced));

    // Limpa edges cujo sourceHandle não existe mais após edição (menu/random)
    if (kind === "menu" || kind === "random") {
      const validHandles = new Set<string>();
      if (kind === "menu") {
        (synced as { options?: { id: string }[] }).options?.forEach((o) => validHandles.add(`opt-${o.id}`));
      } else {
        (synced as { outputs?: { id: string }[] }).outputs?.forEach((o) => validHandles.add(`opt-${o.id}`));
      }
      setEdges((es) =>
        es.filter((e) => e.source !== nodeId || !e.sourceHandle || validHandles.has(e.sourceHandle)),
      );
    }
  }, [nodes, setNodes, setEdges]);

  const handleRemoveEdgesForHandle = useCallback((nodeId: string, handleId: string) => {
    let removedCount = 0;
    setEdges((es) => {
      const { edges: kept, removed } = removeEdgesForHandle(es, nodeId, handleId);
      removedCount = removed.length;
      return kept;
    });
    return removedCount;
  }, [setEdges]);

  const handleChangeLabel = useCallback((nodeId: string, label: string) => {
    setNodes((ns) => ns.map((n) =>
      n.id === nodeId ? { ...n, data: { ...n.data, label } } : n,
    ));
  }, [setNodes]);
  void handleChangeLabel;

  const handleDuplicateNode = useCallback((nodeId: string) => {
    const src = nodes.find((n) => n.id === nodeId);
    if (!src) return;
    const kind = src.type as NodeKind;
    if (kind === "start") return;
    const copy = createNode(kind, { x: src.position.x + 40, y: src.position.y + 40 });
    // Preserva dados editados + migra para shape atual
    copy.data = mergeNodeData(kind, structuredClone(src.data ?? {})) as never;
    // Para menu/random, regenera ids de opções para evitar conflito de handles
    const synced = syncDynamicHandles(kind, copy.data as AnyNodeData);
    if (kind === "menu") {
      (synced as { options?: { id: string }[] }).options?.forEach((o) => { o.id = `opt_${Math.random().toString(36).slice(2, 10)}`; });
    } else if (kind === "random") {
      (synced as { outputs?: { id: string }[] }).outputs?.forEach((o) => { o.id = `out_${Math.random().toString(36).slice(2, 10)}`; });
    }
    copy.data = synced as never;
    setNodes((ns) => [...ns, copy]);
    setSelectedNode(copy);
    toast.success("Bloco duplicado");
  }, [nodes, setNodes]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    if (nodeId === "start") { toast.error("Bloco inicial não pode ser excluído"); return; }
    setNodes((ns) => ns.filter((n) => n.id !== nodeId));
    setEdges((es) => es.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
    toast.success("Bloco excluído");
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
        <InspectorPanel
          node={selectedNode}
          edges={edges}
          disconnectedIds={disconnected}
          onClose={() => setSelectedNode(null)}
          onCommit={handleCommitNodeData}
          onDuplicate={handleDuplicateNode}
          onDelete={handleDeleteNode}
          onRemoveEdgesForHandle={handleRemoveEdgesForHandle}
        />
      </div>
    </div>
  );
}
