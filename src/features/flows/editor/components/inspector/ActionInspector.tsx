import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { FieldError } from "./shared/FieldError";
import { InputWithVariables } from "./shared/TextWithVariables";
import { useCustomFields, useTags, useCreateTag } from "../../hooks/useTaxonomy";
import type { ActionData, ActionType } from "../../types";
import type { FieldErrors } from "../../schemas/nodeSchemas";

type Props = {
  draft: ActionData;
  setDraft: (next: ActionData) => void;
  errors: FieldErrors;
};

const ACTION_LABELS: Record<ActionType, string> = {
  add_tag: "Adicionar etiqueta",
  remove_tag: "Remover etiqueta",
  pause_bot: "Pausar automação",
  resume_bot: "Reiniciar automação",
  transfer_human: "Marcar como atendimento humano",
  mark_resolved: "Marcar conversa como resolvida",
  update_field: "Atualizar campo do contato",
};

export function ActionInspector({ draft, setDraft, errors }: Props) {
  const { data: tags = [] } = useTags();
  const { data: fields = [] } = useCustomFields();
  const createTag = useCreateTag();
  const [tagSearch, setTagSearch] = useState("");
  const [newTagOpen, setNewTagOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  const needsTags = draft.actionType === "add_tag" || draft.actionType === "remove_tag";
  const needsField = draft.actionType === "update_field";

  const selectedTags = tags.filter((t) => draft.tagIds.includes(t.id));

  const toggleTag = (id: string) => {
    const next = draft.tagIds.includes(id)
      ? draft.tagIds.filter((x) => x !== id)
      : [...draft.tagIds, id];
    setDraft({ ...draft, tagIds: next });
  };

  const handleCreateTag = async () => {
    const name = newTagName.trim();
    if (!name) return;
    try {
      const tag = await createTag.mutateAsync({ name });
      setDraft({ ...draft, tagIds: [...draft.tagIds, tag.id] });
      setNewTagName("");
      setNewTagOpen(false);
      toast.success("Etiqueta criada");
    } catch (e) {
      toast.error("Erro ao criar etiqueta", { description: (e as Error).message });
    }
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
        <Label className="text-[11px] text-muted-foreground">Tipo de ação</Label>
        <Select
          value={draft.actionType}
          onValueChange={(v) => setDraft({ ...draft, actionType: v as ActionType })}
        >
          <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(ACTION_LABELS) as ActionType[]).map((k) => (
              <SelectItem key={k} value={k}>{ACTION_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {needsTags && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] text-muted-foreground">Etiquetas</Label>
            <Popover open={newTagOpen} onOpenChange={setNewTagOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]">
                  <Plus className="h-3 w-3 mr-1" /> Nova
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="end">
                <div className="space-y-2">
                  <Label className="text-[11px]">Nome da etiqueta</Label>
                  <Input
                    autoFocus
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreateTag(); }}
                    className="h-8"
                  />
                  <Button size="sm" className="w-full h-8" onClick={handleCreateTag} disabled={createTag.isPending}>
                    Criar etiqueta
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start h-auto min-h-8 py-1.5 px-2 font-normal">
                {selectedTags.length === 0 ? (
                  <span className="text-muted-foreground text-[12px]">Selecionar etiquetas…</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {selectedTags.map((t) => (
                      <Badge key={t.id} variant="secondary" className="text-[10px] gap-1">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.color ?? "#22c55e" }} />
                        {t.name}
                        <X
                          className="h-2.5 w-2.5 ml-0.5 hover:text-destructive cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); toggleTag(t.id); }}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar…" value={tagSearch} onValueChange={setTagSearch} />
                <CommandList>
                  <CommandEmpty>Nenhuma etiqueta encontrada.</CommandEmpty>
                  <CommandGroup>
                    {tags.map((t) => {
                      const sel = draft.tagIds.includes(t.id);
                      return (
                        <CommandItem key={t.id} onSelect={() => toggleTag(t.id)}>
                          <span className="h-2 w-2 rounded-full mr-2" style={{ backgroundColor: t.color ?? "#22c55e" }} />
                          <span className="flex-1 truncate">{t.name}</span>
                          {sel && <Check className="h-3.5 w-3.5 text-primary" />}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FieldError message={errors.tagIds} />
        </div>
      )}

      {needsField && (
        <div className="space-y-3">
          <div>
            <Label className="text-[11px] text-muted-foreground">Campo personalizado</Label>
            <Select
              value={draft.customFieldKey}
              onValueChange={(v) => setDraft({ ...draft, customFieldKey: v })}
            >
              <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Selecionar campo…" /></SelectTrigger>
              <SelectContent>
                {fields.length === 0 && <div className="px-2 py-1.5 text-[11px] text-muted-foreground">Nenhum campo criado ainda.</div>}
                {fields.map((f) => (
                  <SelectItem key={f.id} value={f.key}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.customFieldKey} />
          </div>
          <InputWithVariables
            label="Valor"
            value={draft.customFieldValue}
            onChange={(v) => setDraft({ ...draft, customFieldValue: v })}
            placeholder="Texto ou {{variável}}"
          />
        </div>
      )}
    </div>
  );
}
