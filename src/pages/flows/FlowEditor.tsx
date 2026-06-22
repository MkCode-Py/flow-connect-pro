import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactFlow, {
  Background, BackgroundVariant, Controls, MiniMap, ReactFlowProvider,
  addEdge, useEdgesState, useNodesState, useReactFlow,
  type Connection, type Edge, type Node, type OnConnect,
} from "reactflow";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Save, PlayCircle, Maximize2, Minimize2, Loader2, Map, MoreVertical, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { FlowNode } from "@/features/flows/FlowNode";
import { NODE_DEFS, NODE_KINDS, type NodeKind } from "@/features/flows/nodeDefs";
import { NodeInspector } from "@/features/flows/NodeInspector";
import { FlowSimulator } from "@/features/flows/FlowSimulator";
import { EMPTY_GRAPH, type FlowGraph } from "@/features/flows/types";
import { cn } from "@/lib/utils";

const NODE_TYPES = Object.fromEntries(NODE_KINDS.concat(["start"]).map((k) => [k, FlowNode]));

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
  const { user } = useAuth();
  const qc = useQueryClient();

  const flow = useQuery({
    queryKey: ["flow", id],
    enabled: !!id && !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("flows").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  const initialGraph = useMemo(() => {
    const g = (flow.data?.graph as unknown as FlowGraph | undefined) ?? EMPTY_GRAPH;
    return { nodes: g.nodes?.length ? g.nodes : EMPTY_GRAPH.nodes, edges: g.edges ?? [], viewport: g.viewport ?? EMPTY_GRAPH.viewport };
  }, [flow.data?.id]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges);
  const [name, setName] = useState(flow.data?.name ?? "");
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showSim, setShowSim] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const { project, fitView } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    if (flow.data) {
      setName(flow.data.name);
      const g = flow.data.graph as unknown as FlowGraph;
      setNodes(g?.nodes?.length ? g.nodes : EMPTY_GRAPH.nodes);
      setEdges(g?.edges ?? []);
    }
  }, [flow.data?.id]);

  const onConnect: OnConnect = useCallback(
    (c: Connection) => setEdges((es) => addEdge({ ...c, animated: false }, es)),
    [setEdges]
  );

  useEffect(() => {
    if (!flow.data) return;
    setDirty(true);
  }, [nodes, edges, name]);

  // autosave debounced
  useEffect(() => {
    if (!dirty || !flow.data) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => save(false), 1200);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, nodes, edges, name]);

  async function save(showToast = true) {
    if (!flow.data) return;
    setSaving(true);
    const graph: FlowGraph = { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } };
    const { error } = await supabase.from("flows").update({ name, graph: graph as never }).eq("id", flow.data.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    setDirty(false);
    setSavedAt(new Date());
    qc.invalidateQueries({ queryKey: ["flows"] });
    if (showToast) toast({ title: "Fluxo salvo" });
  }

  function addNode(kind: NodeKind) {
    const def = NODE_DEFS[kind];
    if (def.unique && nodes.some((n) => n.type === kind)) {
      toast({ title: "Bloco único", description: `Só pode existir um bloco ${def.label}.`, variant: "destructive" });
      return;
    }
    const rect = wrapperRef.current?.getBoundingClientRect();
    const center = rect ? project({ x: rect.width / 2 - 120, y: rect.height / 2 - 80 }) : { x: 200, y: 200 };
    const newNode: Node = {
      id: crypto.randomUUID(),
      type: kind,
      position: center,
      data: { ...def.defaultData },
    };
    setNodes((ns) => [...ns, newNode]);
    setSelectedNode(newNode);
  }

  function updateNodeData(nodeId: string, data: Record<string, unknown>) {
    setNodes((ns) => ns.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)));
    setSelectedNode((s) => (s && s.id === nodeId ? { ...s, data: { ...s.data, ...data } } : s));
  }

  function deleteNode(nodeId: string) {
    setNodes((ns) => ns.filter((n) => n.id !== nodeId));
    setEdges((es) => es.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  }

  function duplicateNode(node: Node) {
    const copy: Node = { ...node, id: crypto.randomUUID(), position: { x: node.position.x + 40, y: node.position.y + 40 } };
    setNodes((ns) => [...ns, copy]);
  }

  if (flow.isLoading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (!flow.data) return <div className="p-8 text-center text-muted-foreground">Fluxo não encontrado.</div>;

  return (
    <div className={cn("h-[calc(100vh-3rem)] flex flex-col", fullscreen && "fixed inset-0 z-50 bg-background")}>
      {/* Top bar */}
      <div className="h-12 px-3 border-b border-border surface-1 flex items-center gap-2 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => nav("/flows")}><ArrowLeft className="h-4 w-4" /></Button>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 max-w-xs border-transparent hover:border-border focus-visible:border-border bg-transparent" />
        <Badge variant="outline" className="text-[10px]">
          {saving ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> salvando</> : dirty ? "alterações não salvas" : savedAt ? `salvo ${savedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "salvo"}
        </Badge>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: "Link copiado" }); }}>
          <Link2 className="h-4 w-4 mr-1.5" /> Copiar link
        </Button>
        <Button variant={showSim ? "default" : "outline"} size="sm" onClick={() => setShowSim((s) => !s)}>
          <PlayCircle className="h-4 w-4 mr-1.5" /> Testar
        </Button>
        <Button size="sm" onClick={() => save()}><Save className="h-4 w-4 mr-1.5" /> Salvar</Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => fitView({ padding: 0.2 })}><Map className="h-4 w-4 mr-2" /> Ajustar visualização</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowMiniMap((m) => !m)}><Map className="h-4 w-4 mr-2" /> {showMiniMap ? "Ocultar" : "Mostrar"} minimapa</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFullscreen((f) => !f)}>{fullscreen ? <Minimize2 className="h-4 w-4 mr-2" /> : <Maximize2 className="h-4 w-4 mr-2" />} {fullscreen ? "Sair tela cheia" : "Tela cheia"}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Canvas + simulator */}
      <div className="flex-1 flex min-h-0">
        <div ref={wrapperRef} className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_e, n) => setSelectedNode(n)}
            onPaneClick={() => setSelectedNode(null)}
            nodeTypes={NODE_TYPES}
            fitView
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ animated: false, style: { strokeWidth: 2 } }}
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} color="hsl(var(--border-strong))" />
            <Controls position="bottom-right" showInteractive={false} />
            {showMiniMap && <MiniMap pannable zoomable nodeColor={(n) => `hsl(var(--node-${NODE_DEFS[n.type as NodeKind]?.tone ?? "content"}))`} maskColor="hsl(var(--background) / 0.6)" />}
          </ReactFlow>

          {/* FAB Add bloco */}
          <Popover>
            <PopoverTrigger asChild>
              <Button size="lg" className="absolute bottom-6 left-6 rounded-full shadow-glow h-12 px-5">
                <Plus className="h-5 w-5 mr-2" /> Adicionar bloco
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-72 p-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1.5">Tipos de bloco</div>
              <div className="grid grid-cols-1 gap-1">
                {NODE_KINDS.map((k) => {
                  const def = NODE_DEFS[k];
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => addNode(k)}
                      className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-surface-2 text-left transition-colors"
                    >
                      <div className={`h-7 w-7 rounded-md flex items-center justify-center bg-node-${def.tone}/20`}>
                        <def.icon className={`h-3.5 w-3.5 text-node-${def.tone}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{def.label}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{def.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {showSim && (
          <div className="w-[380px] border-l border-border shrink-0">
            <FlowSimulator nodes={nodes} edges={edges} />
          </div>
        )}
      </div>

      <NodeInspector
        open={!!selectedNode && !showSim}
        node={selectedNode}
        allEdges={edges}
        onChange={(data) => selectedNode && updateNodeData(selectedNode.id, data)}
        onDelete={() => selectedNode && deleteNode(selectedNode.id)}
        onDuplicate={() => selectedNode && duplicateNode(selectedNode)}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  );
}
