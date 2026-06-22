import { useEffect, useRef, useState } from "react";
import { Send, RotateCcw, Loader2, Bot, User as UserIcon, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FlowEngine, type EngineEvent, type SimContact } from "./engine/engine";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import type { Node, Edge } from "reactflow";

type ChatItem =
  | { role: "bot"; text: string }
  | { role: "user"; text: string }
  | { role: "system"; text: string; tone?: "info" | "warn" | "ok" };

const DEFAULT_CONTACT: SimContact = {
  first_name: "Maria", name: "Maria Silva", phone: "11999999999",
  tags: ["Cliente"], custom: {},
};

export function FlowSimulator({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) {
  const [contact, setContact] = useState<SimContact>(DEFAULT_CONTACT);
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const engineRef = useRef<FlowEngine | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9 }); }, [chat]);

  async function start() {
    setBusy(true);
    setChat([{ role: "system", text: "Simulação iniciada", tone: "info" }]);
    const engine = new FlowEngine({ nodes, edges }, contact);
    engine.onFollowFlow = async (id: string) => {
      const { data } = await supabase.from("flows").select("graph").eq("id", id).single();
      const g = data?.graph as { nodes: Node[]; edges: Edge[] } | undefined;
      return g ? { nodes: g.nodes, edges: g.edges } : null;
    };
    engineRef.current = engine;
    await engine.run();
    pumpEvents();
    setBusy(false);
  }

  function pumpEvents() {
    const engine = engineRef.current;
    if (!engine) return;
    const items: ChatItem[] = [];
    engine.events.forEach((e) => items.push(...renderEvent(e)));
    engine.events = [];
    if (engine.state.status === "finished") items.push({ role: "system", text: engine.state.reason, tone: "ok" });
    if (engine.state.status === "error") items.push({ role: "system", text: engine.state.message, tone: "warn" });
    setChat((c) => [...c, ...items]);
  }

  async function send() {
    const text = input.trim();
    if (!text || !engineRef.current) return;
    setInput("");
    setChat((c) => [...c, { role: "user", text }]);
    setBusy(true);
    const engine = engineRef.current;
    if (engine.state.status === "awaiting_menu") await engine.resumeWithMenuChoice(text);
    else if (engine.state.status === "awaiting_question") await engine.resumeWithAnswer(text);
    pumpEvents();
    setBusy(false);
  }

  function reset() {
    engineRef.current = null;
    setChat([]);
    setInput("");
  }

  const awaitingInput = engineRef.current?.state.status === "awaiting_menu" || engineRef.current?.state.status === "awaiting_question";

  return (
    <div className="flex flex-col h-full bg-surface-1">
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-gradient-brand flex items-center justify-center"><Bot className="h-3.5 w-3.5 text-background" /></div>
          <div>
            <div className="text-sm font-medium">Simulador</div>
            <div className="text-[10px] text-muted-foreground">Teste o fluxo como se fosse um contato real</div>
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => setContactOpen((o) => !o)}>Contato</Button>
          <Button size="sm" variant="ghost" onClick={reset}><RotateCcw className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      {contactOpen && (
        <div className="p-3 border-b border-border space-y-2 surface-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-[10px]">Primeiro nome</Label><Input value={contact.first_name} onChange={(e) => setContact({ ...contact, first_name: e.target.value })} className="h-8 text-xs" /></div>
            <div><Label className="text-[10px]">Telefone</Label><Input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className="h-8 text-xs" /></div>
          </div>
          <div><Label className="text-[10px]">Etiquetas (separadas por vírgula)</Label><Input value={contact.tags.join(", ")} onChange={(e) => setContact({ ...contact, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} className="h-8 text-xs" /></div>
        </div>
      )}

      <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef as never}>
        {chat.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-sm text-muted-foreground p-8">
            <div>
              <Bot className="h-8 w-8 mx-auto mb-2 opacity-60" />
              Clique em <span className="text-foreground font-medium">Testar fluxo</span> para começar.
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {chat.map((c, i) => <ChatRow key={i} item={c} />)}
            {busy && <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> processando...</div>}
          </div>
        )}
      </ScrollArea>

      <div className="border-t border-border p-3 flex gap-2">
        {!engineRef.current ? (
          <Button onClick={start} className="flex-1" disabled={busy}>
            <Bot className="h-4 w-4 mr-2" /> Testar fluxo
          </Button>
        ) : (
          <>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={awaitingInput ? "Digite a resposta do contato..." : "Aguardando bot..."}
              disabled={!awaitingInput || busy}
              className="flex-1"
            />
            <Button onClick={send} disabled={!awaitingInput || busy || !input.trim()}><Send className="h-4 w-4" /></Button>
          </>
        )}
      </div>
    </div>
  );
}

function ChatRow({ item }: { item: ChatItem }) {
  if (item.role === "system") {
    const Icon = item.tone === "warn" ? AlertCircle : item.tone === "ok" ? Check : Bot;
    const color = item.tone === "warn" ? "text-destructive" : item.tone === "ok" ? "text-success" : "text-muted-foreground";
    return (
      <div className={`flex items-center gap-2 text-[11px] ${color} justify-center py-1`}>
        <Icon className="h-3 w-3" /> {item.text}
      </div>
    );
  }
  const isUser = item.role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && <div className="h-6 w-6 rounded-full bg-surface-3 flex items-center justify-center shrink-0"><Bot className="h-3 w-3" /></div>}
      <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${isUser ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-surface-3 text-foreground rounded-bl-sm"}`}>
        {item.text}
      </div>
      {isUser && <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0"><UserIcon className="h-3 w-3 text-primary" /></div>}
    </div>
  );
}

function renderEvent(e: EngineEvent): ChatItem[] {
  switch (e.type) {
    case "send": return [{ role: "bot", text: e.text }];
    case "menu": return [{ role: "bot", text: `${e.question}\n\n${e.options.map((o, i) => `${i + 1}. ${o.label}`).join("\n")}` }];
    case "question": return [{ role: "bot", text: e.question }];
    case "action": return [{ role: "system", text: `Ação: ${e.action}${e.value ? ` (${e.value})` : ""}`, tone: "info" }];
    case "condition": return [{ role: "system", text: `Condição → ${e.branch === "true" ? "verdadeira" : "nenhuma"}`, tone: "info" }];
    case "flowlink": return [{ role: "system", text: `→ Indo para fluxo ${e.targetFlowName || e.targetFlowId}`, tone: "info" }];
    case "random": return [{ role: "system", text: `Randomizador escolheu ${e.branchId}`, tone: "info" }];
    case "webhook": return [{ role: "system", text: `Webhook ${e.method} ${e.url}`, tone: "info" }];
    case "human": return [{ role: "system", text: "Transferido para atendimento humano", tone: "warn" }];
    case "paused": return [{ role: "system", text: "Automação pausada", tone: "warn" }];
    case "end": return [{ role: "system", text: e.resolved ? "Fluxo encerrado e marcado como resolvido" : "Fluxo encerrado", tone: "ok" }];
    case "start": return [{ role: "system", text: "Início do fluxo", tone: "info" }];
    case "log": return [{ role: "system", text: e.message, tone: "info" }];
  }
}
