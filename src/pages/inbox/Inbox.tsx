import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Send, Pause, Play, CheckCircle2, MessageSquare, Tag, User as UserIcon, Bot } from "lucide-react";
import { PageContainer } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

/** Inbox mockada — usa conversas/mensagens do banco se existirem, senão usa exemplos locais. */
type LocalConv = {
  id: string; name: string; phone: string; tags: string[];
  paused: boolean; status: "open" | "pending" | "resolved";
  messages: Array<{ id: string; from: "contact" | "bot" | "human"; body: string; at: string }>;
};

const MOCK: LocalConv[] = [
  {
    id: "c1", name: "Maria Silva", phone: "11987651234", tags: ["Cliente"], paused: false, status: "open",
    messages: [
      { id: "m1", from: "contact", body: "Oi, vocês têm o produto X em estoque?", at: "09:14" },
      { id: "m2", from: "bot", body: "Olá Maria! Sim, temos. Quer ver os preços?", at: "09:14" },
      { id: "m3", from: "contact", body: "Sim, por favor.", at: "09:15" },
    ],
  },
  {
    id: "c2", name: "João Pereira", phone: "11991234567", tags: ["Lead"], paused: true, status: "pending",
    messages: [
      { id: "m1", from: "contact", body: "Boa tarde, gostaria de uma proposta.", at: "13:02" },
      { id: "m2", from: "human", body: "Já estou te chamando, João.", at: "13:05" },
    ],
  },
  {
    id: "c3", name: "Carla Souza", phone: "21988887777", tags: ["Cliente", "VIP"], paused: false, status: "resolved",
    messages: [
      { id: "m1", from: "contact", body: "Obrigada pelo atendimento!", at: "Ontem" },
      { id: "m2", from: "human", body: "Por nada Carla, qualquer coisa estou aqui.", at: "Ontem" },
    ],
  },
];

export default function Inbox() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"open" | "pending" | "resolved">("open");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<LocalConv>(MOCK[0]);
  const [draft, setDraft] = useState("");

  // verificação leve para mostrar dados reais quando existirem
  const real = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("conversations").select("*").eq("owner_id", user!.id)).data ?? [],
  });

  const list = MOCK.filter((c) => c.status === filter && (!query || c.name.toLowerCase().includes(query.toLowerCase())));

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      {/* Lista */}
      <div className="w-[340px] border-r border-border surface-1 flex flex-col">
        <div className="p-3 border-b border-border space-y-2">
          <h2 className="font-display text-lg font-semibold">Inbox</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar conversa..." className="pl-8 h-9" />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList className="w-full">
              <TabsTrigger value="open" className="flex-1">Abertas</TabsTrigger>
              <TabsTrigger value="pending" className="flex-1">Pendentes</TabsTrigger>
              <TabsTrigger value="resolved" className="flex-1">Resolvidas</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <ScrollArea className="flex-1">
          {list.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma conversa.</div>}
          {list.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActive(c)}
              className={cn("w-full text-left px-3 py-3 border-b border-border hover:bg-surface-2 transition-colors", active.id === c.id && "bg-surface-2")}
            >
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-gradient-brand flex items-center justify-center text-background font-medium text-sm">{c.name.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm truncate">{c.name}</div>
                    <div className="text-[10px] text-muted-foreground">{c.messages[c.messages.length - 1]?.at}</div>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{c.messages[c.messages.length - 1]?.body}</div>
                </div>
              </div>
              <div className="flex gap-1 mt-1.5">
                {c.tags.map((t) => <Badge key={t} variant="outline" className="text-[10px] bg-accent/5">{t}</Badge>)}
                {c.paused && <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">Pausada</Badge>}
              </div>
            </button>
          ))}
        </ScrollArea>
        {real.data && real.data.length > 0 && (
          <div className="p-2 border-t border-border text-[10px] text-muted-foreground text-center">
            {real.data.length} conversa(s) reais no banco; UI usa demo enquanto não há mensagens.
          </div>
        )}
      </div>

      {/* Thread */}
      <div className="flex-1 flex flex-col bg-background">
        <div className="h-14 border-b border-border px-4 flex items-center gap-3 surface-1">
          <div className="h-9 w-9 rounded-full bg-gradient-brand flex items-center justify-center text-background font-medium">{active.name.charAt(0)}</div>
          <div className="flex-1">
            <div className="font-medium">{active.name}</div>
            <div className="text-xs text-muted-foreground">{active.phone}</div>
          </div>
          <Button variant="outline" size="sm" disabled={active.status === "resolved"}><CheckCircle2 className="h-4 w-4 mr-1.5" /> Resolver</Button>
        </div>
        <ScrollArea className="flex-1 p-6 dot-grid">
          <div className="max-w-2xl mx-auto space-y-3">
            {active.messages.map((m) => <MessageBubble key={m.id} m={m} />)}
          </div>
        </ScrollArea>
        <div className="border-t border-border p-3 flex gap-2">
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Digite uma mensagem ou /atalho..." />
          <Button onClick={() => setDraft("")} disabled={!draft.trim()}><Send className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Painel contato */}
      <div className="w-[300px] border-l border-border surface-1 p-4 space-y-4">
        <div className="text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-brand mx-auto flex items-center justify-center text-background font-semibold text-xl">{active.name.charAt(0)}</div>
          <div className="mt-2 font-medium">{active.name}</div>
          <div className="text-xs text-muted-foreground">{active.phone}</div>
        </div>

        <div className="border border-border rounded-lg p-3 space-y-2 surface-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2"><Bot className="h-4 w-4 text-primary" /> Automação</div>
            <Switch checked={!active.paused} onCheckedChange={(v) => setActive({ ...active, paused: !v })} />
          </div>
          <p className="text-[11px] text-muted-foreground">{active.paused ? "Pausada — somente humano responde." : "Ativa — os fluxos podem responder."}</p>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1"><Tag className="h-3 w-3" /> Etiquetas</div>
          <div className="flex flex-wrap gap-1.5">
            {active.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Histórico</div>
          <div className="text-xs text-muted-foreground space-y-1.5">
            <div>• Fluxo de boas-vindas executado</div>
            <div>• Etiqueta &quot;Cliente&quot; adicionada</div>
            <div>• Mensagem recebida do contato</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ m }: { m: { from: "contact" | "bot" | "human"; body: string; at: string } }) {
  const out = m.from !== "contact";
  return (
    <div className={cn("flex gap-2", out ? "justify-end" : "justify-start")}>
      {!out && <div className="h-7 w-7 rounded-full bg-surface-3 flex items-center justify-center shrink-0"><UserIcon className="h-3.5 w-3.5" /></div>}
      <div className={cn("max-w-[70%] rounded-2xl px-3.5 py-2 shadow-card", out ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-surface-2 text-foreground rounded-bl-sm")}>
        <p className="text-sm whitespace-pre-wrap">{m.body}</p>
        <div className={cn("text-[10px] mt-1 flex items-center gap-1", out ? "text-primary-foreground/70 justify-end" : "text-muted-foreground")}>
          {m.from === "bot" && <Bot className="h-2.5 w-2.5" />}
          {m.at}
        </div>
      </div>
    </div>
  );
}
