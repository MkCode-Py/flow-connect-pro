import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Search, Plus, MessageSquare, Pause, Play, CheckCircle2, Clock, UserCog, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

import { useConversations, useConversationMessages, useConversationLogs, useSendMockMessage, useCreateMockIncomingMessage, useUpdateConversationStatus, useSetAutomationPaused, useApplyContactTag, useUpdateContactInline, useCreateMockConversation } from "../hooks/useInbox";
import { useQuickReplies } from "@/features/quick-replies/hooks/useQuickReplies";
import { useTagsList, useUpsertTag } from "@/features/tags/hooks/useTagsCrud";
import { ensureInboxDemo } from "../utils/seedInboxDemo";
import { ConversationFilters, type InboxFilter } from "../components/ConversationFilters";
import { ConversationList } from "../components/ConversationList";
import { ConversationThread } from "../components/ConversationThread";
import { MessageComposer } from "../components/MessageComposer";
import { ContactSidePanel } from "../components/ContactSidePanel";
import { MockIncomingMessageDialog } from "../components/MockIncomingMessageDialog";
import { AutomationStatusBadge } from "../components/AutomationStatusBadge";
import { STATUS_LABEL, type InboxConversation } from "../types";
import { useConnectionSummary } from "@/features/connections/hooks/useConnectionSummary";
import { Link } from "react-router-dom";
import { Smartphone, AlertCircle } from "lucide-react";

export default function InboxPage() {
  const { user } = useAuth();
  const { conversationId } = useParams();
  const navigate = useNavigate();

  // Seed demo conversations once per user
  useEffect(() => {
    if (user) ensureInboxDemo(user.id).catch(() => undefined);
  }, [user]);

  const convs = useConversations();
  const quickReplies = useQuickReplies();
  const tags = useTagsList();
  const upsertTag = useUpsertTag();

  const [filter, setFilter] = useState<InboxFilter>("all");
  const [tagFilter, setTagFilter] = useState("__all__");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(conversationId ?? null);
  const [mockOpen, setMockOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "thread">(conversationId ? "thread" : "list");

  // Filter logic
  const filtered = useMemo(() => {
    const items = convs.data ?? [];
    return items.filter((c) => {
      if (filter === "paused" && !c.automation_paused) return false;
      if (filter !== "all" && filter !== "paused" && c.status !== filter) return false;
      if (tagFilter !== "__all__" && !c.tags.some((t) => t.id === tagFilter)) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        if (
          !c.contact.name.toLowerCase().includes(q) &&
          !(c.contact.phone ?? "").toLowerCase().includes(q) &&
          !(c.last_message_preview ?? "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [convs.data, filter, tagFilter, query]);

  // Auto-select first
  useEffect(() => {
    if (!activeId && filtered.length) setActiveId(filtered[0].id);
  }, [filtered, activeId]);

  // Sync param
  useEffect(() => {
    if (activeId && activeId !== conversationId) navigate(`/inbox/${activeId}`, { replace: true });
  }, [activeId, conversationId, navigate]);

  const active = useMemo<InboxConversation | null>(
    () => (convs.data ?? []).find((c) => c.id === activeId) ?? null,
    [convs.data, activeId],
  );

  const messages = useConversationMessages(activeId);
  const logs = useConversationLogs(activeId);
  const sendMsg = useSendMockMessage();
  const sendIncoming = useCreateMockIncomingMessage();
  const updateStatus = useUpdateConversationStatus();
  const setPaused = useSetAutomationPaused();
  const applyTag = useApplyContactTag();
  const updateContact = useUpdateContactInline();
  const createConv = useCreateMockConversation();

  const conn = useConnectionSummary();

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] overflow-hidden">
      <ConnectionBanner connected={conn.connected > 0} total={conn.total} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* COLUNA ESQUERDA */}
      <aside
        className={cn(
          "w-full md:w-[340px] border-r border-border surface-1 flex flex-col shrink-0",
          mobileView === "thread" ? "hidden md:flex" : "flex",
        )}
      >
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Inbox</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => createConv.mutate(undefined, { onSuccess: (id) => { setActiveId(id); setMobileView("thread"); } })}
              disabled={createConv.isPending}
            >
              <Plus className="h-4 w-4 mr-1" /> Mock
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar nome, telefone ou mensagem..."
              className="pl-8 h-9"
            />
          </div>
          <ConversationFilters
            value={filter}
            onChange={setFilter}
            tagId={tagFilter}
            onTagChange={setTagFilter}
            tags={tags.data ?? []}
          />
        </div>
        <ConversationList
          conversations={filtered}
          activeId={activeId}
          loading={convs.isLoading}
          onSelect={(c) => { setActiveId(c.id); setMobileView("thread"); }}
        />
        <div className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground text-center">
          Mensagens 100% mockadas — nada é enviado pelo WhatsApp real.
        </div>
      </aside>

      {/* COLUNA CENTRAL */}
      <main
        className={cn(
          "flex-1 flex flex-col bg-background min-w-0",
          mobileView === "list" ? "hidden md:flex" : "flex",
        )}
      >
        {!active ? (
          <EmptyState />
        ) : (
          <>
            <header className="h-14 border-b border-border px-3 md:px-4 flex items-center gap-3 surface-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-8 w-8"
                onClick={() => setMobileView("list")}
                aria-label="Voltar"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="h-9 w-9 rounded-full bg-gradient-brand flex items-center justify-center text-background font-semibold">
                {active.contact.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{active.contact.name}</div>
                <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
                  <span>{active.contact.phone ?? "Sem telefone"}</span>
                  <span>·</span>
                  <Badge variant="outline" className="text-[10px] py-0">{STATUS_LABEL[active.status]}</Badge>
                </div>
              </div>
              <AutomationStatusBadge paused={active.automation_paused} className="hidden sm:inline-flex" />
              <div className="hidden md:flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={() => setMockOpen(true)}>
                  <MessageSquare className="h-4 w-4 mr-1" /> Simular cliente
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPaused.mutate({ id: active.id, paused: !active.automation_paused })}
                >
                  {active.automation_paused ? <Play className="h-4 w-4 mr-1" /> : <Pause className="h-4 w-4 mr-1" />}
                  {active.automation_paused ? "Retomar" : "Pausar"}
                </Button>
                {active.status !== "resolved" ? (
                  <Button
                    size="sm"
                    onClick={() => updateStatus.mutate({ id: active.id, status: "resolved" })}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Resolver
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: active.id, status: "open" })}>
                    Reabrir
                  </Button>
                )}
              </div>
            </header>

            <ConversationThread messages={messages.data ?? []} loading={messages.isLoading} />

            <MessageComposer
              contact={active.contact}
              quickReplies={(quickReplies.data ?? []).map((q) => ({
                id: q.id, shortcut: q.shortcut, title: q.title, category: q.category, content: q.content, is_active: q.is_active,
              }))}
              disabled={active.status === "resolved"}
              onSend={async (body) => {
                await sendMsg.mutateAsync({ conversationId: active.id, body });
              }}
            />

            {/* Toolbar mobile (atalhos) */}
            <div className="md:hidden border-t border-border p-2 flex gap-1 surface-1">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setMockOpen(true)}>
                <MessageSquare className="h-4 w-4 mr-1" /> Mock cliente
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => setPaused.mutate({ id: active.id, paused: !active.automation_paused })}
              >
                {active.automation_paused ? "Retomar" : "Pausar"}
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={() => updateStatus.mutate({ id: active.id, status: active.status === "resolved" ? "open" : "resolved" })}
              >
                {active.status === "resolved" ? "Reabrir" : "Resolver"}
              </Button>
            </div>
          </>
        )}
      </main>

      {/* COLUNA DIREITA */}
      {active && (
        <aside className="hidden lg:flex w-[320px] border-l border-border surface-1 shrink-0">
          <div className="flex-1 min-h-0">
            <ContactSidePanel
              conversation={active}
              allTags={tags.data ?? []}
              logs={logs.data ?? []}
              onUpdateContact={(patch) => updateContact.mutateAsync({ id: active.contact.id, patch })}
              onApplyTag={(tagId, attach) => applyTag.mutateAsync({ contactId: active.contact.id, tagId, attach })}
              onCreateTag={async (name) => {
                const t = await upsertTag.mutateAsync({ name, color: "#22c55e" });
                return t;
              }}
              onSetStatus={(s) => updateStatus.mutateAsync({ id: active.id, status: s })}
              onSetAutomationPaused={(p) => setPaused.mutateAsync({ id: active.id, paused: p })}
            />
          </div>
        </aside>
      )}

      {active && (
        <MockIncomingMessageDialog
          open={mockOpen}
          onOpenChange={setMockOpen}
          onSubmit={(body) => sendIncoming.mutateAsync({ conversationId: active.id, body })}
        />
      )}
      </div>
    </div>
  );
}

function ConnectionBanner({ connected, total }: { connected: boolean; total: number }) {
  if (total === 0) {
    return (
      <div className="border-b border-warning/30 bg-warning/10 px-4 py-2 text-xs flex items-center gap-2 text-warning">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 min-w-0">WhatsApp não conectado — modo mock ativo. Mensagens enviadas aqui não saem para o WhatsApp real.</span>
        <Link to="/connections" className="font-medium underline-offset-2 hover:underline shrink-0">Conectar</Link>
      </div>
    );
  }
  return (
    <div className="border-b border-border bg-surface-2/40 px-4 py-2 text-xs flex items-center gap-2 text-muted-foreground">
      <Smartphone className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 min-w-0">
        {connected ? "Instância conectada em modo mock — nenhuma mensagem real é enviada." : "Nenhuma instância conectada no momento."}
      </span>
      <Link to="/connections" className="font-medium underline-offset-2 hover:underline shrink-0 text-foreground">Gerenciar</Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2 p-6 text-center">
      <MessageSquare className="h-12 w-12 opacity-40" />
      <div className="font-medium text-foreground">Selecione uma conversa</div>
      <p className="text-sm max-w-sm">
        Escolha uma conversa na lista à esquerda para começar a atender, ou crie uma conversa mockada para testes.
      </p>
    </div>
  );
}
