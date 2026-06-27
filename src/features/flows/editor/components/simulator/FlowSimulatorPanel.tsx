/**
 * Painel do simulador de fluxos. Renderiza chat, logs, contato e variáveis,
 * orquestra a engine pura (FlowEngine) e devolve highlights de execução
 * (nó atual + nós visitados + edges percorridas) para o canvas.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, MessageSquare, Terminal, UserRound, Braces } from "lucide-react";
import type { Edge, Node } from "reactflow";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  FlowEngine, defaultSimulationContact,
  type AutomationLog, type BotOutput, type EngineStatus,
  type SimulationContact, type FlowGraph,
} from "@/features/flows/engine";
import { SimulatorChat, type ChatMessage } from "./SimulatorChat";
import { SimulatorLogs } from "./SimulatorLogs";
import { SimulatorContactPanel } from "./SimulatorContactPanel";
import { SimulatorVariablesPanel } from "./SimulatorVariablesPanel";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export type FlowSimulatorPanelHandle = {
  /** Permite ao canvas inferir destaque sem props extras. */
  highlight: { current: string | null; visited: Set<string>; edges: Set<string> };
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Graph atual em memória (pode ter alterações não salvas). */
  nodes: Node[];
  edges: Edge[];
  hasUnsavedChanges: boolean;
  /** Callbacks para o editor atualizar o highlight dos nós no canvas. */
  onHighlightChange: (h: { current: string | null; visited: Set<string>; edges: Set<string> }) => void;
};

let uid = 0;
const mkId = () => `msg_${Date.now().toString(36)}_${(++uid).toString(36)}`;

export function FlowSimulatorPanel({ open, onClose, nodes, edges, hasUnsavedChanges, onHighlightChange }: Props) {
  const [contact, setContact] = useState<SimulationContact>(() => defaultSimulationContact());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<EngineStatus>("idle");
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [tab, setTab] = useState<"chat" | "logs" | "contact" | "variables">("chat");

  const engineRef = useRef<FlowEngine | null>(null);
  const startedRef = useRef(false);
  const playbackQueueRef = useRef<Promise<void>>(Promise.resolve());

  // Tags do owner para resolver condições/ações por id → nome.
  const tagsQuery = useQuery({
    queryKey: ["tags", "lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tags").select("id,name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: open,
  });
  const tagsById = useMemo(() => {
    const m: Record<string, string> = {};
    (tagsQuery.data ?? []).forEach((t) => { m[t.id] = t.name; });
    return m;
  }, [tagsQuery.data]);

  // Resolve flow remoto para Conexão de Fluxo (carregamento sob demanda).
  const resolveFlow = useCallback(async (flowId: string) => {
    const { data, error } = await supabase
      .from("flows").select("id,name,graph").eq("id", flowId).maybeSingle();
    if (error || !data) return null;
    return { name: data.name, graph: (data.graph as unknown) as FlowGraph };
  }, []);

  /** Cria/recria a engine. */
  const newEngine = useCallback((c?: SimulationContact) => {
    const e = new FlowEngine({ nodes, edges }, c ?? contact, { resolveFlow });
    e.setTagNames(tagsById);
    return e;
  }, [nodes, edges, contact, resolveFlow, tagsById]);

  /** Atualiza highlight no canvas a partir do snapshot. */
  const pushHighlight = useCallback(() => {
    const snap = engineRef.current?.getSnapshot();
    onHighlightChange({
      current: snap?.currentNodeId ?? null,
      visited: new Set(snap?.visitedNodeIds ?? []),
      edges: new Set(snap?.executedEdgeIds ?? []),
    });
  }, [onHighlightChange]);

  /** Reproduz uma tick com animação (typing + delays) e atualiza estado UI. */
  const playTick = useCallback(async (tick: { outputs: BotOutput[]; logs: AutomationLog[]; status: EngineStatus; variables: Record<string, string>; contact: SimulationContact }) => {
    // Logs e variáveis aparecem imediatamente.
    if (tick.logs.length) setLogs((prev) => [...prev, ...tick.logs]);
    setVariables(tick.variables);
    setContact(tick.contact);

    for (const out of tick.outputs) {
      const typingMs = out.kind === "text" || out.kind === "media_mock" ? out.typingMs : 0;
      const nextDelayMs = out.kind === "text" || out.kind === "media_mock" ? out.nextDelayMs : 0;
      if (typingMs > 0) {
        setTyping(true);
        await wait(Math.min(typingMs, 3000));
        setTyping(false);
      }
      setMessages((prev) => [...prev, { kind: "bot", output: out }]);
      if (nextDelayMs > 0) await wait(Math.min(nextDelayMs, 3000));
    }
    setStatus(tick.status);
    pushHighlight();
  }, [pushHighlight]);

  /** Sequencializa playbacks para evitar entrelaçamento. */
  const enqueuePlayback = useCallback((tickPromise: Promise<Awaited<ReturnType<FlowEngine["start"]>>>) => {
    playbackQueueRef.current = playbackQueueRef.current.then(async () => {
      const tick = await tickPromise;
      await playTick(tick);
    }).catch((err) => {
      console.error("[simulator] playback error", err);
    });
    return playbackQueueRef.current;
  }, [playTick]);

  const handleStart = useCallback(() => {
    if (!engineRef.current) return;
    enqueuePlayback(engineRef.current.start());
  }, [enqueuePlayback]);

  const handleRestart = useCallback(() => {
    setMessages([]); setLogs([]); setVariables({}); setTyping(false); setInput("");
    setStatus("idle");
    engineRef.current = newEngine(contact);
    startedRef.current = true;
    handleStart();
  }, [newEngine, contact, handleStart]);

  const handleClear = useCallback(() => {
    setMessages([]); setLogs([]); setTyping(false);
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || !engineRef.current) return;
    setMessages((prev) => [...prev, { kind: "user", id: mkId(), text, timestamp: Date.now() }]);
    setInput("");
    enqueuePlayback(engineRef.current.sendUserMessage(text));
  }, [input, enqueuePlayback]);

  const handleSelectMenuOption = useCallback((optionTitle: string) => {
    if (!engineRef.current) return;
    setMessages((prev) => [...prev, { kind: "user", id: mkId(), text: optionTitle, timestamp: Date.now() }]);
    enqueuePlayback(engineRef.current.sendUserMessage(optionTitle));
  }, [enqueuePlayback]);

  // Último menu emitido pelo bot (para destacar como ativo).
  const activeMenuOutputId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.kind === "bot" && m.output.kind === "menu") return m.output.id;
    }
    return null;
  }, [messages]);

  const handleTimeout = useCallback(() => {
    if (!engineRef.current) return;
    enqueuePlayback(engineRef.current.simulateTimeout());
  }, [enqueuePlayback]);

  // Quando o contato muda, propaga para a engine viva (se houver pausa, próximas avaliações usam o novo).
  useEffect(() => {
    if (engineRef.current) engineRef.current.setContact(contact);
  }, [contact]);

  useEffect(() => {
    if (engineRef.current) engineRef.current.setTagNames(tagsById);
  }, [tagsById]);

  // Quando o painel abre pela primeira vez, prepara engine e dispara start.
  useEffect(() => {
    if (!open) return;
    if (!startedRef.current) {
      engineRef.current = newEngine();
      startedRef.current = true;
      handleStart();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Quando o painel fecha, limpa highlight.
  useEffect(() => {
    if (!open) {
      onHighlightChange({ current: null, visited: new Set(), edges: new Set() });
    }
  }, [open, onHighlightChange]);

  if (!open) return null;

  const canTimeout = status === "waiting_menu_reply" || status === "waiting_question_reply";

  return (
    <aside className={cn(
      "w-full lg:w-[420px] shrink-0 border-l border-border bg-background flex flex-col",
      "absolute lg:relative inset-0 lg:inset-auto z-30",
    )}>
      <header className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-none">Simulador</h3>
          <p className="text-[11px] text-muted-foreground mt-1">
            {hasUnsavedChanges
              ? "Testando alterações não salvas (versão na tela)."
              : "Testando a versão atual do fluxo."}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid grid-cols-4 mx-3 mt-2">
          <TabsTrigger value="chat" className="text-xs gap-1"><MessageSquare className="h-3 w-3" />Chat</TabsTrigger>
          <TabsTrigger value="logs" className="text-xs gap-1"><Terminal className="h-3 w-3" />Logs</TabsTrigger>
          <TabsTrigger value="contact" className="text-xs gap-1"><UserRound className="h-3 w-3" />Contato</TabsTrigger>
          <TabsTrigger value="variables" className="text-xs gap-1"><Braces className="h-3 w-3" />Vars</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 mt-2 min-h-0">
          <SimulatorChat
            messages={messages} status={status} typing={typing}
            input={input} onInputChange={setInput} onSend={handleSend}
            onRestart={handleRestart} onClear={handleClear}
            onSimulateTimeout={handleTimeout} canSimulateTimeout={canTimeout}
            onSelectMenuOption={handleSelectMenuOption}
            activeMenuOutputId={activeMenuOutputId}
          />
        </TabsContent>
        <TabsContent value="logs" className="flex-1 mt-2 min-h-0">
          <SimulatorLogs logs={logs} />
        </TabsContent>
        <TabsContent value="contact" className="flex-1 mt-2 min-h-0">
          <SimulatorContactPanel contact={contact} onChange={setContact} />
        </TabsContent>
        <TabsContent value="variables" className="flex-1 mt-2 min-h-0">
          <SimulatorVariablesPanel contact={contact} variables={variables} />
        </TabsContent>
      </Tabs>
    </aside>
  );
}

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
