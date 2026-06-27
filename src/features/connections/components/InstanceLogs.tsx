import { useInstanceLogs } from "../hooks/useInstances";
import { LOG_EVENT_LABEL } from "../types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History } from "lucide-react";

export function InstanceLogs({ instanceId }: { instanceId: string }) {
  const logs = useInstanceLogs(instanceId);
  const items = logs.data ?? [];
  if (!items.length) {
    return (
      <div className="text-xs text-muted-foreground flex items-center gap-2 py-2">
        <History className="h-3.5 w-3.5" /> Sem eventos ainda.
      </div>
    );
  }
  return (
    <ScrollArea className="max-h-48">
      <ul className="space-y-1.5">
        {items.map((l) => (
          <li key={l.id} className="text-xs flex items-start gap-2 py-1 border-b border-border/50 last:border-0">
            <span className="h-1.5 w-1.5 rounded-full bg-primary/70 mt-1.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{LOG_EVENT_LABEL[l.event] ?? l.event}</span>
                <span className="text-muted-foreground text-[10px] shrink-0">
                  {formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
              {l.message && <div className="text-muted-foreground truncate">{l.message}</div>}
            </div>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}
