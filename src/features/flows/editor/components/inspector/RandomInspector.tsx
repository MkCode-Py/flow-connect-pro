import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Plus, Trash2 } from "lucide-react";
import { FieldError } from "./shared/FieldError";
import type { RandomData } from "../../types";
import type { FieldErrors } from "../../schemas/nodeSchemas";
import { genId } from "../../utils/nodeDataDefaults";

type Props = {
  draft: RandomData;
  setDraft: (next: RandomData) => void;
  errors: FieldErrors;
  onRequestRemoveHandle: (handleId: string) => Promise<boolean>;
};

export function RandomInspector({ draft, setDraft, errors, onRequestRemoveHandle }: Props) {
  const addOutput = () => {
    const letter = String.fromCharCode(65 + draft.outputs.length);
    setDraft({
      ...draft,
      outputs: [...draft.outputs, { id: genId("out"), label: `Saída ${letter}` }],
    });
  };

  const updateOutput = (idx: number, label: string) => {
    const outputs = draft.outputs.map((o, i) => (i === idx ? { ...o, label } : o));
    setDraft({ ...draft, outputs });
  };

  const removeOutput = async (idx: number) => {
    if (draft.outputs.length <= 2) return;
    const out = draft.outputs[idx];
    const ok = await onRequestRemoveHandle(`opt-${out.id}`);
    if (!ok) return;
    setDraft({ ...draft, outputs: draft.outputs.filter((_, i) => i !== idx) });
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
        <Label className="text-[11px] text-muted-foreground mb-1.5 block">Tipo de seleção</Label>
        <ToggleGroup
          type="single"
          value={draft.mode}
          onValueChange={(v) => v && setDraft({ ...draft, mode: v as "random" | "sequential" })}
          className="grid grid-cols-2"
        >
          <ToggleGroupItem value="random" className="text-[11px]">Aleatória</ToggleGroupItem>
          <ToggleGroupItem value="sequential" className="text-[11px]">Sequencial</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] text-muted-foreground">Saídas ({draft.outputs.length})</Label>
          <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={addOutput}>
            <Plus className="h-3 w-3 mr-1" /> Adicionar
          </Button>
        </div>

        {draft.outputs.map((o, idx) => (
          <div key={o.id} className="flex items-center gap-1.5">
            <Input
              value={o.label}
              onChange={(e) => updateOutput(idx, e.target.value)}
              className="h-8 text-[12px]"
            />
            <Button
              variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => removeOutput(idx)}
              disabled={draft.outputs.length <= 2}
              title="Remover saída"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <FieldError message={errors.outputs} />
      </div>
    </div>
  );
}
