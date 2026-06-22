/** Componente único de nó (renderiza qualquer tipo). */
import { Handle, Position, type NodeProps } from "reactflow";
import { NODE_DEFS, type NodeKind } from "./nodeDefs";
import { cn } from "@/lib/utils";

type NodeData = {
  label?: string;
  text?: string;
  question?: string;
  options?: Array<{ id: string; label: string }>;
  branches?: Array<{ id: string; label: string }>;
  action?: string;
  value?: string;
  rules?: Array<{ field: string; op: string; value: string }>;
  logic?: string;
  saveAs?: string;
  targetFlowId?: string;
  targetFlowName?: string;
  delay?: number;
  [k: string]: unknown;
};

const TONE_BG: Record<NodeKind, string> = {
  start: "bg-node-start/15 border-node-start/40",
  content: "bg-node-content/10 border-node-content/40",
  action: "bg-node-action/10 border-node-action/40",
  condition: "bg-node-condition/10 border-node-condition/40",
  menu: "bg-node-menu/10 border-node-menu/40",
  question: "bg-node-question/10 border-node-question/40",
  flowlink: "bg-node-flowlink/15 border-node-flowlink/40",
  random: "bg-node-random/10 border-node-random/40",
  webhook: "bg-node-webhook/10 border-node-webhook/40",
  end: "bg-node-end/10 border-node-end/40",
};

const TONE_BAR: Record<NodeKind, string> = {
  start: "bg-node-start text-node-start-fg",
  content: "bg-node-content text-node-content-fg",
  action: "bg-node-action text-node-action-fg",
  condition: "bg-node-condition text-node-condition-fg",
  menu: "bg-node-menu text-node-menu-fg",
  question: "bg-node-question text-node-question-fg",
  flowlink: "bg-node-flowlink text-node-flowlink-fg",
  random: "bg-node-random text-node-random-fg",
  webhook: "bg-node-webhook text-node-webhook-fg",
  end: "bg-node-end text-node-end-fg",
};

export function FlowNode({ type, data, selected }: NodeProps<NodeData>) {
  const def = NODE_DEFS[type as NodeKind];
  if (!def) return null;
  const Icon = def.icon;
  const outputs = def.outputs === "dynamic"
    ? (type === "menu" ? data.options?.length ?? 0 : data.branches?.length ?? 0)
    : def.outputs;

  return (
    <div
      className={cn(
        "rounded-xl border bg-surface-1 backdrop-blur min-w-[240px] max-w-[280px] shadow-card transition-all",
        TONE_BG[type as NodeKind],
        selected && "ring-2 ring-primary/60 ring-offset-2 ring-offset-background"
      )}
    >
      {def.hasInput && (
        <Handle type="target" position={Position.Left} className="!w-3 !h-3" />
      )}

      <div className={cn("flex items-center gap-2 px-3 py-2 rounded-t-xl text-xs font-semibold", TONE_BAR[type as NodeKind])}>
        <Icon className="h-3.5 w-3.5" />
        <span className="uppercase tracking-wide">{def.label}</span>
      </div>

      <div className="p-3 text-xs space-y-1.5">
        <NodePreview kind={type as NodeKind} data={data} />
      </div>

      {/* outputs */}
      {type === "menu" && (data.options ?? []).map((opt, i) => (
        <Handle
          key={opt.id}
          type="source"
          id={opt.id}
          position={Position.Right}
          style={{ top: 60 + i * 22 + 24 }}
          className="!w-3 !h-3"
        />
      ))}
      {type === "random" && (data.branches ?? []).map((b, i) => (
        <Handle key={b.id} type="source" id={b.id} position={Position.Right} style={{ top: 60 + i * 22 + 24 }} className="!w-3 !h-3" />
      ))}
      {type === "condition" && (
        <>
          <Handle type="source" id="true" position={Position.Right} style={{ top: "40%" }} className="!w-3 !h-3 !bg-node-condition" />
          <Handle type="source" id="false" position={Position.Right} style={{ top: "75%" }} className="!w-3 !h-3 !bg-muted-foreground" />
        </>
      )}
      {type === "question" && (
        <>
          <Handle type="source" id="valid" position={Position.Right} style={{ top: "40%" }} className="!w-3 !h-3 !bg-node-question" />
          <Handle type="source" id="invalid" position={Position.Right} style={{ top: "75%" }} className="!w-3 !h-3 !bg-muted-foreground" />
        </>
      )}
      {outputs === 1 && (
        <Handle type="source" position={Position.Right} className="!w-3 !h-3" />
      )}
    </div>
  );
}

function NodePreview({ kind, data }: { kind: NodeKind; data: NodeData }) {
  switch (kind) {
    case "start":
      return <p className="text-muted-foreground">Seu fluxo começa aqui. Conecte ao próximo bloco.</p>;
    case "content":
      return (
        <>
          <p className="text-foreground/90 line-clamp-3 whitespace-pre-wrap">{data.text || "—"}</p>
          {data.delay ? <p className="text-muted-foreground">Digitando {data.delay}s...</p> : null}
        </>
      );
    case "action": {
      const labels: Record<string, string> = {
        add_tag: "Adicionar etiqueta", remove_tag: "Remover etiqueta",
        pause_automation: "Pausar automação", resume_automation: "Reiniciar automação",
        assign_human: "Atendimento humano", mark_resolved: "Marcar como resolvida",
        update_field: "Atualizar campo",
      };
      return (
        <>
          <p className="text-muted-foreground text-[10px] uppercase tracking-wider">{labels[String(data.action)] ?? "Ação"}</p>
          <p className="text-foreground/90">{data.value || "—"}</p>
        </>
      );
    }
    case "condition":
      return (
        <>
          <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Lógica {data.logic === "all" ? "E" : "OU"}</p>
          <p className="text-foreground/90">{(data.rules ?? []).length} regra{(data.rules ?? []).length === 1 ? "" : "s"}</p>
          <div className="flex flex-col gap-1 mt-2">
            <span className="text-[10px] text-node-condition">↗ verdadeiro</span>
            <span className="text-[10px] text-muted-foreground">↘ nenhuma</span>
          </div>
        </>
      );
    case "menu":
      return (
        <>
          <p className="text-foreground/90 line-clamp-2">{data.question}</p>
          <div className="mt-2 space-y-1">
            {(data.options ?? []).map((o, i) => (
              <div key={o.id} className="text-[11px] flex items-center gap-1.5 text-muted-foreground">
                <span className="text-node-menu font-semibold">{i + 1}.</span> {o.label}
              </div>
            ))}
          </div>
        </>
      );
    case "question":
      return (
        <>
          <p className="text-foreground/90 line-clamp-2">{data.question}</p>
          <p className="text-muted-foreground text-[10px] mt-1">Salvar em: {data.saveAs || "—"}</p>
        </>
      );
    case "flowlink":
      return <p className="text-foreground/90">{data.targetFlowName ? `→ ${data.targetFlowName}` : "Selecionar fluxo destino"}</p>;
    case "random":
      return (
        <>
          <p className="text-muted-foreground text-[10px] uppercase tracking-wider">{data.mode === "sequential" ? "Sequencial" : "Aleatório"}</p>
          {(data.branches ?? []).map((b) => <p key={b.id} className="text-foreground/90 text-[11px]">• {b.label}</p>)}
        </>
      );
    case "webhook":
      return (
        <>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{String(data.method)}</p>
          <p className="text-foreground/90 truncate">{String(data.url) || "—"}</p>
        </>
      );
    case "end":
      return <p className="text-muted-foreground">Finaliza a automação.</p>;
  }
}
