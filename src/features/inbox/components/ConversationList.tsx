import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { InboxConversation } from "../types";
import { STATUS_LABEL } from "../types";

const STATUS_TONE: Record<string, string> = {
  open: "bg-primary/10 text-primary border-primary/30",
  pending: "bg-warning/10 text-warning border-warning/30",
  resolved: "bg-muted text-muted-foreground border-border",
  human_required: "bg-accent/10 text-accent border-accent/30",
};

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  loading,
}: {
  conversations: InboxConversation[];
  activeId: string | null;
  onSelect: (c: InboxConversation) => void;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="p-3 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!conversations.length) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
        Nenhuma conversa nesse filtro.
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <ul className="divide-y divide-border">
        {conversations.map((c) => {
          const time = c.last_message_at
            ? formatDistanceToNowStrict(new Date(c.last_message_at), { locale: ptBR, addSuffix: false })
            : "";
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c)}
                className={cn(
                  "w-full text-left px-3 py-3 hover:bg-surface-2 transition-colors",
                  activeId === c.id && "bg-surface-2",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-brand flex items-center justify-center text-background font-semibold text-sm shrink-0">
                    {c.contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm truncate">{c.contact.name}</div>
                      <div className="text-[10px] text-muted-foreground shrink-0">{time}</div>
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {c.last_message_preview ?? c.contact.phone ?? "Sem mensagens"}
                    </div>
                    <div className="flex items-center flex-wrap gap-1 mt-1.5">
                      <Badge variant="outline" className={cn("text-[10px] py-0 h-4", STATUS_TONE[c.status])}>
                        {STATUS_LABEL[c.status]}
                      </Badge>
                      {c.automation_paused && (
                        <Badge variant="outline" className="text-[10px] py-0 h-4 bg-warning/10 text-warning border-warning/30">
                          Pausada
                        </Badge>
                      )}
                      {c.tags.slice(0, 2).map((t) => (
                        <span
                          key={t.id}
                          className="text-[10px] px-1.5 py-0.5 rounded-md border"
                          style={{ background: `${t.color}1a`, color: t.color, borderColor: `${t.color}55` }}
                        >
                          {t.name}
                        </span>
                      ))}
                      {c.unread_count > 0 && (
                        <span className="ml-auto h-4 min-w-[1rem] px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </ScrollArea>
  );
}
