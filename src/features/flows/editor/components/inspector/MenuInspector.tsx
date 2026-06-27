import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { FieldError } from "./shared/FieldError";
import { TextWithVariables } from "./shared/TextWithVariables";
import type { MenuData, MenuOption } from "../../types";
import type { FieldErrors } from "../../schemas/nodeSchemas";
import { genId } from "../../utils/nodeDataDefaults";

type Props = {
  draft: MenuData;
  setDraft: (next: MenuData) => void;
  errors: FieldErrors;
  /** Pede ao page para remover handle e edges associados, devolve true se confirmado. */
  onRequestRemoveHandle: (handleId: string) => Promise<boolean>;
};

export function MenuInspector({ draft, setDraft, errors, onRequestRemoveHandle }: Props) {
  const [valueDraft, setValueDraft] = useState<Record<string, string>>({});

  const updateOption = (idx: number, patch: Partial<MenuOption>) => {
    const options = draft.options.map((o, i) => (i === idx ? { ...o, ...patch } : o));
    setDraft({ ...draft, options });
  };

  const addOption = () => {
    const next = draft.options.length + 1;
    setDraft({
      ...draft,
      options: [
        ...draft.options,
        {
          id: genId("opt"),
          shortcut: String(next),
          title: `Opção ${next}`,
          description: "",
          acceptedValues: [String(next)],
        },
      ],
    });
  };

  const moveOption = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= draft.options.length) return;
    const next = [...draft.options];
    [next[idx], next[target]] = [next[target], next[idx]];
    setDraft({ ...draft, options: next });
  };

  const removeOption = async (idx: number) => {
    const opt = draft.options[idx];
    const handleId = `opt-${opt.id}`;
    const ok = await onRequestRemoveHandle(handleId);
    if (!ok) return;
    setDraft({ ...draft, options: draft.options.filter((_, i) => i !== idx) });
  };

  const addAcceptedValue = (idx: number) => {
    const v = (valueDraft[draft.options[idx].id] ?? "").trim();
    if (!v) return;
    const opt = draft.options[idx];
    if (opt.acceptedValues.includes(v)) return;
    updateOption(idx, { acceptedValues: [...opt.acceptedValues, v] });
    setValueDraft((s) => ({ ...s, [opt.id]: "" }));
  };

  const removeAcceptedValue = (idx: number, v: string) => {
    const opt = draft.options[idx];
    updateOption(idx, { acceptedValues: opt.acceptedValues.filter((x) => x !== v) });
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

      <TextWithVariables
        label="Texto do menu"
        value={draft.question}
        onChange={(v) => setDraft({ ...draft, question: v })}
        placeholder="Escolha uma opção:"
        error={errors.question}
        rows={3}
      />

      <div>
        <Label className="text-[11px] text-muted-foreground">Texto auxiliar (opcional)</Label>
        <Textarea
          value={draft.helperText ?? ""}
          onChange={(e) => setDraft({ ...draft, helperText: e.target.value })}
          rows={2}
          className="mt-1"
          placeholder="Mais detalhes para o contato…"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] text-muted-foreground">Opções</Label>
          <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={addOption}>
            <Plus className="h-3 w-3 mr-1" /> Adicionar opção
          </Button>
        </div>

        {draft.options.map((opt, idx) => {
          const err = (k: string) => errors[`options.${idx}.${k}`];
          return (
            <div key={opt.id} className="rounded-md border border-border bg-surface-1 p-2.5 space-y-2">
              <div className="flex items-center gap-1.5">
                <div className="flex flex-col">
                  <button
                    type="button" onClick={() => moveOption(idx, -1)}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={idx === 0}
                  ><ArrowUp className="h-3 w-3" /></button>
                  <button
                    type="button" onClick={() => moveOption(idx, 1)}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={idx === draft.options.length - 1}
                  ><ArrowDown className="h-3 w-3" /></button>
                </div>
                <Input
                  value={opt.shortcut}
                  onChange={(e) => updateOption(idx, { shortcut: e.target.value })}
                  placeholder="Atalho"
                  className="h-8 w-16 text-[12px] font-mono text-center"
                />
                <Input
                  value={opt.title}
                  onChange={(e) => updateOption(idx, { title: e.target.value })}
                  placeholder="Título da opção"
                  className="h-8 flex-1 text-[12px]"
                />
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => removeOption(idx)}
                  disabled={draft.options.length === 1}
                  title="Remover opção"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <FieldError message={err("shortcut")} />
              <FieldError message={err("title")} />

              <Input
                value={opt.description ?? ""}
                onChange={(e) => updateOption(idx, { description: e.target.value })}
                placeholder="Descrição (opcional)"
                className="h-7 text-[12px]"
              />

              <div>
                <Label className="text-[10px] text-muted-foreground">Valores aceitos</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {opt.acceptedValues.map((v) => (
                    <Badge key={v} variant="secondary" className="text-[10px] gap-1">
                      {v}
                      <X
                        className="h-2.5 w-2.5 cursor-pointer hover:text-destructive"
                        onClick={() => removeAcceptedValue(idx, v)}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-1 mt-1">
                  <Input
                    value={valueDraft[opt.id] ?? ""}
                    onChange={(e) => setValueDraft((s) => ({ ...s, [opt.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAcceptedValue(idx); } }}
                    placeholder="ex: 1, preços, tabela"
                    className="h-7 text-[12px]"
                  />
                  <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => addAcceptedValue(idx)}>
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        <FieldError message={errors.options} />
      </div>

      <div className="space-y-3 pt-2 border-t border-border">
        <div>
          <Label className="text-[11px] text-muted-foreground">Mensagem para resposta inválida</Label>
          <Textarea
            value={draft.invalidReplyMessage}
            onChange={(e) => setDraft({ ...draft, invalidReplyMessage: e.target.value })}
            rows={2} className="mt-1"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[11px] text-muted-foreground">Tempo máx. (min)</Label>
            <Input
              type="number" min={0} max={10080}
              value={draft.timeoutMinutes}
              onChange={(e) => setDraft({ ...draft, timeoutMinutes: Number(e.target.value) || 0 })}
              className="h-8 mt-1"
            />
            <FieldError message={errors.timeoutMinutes} />
          </div>
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Mensagem ao expirar</Label>
          <Textarea
            value={draft.timeoutMessage}
            onChange={(e) => setDraft({ ...draft, timeoutMessage: e.target.value })}
            rows={2} className="mt-1"
          />
        </div>
      </div>
    </div>
  );
}
