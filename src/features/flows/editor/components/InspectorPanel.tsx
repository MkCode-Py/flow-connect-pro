import { useEffect, useMemo, useState } from "react";
import type { Edge, Node } from "reactflow";
import { AlertTriangle, Copy, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { NODE_META } from "../utils/nodeMeta";
import { validateNodeData, type FieldErrors } from "../schemas/nodeSchemas";
import { mergeNodeData } from "../utils/nodeDataDefaults";
import { findEdgesForHandle } from "../utils/edgeCleanup";
import type { AnyNodeData, NodeKind } from "../types";

import { AdvancedSection } from "./inspector/shared/AdvancedSection";
import { StartInspector } from "./inspector/StartInspector";
import { ContentInspector } from "./inspector/ContentInspector";
import { ActionInspector } from "./inspector/ActionInspector";
import { ConditionInspector } from "./inspector/ConditionInspector";
import { MenuInspector } from "./inspector/MenuInspector";
import { QuestionInspector } from "./inspector/QuestionInspector";
import { FlowLinkInspector } from "./inspector/FlowLinkInspector";
import { RandomInspector } from "./inspector/RandomInspector";
import { WebhookInspector } from "./inspector/WebhookInspector";
import { EndInspector } from "./inspector/EndInspector";

type Props = {
  node: Node | null;
  edges: Edge[];
  disconnectedIds: Set<string>;
  onClose: () => void;
  onCommit: (nodeId: string, data: AnyNodeData) => void;
  onDuplicate: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  /** Remove edges associadas a um handle e devolve a quantidade removida. */
  onRemoveEdgesForHandle: (nodeId: string, handleId: string) => number;
};

export function InspectorPanel(props: Props) {
  if (!props.node) return null;

  return (
    <>
      {/* Desktop: painel fixo lateral, visível apenas quando há nó selecionado */}
      <aside className="hidden lg:flex flex-col w-[380px] shrink-0 border-l border-border bg-card surface-1 animate-in slide-in-from-right duration-200">
        <InspectorContent {...props} />
      </aside>

      {/* Mobile: sheet sobreposto */}
      <div className="lg:hidden fixed inset-0 z-30 flex">
        <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={props.onClose} />
        <aside className="w-full max-w-sm bg-card border-l border-border flex flex-col animate-in slide-in-from-right duration-200">
          <InspectorContent {...props} />
        </aside>
      </div>
    </>
  );
}

function InspectorContent({
  node, edges, disconnectedIds, onClose, onCommit, onDuplicate, onDelete, onRemoveEdgesForHandle,
}: Props) {
  if (!node) return null;


  const kind = node.type as NodeKind;
  const meta = NODE_META[kind];
  if (!meta) return null;
  const Icon = meta.icon;
  const isStart = kind === "start";

  // --- estado de rascunho ---
  const initial = useMemo(() => mergeNodeData(kind, node.data), [node.id, kind]);
  const [draft, setDraft] = useState<AnyNodeData>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pendingRemove, setPendingRemove] = useState<{ handleId: string; resolve: (ok: boolean) => void; count: number } | null>(null);

  // Reset quando muda o nó selecionado
  useEffect(() => {
    setDraft(mergeNodeData(kind, node.data));
    setErrors({});
  }, [node.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initial), [draft, initial]);
  const isDisconnected = disconnectedIds.has(node.id);

  const handleSave = () => {
    const result = validateNodeData(kind, draft);
    if (!result.ok) {
      setErrors(result.errors);
      toast.error("Corrija os campos destacados");
      return;
    }
    setErrors({});
    onCommit(node.id, draft);
    toast.success("Bloco salvo");
  };

  const handleCancel = () => {
    setDraft(mergeNodeData(kind, node.data));
    setErrors({});
  };

  // Atalhos
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!dirty) return;
      const target = e.target as HTMLElement;
      const inField = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape" && !inField) {
        e.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dirty, draft]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRequestRemoveHandle = (handleId: string): Promise<boolean> => {
    const count = findEdgesForHandle(edges, node.id, handleId).length;
    if (count === 0) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      setPendingRemove({ handleId, resolve, count });
    });
  };

  const confirmRemoveHandle = () => {
    if (!pendingRemove) return;
    onRemoveEdgesForHandle(node.id, pendingRemove.handleId);
    pendingRemove.resolve(true);
    setPendingRemove(null);
  };

  const cancelRemoveHandle = () => {
    if (!pendingRemove) return;
    pendingRemove.resolve(false);
    setPendingRemove(null);
  };

  return (
    <>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-start gap-2.5">
        <div
          className="h-8 w-8 rounded-md flex items-center justify-center shrink-0 mt-0.5"
          style={{
            backgroundColor: `hsl(var(--node-${meta.tone}) / 0.18)`,
            color: `hsl(var(--node-${meta.tone}))`,
          }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{meta.shortLabel}</span>
            {isStart && <Badge variant="secondary" className="h-4 text-[9px] px-1">obrigatório</Badge>}
            {dirty && <Badge variant="outline" className="h-4 text-[9px] px-1 border-warning/40 text-warning">não salvo</Badge>}
          </div>
          <h3 className="text-sm font-medium truncate mt-0.5">
            {(draft as { label?: string }).label || meta.label}
          </h3>
          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{meta.description}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose} title="Fechar">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {isDisconnected && (
        <div className="mx-4 mt-3 rounded-md border border-warning/40 bg-warning/5 px-2.5 py-1.5 text-[11px] text-warning flex items-start gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>Este bloco está desconectado do fluxo.</span>
        </div>
      )}

      {/* Body */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4">
          {renderInspector(kind, draft, setDraft, errors, handleRequestRemoveHandle)}
        </div>
        <AdvancedSection nodeId={node.id} nodeType={kind} data={draft} />
      </ScrollArea>

      {/* Footer ações + commit */}
      <div className="border-t border-border p-3 space-y-2 bg-card">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1 h-8" onClick={handleCancel} disabled={!dirty}>
            Cancelar
          </Button>
          <Button
            size="sm"
            className={cn("flex-1 h-8", dirty && "ring-1 ring-primary/40")}
            onClick={handleSave}
            disabled={!dirty}
          >
            Salvar bloco
          </Button>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost" size="sm" className="flex-1 h-7 text-[11px]"
            onClick={() => onDuplicate(node.id)}
            disabled={isStart}
          >
            <Copy className="h-3 w-3 mr-1" /> Duplicar
          </Button>
          <Button
            variant="ghost" size="sm" className="flex-1 h-7 text-[11px] text-destructive hover:text-destructive"
            onClick={() => onDelete(node.id)}
            disabled={isStart}
          >
            <Trash2 className="h-3 w-3 mr-1" /> Excluir
          </Button>
        </div>
      </div>

      <AlertDialog open={!!pendingRemove} onOpenChange={(o) => { if (!o) cancelRemoveHandle(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover saída conectada?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta saída possui {pendingRemove?.count ?? 0} conexão(ões). Ao remover, as conexões correspondentes também serão excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelRemoveHandle}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveHandle} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover saída
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function renderInspector(
  kind: NodeKind,
  draft: AnyNodeData,
  setDraft: (next: AnyNodeData) => void,
  errors: FieldErrors,
  onRequestRemoveHandle: (handleId: string) => Promise<boolean>,
) {
  const setAs = <T,>(next: T) => setDraft(next as unknown as AnyNodeData);
  switch (kind) {
    case "start":
      return <StartInspector draft={draft as never} setDraft={setAs} errors={errors} />;
    case "content":
      return <ContentInspector draft={draft as never} setDraft={setAs} errors={errors} />;
    case "action":
      return <ActionInspector draft={draft as never} setDraft={setAs} errors={errors} />;
    case "condition":
      return <ConditionInspector draft={draft as never} setDraft={setAs} errors={errors} />;
    case "menu":
      return <MenuInspector draft={draft as never} setDraft={setAs} errors={errors} onRequestRemoveHandle={onRequestRemoveHandle} />;
    case "question":
      return <QuestionInspector draft={draft as never} setDraft={setAs} errors={errors} />;
    case "flowlink":
      return <FlowLinkInspector draft={draft as never} setDraft={setAs} errors={errors} />;
    case "random":
      return <RandomInspector draft={draft as never} setDraft={setAs} errors={errors} onRequestRemoveHandle={onRequestRemoveHandle} />;
    case "webhook":
      return <WebhookInspector draft={draft as never} setDraft={setAs} errors={errors} />;
    case "end":
      return <EndInspector draft={draft as never} setDraft={setAs} errors={errors} />;
    default:
      return null;
  }
}
