import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { NODE_META, PALETTE_KINDS } from "../utils/nodeMeta";
import type { NodeKind } from "../types";

type Props = {
  onAdd: (kind: NodeKind) => void;
};

export function NodePalette({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const items = PALETTE_KINDS
    .map((k) => NODE_META[k])
    .filter((m) => !q || m.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="lg"
          className="absolute bottom-6 left-6 z-10 rounded-full shadow-glow h-12 px-5 gap-2"
        >
          <Plus className="h-5 w-5" />
          Adicionar bloco
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-80 p-2">
        <div className="px-2 py-1.5">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar bloco..."
              className="h-8 pl-7 text-sm"
              autoFocus
            />
          </div>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1.5">
          Tipos de bloco
        </div>
        <div className="max-h-[360px] overflow-y-auto pr-1">
          {items.length === 0 && (
            <div className="text-xs text-muted-foreground px-2 py-3 text-center">
              Nenhum bloco encontrado
            </div>
          )}
          {items.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.kind}
                type="button"
                onClick={() => { onAdd(m.kind); setOpen(false); setQ(""); }}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-surface-2 text-left transition-colors"
              >
                <div
                  className="h-8 w-8 rounded-md flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: `hsl(var(--node-${m.tone}) / 0.18)`,
                    color: `hsl(var(--node-${m.tone}))`,
                  }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">{m.label}</div>
                  <div className="text-[11px] text-muted-foreground line-clamp-1">
                    {m.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
