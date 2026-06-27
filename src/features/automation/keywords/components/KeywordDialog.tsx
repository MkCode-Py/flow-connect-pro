import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MATCH_RULE_HINT, MATCH_RULE_LABEL, type KeywordFormValues, type KeywordMatchRule, type KeywordRule } from "../types";

const RULES: KeywordMatchRule[] = ["contains", "contains_any", "contains_all", "starts_with", "exact"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: KeywordRule | null;
  flows: Array<{ id: string; name: string }>;
  onSubmit: (values: KeywordFormValues) => void;
  saving?: boolean;
};

const empty: KeywordFormValues = {
  name: "",
  flow_id: null,
  match_rule: "contains_any",
  terms: [],
  priority: 10,
  is_active: true,
  notes: "",
};

export function KeywordDialog({ open, onOpenChange, initial, flows, onSubmit, saving }: Props) {
  const [values, setValues] = useState<KeywordFormValues>(empty);
  const [termInput, setTermInput] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof KeywordFormValues, string>>>({});

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setValues({
        id: initial.id,
        name: initial.name,
        flow_id: initial.flow_id,
        match_rule: initial.match_rule,
        terms: initial.terms,
        priority: initial.priority,
        is_active: initial.is_active,
        notes: initial.notes ?? "",
      });
    } else {
      setValues(empty);
    }
    setTermInput("");
    setErrors({});
  }, [open, initial]);

  function addTerm() {
    const t = termInput.trim();
    if (!t) return;
    if (values.terms.map((x) => x.toLowerCase()).includes(t.toLowerCase())) {
      setTermInput("");
      return;
    }
    setValues((v) => ({ ...v, terms: [...v.terms, t] }));
    setTermInput("");
  }

  function removeTerm(t: string) {
    setValues((v) => ({ ...v, terms: v.terms.filter((x) => x !== t) }));
  }

  function submit() {
    const errs: typeof errors = {};
    if (!values.name.trim()) errs.name = "Nome obrigatório";
    if (!values.flow_id) errs.flow_id = "Selecione um fluxo";
    if (!values.terms.length) errs.terms = "Adicione pelo menos 1 termo";
    if (!Number.isFinite(values.priority)) errs.priority = "Prioridade inválida";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onSubmit(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar palavra-chave" : "Nova palavra-chave"}</DialogTitle>
          <DialogDescription>
            Quando o cliente enviar uma mensagem que combine com a regra, o fluxo vinculado será iniciado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nome da regra</Label>
            <Input
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              placeholder="Cliente pediu preço"
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label>Fluxo vinculado</Label>
            <Select
              value={values.flow_id ?? ""}
              onValueChange={(v) => setValues((s) => ({ ...s, flow_id: v || null }))}
            >
              <SelectTrigger><SelectValue placeholder="Selecione um fluxo" /></SelectTrigger>
              <SelectContent>
                {flows.length === 0 && (
                  <div className="px-2 py-2 text-xs text-muted-foreground">Nenhum fluxo disponível. Crie um em Fluxos.</div>
                )}
                {flows.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.flow_id && <p className="text-xs text-destructive mt-1">{errors.flow_id}</p>}
          </div>

          <div>
            <Label>Tipo de correspondência</Label>
            <Select
              value={values.match_rule}
              onValueChange={(v) => setValues((s) => ({ ...s, match_rule: v as KeywordMatchRule }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RULES.map((r) => (
                  <SelectItem key={r} value={r}>{MATCH_RULE_LABEL[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">{MATCH_RULE_HINT[values.match_rule]}</p>
          </div>

          <div>
            <Label>Termos ou frases</Label>
            <div className="flex gap-2">
              <Input
                value={termInput}
                onChange={(e) => setTermInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addTerm(); }
                }}
                placeholder="preço, tabela, pix, pedido..."
              />
              <Button type="button" variant="outline" onClick={addTerm}>Adicionar</Button>
            </div>
            {values.terms.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {values.terms.map((t) => (
                  <Badge key={t} variant="secondary" className="gap-1 bg-accent/10 text-accent border-accent/20">
                    {t}
                    <button type="button" onClick={() => removeTerm(t)} aria-label={`Remover ${t}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {errors.terms && <p className="text-xs text-destructive mt-1">{errors.terms}</p>}
            <p className="text-[11px] text-muted-foreground mt-1">
              Matching ignora maiúsculas, acentos e pontuação. "PREÇO!" combina com "preco".
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prioridade</Label>
              <Input
                type="number"
                min={1}
                value={values.priority}
                onChange={(e) => setValues((s) => ({ ...s, priority: Number(e.target.value) || 1 }))}
              />
              <p className="text-[11px] text-muted-foreground mt-1">Menor número = maior prioridade.</p>
            </div>
            <div className="flex items-end gap-3 pb-1">
              <Switch checked={values.is_active} onCheckedChange={(v) => setValues((s) => ({ ...s, is_active: v }))} />
              <Label className="cursor-pointer">{values.is_active ? "Ativa" : "Inativa"}</Label>
            </div>
          </div>

          <div>
            <Label>Observação interna (opcional)</Label>
            <Textarea
              rows={2}
              value={values.notes}
              onChange={(e) => setValues((s) => ({ ...s, notes: e.target.value }))}
              placeholder="Anotações para o time. Não é enviado ao cliente."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Salvando..." : initial ? "Salvar" : "Criar palavra-chave"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
