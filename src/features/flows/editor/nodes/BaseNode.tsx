/** Componente visual único para todos os tipos de bloco. */
import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { NODE_META, getInputs, getOutputs } from "../utils/nodeMeta";
import type { AnyNodeData, NodeKind } from "../types";

type BaseNodeContext = {
  disconnectedIds: Set<string>;
  /** Nó atualmente em execução pelo simulador. */
  activeNodeId: string | null;
  /** Nós já visitados na execução corrente. */
  visitedNodeIds: Set<string>;
};

// passamos contexto via window-attached store simples para evitar prop drilling no ReactFlow
const ctx: BaseNodeContext = {
  disconnectedIds: new Set(),
  activeNodeId: null,
  visitedNodeIds: new Set(),
};
const listeners = new Set<() => void>();
export function setBaseNodeContext(next: Partial<BaseNodeContext>) {
  Object.assign(ctx, next);
  listeners.forEach((l) => l());
}
export function subscribeBaseNodeContext(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function NodePreview({ kind, data }: { kind: NodeKind; data: AnyNodeData }) {
  switch (kind) {
    case "content": {
      const d = data as { contentType?: string; message?: string; mediaUrl?: string };
      if (d.contentType && d.contentType !== "text") {
        return (
          <p className="text-xs text-muted-foreground line-clamp-1">
            <span className="uppercase tracking-wide text-[10px] text-foreground/60 mr-1">{d.contentType}</span>
            {d.mediaUrl || "Mídia não definida"}
          </p>
        );
      }
      return <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{d.message?.trim() || "Sem mensagem"}</p>;
    }
    case "menu": {
      const d = data as { question?: string; options?: { id: string; title?: string }[] };
      return (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground line-clamp-1">{d.question || "—"}</p>
          <div className="text-[11px] text-muted-foreground/80">
            {d.options?.length ?? 0} {d.options?.length === 1 ? "opção" : "opções"}
          </div>
        </div>
      );
    }
    case "question": {
      const d = data as { question?: string; saveTo?: string };
      return (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground line-clamp-1">{d.question || "—"}</p>
          {d.saveTo && (
            <code className="text-[10px] text-foreground/70 font-mono">→ {`{{${d.saveTo}}}`}</code>
          )}
        </div>
      );
    }
    case "condition": {
      const d = data as { mode?: "any" | "all"; rules?: unknown[] };
      return (
        <p className="text-xs text-muted-foreground">
          {d.rules?.length ?? 0} regra(s) · {d.mode === "all" ? "todas" : "qualquer"}
        </p>
      );
    }
    case "action": {
      const d = data as { actionType?: string; tagIds?: string[] };
      const map: Record<string, string> = {
        add_tag: "Adicionar etiqueta",
        remove_tag: "Remover etiqueta",
        pause_bot: "Pausar automação",
        resume_bot: "Reiniciar automação",
        transfer_human: "Transferir para humano",
        mark_resolved: "Marcar como resolvido",
        update_field: "Atualizar campo",
      };
      return (
        <p className="text-xs text-muted-foreground">
          {map[d.actionType ?? ""] ?? d.actionType ?? "—"}
          {d.tagIds?.length ? ` · ${d.tagIds.length} etiqueta(s)` : ""}
        </p>
      );
    }
    case "webhook": {
      const d = data as { method?: string; url?: string; mockMode?: boolean };
      return (
        <p className="text-xs text-muted-foreground line-clamp-1">
          <span className="font-mono text-foreground/80">{d.method ?? "POST"}</span>{" "}
          {d.url || "URL não definida"}
          {d.mockMode ? " · mock" : ""}
        </p>
      );
    }
    case "flowlink": {
      const d = data as { targetFlowId?: string | null };
      return (
        <p className="text-xs text-muted-foreground">
          {d.targetFlowId ? "Fluxo vinculado" : "Selecionar fluxo destino"}
        </p>
      );
    }
    case "random": {
      const d = data as { mode?: string; outputs?: unknown[] };
      return (
        <p className="text-xs text-muted-foreground">
          {d.outputs?.length ?? 0} saídas · {d.mode === "sequential" ? "sequencial" : "aleatório"}
        </p>
      );
    }
    case "end": {
      const d = data as { markResolved?: boolean; finalMessage?: string };
      return (
        <p className="text-xs text-muted-foreground line-clamp-1">
          {d.finalMessage?.trim() || (d.markResolved ? "Marca como resolvido" : "Finaliza a automação")}
        </p>
      );
    }
    case "start":
    default: {
      const d = data as { description?: string };
      return <p className="text-xs text-muted-foreground leading-relaxed">{d.description ?? ""}</p>;
    }
  }
}


function BaseNodeImpl({ id, type, data, selected }: NodeProps) {
  const kind = type as NodeKind;
  const meta = NODE_META[kind];
  if (!meta) return null;
  const inputs = getInputs(kind);
  const outputs = getOutputs(kind, data as AnyNodeData);
  const Icon = meta.icon;
  const label = (data as { label?: string })?.label ?? meta.label;
  const isDisconnected = ctx.disconnectedIds.has(id);

  // posicionamento vertical dos handles de saída quando há múltiplos
  const outSpacing = outputs.length > 1 ? 1 / (outputs.length + 1) : 0.5;

  return (
    <div
      data-selected={selected ? "true" : "false"}
      className={cn(
        "group relative w-[240px] rounded-xl bg-card border border-border shadow-card transition-all",
        "hover:border-border-strong",
        selected && "ring-2 ring-offset-2 ring-offset-background ring-primary/70 shadow-glow",
      )}
      style={{ borderLeft: `4px solid hsl(var(--node-${meta.tone}))` }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
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
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 leading-none">
            {meta.shortLabel}
          </div>
          <div className="text-sm font-medium truncate mt-0.5">{label}</div>
        </div>
        {isDisconnected && (
          <span
            title="Bloco desconectado"
            className="text-warning shrink-0"
          >
            <AlertCircle className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-3 pb-3">
        <NodePreview kind={kind} data={data as AnyNodeData} />
      </div>

      {/* Outputs com rótulos (quando múltiplos) */}
      {outputs.length > 1 && (
        <div className="border-t border-border/60 px-3 py-2 space-y-1.5">
          {outputs.map((h) => (
            <div key={h.id} className="flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
              <span className="truncate">{h.label ?? h.id}</span>
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: `hsl(var(--node-${meta.tone}))` }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Handles de entrada */}
      {inputs.map((h) => (
        <Handle
          key={`in-${h.id}`}
          type="target"
          position={Position.Left}
          id={h.id}
          style={{ top: "26px" }}
        />
      ))}

      {/* Handles de saída */}
      {outputs.length === 1 ? (
        <Handle
          type="source"
          position={Position.Right}
          id={outputs[0].id}
          style={{ top: "26px" }}
        />
      ) : (
        outputs.map((h, idx) => (
          <Handle
            key={`out-${h.id}`}
            type="source"
            position={Position.Right}
            id={h.id}
            style={{
              top: `calc(100% - ${(outputs.length - idx) * 28 - 14}px)`,
            }}
          />
        ))
      )}
    </div>
  );
}

export const BaseNode = memo(BaseNodeImpl);
