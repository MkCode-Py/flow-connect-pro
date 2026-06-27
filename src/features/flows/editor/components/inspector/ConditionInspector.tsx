import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Copy, Info, Plus, Trash2 } from "lucide-react";
import { FieldError } from "./shared/FieldError";
import { useCustomFields, useTags } from "../../hooks/useTaxonomy";
import type { ConditionData, ConditionField, ConditionOperator, ConditionRule } from "../../types";
import type { FieldErrors } from "../../schemas/nodeSchemas";
import { genId } from "../../utils/nodeDataDefaults";

type Props = {
  draft: ConditionData;
  setDraft: (next: ConditionData) => void;
  errors: FieldErrors;
};

const FIELD_LABELS: Record<ConditionField, string> = {
  tag: "Etiqueta",
  contact_name: "Nome do contato",
  contact_phone: "Telefone",
  custom_field: "Campo personalizado",
  last_message: "Última mensagem",
  current_time: "Horário atual",
  bot_paused: "Automação pausada",
  conversation_status: "Status da conversa",
};

const OPERATORS_BY_FIELD: Record<ConditionField, ConditionOperator[]> = {
  tag: ["is", "is_not"],
  contact_name: ["is", "is_not", "contains", "not_contains", "starts_with", "ends_with", "is_empty", "is_not_empty"],
  contact_phone: ["is", "is_not", "contains", "not_contains", "is_empty", "is_not_empty"],
  custom_field: ["is", "is_not", "contains", "not_contains", "is_empty", "is_not_empty"],
  last_message: ["is", "contains", "not_contains", "starts_with", "ends_with", "is_empty"],
  current_time: ["between"],
  bot_paused: ["is"],
  conversation_status: ["is", "is_not"],
};

const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  is: "é",
  is_not: "não é",
  contains: "contém",
  not_contains: "não contém",
  starts_with: "começa com",
  ends_with: "termina com",
  is_empty: "está vazio",
  is_not_empty: "não está vazio",
  between: "entre",
};

const STATUS_OPTIONS = [
  { v: "open", l: "Aberta" },
  { v: "pending", l: "Pendente" },
  { v: "resolved", l: "Resolvida" },
];

export function ConditionInspector({ draft, setDraft, errors }: Props) {
  const { data: tags = [] } = useTags();
  const { data: fields = [] } = useCustomFields();

  const updateRule = (idx: number, patch: Partial<ConditionRule>) => {
    const rules = draft.rules.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    setDraft({ ...draft, rules });
  };

  const addRule = () => {
    setDraft({
      ...draft,
      rules: [
        ...draft.rules,
        { id: genId("rule"), field: "last_message", operator: "contains", value: "" },
      ],
    });
  };

  const removeRule = (idx: number) => {
    setDraft({ ...draft, rules: draft.rules.filter((_, i) => i !== idx) });
  };

  const duplicateRule = (idx: number) => {
    const src = draft.rules[idx];
    const copy: ConditionRule = { ...src, id: genId("rule") };
    const next = [...draft.rules];
    next.splice(idx + 1, 0, copy);
    setDraft({ ...draft, rules: next });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-[11px] text-muted-foreground">Nome do bloco</Label>
        <Input
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          className="h-8 mt-1"
        />
        <FieldError message={errors.label} />
      </div>

      <div>
        <Label className="text-[11px] text-muted-foreground mb-1.5 block">Modo</Label>
        <ToggleGroup
          type="single"
          value={draft.mode}
          onValueChange={(v) => v && setDraft({ ...draft, mode: v as "all" | "any" })}
          className="grid grid-cols-2"
        >
          <ToggleGroupItem value="all" className="text-[11px]">TODAS as condições</ToggleGroupItem>
          <ToggleGroupItem value="any" className="text-[11px]">QUALQUER condição</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-[11px]">
          O bloco tem duas saídas fixas: <b>Verdadeira</b> e <b>Falsa</b>.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] text-muted-foreground">Condições</Label>
          <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={addRule}>
            <Plus className="h-3 w-3 mr-1" /> Adicionar
          </Button>
        </div>

        {draft.rules.map((rule, idx) => {
          const operators = OPERATORS_BY_FIELD[rule.field];
          const needsValue = rule.operator !== "is_empty" && rule.operator !== "is_not_empty";
          const ruleErr = (path: string) => errors[`rules.${idx}.${path}`];
          return (
            <div key={rule.id} className="rounded-md border border-border bg-surface-1 p-2.5 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={rule.field}
                  onValueChange={(v) =>
                    updateRule(idx, {
                      field: v as ConditionField,
                      operator: OPERATORS_BY_FIELD[v as ConditionField][0],
                      value: "",
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(FIELD_LABELS) as ConditionField[]).map((f) => (
                      <SelectItem key={f} value={f}>{FIELD_LABELS[f]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={rule.operator}
                  onValueChange={(v) => updateRule(idx, { operator: v as ConditionOperator })}
                >
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {operators.map((op) => (
                      <SelectItem key={op} value={op}>{OPERATOR_LABELS[op]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {rule.field === "custom_field" && (
                <Select
                  value={rule.fieldKey ?? ""}
                  onValueChange={(v) => updateRule(idx, { fieldKey: v })}
                >
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Escolher campo personalizado…" /></SelectTrigger>
                  <SelectContent>
                    {fields.map((f) => <SelectItem key={f.id} value={f.key}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <FieldError message={ruleErr("fieldKey")} />

              {needsValue && (
                <>
                  {rule.field === "tag" ? (
                    <Select value={rule.value} onValueChange={(v) => updateRule(idx, { value: v })}>
                      <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Escolher etiqueta…" /></SelectTrigger>
                      <SelectContent>
                        {tags.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : rule.field === "conversation_status" ? (
                    <Select value={rule.value} onValueChange={(v) => updateRule(idx, { value: v })}>
                      <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Escolher status…" /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : rule.field === "bot_paused" ? (
                    <Select value={rule.value} onValueChange={(v) => updateRule(idx, { value: v })}>
                      <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Verdadeiro ou falso" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Pausada</SelectItem>
                        <SelectItem value="false">Ativa</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : rule.field === "current_time" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="time"
                        value={rule.value}
                        onChange={(e) => updateRule(idx, { value: e.target.value })}
                        className="h-8 text-[12px]"
                      />
                      <Input
                        type="time"
                        value={rule.valueEnd ?? ""}
                        onChange={(e) => updateRule(idx, { valueEnd: e.target.value })}
                        className="h-8 text-[12px]"
                      />
                    </div>
                  ) : (
                    <Input
                      value={rule.value}
                      onChange={(e) => updateRule(idx, { value: e.target.value })}
                      className="h-8 text-[12px]"
                      placeholder="Valor"
                    />
                  )}
                  <FieldError message={ruleErr("value")} />
                  <FieldError message={ruleErr("valueEnd")} />
                </>
              )}

              <div className="flex items-center justify-end gap-1 pt-1">
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => duplicateRule(idx)}>
                  <Copy className="h-3 w-3 mr-1" /> Duplicar
                </Button>
                <Button
                  variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-destructive hover:text-destructive"
                  onClick={() => removeRule(idx)}
                  disabled={draft.rules.length === 1}
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Remover
                </Button>
              </div>
            </div>
          );
        })}
        <FieldError message={errors.rules} />
      </div>
    </div>
  );
}
