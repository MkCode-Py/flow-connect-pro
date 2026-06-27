/** Aba "Logs" do simulador: lista cronológica com payload recolhível. */
import { useState } from "react";
import { ChevronRight, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EVENT_LABEL, type AutomationLog } from "@/features/flows/engine";

const eventTone: Partial<Record<AutomationLog["event"], string>> = {
  "flow.started": "text-success border-success/40",
  "flow.finished": "text-muted-foreground border-border",
  "flow.error": "text-destructive border-destructive/40",
  "menu.invalid_reply": "text-warning border-warning/40",
  "question.invalid_reply": "text-warning border-warning/40",
  "human.transfer": "text-warning border-warning/40",
  "engine.warning": "text-warning border-warning/40",
  "variable.missing": "text-warning border-warning/40",
  "action.executed": "text-primary border-primary/40",
  "condition.evaluated": "text-primary border-primary/40",
  "webhook.mocked": "text-primary border-primary/40",
};

function fmt(ts: number) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

export function SimulatorLogs({ logs }: { logs: AutomationLog[] }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const copy = () => {
    const txt = logs.map((l) =>
      `[${fmt(l.timestamp)}] ${EVENT_LABEL[l.event]} — ${l.message}${l.payload ? `\n  ${JSON.stringify(l.payload)}` : ""}`,
    ).join("\n");
    navigator.clipboard.writeText(txt);
    toast.success("Logs copiados");
  };

  if (!logs.length) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Nenhum log ainda. Inicie a simulação para ver os eventos.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs text-muted-foreground">{logs.length} evento{logs.length === 1 ? "" : "s"}</span>
        <Button variant="ghost" size="sm" onClick={copy} className="h-7 gap-1.5 text-xs">
          <Copy className="h-3 w-3" /> Copiar
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {logs.map((l) => {
            const isOpen = open[l.id];
            return (
              <div key={l.id} className={cn("rounded-md border bg-card/50 px-2 py-1.5", eventTone[l.event] ?? "border-border")}>
                <button
                  type="button"
                  className="w-full flex items-start gap-1.5 text-left"
                  onClick={() => l.payload && setOpen((s) => ({ ...s, [l.id]: !s[l.id] }))}
                >
                  <ChevronRight className={cn("h-3.5 w-3.5 mt-0.5 shrink-0 transition-transform", isOpen && "rotate-90", !l.payload && "opacity-0")} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="h-4 text-[10px] px-1.5 font-normal">
                        {EVENT_LABEL[l.event]}
                      </Badge>
                      {l.nodeType && (
                        <span className="text-[10px] text-muted-foreground font-mono">{l.nodeType}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground ml-auto">{fmt(l.timestamp)}</span>
                    </div>
                    <p className="text-xs mt-1 break-words">{l.message}</p>
                  </div>
                </button>
                {isOpen && l.payload && (
                  <pre className="mt-1.5 ml-5 text-[10px] bg-muted/50 rounded p-2 overflow-x-auto">
                    {JSON.stringify(l.payload, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
