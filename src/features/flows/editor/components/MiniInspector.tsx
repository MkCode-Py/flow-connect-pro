import { useEffect, useState } from "react";
import type { Node } from "reactflow";
import { Copy, Info, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { NODE_META } from "../utils/nodeMeta";
import type { NodeKind } from "../types";

type Props = {
  node: Node | null;
  onClose: () => void;
  onChangeLabel: (id: string, label: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
};

export function MiniInspector({ node, onClose, onChangeLabel, onDuplicate, onDelete }: Props) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!node) return;
    setLabel(((node.data as { label?: string })?.label as string) ?? "");
  }, [node?.id]);

  if (!node) return null;
  const kind = node.type as NodeKind;
  const meta = NODE_META[kind];
  if (!meta) return null;
  const Icon = meta.icon;
  const isStart = kind === "start";

  return (
    <aside className="absolute top-4 right-4 z-10 w-[320px] rounded-xl border border-border bg-card shadow-card surface-1">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <div
          className="h-7 w-7 rounded-md flex items-center justify-center shrink-0"
          style={{
            backgroundColor: `hsl(var(--node-${meta.tone}) / 0.18)`,
            color: `hsl(var(--node-${meta.tone}))`,
          }}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground leading-none">
            Bloco selecionado
          </div>
          <div className="text-sm font-medium truncate mt-0.5">{meta.label}</div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-3 space-y-3">
        <div>
          <Label className="text-[11px] text-muted-foreground">Nome do bloco</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => onChangeLabel(node.id, label.trim() || meta.label)}
            onKeyDown={(e) => { if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur(); }}
            className="h-8 mt-1"
          />
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>ID</span>
          <code className="font-mono px-1.5 py-0.5 rounded bg-surface-2 text-foreground/80 truncate">
            {node.id}
          </code>
        </div>

        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">{meta.shortLabel}</Badge>
          {isStart && <Badge variant="secondary" className="text-[10px]">obrigatório</Badge>}
        </div>

        <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-surface-2 border border-border rounded-md p-2.5">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-accent" />
          <span>
            Edição completa de campos deste bloco será liberada na próxima etapa
            (Inspector lateral).
          </span>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onDuplicate(node.id)}
            disabled={isStart}
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" /> Duplicar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-destructive hover:text-destructive"
            onClick={() => onDelete(node.id)}
            disabled={isStart}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Excluir
          </Button>
        </div>
      </div>
    </aside>
  );
}
