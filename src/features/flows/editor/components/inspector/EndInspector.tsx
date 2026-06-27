import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FieldError } from "./shared/FieldError";
import type { EndData } from "../../types";
import type { FieldErrors } from "../../schemas/nodeSchemas";

type Props = {
  draft: EndData;
  setDraft: (next: EndData) => void;
  errors: FieldErrors;
};

export function EndInspector({ draft, setDraft, errors }: Props) {
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
        <Label className="text-[11px] text-muted-foreground">Mensagem final (opcional)</Label>
        <Textarea
          value={draft.finalMessage}
          onChange={(e) => setDraft({ ...draft, finalMessage: e.target.value })}
          rows={3} className="mt-1"
          placeholder="Mensagem enviada antes de encerrar."
        />
      </div>

      <div className="space-y-3 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-[12px]">Marcar conversa como resolvida</Label>
          </div>
          <Switch checked={draft.markResolved} onCheckedChange={(v) => setDraft({ ...draft, markResolved: v })} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-[12px]">Remover etiquetas temporárias</Label>
          </div>
          <Switch checked={draft.removeTemporaryTags} onCheckedChange={(v) => setDraft({ ...draft, removeTemporaryTags: v })} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-[12px]">Pausar automação após encerrar</Label>
          </div>
          <Switch checked={draft.pauseAutomation} onCheckedChange={(v) => setDraft({ ...draft, pauseAutomation: v })} />
        </div>
      </div>
    </div>
  );
}
