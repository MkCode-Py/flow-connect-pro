/** Inspector lateral — edita o nó selecionado. */
import { useEffect, useState } from "react";
import { Trash2, Copy, Save, AlertTriangle, Plus, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { NODE_DEFS, type NodeKind } from "./nodeDefs";
import type { Node, Edge } from "reactflow";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

type Props = {
  open: boolean;
  node: Node | null;
  allEdges: Edge[];
  onChange: (data: Record<string, unknown>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onClose: () => void;
};

export function NodeInspector({ open, node, allEdges, onChange, onDelete, onDuplicate, onClose }: Props) {
  if (!node) return null;
  const def = NODE_DEFS[node.type as NodeKind];
  const [draft, setDraft] = useState<Record<string, unknown>>(node.data);
  useEffect(() => setDraft(node.data), [node.id]);

  const disconnected = !allEdges.some((e) => e.source === node.id) && def.outputs !== 0 && node.type !== "start"
    ? false
    : allEdges.some((e) => e.target === node.id) ? false : node.type !== "start";

  const update = (patch: Record<string, unknown>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    onChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[420px] sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className={`h-7 w-7 rounded-md flex items-center justify-center bg-node-${def.tone}/15`}>
              <def.icon className={`h-4 w-4 text-node-${def.tone}`} />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-base">{def.label}</SheetTitle>
              <SheetDescription className="text-xs">{def.description}</SheetDescription>
            </div>
          </div>
          {disconnected && (
            <div className="flex items-center gap-2 text-xs text-warning bg-warning/10 border border-warning/30 rounded-md p-2">
              <AlertTriangle className="h-3.5 w-3.5" /> Este bloco não tem saída conectada.
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          <Fields kind={node.type as NodeKind} data={draft} onChange={update} />
        </div>

        <div className="border-t border-border p-3 flex items-center gap-2">
          {node.type !== "start" && (
            <>
              <Button variant="ghost" size="sm" onClick={onDuplicate}><Copy className="h-4 w-4 mr-1" />Duplicar</Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4 mr-1" />Excluir</Button>
            </>
          )}
          <div className="flex-1" />
          <Badge variant="outline" className="text-[10px]">Salvo automaticamente</Badge>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Fields({ kind, data, onChange }: { kind: NodeKind; data: Record<string, unknown>; onChange: (p: Record<string, unknown>) => void }) {
  switch (kind) {
    case "start": return <p className="text-sm text-muted-foreground">Bloco fixo. Conecte-o ao próximo passo do fluxo.</p>;
    case "content": return <ContentFields data={data} onChange={onChange} />;
    case "action": return <ActionFields data={data} onChange={onChange} />;
    case "condition": return <ConditionFields data={data} onChange={onChange} />;
    case "menu": return <MenuFields data={data} onChange={onChange} />;
    case "question": return <QuestionFields data={data} onChange={onChange} />;
    case "flowlink": return <FlowLinkFields data={data} onChange={onChange} />;
    case "random": return <RandomFields data={data} onChange={onChange} />;
    case "webhook": return <WebhookFields data={data} onChange={onChange} />;
    case "end": return <EndFields data={data} onChange={onChange} />;
  }
}

function ContentFields({ data, onChange }: { data: Record<string, unknown>; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <>
      <div>
        <Label>Mensagem</Label>
        <Textarea rows={6} value={String(data.text ?? "")} onChange={(e) => onChange({ text: e.target.value })} placeholder="Use {{primeiro_nome}}, {{nome}}, {{telefone}}..." />
        <p className="text-[10px] text-muted-foreground mt-1">Variáveis: {`{{primeiro_nome}}, {{nome}}, {{telefone}}, {{campo.<chave>}}`}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Atraso (segundos)</Label>
          <Input type="number" min={0} max={60} value={Number(data.delay ?? 0)} onChange={(e) => onChange({ delay: Number(e.target.value) })} />
        </div>
        <div className="flex items-end gap-2 pb-1.5">
          <Switch checked={Boolean(data.typing)} onCheckedChange={(v) => onChange({ typing: v })} />
          <Label className="cursor-pointer">Mostrar &quot;digitando&quot;</Label>
        </div>
      </div>
    </>
  );
}

function ActionFields({ data, onChange }: { data: Record<string, unknown>; onChange: (p: Record<string, unknown>) => void }) {
  const { user } = useAuth();
  const tags = useQuery({
    queryKey: ["tags", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("tags").select("*").eq("owner_id", user!.id).order("name")).data ?? [],
  });
  const action = String(data.action ?? "add_tag");
  const isTag = action === "add_tag" || action === "remove_tag";
  return (
    <>
      <div>
        <Label>Tipo de ação</Label>
        <Select value={action} onValueChange={(v) => onChange({ action: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="add_tag">Adicionar etiqueta</SelectItem>
            <SelectItem value="remove_tag">Remover etiqueta</SelectItem>
            <SelectItem value="pause_automation">Pausar automação</SelectItem>
            <SelectItem value="resume_automation">Reiniciar automação</SelectItem>
            <SelectItem value="assign_human">Marcar atendimento humano</SelectItem>
            <SelectItem value="mark_resolved">Marcar conversa como resolvida</SelectItem>
            <SelectItem value="update_field">Atualizar campo do contato</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isTag && (
        <div>
          <Label>Etiqueta</Label>
          <Select value={String(data.value ?? "")} onValueChange={(v) => onChange({ value: v })}>
            <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
            <SelectContent>
              {(tags.data ?? []).map((t) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      {action === "update_field" && (
        <div>
          <Label>Campo=valor</Label>
          <Input value={String(data.value ?? "")} onChange={(e) => onChange({ value: e.target.value })} placeholder="ex: email=cliente@email.com" />
        </div>
      )}
    </>
  );
}

function ConditionFields({ data, onChange }: { data: Record<string, unknown>; onChange: (p: Record<string, unknown>) => void }) {
  const rules = (data.rules ?? []) as Array<{ field: string; op: string; value: string }>;
  return (
    <>
      <div>
        <Label>Quando aplicar</Label>
        <Select value={String(data.logic ?? "any")} onValueChange={(v) => onChange({ logic: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as condições (E)</SelectItem>
            <SelectItem value="any">Qualquer condição (OU)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Condições</Label>
        {rules.map((r, i) => (
          <div key={i} className="border border-border rounded-md p-2 space-y-2 bg-surface-2">
            <div className="grid grid-cols-2 gap-2">
              <Select value={r.field} onValueChange={(v) => { const next = [...rules]; next[i] = { ...r, field: v }; onChange({ rules: next }); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tag">Etiqueta</SelectItem>
                  <SelectItem value="name_contains">Nome contém</SelectItem>
                  <SelectItem value="phone_contains">Telefone contém</SelectItem>
                  <SelectItem value="last_message_contains">Última mensagem contém</SelectItem>
                  <SelectItem value="custom">Campo personalizado</SelectItem>
                  <SelectItem value="hour_between">Hora entre</SelectItem>
                </SelectContent>
              </Select>
              {r.field === "tag" ? (
                <Select value={r.op} onValueChange={(v) => { const next = [...rules]; next[i] = { ...r, op: v }; onChange({ rules: next }); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="is">É</SelectItem>
                    <SelectItem value="is_not">Não é</SelectItem>
                  </SelectContent>
                </Select>
              ) : <div className="text-xs text-muted-foreground self-center px-2">contém</div>}
            </div>
            <div className="flex gap-2">
              <Input value={r.value} onChange={(e) => { const next = [...rules]; next[i] = { ...r, value: e.target.value }; onChange({ rules: next }); }} placeholder={r.field === "hour_between" ? "Ex: 8-18" : r.field === "custom" ? "chave=valor" : "valor"} />
              <Button variant="ghost" size="icon" onClick={() => onChange({ rules: rules.filter((_, j) => j !== i) })}><X className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange({ rules: [...rules, { field: "tag", op: "is", value: "" }] })}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar condição
        </Button>
      </div>
    </>
  );
}

function MenuFields({ data, onChange }: { data: Record<string, unknown>; onChange: (p: Record<string, unknown>) => void }) {
  const options = (data.options ?? []) as Array<{ id: string; label: string }>;
  return (
    <>
      <div>
        <Label>Pergunta</Label>
        <Textarea rows={3} value={String(data.question ?? "")} onChange={(e) => onChange({ question: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Opções</Label>
        {options.map((o, i) => (
          <div key={o.id} className="flex gap-2">
            <span className="text-xs font-semibold text-node-menu pt-2.5 w-5">{i + 1}.</span>
            <Input value={o.label} onChange={(e) => { const next = [...options]; next[i] = { ...o, label: e.target.value }; onChange({ options: next }); }} placeholder="Texto da opção" />
            <Button variant="ghost" size="icon" onClick={() => onChange({ options: options.filter((_, j) => j !== i) })}><X className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange({ options: [...options, { id: crypto.randomUUID().slice(0, 6), label: "Nova opção" }] })}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar opção
        </Button>
      </div>
      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex items-center gap-2">
          <Switch checked={Boolean(data.fallbackEnabled)} onCheckedChange={(v) => onChange({ fallbackEnabled: v })} />
          <Label className="cursor-pointer text-sm">Fallback se não responder</Label>
        </div>
        {Boolean(data.fallbackEnabled) && (
          <div>
            <Label className="text-xs">Aguardar (minutos)</Label>
            <Input type="number" min={1} value={Number(data.fallbackWaitMinutes ?? 60)} onChange={(e) => onChange({ fallbackWaitMinutes: Number(e.target.value) })} />
          </div>
        )}
      </div>
    </>
  );
}

function QuestionFields({ data, onChange }: { data: Record<string, unknown>; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <>
      <div>
        <Label>Pergunta</Label>
        <Textarea rows={3} value={String(data.question ?? "")} onChange={(e) => onChange({ question: e.target.value })} />
      </div>
      <div>
        <Label>Salvar resposta em</Label>
        <Select value={String(data.saveAs ?? "first_name")} onValueChange={(v) => onChange({ saveAs: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="first_name">Primeiro nome</SelectItem>
            <SelectItem value="name">Nome completo</SelectItem>
            <SelectItem value="phone">Telefone</SelectItem>
            <SelectItem value="email">E-mail</SelectItem>
            <SelectItem value="company">Empresa</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground mt-1">Ou digite uma chave personalizada abaixo.</p>
        <Input className="mt-1" value={String(data.customKey ?? "")} placeholder="ex: cidade" onChange={(e) => onChange({ customKey: e.target.value, saveAs: e.target.value || data.saveAs })} />
      </div>
    </>
  );
}

function FlowLinkFields({ data, onChange }: { data: Record<string, unknown>; onChange: (p: Record<string, unknown>) => void }) {
  const { user } = useAuth();
  const flows = useQuery({
    queryKey: ["flows-pick", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("flows").select("id,name").eq("owner_id", user!.id).order("name")).data ?? [],
  });
  return (
    <div>
      <Label>Fluxo destino</Label>
      <Select value={String(data.targetFlowId ?? "")} onValueChange={(v) => {
        const f = (flows.data ?? []).find((x) => x.id === v);
        onChange({ targetFlowId: v, targetFlowName: f?.name ?? "" });
      }}>
        <SelectTrigger><SelectValue placeholder="Selecionar fluxo..." /></SelectTrigger>
        <SelectContent>
          {(flows.data ?? []).map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function RandomFields({ data, onChange }: { data: Record<string, unknown>; onChange: (p: Record<string, unknown>) => void }) {
  const branches = (data.branches ?? []) as Array<{ id: string; label: string }>;
  return (
    <>
      <div>
        <Label>Tipo</Label>
        <Select value={String(data.mode ?? "random")} onValueChange={(v) => onChange({ mode: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="random">Aleatório</SelectItem>
            <SelectItem value="sequential">Sequencial</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Saídas</Label>
        {branches.map((b, i) => (
          <div key={b.id} className="flex gap-2">
            <Input value={b.label} onChange={(e) => { const next = [...branches]; next[i] = { ...b, label: e.target.value }; onChange({ branches: next }); }} />
            <Button variant="ghost" size="icon" onClick={() => onChange({ branches: branches.filter((_, j) => j !== i) })}><X className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange({ branches: [...branches, { id: crypto.randomUUID().slice(0, 6), label: `Saída ${branches.length + 1}` }] })}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar saída
        </Button>
      </div>
    </>
  );
}

function WebhookFields({ data, onChange }: { data: Record<string, unknown>; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <>
      <div className="grid grid-cols-[100px_1fr] gap-2">
        <div>
          <Label>Método</Label>
          <Select value={String(data.method ?? "POST")} onValueChange={(v) => onChange({ method: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>URL</Label>
          <Input value={String(data.url ?? "")} onChange={(e) => onChange({ url: e.target.value })} placeholder="https://..." />
        </div>
      </div>
      <div>
        <Label>Headers (JSON)</Label>
        <Textarea rows={3} value={String(data.headers ?? "{}")} onChange={(e) => onChange({ headers: e.target.value })} className="font-mono text-xs" />
      </div>
      <div>
        <Label>Body (JSON)</Label>
        <Textarea rows={4} value={String(data.body ?? "{}")} onChange={(e) => onChange({ body: e.target.value })} className="font-mono text-xs" />
      </div>
      <div>
        <Label>Salvar resposta em</Label>
        <Input value={String(data.saveAs ?? "")} onChange={(e) => onChange({ saveAs: e.target.value })} placeholder="ex: webhook_resp" />
      </div>
      <p className="text-xs text-muted-foreground">Em modo MVP, o webhook é simulado. A execução real será feita pelo backend.</p>
    </>
  );
}

function EndFields({ data, onChange }: { data: Record<string, unknown>; onChange: (p: Record<string, unknown>) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={Boolean(data.markResolved)} onCheckedChange={(v) => onChange({ markResolved: v })} />
      <Label className="cursor-pointer">Marcar conversa como resolvida</Label>
    </div>
  );
}
